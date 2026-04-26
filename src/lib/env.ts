function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var: ${name}. Define it in .env.local (see .env.example).`,
    );
  }
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  simbee: {
    get apiKey() {
      return required("SIMBEE_API_KEY");
    },
    get host() {
      return optional("SIMBEE_HOST");
    },
  },
  shroudb: {
    get moat() {
      return required("SHROUDB_MOAT");
    },
    get token() {
      return optional("SHROUDB_TOKEN");
    },
  },
  herald: {
    get wsUrl() {
      return required("HERALD_WS_URL");
    },
    get httpUrl() {
      return required("HERALD_HTTP_URL");
    },
    get tenantKey() {
      return required("HERALD_TENANT_KEY");
    },
    get tenantSecret() {
      return required("HERALD_TENANT_SECRET");
    },
  },
} as const;
