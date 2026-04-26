import "server-only";
import { randomUUID } from "node:crypto";
import { simbeeRaw } from "./simbee-raw";
import { shroudb } from "./shroudb";
import { sigil, SIGIL_USER_SCHEMA } from "./sigil";
import { resolveInternalUserId } from "./simbee-user";

const POSTS_NAMESPACE = process.env.SHROUDB_POSTS_NAMESPACE ?? "posts";
const COMMENTS_NAMESPACE = process.env.SHROUDB_COMMENTS_NAMESPACE ?? "comments";
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

const namespacesEnsured = new Set<string>();

async function ensureNamespace(name: string): Promise<void> {
  if (namespacesEnsured.has(name)) return;
  try {
    await shroudb().shroudb.namespaceCreate(name);
  } catch {
    // Already exists or permission-denied — both fine; next put() will
    // surface a real error if storage is actually broken.
  }
  namespacesEnsured.add(name);
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
  current_user_like_engagement_id: string | null;
}

async function findUserLike(
  contentId: string,
  internalUserId: string,
): Promise<string | null> {
  const res = await simbeeRaw<ListEnvelope<EngagementDto>>(
    `/api/v1/content/${encodeURIComponent(contentId)}/engagements?type=${encodeURIComponent(SIGNAL_KEY_LIKE)}`,
  );
  if (!res.ok) return null;
  return (res.data?.data ?? []).find((e) => e.user_id === internalUserId)?.id ?? null;
}

async function hydrate(
  item: ContentItemDto,
  viewerInternalId: string | null,
): Promise<PostView | null> {
  const [body, envelope, likeEngagementId] = await Promise.all([
    readBody(item.external_id),
    sigil().userGet(SIGIL_USER_SCHEMA, item.author_id).catch(() => null),
    viewerInternalId ? findUserLike(item.id, viewerInternalId) : Promise.resolve(null),
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
    current_user_like_engagement_id: likeEngagementId,
  };
}

export async function listPosts(
  viewerExternalId: string | null = null,
  limit = 20,
): Promise<PostView[]> {
  const [res, viewerInternalId] = await Promise.all([
    simbeeRaw<ListEnvelope<ContentItemDto>>(
      `/api/v1/content?limit=${limit}&content_type=${encodeURIComponent(POST_CONTENT_TYPE)}`,
    ),
    viewerExternalId ? resolveInternalUserId(viewerExternalId) : Promise.resolve(null),
  ]);
  if (!res.ok) return [];
  const items = res.data?.data ?? [];
  const hydrated = await Promise.all(items.map((i) => hydrate(i, viewerInternalId)));
  return hydrated.filter((p): p is PostView => p !== null);
}

export async function createPost(
  authorExternalId: string,
  title: string,
  body: string,
): Promise<PostView | null> {
  const externalId = randomUUID();

  await ensureNamespace(POSTS_NAMESPACE);
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
  // The post we just created can't have a like yet; skip the lookup.
  return hydrate(res.data.data, null);
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


export interface CommentView {
  id: string;
  parent_external_id: string;
  body: string;
  author_external_id: string;
  author_name: string | null;
  created_at: string;
}

interface StoredComment {
  body: string;
  author_external_id: string;
  parent_external_id: string;
  created_at: string;
}

function commentKey(parentExternalId: string, commentExternalId: string): string {
  return `${parentExternalId}/${commentExternalId}`;
}

export async function createComment(
  authorExternalId: string,
  parentExternalId: string,
  body: string,
): Promise<CommentView | null> {
  await ensureNamespace(COMMENTS_NAMESPACE);
  const id = randomUUID();
  const stored: StoredComment = {
    body,
    author_external_id: authorExternalId,
    parent_external_id: parentExternalId,
    created_at: new Date().toISOString(),
  };
  await shroudb().shroudb.put(
    COMMENTS_NAMESPACE,
    commentKey(parentExternalId, id),
    JSON.stringify(stored),
  );
  const author = await sigil()
    .userGet(SIGIL_USER_SCHEMA, authorExternalId)
    .catch(() => null);
  const fields = (author?.fields ?? {}) as Record<string, unknown>;
  return {
    id,
    parent_external_id: parentExternalId,
    body: stored.body,
    author_external_id: authorExternalId,
    author_name: typeof fields.display_name === "string" ? fields.display_name : null,
    created_at: stored.created_at,
  };
}

export async function listComments(parentExternalId: string): Promise<CommentView[]> {
  await ensureNamespace(COMMENTS_NAMESPACE);
  const listing = await shroudb()
    .shroudb.list(COMMENTS_NAMESPACE, { prefix: `${parentExternalId}/`, limit: 100 })
    .catch(() => null);
  if (!listing) return [];

  const keys = ((listing as { keys?: unknown }).keys ?? []) as unknown[];
  const stringKeys = keys.filter((k): k is string => typeof k === "string");

  const fetched = await Promise.all(
    stringKeys.map(async (key) => {
      const got = await shroudb()
        .shroudb.get(COMMENTS_NAMESPACE, key)
        .catch(() => null);
      if (!got || typeof (got as { value?: unknown }).value !== "string") return null;
      try {
        const parsed = JSON.parse((got as { value: string }).value) as StoredComment;
        const id = key.startsWith(`${parentExternalId}/`)
          ? key.slice(parentExternalId.length + 1)
          : key;
        return { id, parsed };
      } catch {
        return null;
      }
    }),
  );

  const valid = fetched.filter(
    (x): x is { id: string; parsed: StoredComment } => x !== null,
  );

  const authors = new Map<string, string | null>();
  await Promise.all(
    Array.from(new Set(valid.map((v) => v.parsed.author_external_id))).map(async (ext) => {
      const env = await sigil().userGet(SIGIL_USER_SCHEMA, ext).catch(() => null);
      const fields = (env?.fields ?? {}) as Record<string, unknown>;
      authors.set(
        ext,
        typeof fields.display_name === "string" ? fields.display_name : null,
      );
    }),
  );

  return valid
    .map(({ id, parsed }) => ({
      id,
      parent_external_id: parsed.parent_external_id,
      body: parsed.body,
      author_external_id: parsed.author_external_id,
      author_name: authors.get(parsed.author_external_id) ?? null,
      created_at: parsed.created_at,
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
