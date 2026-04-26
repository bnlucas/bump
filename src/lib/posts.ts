import "server-only";
import { randomUUID } from "node:crypto";
import { simbeeRaw } from "./simbee-raw";
import { shroudb } from "./shroudb";
import { sigil, SIGIL_USER_SCHEMA } from "./sigil";

const POSTS_NAMESPACE = process.env.SHROUDB_POSTS_NAMESPACE ?? "posts";
const POST_CONTENT_TYPE = "post";
const POST_VISIBILITY = "public";
const SIGNAL_KEY_LIKE = process.env.SIMBEE_SIGNAL_KEY_LIKE ?? "like";

interface ContentItemDto {
  id: string;
  client_id: string;
  author_id: string;
  external_id: string;
  content_type: string;
  visibility: string;
  engagements_count?: number;
  published_at?: string;
}

interface EngagementDto {
  id: string;
  user_id: string;
  content_item_id: string;
  signal_type_id: string;
  created_at?: string;
}

interface ListEnvelope<T> {
  data: T[];
}

interface Envelope<T> {
  data: T;
}

let namespaceEnsured = false;

async function ensurePostsNamespace(): Promise<void> {
  if (namespaceEnsured) return;
  try {
    await shroudb().shroudb.namespaceCreate(POSTS_NAMESPACE);
  } catch {
    // Already exists or permission-denied — both are fine for our purposes;
    // the next put() will surface a real error if storage is broken.
  }
  namespaceEnsured = true;
}

interface StoredBody {
  title: string;
  body: string;
}

async function readBody(externalId: string): Promise<StoredBody | null> {
  try {
    const res = await shroudb().shroudb.get(POSTS_NAMESPACE, externalId);
    if (typeof res.value !== "string") return null;
    const parsed = JSON.parse(res.value) as Partial<StoredBody>;
    if (typeof parsed.body !== "string") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      body: parsed.body,
    };
  } catch {
    return null;
  }
}

export interface PostView {
  id: string;
  external_id: string;
  author_id: string;
  author_name: string | null;
  title: string;
  body: string;
  published_at: string | null;
  engagements_count: number;
}

async function hydrate(item: ContentItemDto): Promise<PostView | null> {
  const [body, envelope] = await Promise.all([
    readBody(item.external_id),
    sigil().userGet(SIGIL_USER_SCHEMA, item.author_id).catch(() => null),
  ]);
  if (!body) return null;
  const fields = (envelope?.fields ?? {}) as Record<string, unknown>;
  return {
    id: item.id,
    external_id: item.external_id,
    author_id: item.author_id,
    author_name: typeof fields.display_name === "string" ? fields.display_name : null,
    title: body.title,
    body: body.body,
    published_at: item.published_at ?? null,
    engagements_count: item.engagements_count ?? 0,
  };
}

export async function listPosts(limit = 20): Promise<PostView[]> {
  const res = await simbeeRaw<ListEnvelope<ContentItemDto>>(
    `/api/v1/content?limit=${limit}&content_type=${encodeURIComponent(POST_CONTENT_TYPE)}`,
  );
  if (!res.ok) return [];
  const items = res.data?.data ?? [];
  const hydrated = await Promise.all(items.map(hydrate));
  return hydrated.filter((p): p is PostView => p !== null);
}

export async function createPost(
  authorExternalId: string,
  title: string,
  body: string,
): Promise<PostView | null> {
  const externalId = randomUUID();

  await ensurePostsNamespace();
  await shroudb().shroudb.put(
    POSTS_NAMESPACE,
    externalId,
    JSON.stringify({ title, body } satisfies StoredBody),
  );

  const res = await simbeeRaw<Envelope<ContentItemDto>>("/api/v1/content", {
    method: "POST",
    body: JSON.stringify({
      author_external_id: authorExternalId,
      external_id: externalId,
      content_type: POST_CONTENT_TYPE,
      visibility: POST_VISIBILITY,
      published_at: new Date().toISOString(),
    }),
  });

  if (!res.ok || !res.data?.data) {
    await shroudb().shroudb.delete(POSTS_NAMESPACE, externalId).catch(() => {});
    return null;
  }
  return hydrate(res.data.data);
}

export interface LikeResult {
  engagement_id: string;
}

export async function addLike(
  contentId: string,
  userExternalId: string,
): Promise<LikeResult | null> {
  const res = await simbeeRaw<Envelope<EngagementDto>>(
    `/api/v1/content/${encodeURIComponent(contentId)}/engagements`,
    {
      method: "POST",
      body: JSON.stringify({
        user_external_id: userExternalId,
        type: SIGNAL_KEY_LIKE,
      }),
    },
  );
  if (!res.ok || !res.data?.data) return null;
  return { engagement_id: res.data.data.id };
}

export async function removeLike(
  contentId: string,
  engagementId: string,
): Promise<boolean> {
  const res = await simbeeRaw(
    `/api/v1/content/${encodeURIComponent(contentId)}/engagements/${encodeURIComponent(
      engagementId,
    )}`,
    { method: "DELETE" },
  );
  return res.ok;
}

