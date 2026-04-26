import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { simbee } from "@/lib/simbee";

export const dynamic = "force-dynamic";

interface SignupBody {
  email: string;
  password: string;
  displayName?: string;
}

function parseBody(value: unknown): SignupBody | { error: string } {
  if (!value || typeof value !== "object") return { error: "Body must be a JSON object." };
  const v = value as Record<string, unknown>;
  if (typeof v.email !== "string" || !v.email.includes("@")) return { error: "Invalid email." };
  if (typeof v.password !== "string" || v.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (v.displayName !== undefined && typeof v.displayName !== "string") {
    return { error: "displayName must be a string when provided." };
  }
  return { email: v.email, password: v.password, displayName: v.displayName };
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = parseBody(json);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const externalId = randomUUID();

  const { data, error } = await simbee().fetch.POST("/api/v1/users", {
    body: { external_id: externalId },
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create Simbee graph user.", detail: error },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      external_id: externalId,
      user: data,
    },
    { status: 201 },
  );
}
