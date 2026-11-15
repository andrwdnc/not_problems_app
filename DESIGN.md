---
name: Nest
description: Shared household finances for two people — mobile-first PWA
colors:
  brand-navy: "#0F172A"
  brand-primary: "#2563EB"
  brand-sky: "#60A5FA"
  brand-pale: "#EFF6FF"
  brand-bg: "#F8FAFC"
  brand-surface: "#FFFFFF"
  brand-ink: "#0F172A"
  brand-muted: "#56687A"
  brand-border: "#E2E8F0"
  financial-positive: "#10B981"
  financial-positive-bg: "#ECFDF5"
  financial-negative: "#EF4444"
  financial-negative-bg: "#FEF2F2"
  financial-amber: "#F59E0B"
typography:
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  mono:
    fontFamily: "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.brand-surface}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.brand-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.brand-surface}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  chip:
    backgroundColor: "{colors.brand-surface}"
    textColor: "{colors.brand-muted}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
---

# Design System: Nest

## Overview

**Creative North Star: "El cuaderno de cuentas"**

Nest is a calm, trustworthy ledger for two people sharing a household. The
interface reads like a well-kept notebook: ordered, legible, and never
showy. Density is comfortable for one-handed phone use; every figure is
monospaced so columns align and numbers stay auditable. Color is used
sparingly and with meaning — brand blue for actions and "contributed",
coral for "spent", green for "available", amber only for the grace window.

**Key Characteristics:**

- Mobile-first, single column, 390–430 px base width.
- Rounded cards (`rounded-2xl`/`rounded-3xl`) on a soft blue-gray background.
- Monospaced numerals everywhere money appears.
- Color reserved strictly for financial meaning; never decoration.
- Bottom navigation bar with 4 destinations; floating action button for new
  expenses.

## Colors

A restrained palette: one brand blue for actions, a soft blue-gray canvas, and
three semantic financial colors.

### Primary
- **Deep Navy** (#0F172A): headers, card titles, navigation bar background.
- **Trust Blue** (#2563EB): primary buttons, "contributed" figures, active
  nav item, links.
- **Sky Blue** (#60A5FA): secondary accents and focus rings.

### Neutral
- **Pale Blue** (#EFF6FF): soft backgrounds, inactive chips, icon tiles.
- **Canvas** (#F8FAFC): app background.
- **Surface** (#FFFFFF): cards and containers.
- **Ink** (#0F172A): primary text.
- **Muted** (#56687A): secondary text, labels, captions.
- **Border** (#E2E8F0): soft borders and dividers.

### Financial (semantic — never decoration)
- **Positive** (#10B981) / **Positive Bg** (#ECFDF5): money available, savings,
  paid state.
- **Negative** (#EF4444) / **Negative Bg** (#FEF2F2): money spent, deficit.
- **Amber** (#F59E0B): grace window "editable until day 5".

### Named Rules
**The Reserved Color Rule.** `financial.positive` and `financial.negative` are
used only for financial meaning. Never as general decoration.

## Typography

**Display Font:** system-ui stack (with `sans-serif` fallback)
**Body Font:** system-ui stack (with `sans-serif` fallback)
**Mono Font:** ui-monospace / JetBrains Mono (with `Menlo, monospace` fallback)

**Character:** A system sans-serif for readability and zero font-loading cost on
mobile; a monospaced face exclusively for money so columns align and figures stay
auditable.

### Hierarchy
- **Display** (700, 1.5rem, 1.2): screen titles and hero figures.
- **Title** (600, 1.125rem, 1.3): section headers.
- **Body** (400, 1rem, 1.5): default text, max ~75ch for readability.
- **Label** (500, 0.875rem, 1.4, uppercase tracking-wide): category chips,
  captions, muted labels.
- **Mono** (600, 1rem, 1.2, tabular-nums): every monetary figure.

### Named Rules
**The Tabular Rule.** All money uses `font-mono` with tabular numerals. A
figure that is not monospaced is a bug.

## Layout

Single column, `max-w-md` (448 px) centered, with `px-4` side padding. Spacing
rhythm follows Tailwind's 4 px scale (4/8/16/24/32). Cards stack vertically with
`gap-2`/`gap-4`. The bottom navigation bar is fixed and publishes its content
height as `--bottom-nav-altura` so the floating action button can offset itself.
Safe-area insets are respected for standalone PWA launch.

Responsive: mobile-first; on wider screens the column simply stays centered. No
breakpoint-specific layouts exist beyond the single column.

## Elevation & Depth

Flat by default. Cards are flat surfaces (`shadow-sm`) on a soft blue-gray
canvas; depth is conveyed by color layering (surface on background) rather than
shadows. Shadows appear only as state response: dialogs (`shadow-xl`), the
floating action button (`shadow-lg`), and hover elevation on cards.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Elevation is a response
to state (hover, modal, floating), never the default.

## Shapes

Rounded, friendly geometry. Cards use `rounded-2xl` (16 px) or `rounded-3xl`
(24 px); buttons and inputs use `rounded-xl` (12 px); chips and badges are
`rounded-full`. No sharp corners anywhere in the UI. Borders are thin and soft
(`border-brand-border`).

## Components

### Buttons
- **Shape:** `rounded-xl`, full-width on forms.
- **Primary:** Trust Blue background, white text, `px-4 py-3`, semibold.
- **Secondary/Ghost:** surface background with border, muted text.
- **Hover/Focus:** color shift + opacity; focus via border color.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (16 px).
- **Background:** Surface white on Canvas.
- **Shadow Strategy:** `shadow-sm` at rest; `shadow-xl` for dialogs.
- **Internal Padding:** 16 px (`p-4`).

### Inputs / Fields
- **Style:** surface background, `rounded-xl`, `border-brand-border`, `px-4 py-3`.
- **Focus:** border shifts to Trust Blue.
- **Error:** coral text on soft coral background.

### Chips
- **Style:** `rounded-full`, `px-4 py-2`, border on unselected.
- **State:** selected = primary fill + white text; unselected = surface + muted.

### Navigation (BottomNav)
- **Style:** fixed bottom bar, 4 items, icon + 11 px label.
- **Active:** Trust Blue, thicker stroke; inactive: Muted.

### Dialogs (ConfirmDialog)
- **Style:** `rounded-3xl`, `shadow-xl`, max-width `sm`, centered overlay.

## Do's and Don'ts

### Do:
- **Do** use `font-mono` with tabular numerals for every monetary figure.
- **Do** keep `financial.positive`/`financial.negative` strictly for financial meaning.
- **Do** enforce immutability and permission rules on the server, not just in the UI.
- **Do** center the mobile column (`max-w-md`) and respect safe-area insets.
- **Do** derive the owner from the session in the individual area.

### Don't:
- **Don't** use financial colors as general decoration.
- **Don't** introduce a second percentage or a per-user budget in the joint account.
- **Don't** let the apartado/devengo (removed) reappear: payments are reminders, not accruals.
- **Don't** hardcode user-facing strings; use `src/literals/`.
- **Don't** skip the grace-window rules when editing past months.