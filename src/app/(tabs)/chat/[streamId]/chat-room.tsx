"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HeraldClient } from "@skeptik-io/herald-sdk";
import { HeraldChatClient } from "@skeptik-io/herald-chat-sdk";
import {
  HeraldChat,
  HeraldChatProvider,
  MessageList,
  MessageInput,
} from "@skeptik-io/herald-chat-react";
import type { Message } from "@skeptik-io/herald-chat";
import type { HeraldClientCreds } from "@/lib/herald-token";

export function ChatRoom({
  creds,
  streamId,
  recipientExternalId,
}: {
  creds: HeraldClientCreds;
  streamId: string;
  recipientExternalId: string | null;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { client, chat } = useMemo(() => {
    const c = new HeraldClient({
      url: creds.url,
      key: creds.key,
      token: creds.token,
      userId: creds.userId,
      streams: creds.streams,
      watchlist: creds.watchlist,
    });
    return { client: c, chat: new HeraldChatClient(c) };
  }, [creds]);

  useEffect(() => {
    let cancelled = false;
    client
      .connect()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
      client.disconnect();
    };
  }, [client]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-600 dark:text-red-400">
        Connection failed: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-[color:var(--muted-foreground)]">
        Connecting…
      </div>
    );
  }

  return (
    <HeraldChatProvider client={client} chat={chat} userId={creds.userId}>
      <ChatLayout
        streamId={streamId}
        userId={creds.userId}
        recipientExternalId={recipientExternalId}
      />
    </HeraldChatProvider>
  );
}

function ChatLayout({
  streamId,
  userId,
  recipientExternalId,
}: {
  streamId: string;
  userId: string;
  recipientExternalId: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function pingNotify(body: string) {
    if (!recipientExternalId) return;
    void fetch("/api/notify/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stream_id: streamId,
        recipient_external_id: recipientExternalId,
        preview: body,
      }),
    }).catch(() => {});
  }

  return (
    <HeraldChat streamId={streamId} scrollRef={scrollRef}>
      {() => (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4"
          >
            <MessageList streamId={streamId}>
              {({ messages }) => (
                <ul className="space-y-2">
                  {messages.map((m) => (
                    <Bubble key={m.id} message={m} mine={m.sender === userId} />
                  ))}
                </ul>
              )}
            </MessageList>
          </div>

          <MessageInput streamId={streamId}>
            {({ send, sendTyping }) => (
              <Composer
                onSend={async (body) => {
                  const result = await send(body);
                  pingNotify(body);
                  return result;
                }}
                onTyping={sendTyping}
              />
            )}
          </MessageInput>
        </>
      )}
    </HeraldChat>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  const pending = message.status === "sending";
  const failed = message.status === "failed";
  return (
    <li
      className={`flex ${mine ? "justify-end" : "justify-start"}`}
      data-status={message.status}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm transition-opacity ${
          mine
            ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
            : "bg-[color:var(--muted)] text-[color:var(--foreground)]"
        } ${pending ? "opacity-60" : ""} ${failed ? "ring-1 ring-red-500" : ""}`}
        title={failed ? "Failed to send" : undefined}
      >
        {message.deleted ? (
          <span className="italic opacity-60">message deleted</span>
        ) : (
          message.body
        )}
      </div>
    </li>
  );
}

function Composer({
  onSend,
  onTyping,
}: {
  onSend: (body: string) => Promise<unknown>;
  onTyping: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      await onSend(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 border-t border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(e);
          }
        }}
        rows={1}
        placeholder="Message"
        className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] px-3 py-2 text-sm outline-none focus:border-[color:var(--accent)]"
      />
      <button
        type="submit"
        disabled={!text.trim() || sending}
        className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-foreground)] transition-opacity disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
