import "server-only";
import { simbee } from "./simbee";
import { sigil, SIGIL_USER_SCHEMA } from "./sigil";

export interface Profile {
  external_id: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  cluster_id: string | null;
  traits: Record<string, unknown>;
}

export async function loadProfile(externalId: string): Promise<Profile> {
  const [envelope, simbeeRes] = await Promise.all([
    sigil().userGet(SIGIL_USER_SCHEMA, externalId).catch(() => null),
    simbee().fetch.GET("/api/v1/users/{external_id}", {
      params: { path: { external_id: externalId } },
    }),
  ]);

  const fields = (envelope?.fields ?? {}) as Record<string, unknown>;
  const user = simbeeRes.data?.data;
  const traits = (user?.traits ?? {}) as Record<string, unknown>;

  return {
    external_id: externalId,
    email: typeof fields.email === "string" ? fields.email : null,
    display_name: typeof fields.display_name === "string" ? fields.display_name : null,
    bio: typeof traits.bio === "string" ? traits.bio : null,
    cluster_id: user?.cluster_id ?? null,
    traits,
  };
}

export interface ProfileUpdate {
  display_name?: string;
  bio?: string;
}

export async function updateProfile(externalId: string, patch: ProfileUpdate): Promise<Profile> {
  const tasks: Promise<unknown>[] = [];

  if (patch.display_name !== undefined) {
    tasks.push(
      sigil().userUpdate(SIGIL_USER_SCHEMA, externalId, { display_name: patch.display_name }),
    );
  }

  if (patch.bio !== undefined) {
    const current = await simbee().fetch.GET("/api/v1/users/{external_id}", {
      params: { path: { external_id: externalId } },
    });
    const currentTraits = (current.data?.data?.traits ?? {}) as Record<string, unknown>;
    const nextTraits = { ...currentTraits, bio: patch.bio };
    tasks.push(
      simbee().fetch.PUT("/api/v1/users/{external_id}", {
        params: { path: { external_id: externalId } },
        body: { traits: nextTraits as unknown as Record<string, never> },
      }),
    );
  }

  await Promise.all(tasks);
  return loadProfile(externalId);
}
