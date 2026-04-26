import "server-only";
import { randomUUID } from "node:crypto";
import { simbee } from "./simbee";
import { shroudb } from "./shroudb";

const TRAITS_KEY = "photo_ids";

async function readTraits(externalId: string): Promise<Record<string, unknown>> {
  const res = await simbee().fetch.GET("/api/v1/users/{external_id}", {
    params: { path: { external_id: externalId } },
  });
  return (res.data?.data?.traits ?? {}) as Record<string, unknown>;
}

async function writeTraits(
  externalId: string,
  traits: Record<string, unknown>,
): Promise<void> {
  await simbee().fetch.PUT("/api/v1/users/{external_id}", {
    params: { path: { external_id: externalId } },
    body: { traits: traits as unknown as Record<string, never> },
  });
}

function readPhotoIdsFrom(traits: Record<string, unknown>): string[] {
  const raw = traits[TRAITS_KEY];
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

export async function listPhotoIds(externalId: string): Promise<string[]> {
  const traits = await readTraits(externalId);
  return readPhotoIdsFrom(traits);
}

export interface PhotoBytes {
  bytes: Buffer;
  contentType: string;
}

export async function retrievePhoto(photoId: string): Promise<PhotoBytes | null> {
  const res = (await shroudb()
    .stash.retrieve(photoId)
    .catch(() => null)) as unknown;
  if (!res || !Array.isArray(res) || res.length < 2) return null;

  const [rawMetadata, plaintext] = res as [unknown, unknown];
  if (typeof plaintext !== "string") return null;

  const metadata: Record<string, unknown> =
    typeof rawMetadata === "string"
      ? safeJsonObject(rawMetadata)
      : rawMetadata && typeof rawMetadata === "object"
        ? (rawMetadata as Record<string, unknown>)
        : {};

  const contentType =
    typeof metadata.content_type === "string" && metadata.content_type
      ? metadata.content_type
      : "application/octet-stream";

  return { bytes: Buffer.from(plaintext, "base64"), contentType };
}

function safeJsonObject(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function addPhoto(
  externalId: string,
  dataB64: string,
  contentType: string,
): Promise<string> {
  const photoId = randomUUID();
  await shroudb().stash.store(photoId, dataB64, { content_type: contentType });

  const traits = await readTraits(externalId);
  const next = { ...traits, [TRAITS_KEY]: [...readPhotoIdsFrom(traits), photoId] };
  await writeTraits(externalId, next);

  return photoId;
}

export async function removePhoto(externalId: string, photoId: string): Promise<boolean> {
  const traits = await readTraits(externalId);
  const current = readPhotoIdsFrom(traits);
  if (!current.includes(photoId)) return false;

  await shroudb()
    .stash.revoke(photoId)
    .catch(() => null);

  const next = { ...traits, [TRAITS_KEY]: current.filter((id) => id !== photoId) };
  await writeTraits(externalId, next);
  return true;
}
