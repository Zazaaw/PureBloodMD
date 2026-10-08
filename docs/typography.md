# Type spec sheet: PureBloodMD

**Kind:** scanning (deck, chat) + light persuading (landing)   **Devices:** phone-first, desktop too
**Scripts:** Latin + Latin-ext (Indonesian names)   **Data-heavy:** light (timers, counters, distances, STR numbers)

## Families
| Role | Family | Weights | Features | License | Delivery |
|---|---|---|---|---|---|
| UI / body / display | Plus Jakarta Sans (variable) | 400 / 500 / 600 / 700, 800 display only | `tabular-nums` on numbers | SIL OFL | `next/font/google`, latin + latin-ext, `--font-jakarta` |
| Mono | JetBrains Mono | 400 / 600 | `tabular-nums` | SIL OFL | `next/font/google`, latin, `--font-jetbrains` |

Stack: `"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
Why: the style kit mandates Plus Jakarta Sans; it is warm enough for a dating app and clean at 14-16px.
Runner-up: Inter, too neutral for a consumer brand.

## Scale
Base 16px, ratio phi = 1.618, half-steps (sqrt phi = 1.272) plus the body-sm quarter step.
Tokens carry 3-decimal rem; px is documentation only. Rhythm unit = 1.618rem (`mt-rhythm`).

| Token (`text-*`) | Exact px | rem | Role | Remapped default |
|---|---|---|---|---|
| caption / overline | 12.58 | 0.786 | timestamps, helper, labels, pills | `text-xs` |
| body-sm | 14.19 | 0.887 | chat bubbles, list rows, form labels | `text-sm` |
| body | 16.00 | 1.000 | paragraphs, inputs | `text-base` |
| lead | 20.35 | 1.272 | intro paragraphs, dialog titles | `text-lg`, `text-xl` |
| h5 | 25.89 | 1.618 | card name, auth titles | `text-2xl` |
| h4 | 32.93 | 2.058 | page title (PageHeader), landing sections | `text-3xl` |
| h3 | 41.89 | 2.618 | landing hero (phone) | `text-4xl` |
| h2 | 53.28 | 3.330 | landing hero (tablet) | `text-5xl` |
| h1 | 67.78 | 4.236 | landing hero (desktop) | `text-6xl` |

## Roles
| Role | Size | Weight | Line-height | Tracking | Max width | Color |
|---|---|---|---|---|---|---|
| Hero headline | h3 -> h2 -> h1 | 800 | 1.15 -> 1.05 | -0.02 to -0.025em | 16ch | foreground |
| Page title | h4 | 700 | 1.2 | -0.015em | none | foreground |
| Doctor name (card) | h5 | 700 | 1.25 | -0.01em | truncate is NOT used on the full name row | white on scrim |
| Body | body | 400 | 1.618 | 0 | 65ch | foreground |
| Lead | lead | 400 | 1.5 | 0 | 52ch | muted-foreground |
| Chat bubble | body-sm | 400 | 1.5 | 0 | 80% of column | foreground / primary-foreground |
| Label | body-sm | 500 | 1.5 | 0 | none | foreground |
| Overline | caption | 600 | 1.3 | +0.08em, uppercase | none | muted-foreground |
| Caption | caption | 400 | 1.4 | 0 | 50ch | muted-foreground |
| Numbers (timer, km, bubbles, STR) | caption-body | 400-600 | inherit | tabular-nums, mono | none | inherit |

## Loading
`next/font` self-hosts both families with metric-matched fallbacks (no layout shift). `font-synthesis: none` is set globally.

## Accessibility
Muted text uses the kit token (45.1% light / 63.9% dark), both above 4.5:1. Rose primary passes 4.5:1 with its label in both themes.
`text-wrap: balance` on headings, `pretty` on paragraphs. All sizes in rem.

## Exceptions
- Kit components keep their default Tailwind class names (`text-sm`, `text-3xl`); the defaults are remapped onto the phi scale in `globals.css`, so there is still only one scale.

Dibuat oleh Faiz Hazim Hawari · skill-typography
