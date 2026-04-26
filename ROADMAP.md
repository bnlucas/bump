# Roadmap

Things we deferred during the initial build, and things that would be
worth picking up next. Sized **S / M / L**, with what's actually
blocking each one called out honestly.

The architectural rules in [AGENTS.md](AGENTS.md) are the constraints
to keep — this file is the *what*, not the *how*.

---

## Blocked on spec / SDK

These have a sketch and a clear shape — they're held off because
something upstream isn't quite there yet, not because we don't know
what to do.

### Hydrate attached affinity-tag chip state on profile load (S)

**Status.** `<InterestChips />` resets visual state on every page
load: chips revert to "off" until the user taps them again. New taps
within the session work correctly (we get the `affinity_tag_id`
back from the POST and remember it for DELETE).

**Why we held off.** The internal `/affinity_tags` summary returns
`{ id, tag_type, association_type }` — which gives us *one* of the
two ids we need to render and toggle off, but never both in the same
shape. If `id` is the vocab `tag_id` we can highlight chips but
can't DELETE; if it's the `affinity_tag_id` we can DELETE but can't
match it back to a vocab tag.

**Unblock.** A summary endpoint that returns
`[{ tag_id, affinity_tag_id, ... }]`, or a public list endpoint with
the full `AffinityTagDto[]`. Once one exists, hydration is a
two-line change in `src/app/(tabs)/profile/page.tsx` +
`<InterestChips />`.

### Personalized Communities feed via `/users/{ext}/feed` (M)

**Status.** `/communities` lists from `/api/v1/content?content_type=post`
flat across the tenant. Active-context filter pills filter the result
client-side.

**Why we held off.** The personalized `/users/{ext}/feed` endpoint
returns `FeedItemDto[]` whose `content_item_id` is the **internal**
content id. Our ShrouDB body keys are the `external_id`. Hydrating
each feed item would need a `/content/{id}` round-trip just to
resolve the external id — N+1 on the read.

**Unblock.** A batch lookup `/content?ids=a,b,c` (or a feed response
that includes external_id directly). Once we can resolve N internal
ids in one call, switching to the personalized feed is a swap in
`src/lib/posts.ts:listPosts`.

### Per-DM push without a client ping (M)

**Status.** Today `/api/notify/dm` is fired by the chat composer
after each successful Herald `send()`. The route does the honest
gating server-side — membership both ways, recipient presence,
permission re-check — but the trigger comes from the client.

**Why we held off.** `@skeptik-io/herald-admin@5.0.1` doesn't
expose webhooks or a server-subscribe API. The only alternatives
are polling (wasteful) or the client-driven ping (what we shipped).

**Unblock.** Herald-admin grows a webhook config endpoint, or a
long-poll / SSE subscription API. With either, we can move the
notify trigger off the client and onto a small server-side
listener. Most of `/api/notify/dm`'s logic carries over verbatim.

---

## Product enhancements

Things we haven't built. Each is a real feature, not a defect.

### Swipe card score breakdown + explanations (S)

`MatchResultDto` carries `score_breakdown` (a `Record<string, never>`
in the spec, presumably keyed by scoring layer) and `explanation`
(`string[]`). We render up to three explanation strings on the card
already; surfacing the breakdown as a small "why this match"
disclosure (collapsed by default) would explain Simbee's reasoning
without committing screen space.

### Subreddit-style rooms vs tagged feed (M)

The Communities tab today is one feed with a layer filter. An
alternative shape is one *room per consent layer* with its own URL,
its own compose default, and its own "live now" indicator from
Herald presence. Genuinely better for some product visions, worse
for others — a UX call rather than an engineering one.

### Photo crop / order in profile (S)

The photo grid lets you upload + delete but not reorder. First
photo is always primary (used as the swipe card hero + chat avatar
fallback). Drag-to-reorder via `@dnd-kit/sortable` would be ~80
lines.

### Match-preferences "preferred connections" + "connection types" (S)

`MatchPreferencesDto` exposes both, but the UI form skips them
because their semantics are tenant-specific. With a small lookup
against tenant-config (similar to how affinity preferences/roles
work), they'd render as another pair of comma-separated inputs
(or, better, multi-selects against the configured vocab).

### "Find more" auto-refresh (S)

`/discover` empty-state's *Find more* button POSTs `/matches/compute`
(202 enqueued) and tells the user to pull down to refresh. A small
poll loop (with bounded retries) that watches for new candidates
and `router.refresh()` once results land would close that loop
without the user having to think about it.

### Reply threading depth in Communities (M)

Comments today are flat under each post. True threading (replies
to replies) needs a `parent_comment_id` field in the stored body
JSON and a recursive render on the client. The N+1 cost on read
grows accordingly; capping depth at 3-4 with a "show replies"
expander is reasonable.

### Block / report from the swipe card and chat header (S)

Simbee `/users/{ext}/blocks` is in the schema and we use it
implicitly via `messagingAllowed`. Surfacing an explicit "block"
or "report" affordance from the swipe card and chat header would
let the user trigger the gate manually. Block POST + audit-log
entry via ShrouDB chronicle for the moderation trail.

