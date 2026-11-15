"use client";

import { useCallback, useEffect, useState } from "react";
import type { IdentityImages, IdentitySummary, ReportIdentity } from "@/lib/reportIdentity";

const NO_IMAGES: IdentityImages = { signatureImage: null, headerImage: null, footerImage: null };
// One request per version, shared by every screen that asks.
const requests = new Map<string, Promise<IdentityImages>>();

function load(version: string) {
  let request = requests.get(version);
  if (!request) {
    request = fetch(`/api/account/identity-images?v=${encodeURIComponent(version)}`).then((response) => {
      if (!response.ok) throw new Error("The images could not be loaded.");
      return response.json() as Promise<IdentityImages>;
    });
    // A failed request is forgotten, so the next copy or print tries again.
    request.catch(() => requests.delete(version));
    requests.set(version, request);
  }
  return request;
}

/**
 * The doctor's sign-off and letterhead with their images. The page arrives
 * without the images; they are fetched once here and kept by the browser.
 * `ready` gives the complete identity, waiting for the images when a copy or
 * print is asked for before they have arrived.
 */
export function useIdentityImages(summary: IdentitySummary) {
  const version = summary.imagesVersion;
  const [images, setImages] = useState<IdentityImages | null>(null);

  useEffect(() => {
    if (!version) return;
    let current = true;
    load(version)
      .then((loaded) => current && setImages(loaded))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [version]);

  const identity: ReportIdentity = { ...summary, ...(version ? (images ?? NO_IMAGES) : NO_IMAGES) };

  const ready = useCallback(async (): Promise<ReportIdentity> => {
    if (!version) return { ...summary, ...NO_IMAGES };
    return { ...summary, ...(await load(version)) };
  }, [summary, version]);

  return { identity, ready };
}
