import "server-only";
import { randomUUID } from "node:crypto";
import { simbee } from "./simbee";
import { shroudb } from "./shroudb";
import { sigil, SIGIL_USER_SCHEMA } from "./sigil";
import { resolveInternalUserId } from "./simbee-user";
import type { components } from "./simbee-schema";

const POSTS_NAMESPACE = process.env.SHROUDB_POSTS_NAMESPACE ?? "posts";
const COMMENTS_NAMESPACE = process.env.SHROUDB_COMMENTS_NAMESPACE ?? "comments";
const POST_CONTENT_TYPE = "post";
const POST_VISIBILITY = "public";
const SIGNAL_KEY_LIKE = process.env.SIMBEE_SIGNAL_KEY_LIKE ?? "like";

type ContentItemDto = components["schemas"]["ContentItemDto"];
type EngagementDto = components["schemas"]["EngagementDto"];

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
  layer_key?: string;
  topic_id?: string;
  topic_name?: string;
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
      layer_key: typeof parsed.layer_key === "string" ? parsed.layer_key : undefined,
      topic_id: typeof parsed.topic_id === "string" ? parsed.topic_id : undefined,
      topic_name: typeof parsed.topic_name === "string" ? parsed.topic_name : undefined,
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
  layer_key: string | null;
  topic_name: string | null;
  published_at: string | null;
  engagements_count: number;
  current_user_like_engagement_id: string | null;
}

async function findUserLike(
  contentId: string,
  internalUserId: string,
): Promise<string | null> {
  const res = await simbee().fetch.GET(
    "/api/v1/content/{content_id}/engagements",
    {
      params: {
        path: { content_id: contentId },
        query: { type: SIGNAL_KEY_LIKE },
      },
    },
  );
  const list = (res.data?.data ?? []) as EngagementDto[];
  return list.find((e) => e.user_id === internalUserId)?.id ?? null;
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
    layer_key: body.layer_key ?? null,
    topic_name: body.topic_name ?? null,
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
    simbee().fetch.GET("/api/v1/content", {
      params: { query: { limit, content_type: POST_CONTENT_TYPE } },
    }),
    viewerExternalId ? resolveInternalUserId(viewerExternalId) : Promise.resolve(null),
  ]);
  const items = (res.data?.data ?? []) as ContentItemDto[];
  const hydrated = await Promise.all(items.map((i) => hydrate(i, viewerInternalId)));
  return hydrated.filter((p): p is PostView => p !== null);
}

export interface CreatePostInput {
  title: string;
  body: string;
  layer_key?: string;
  topic_id?: string;
  topic_name?: string;
}

export async function createPost(
  authorExternalId: string,
  input: CreatePostInput,
): Promise<PostView | null> {
  const externalId = randomUUID();

  await ensureNamespace(POSTS_NAMESPACE);
  await shroudb().shroudb.put(
    POSTS_NAMESPACE,
    externalId,
    JSON.stringify({
      title: input.title,
      body: input.body,
      ...(input.layer_key ? { layer_key: input.layer_key } : {}),
      ...(input.topic_id ? { topic_id: input.topic_id } : {}),
      ...(input.topic_name ? { topic_name: input.topic_name } : {}),
    } satisfies StoredBody),
  );

  const res = await simbee().fetch.POST("/api/v1/content", {
    body: {
      author_external_id: authorExternalId,
      external_id: externalId,
      content_type: POST_CONTENT_TYPE,
      visibility: POST_VISIBILITY,
      published_at: new Date().toISOString(),
    },
  });

  const created = res.data?.data as ContentItemDto | undefined;
  if (!created) {
    await shroudb().shroudb.delete(POSTS_NAMESPACE, externalId).catch(() => {});
    return null;
  }
  // The post we just created can't have a like yet; skip the lookup.
  return hydrate(created, null);
}

export interface LikeResult {
  engagement_id: string;
}

export async function addLike(
  contentId: string,
  userExternalId: string,
): Promise<LikeResult | null> {
  const res = await simbee().fetch.POST(
    "/api/v1/content/{content_id}/engagements",
    {
      params: { path: { content_id: contentId } },
      body: { user_external_id: userExternalId, type: SIGNAL_KEY_LIKE },
    },
  );
  const created = res.data?.data as EngagementDto | undefined;
  return created ? { engagement_id: created.id } : null;
}

export async function removeLike(
  contentId: string,
  engagementId: string,
): Promise<boolean> {
  const res = await simbee().fetch.DELETE(
    "/api/v1/content/{content_id}/engagements/{engagement_id}",
    {
      params: { path: { content_id: contentId, engagement_id: engagementId } },
    },
  );
  return res.response.ok;
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
