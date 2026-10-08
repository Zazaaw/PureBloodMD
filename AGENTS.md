<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PureBloodMD

A parody dating app where doctors match with doctors: swipe triage, Bumble-style chat (female doctors text first), 10 free bubbles then a demo VIP paywall.

## Stack

- Next.js 16 (App Router) + TypeScript, `src/` dir, alias `@/*` -> `./src/*`
- Tailwind CSS **v4** · **p441z style kit** (`src/components/ui`, `src/components/effects` are vendored verbatim)
- Supabase: Auth (email + password), Postgres with RLS, Realtime (messages), Storage (`avatars` bucket)
- Icons: `@phosphor-icons/react` only (use `/dist/ssr` in Server Components). Toasts: `sonner`.

---

## Design rules: follow these strictly

### Monochrome surfaces
All surfaces are **pure greyscale**. The only rebrand is `--primary` / `--ring` (deep rose) in `globals.css`.
Color appears elsewhere only as status pills (`<StatusPill>`), `bg-{color}-500/10 text-{color}-500 border-{color}-500/20`.

### Use the kit's components
| Need | Use |
|---|---|
| Button / link-as-button | `<Button>` (`asChild` for links) |
| Page title | `<PageHeader>` |
| Surface | `<Card>` |
| Filter, view switcher | `<PillTabs>` (or `ChoiceTabs` inside forms) |
| Loading | `<Skeleton>` in `loading.tsx`, mirroring the real layout |
| Tag | `<Badge>` · Status -> `<StatusPill>` |
| Dialog | `<Modal>` (native `<dialog>`) |
| Doctor photo | `<DoctorPhoto>` (handles the fallback; never render a doctor without a photo) |

### Typography (skill-typography)
Use role sizes: `text-caption`, `text-body-sm`, `text-body`, `text-lead`, `text-h5`, `text-h4`, `text-h3`.
No `text-[13px]`-style arbitrary sizes. Numbers get `tabular-nums`; IDs/STR get `font-mono`. Spec: `docs/typography.md`.

### Copy (skill-ui-ux)
No em dashes or en dashes in visible text. Emojis only inside joke copy and chat, never as UI icons.

### Entrance animation
Wrap every page body in `<BlurFade>`. `inView` below the fold. Stagger lists with `delay={i * 0.05}`.

### Spacing
```
mb-6   page header -> content
mt-10  between major sections
p-6    card padding (p-5 dense)
gap-5  card grids
h-9    control height
```

### Tailwind v4 syntax
`outline-hidden` · `shadow-xs`/`shadow-sm` · `bg-linear-to-r` · `shrink-0`. Tokens are bare HSL triplets.

---

## Project conventions

- Game rules live in the database (`supabase/migrations/*.sql`, applied in order): Bumble protocol + 10-bubble quota are triggers, swipes/matches go through RPCs. The UI mirrors them but never replaces them.
- The browser client may only do what RLS allows. The service_role key is used ONLY by `scripts/seed.mjs`, never imported in `src/`.
- Next.js 16: `middleware` is now `src/proxy.ts`; `params` / `cookies()` are async. Read `node_modules/next/dist/docs/` before using an API you are unsure of.
- Safety: chat photos live in the PRIVATE `chat-media` bucket (signed URLs); exact user coordinates are never readable by other users (only `distance_to` / `get_candidates` distances).
- `npm run db:seed` only ADDS missing bots. Never delete bots in a live project: matches and chats cascade.
- `cacheComponents` is OFF on purpose (cookie-based Supabase auth on every app route).

## Commands

```bash
npm run dev      # dev server
npm run build    # production build, must pass before "done"
npm run lint
npm run db:seed  # 420 bot doctors (needs the schema first)
```

## Before reporting a task complete

- [ ] `npm run build` and `npm run lint` pass
- [ ] No hardcoded hex or colored surfaces
- [ ] Page bodies wrapped in `<BlurFade>`, pages open with `<PageHeader>`
- [ ] No hand-rolled components where a kit one exists
- [ ] Dark mode checked
