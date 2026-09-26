# ArchFacing — Design System

> Based on the mockups you sent. Use these same tokens and components when
> building a new page — only then will the whole site look consistent.

---

## Colours

| Token | Hex | Where |
|---|---|---|
| `brand` | `#FF5722` | primary buttons, links, active nav, accent |
| `brand-hover` | `#E64A19` | button hover |
| `brand-soft` | `#FFF3EF` | icon chips, light bands |
| `navy` | `#16233A` | dark sections, admin header |
| `ink` | `#1A1D21` | headings |
| `ink-2` | `#4A5158` | body text |
| `ink-3` | `#7A838C` | meta, labels |
| `ink-4` | `#A8B0B8` | placeholder, disabled |
| `paper` | `#F7F8FA` | page background |
| `paper-2` | `#FFFFFF` | cards |
| `paper-3` | `#EFF2F6` | light fill |
| `line` | `#E4E8ED` | borders |
| `ok` / `warn` / `info` | green / yellow / blue | status pills |

**Rule:** orange is for emphasis in one place only — the whole page must not
turn orange. Use `ok/warn/info` for status, not the brand colour.

---

## Base measurements

| | |
|---|---|
| Card corner | `12px` (`rounded-card`) |
| Button corner | `8px` (`rounded-lg`) |
| Pill | fully round (`rounded-pill`) |
| Page width | `1200px` (`max-w-sheet`) |
| Card padding | `16–24px` |
| Between sections | `56–64px` (`py-14` / `py-16`) |

---

## Ready-made components

From `src/components/ui.tsx`:

```tsx
<Icon name="map" />                    // 26 icons, consistent stroke
<PageTitle eyebrow="…" title="…" />    // page heading
<SectionHead title="…" />              // section heading
<StatCard icon="users" value={12} label="…" />
<EmptyState icon="inbox" title="…" />
<Callout tone="warn" icon="alert">…</Callout>
<DataTable head={[…]}><Td>…</Td></DataTable>
```

From `src/components/form.tsx`:

```tsx
<Field label="…" name="…" required error={…}>
  <Input /> | <Select /> | <Textarea />
</Field>
<Button variant="primary|dark|outline|ghost" />
<Alert tone="error|info|success" />
<Steps steps={[…]} current={0} />
```

CSS classes (`globals.css`):

```
.card  .card-hover
.btn-primary  .btn-dark  .btn-outline  .btn-ghost
.input  .input-error
.chip-icon
.pill-brand  .pill-ok  .pill-info  .pill-warn  .pill-muted
.eyebrow  .tabular
```

---

## Typography

| Role | Font | Where |
|---|---|---|
| Display | **Archivo** 600–700 | headings, numbers |
| Body | **IBM Plex Sans** 400–600 | all text |
| Mono | **IBM Plex Mono** | PIN codes, invoice numbers |

Devanagari ships with IBM Plex Sans itself, so Indic and Latin script sit
together correctly.

**Sizes:** hero `52px` · page title `24px` · section `17px` ·
body `14px` · meta `12.5px`

---

## Card structure

The pattern from the mockup — icon chip, then title, then description:

```tsx
<Link className="card-hover group flex flex-col p-5">
  <span className="chip-icon mb-4 bg-brand-soft text-brand
                   group-hover:bg-brand group-hover:text-white">
    <Icon name="map" />
  </span>
  <h3 className="font-display text-[16px] font-bold">Title</h3>
  <p className="mt-3 text-[13.5px] text-ink-2">Description</p>
</Link>
```

---

## What not to do

- Do not put every label in the mono font — numbers and codes only
- Do not leave square corners — at least `8px`
- Do not spread orange around as a background
- Do not hard-code your own colours — use the tokens
- Do not draw new icons in a different style — add them to `ui.tsx`

---

## Header

Two bands:

```
top    : logo · city · search · Get Best Price · icons · account
bottom : Home · Projects · Products · Around Us · Artistry · Blog ·
         Consult Nearby · Merchandise · Advertisements · Membership ·
         Design Competition · Podcast
```

**Inside the Membership dropdown:** Designers Associates · PIN Code PACT · Club Membership

There are two kinds of dropdown:
- **mega** — columns of taxonomy (Projects has 14 columns, 126 links)
- **links** — a few links with an icon and a description (Membership)

Both are built from `src/config/nav.ts`. Categories come straight from
`taxonomy.ts` — change it in one place and the menu, forms and filters all change.
