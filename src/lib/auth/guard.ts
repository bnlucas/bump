import "server-only";
import { NextResponse } from "next/server";
import { currentSession, type Session } from "./session";

export async function requireSession(): Promise<Session | NextResponse> {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  return session;
}

export function isUnauthorized(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