### Discover "undo last swipe" (S)

Tinder-style. Server already has the signal; revoking it via
`POST /signals/{signal_id}/revoke` would put the candidate back at
the head of the queue. Needs us to keep the last swipe id in
component state (or a tiny revoke endpoint).

---

## Polish / DX

### Bottom-nav active-state flicker on navigate (XS)

The accent dot redraws once during transitions. Likely fixed by a
`will-change-transform` or by `useSelectedLayoutSegment` instead
of `usePathname` for the active check.

### Toast component for transient errors (S)

Most action errors today render as inline `<p role="alert">`.
A bottom-of-screen toast (auto-dismissing, queueable) for one-off
errors like swipe-failed / compose-failed / context-switch-failed
would feel less stilted. Doesn't need a library; a small context
+ portal does it.

### Loading skeleton inside the chat detail (XS)

`/chat/[streamId]` server component renders before Herald
connects, so the user sees the chat header instantly but a blank
message area until the WebSocket handshakes. A subtle "Connecting…"
inside `<ChatRoom>` (which we have) plus a few skeleton bubbles
under it would smooth the gap.

### Image optimization via custom next/image loader (S)

Photos go through `/api/photos/[id]` (auth-gated proxy), so the
default `next/image` optimizer doesn't help. A custom loader that
forwards cookies + uses Next's optimizer for resize would cut
bandwidth on the photo grid + swipe deck. Three `<img>` sites
swap to `<Image>`; eslint warnings disappear.

### `/api/discover/feed` either consumed or removed (XS)

The route exists, mirrors the page-side render, and has no caller
today. Either a future native client uses it or it should go.

### Lint config: tighten `no-unsafe-*` (S)

We cast through `as components["schemas"][…]` in a few spots
where openapi-fetch's union narrowing isn't perfect. A custom
helper to do that cast in one place + tighter eslint rules
elsewhere would make accidental `any` regressions visible.

### Internationalization (M)

Every string is hard-coded English. Not a near-term blocker but
moving them through `next-intl` or similar before the surface
gets bigger is much cheaper than retrofitting later.

### Accessibility audit (M)

We've been mindful but not rigorous: aria roles on the bottom nav
and pill rows, alt text on photos, `role="alert"` on errors.
A pass with axe-core + a screen-reader test would catch what
slipped.

---

## Tests

The unit suite is comprehensive for the lib functions that touch
the SDK pattern. What's left:

- **`loadProfile`, `match-preferences`, `simbee-config`,
  `simbee-user`, `vocab`** — thin wrappers around a single call,
  mostly mechanical to test. Each adds 3-5 tests.
- **Route handler tests** — none yet. Vitest can spin up the
  Next.js handlers via `import { POST } from "..."` and pass a
  fake `NextRequest`. Highest-value targets: `/api/auth/signup`
  (the whole orchestration), `/api/discover/swipe` (gating +
  Herald creation), `/api/notify/dm` (the gates).
- **One Playwright E2E** — onboarding → swipe → chat happy path.
  Catches the "I broke a route handler" class of regression that
  unit tests can't.

---

## Operations / tooling

### Tenant bootstrap scripts (M)

A handful of things have to exist on a Simbee tenant for the app
to work: a sigil `users` schema (with `email` indexed and a
password credential field), at least one consent layer, signal
types for `interest` / `pass` / `like`, and a vocab. Today these
have to be provisioned by hand. A `scripts/bootstrap.ts` that
takes a Simbee API key + ShrouDB token and idempotently creates
the minimum viable config would let a new tenant spin up the app
in one command.

### Admin surface for moderation (L)

Beyond the user-facing block + report, an `/admin` route with the
moderation log (ShrouDB chronicle) + a "review reported content"
queue + the ability to revoke a stash photo / delete a post would
turn the trust-and-safety story from "hope nothing bad happens"
into something operable.

### Webhook receiver for Simbee events (M)

Simbee can emit webhooks on signal/match/etc. events. We don't
currently consume them. A `/api/webhooks/simbee` receiver that
verifies the signature and reacts (e.g., when `match.created`
fires for a pair, eagerly create the Herald stream so the chat
detail page doesn't have to do it on first open) would reduce
the latency of the discover→chat transition.

---

## Platform expansion

### Capacitor / React Native wrap (L)

The app is mobile-first PWA today. A Capacitor wrap would give us:

- Native push notifications via OS push services, replacing the
  courier delivery channel for installed users.
- Native camera + photo picker UX (the file input works but isn't
  delightful).
- App store distribution.

The PWA continues to work in browsers; the wrap is a separate
binary path. Most of the React tree is reusable.

### A second platform (web-desktop) (M)

Layout breaks on `>md` widths because we hard-cap at
`max-w-screen-sm`. A real desktop layout — multi-pane, chat
list-and-detail side-by-side, etc. — is a separate set of
templates. Not urgent if mobile is the primary surface, worth
it if web-desktop is a real audience.
