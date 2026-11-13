"use client";

import { useRef, useState } from "react";

export type Word = { text: string; confidence: number };

type Options = {
  model: string;
  language: string;
  keyterms: string[];
  onWords: (words: Word[]) => void;
};

// Streams microphone audio straight to Deepgram and reports finalised words.
export function useDictation({ model, language, keyterms, onWords }: Options) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closedRef = useRef<(() => void) | null>(null);
  // True from the first click until the session ends. Starting takes a moment
  // (token, microphone prompt), and a second click in that gap would open a
  // second session that transcribes the same speech again.
  const activeRef = useRef(false);

  function cleanup() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    socketRef.current = null;
    activeRef.current = false;
    setStarting(false);
    setRecording(false);
    setInterim("");
    closedRef.current?.();
    closedRef.current = null;
  }

  async function start() {
    if (activeRef.current) return;
    activeRef.current = true;
    setStarting(true);
    setError("");
    try {
      const tokenRes = await fetch("/api/stt-token", { method: "POST" });
      const tokenBody = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenBody.error);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const params = new URLSearchParams({
        model,
        language,
        interim_results: "true",
        smart_format: "true",
      });
      keyterms.forEach((term) => params.append("keyterm", term));

      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params}`,
        ["bearer", tokenBody.token],
      );
      socketRef.current = socket;

      socket.onopen = () => {
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        recorder.start(250);
        setStarting(false);
        setRecording(true);
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type !== "Results") return;
        const alternative = message.channel?.alternatives?.[0];
        if (!alternative) return;

        if (message.is_final) {
          onWords(
            (alternative.words ?? []).map(
              (word: { word: string; punctuated_word?: string; confidence: number }) => ({
                text: word.punctuated_word ?? word.word,
                confidence: word.confidence,
              }),
            ),
          );
          setInterim("");
        } else {
          setInterim(alternative.transcript);
        }
      };

      socket.onerror = () => {
        setError("Speech connection failed. Check the model, language and API key.");
      };
      socket.onclose = cleanup;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start dictation.");
      cleanup();
    }
  }

  // Resolves once the last words have arrived and the connection has closed.
  function stop() {
    return new Promise<void>((resolve) => {
      const socket = socketRef.current;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      if (socket?.readyState === WebSocket.OPEN) {
        closedRef.current = resolve;
        // Ask Deepgram to flush the last words, then it closes the socket.
        socket.send(JSON.stringify({ type: "CloseStream" }));
      } else {
        cleanup();
        resolve();
      }
    });
  }

  return { recording, starting, interim, error, start, stop };
}
