"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Word = { text: string; confidence: number };

type Options = {
  model: string;
  language: string;
  keyterms: string[];
  onWords: (words: Word[]) => void;
};

export type MicrophoneAccess = "unknown" | "ask" | "allowed" | "blocked";

/** Plain-language messages for the people using this, not for developers. */
export const MICROPHONE_MESSAGES = {
  ask: "Your browser will ask to use the microphone. Choose Allow. LumenAI listens only while the red Listening sign is showing.",
  blocked:
    "The microphone is blocked for LumenAI. Click the lock icon beside the web address at the top of the screen, change Microphone to Allow, then reload this page.",
  missing:
    "No microphone was found. Plug in a headset or microphone, then press Start speaking again.",
  busy: "The microphone is being used by another program, such as a video call. Close that program, then press Start speaking again.",
  unsupported:
    "This browser cannot use the microphone here. Open LumenAI in Google Chrome or Microsoft Edge.",
  offline:
    "Could not reach the speech service. Check your internet connection, then press Start speaking again.",
};

function microphoneProblem(cause: unknown) {
  const name = cause instanceof DOMException ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return MICROPHONE_MESSAGES.blocked;
  if (name === "NotFoundError" || name === "OverconstrainedError") return MICROPHONE_MESSAGES.missing;
  if (name === "NotReadableError" || name === "AbortError") return MICROPHONE_MESSAGES.busy;
  if (cause instanceof TypeError) return MICROPHONE_MESSAGES.offline;
  return cause instanceof Error && cause.message ? cause.message : MICROPHONE_MESSAGES.offline;
}

// Streams microphone audio straight to Deepgram and reports finalised words.
export function useDictation({ model, language, keyterms, onWords }: Options) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const [access, setAccess] = useState<MicrophoneAccess>("unknown");

  // Know before the first click whether the browser will ask, allow or refuse.
  useEffect(() => {
    let status: PermissionStatus | undefined;
    const read = () => {
      if (!status) return;
      setAccess(status.state === "granted" ? "allowed" : status.state === "denied" ? "blocked" : "ask");
    };
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        status = result;
        read();
        result.addEventListener("change", read);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", read);
  }, []);

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closedRef = useRef<(() => void) | null>(null);
  // True from the first click until the session ends. Starting takes a moment
  // (token, microphone prompt), and a second click in that gap would open a
  // second session that transcribes the same speech again.
  const activeRef = useRef(false);
  // When listening began, to report how long the speech service was used.
  const startedAtRef = useRef<number | null>(null);
  // Listens to the same microphone stream to show how loud the voice is.
  const audioRef = useRef<{ context: AudioContext; analyser: AnalyserNode; samples: Uint8Array<ArrayBuffer> } | null>(null);

  /** Loudness of the voice right now, 0 (silence) to 1. Safe to call on every frame. */
  const readLevel = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return 0;
    audio.analyser.getByteTimeDomainData(audio.samples);
    let sum = 0;
    for (const sample of audio.samples) {
      const centred = (sample - 128) / 128;
      sum += centred * centred;
    }
    return Math.sqrt(sum / audio.samples.length);
  }, []);

  function cleanup() {
    if (startedAtRef.current !== null) {
      const seconds = Math.round((Date.now() - startedAtRef.current) / 1000);
      startedAtRef.current = null;
      fetch("/api/usage/dictation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
        keepalive: true,
      }).catch(() => {});
    }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioRef.current?.context.close().catch(() => {});
    audioRef.current = null;
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

      if (!navigator.mediaDevices?.getUserMedia) throw new Error(MICROPHONE_MESSAGES.unsupported);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setAccess("allowed");

      try {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        context.createMediaStreamSource(stream).connect(analyser);
        audioRef.current = { context, analyser, samples: new Uint8Array(analyser.fftSize) };
      } catch {
        // No level meter on this browser; dictation itself still works.
      }

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
        startedAtRef.current = Date.now();
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
        setError(MICROPHONE_MESSAGES.offline);
      };
      socket.onclose = cleanup;
    } catch (cause) {
      const problem = microphoneProblem(cause);
      if (problem === MICROPHONE_MESSAGES.blocked) setAccess("blocked");
      setError(problem);
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

  return { recording, starting, interim, error, access, start, stop, readLevel };
}
