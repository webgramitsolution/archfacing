# ArchFacing

A B2B marketplace for India's architecture, interior design and building
materials industry.

> Concept: Architect Yudhveer Singh · Copyright Reg. **L-92657/2020**
> "We the Designa and Designi"

---

## What is built

### Phase 0 ✅ — Foundation

| | |
|:---:|---|
| ✅ | Next.js 15 + TypeScript + Tailwind |
| ✅ | PostgreSQL 17 (local, in `.postgres/`) |
| ✅ | Prisma schema — **27 tables** |
| ✅ | PACT partial unique index (the guard against race conditions) |
| ✅ | Full taxonomy from the PDF seeded (**203 categories**) |
| ✅ | Permission matrix (PDF §7.4) expressed as config |
| ✅ | Header, footer and homepage, with the official logo |
| ✅ | Super Admin account |

### Phase 1 ✅ — Registration and login

| | |
|:---:|---|
| ✅ | **Email OTP** over Hostinger SMTP (mobile OTP comes later) |
| ✅ | Three-step registration wizard — Email → Verify → Details |
| ✅ | A separate profile form for each of the five roles |
| ✅ | COA validation, mandatory for a Designa architect (§3.1.8.1.1) |
| ✅ | Cascading select for the 24 Consultant sub-categories |
| ✅ | One `/login` for everyone — email code or password, redirected by role |
| ✅ | Dashboard shells for all seven roles, with PDF section references |
| ✅ | Rate limiting, hashed OTPs, timing-safe comparison |
| ✅ | **17 security tests** — `pnpm test:otp` |

### Phase 2 ✅ — PACT engine

| | |
|:---:|---|
| ✅ | **19,238 Indian PIN codes** (GeoNames) across 36 states |
| ✅ | Seat availability keyed on `(pincode, serviceType, subCategory)` |
| ✅ | 15-minute reservation, released automatically if payment does not arrive |
| ✅ | A 10-year term; the seat reopens once it expires |
| ✅ | **Payment abstraction** — mock today, Razorpay ready to drop in |
| ✅ | Invoices generated with GST (`AF/2026/000001`) |
| ✅ | Cessation cron — 30 days of silence or 5 complaints (§3.1.8.5) |
| ✅ | Expiry reminders at 90, 30 and 7 days |
| ✅ | A PACT purchase screen and a seat map for the whole PIN code |
| ✅ | **65 tests** — ten people racing for one seat, and only one gets it |

### Phase 3 ✅ — Content system

| | |
|:---:|---|
| ✅ | Six posting types — Projects, Products, Around Us, Artistry, Blog, Competition |
| ✅ | **Video is a YouTube or Dailymotion link**, not an upload |
| ✅ | Image upload — magic-byte checks, EXIF stripping, 5:3 / 16:9 (§7.10.1) |
| ✅ | Storage quota (§4.4) — a full account is pointed at Portal Space |
| ✅ | **Storage abstraction** — local disk today, R2 ready |
| ✅ | §7.4.1 matrix enforced — a BMF never even sees the Projects pages |
| ✅ | Public listings with filters (year, state, category, sub-category) |
| ✅ | Detail pages with SEO metadata, og:image and a lazy video embed |
| ✅ | Admin moderation — approve or reject with a reason |
| ✅ | **93 tests** — fake `.jpg` files and domain spoofing are both stopped |

### Phase 4 ✅ — Consult Nearby and the header

| | |
|:---:|---|
| ✅ | **Lead routing** — an enquiry goes straight to that PIN code's PACT holder |
| ✅ | If there is none, the nearest holder within 50 km; then the RM Employee queue |
| ✅ | A suspended PACT receives no leads (§3.1.8.5) |
| ✅ | Replying resets the cessation timer automatically |
| ✅ | My Enquiry (received) and My Consultation (sent) — §5.2.11, §5.2.12 |
| ✅ | RM Employee dashboard — assign UNROUTED leads by hand |
| ✅ | **Mega-menu header** from the mockup, with 14 columns under Projects |
| ✅ | Projects taxonomy completed — **14 categories, 111 sub-categories** |
| ✅ | Public **PACT page** — seat finder and state-wise browsing |
| ✅ | **31 tests**, including the 50 km boundary and the UNROUTED fallback |

### Phase 5 ✅ — Admin panel and a new design

| | |
|:---:|---|
| ✅ | **A new design system** — the mockup's vivid orange, rounded cards, icons |
| ✅ | Membership dropdown — Designers Associates, PIN Code PACT, Club |
| ✅ | **Creating an Employee** — email + password, entering through the same /login |
| ✅ | An RM Employee can be given a territory by state or PIN code |
| ✅ | Password reset, and suspend / activate |
| ✅ | **User verification** — checking the COA before activating an account (§3.1.8.1) |
| ✅ | Sending an application back with a reason, delivered by email |
| ✅ | Admin PACT view — which territories sold, and for how much |
| ✅ | An audit log for every admin action — who, when, what |
| ✅ | **29 tests** |

### Phase 6 ✅ — Commerce

| | |
|:---:|---|
| ✅ | **Merchandise store** — variants, stock, GST, low-stock warnings |
| ✅ | Cart → checkout → order, on the same payment abstraction |
| ✅ | **Stock race protection** — ten buyers, three items, stock never goes negative |
| ✅ | Cancelling an order returns stock to the correct variant |
| ✅ | Free shipping above ₹1,500 |
| ✅ | **Admin-Seller panel** — posting Merchandise and Podcasts |
| ✅ | Order management — packed → shipped → delivered, with a tracking number |
| ✅ | An order cannot move backwards (SHIPPED never returns to PAID) |
| ✅ | The buyer's orders page, with progress |
| ✅ | **Podcast** listings with YouTube/Dailymotion thumbnails |
| ✅ | **30 tests** |

### Phase 7 ✅ — Design Associate and two replica pages

| | |
|:---:|---|
| ✅ | **Designers Associates page** — an exact replica of your mockup |
| ✅ | **Merchandise page** — an exact replica of the second mockup |
| ✅ | 36 SVG illustrations drawn (replaceable with real photographs) |
| ✅ | "Use My Location" — the nearest PIN code from the browser's coordinates |
| ✅ | **The DA 80/20 split** — the two shares always add back to the exact total |
| ✅ | DA email addresses follow §8.2 — `yudhveer110005@gmail.com` |
| ✅ | No invoice can be raised without KYC (§3.1.7.9) |
| ✅ | Invoiced on the 1st, payable by month end (§3.1.7.6) |
| ✅ | Late invoices become OVERDUE automatically |
| ✅ | **38 tests** |

### Phase 8 ✅ — Legal pages and launch preparation

| | |
|:---:|---|
| ✅ | **All seven legal pages** — Privacy, Terms, Refund, Cookies, About, Contact, Need Help |
| ✅ | Each with a hero — title on the left, image on the right, the same image blurred behind |
| ✅ | Fully formatted content — H2, H3, bullets, numbered lists, tables |
| ✅ | An "On this page" list on the right, jumping to any section |
| ✅ | 8 hero illustrations drawn |
| ✅ | **The rules come from config** — change 15 days or 25% and the page changes too |
| ✅ | `sitemap.xml` — published postings are added automatically |
| ✅ | `robots.txt` — admin, dashboard and api are closed |
| ✅ | Launch checklist ([docs/06](docs/06-LAUNCH-CHECKLIST.md)) |
| ✅ | **59 tests** |

### Phase 9 ✅ — Memberships, storage, advertising and English

| | |
|:---:|---|
| ✅ | **The whole site is now in English** — every page, form, email and error |
| ✅ | **Full-width layout** — 15px of padding on each side, on every device |
| ✅ | **Club Membership** — four plans, public page and dashboard |
| ✅ | Renewing early adds to the end of the term; no paid day is ever lost |
| ✅ | A Design Associate gets 10 years free, granted at approval (§3.1.7.10.1) |
| ✅ | **Portal Space** — extra storage in packs, 5-year term, non-refundable |
| ✅ | The quota is returned once a pack ends — published files are never deleted |
| ✅ | **Advertisements** — six placements, weekly pricing, slot availability |
| ✅ | Paying does not publish an ad; it still goes through admin review (§7.4.6) |
| ✅ | **Memberships hub** comparing all three routes side by side |
| ✅ | **Admin Category CRUD** (§7.11.1.1) and **Site Settings** (§7.11.1.9) |
| ✅ | **97 tests** — including ten advertisers racing for two slots |

### Phase 10 ✅ — ArchFacing Club

| | |
|:---:|---|
| ✅ | **Menu cleaned up** — Home, PACT and Club off the top bar; PACT and Club live in the Membership dropdown |
| ✅ | **Club landing page** — built to the supplied design |
| ✅ | **Single event page** — hero, overview card, tabs, speakers, agenda, venue, sponsors, FAQs |
| ✅ | Five events seeded with speakers, agendas and FAQs |
| ✅ | **Real photography** — Unsplash, every image checked before it was assigned |
| ✅ | Membership plans match the design — Basic ₹999 · Professional ₹2,499 · Premium ₹4,999 |
| ✅ | Pricing tiers — Early Bird / Standard / Spot, exactly one live at a time |
| ✅ | Seats remaining with a live percentage, green → amber → red |
| ✅ | Gold-on-navy Club identity, kept separate from the site orange |
| ✅ | Working newsletter sign-up (it used to be a dead form) |
| ✅ | Club events join `sitemap.xml` automatically |
| ✅ | **77 tests** |

### Phase 11 ✅ — Blog, Podcast and SEO breadcrumbs

| | |
|:---:|---|
| ✅ | **Blog index** — built to the supplied design |
| ✅ | **Single article** — numbered sections, icon grid, image grid, benefit pills, pull-quote |
| ✅ | **Podcast page** — hero player, topic tiles, episode grid, guests, platforms |
| ✅ | Single episode page, and a single-article page with prev/next |
| ✅ | **Breadcrumbs kept for SEO but hidden from sight** — sr-only + BreadcrumbList JSON-LD |
| ✅ | 12 articles and 6 episodes seeded, with real authors and verified profiles |
| ✅ | Article bodies are typed blocks — a malformed one is dropped, never fatal |
| ✅ | Podcast added to the top bar; Home, PACT and Club still absent |
| ✅ | Newsletter form gained a light variant for the blog sidebar |
| ✅ | **87 tests** |

### Phase 12 ✅ — Artistry, Projects and the auth fix

| | |
|:---:|---|
| ✅ | **Artistry mega-menu** — five groups, bordered columns, line-art illustration |
| ✅ | **Artistry single page** — 15-frame gallery, specs, artist card, 12 comments |
| ✅ | **Projects listing** — hero stats, category strip, full filter sidebar, grid/list, pagination |
| ✅ | **Project detail** — gallery, key features, testimonials, seller, brand strip |
| ✅ | **Auth ClientFetchError fixed** — the unused SessionProvider is gone |
| ✅ | **The `?next=` login redirect now works** — six pages were silently dropping it |
| ✅ | Open-redirect guard on that redirect — 23 tests |
| ✅ | Filters and pagination work with no client JS at all |
| ✅ | 13 projects and 9 artworks seeded, with real architect profiles |
| ✅ | **23 tests** |

**All twelve phases are complete.** Run through the
[checklist](docs/06-LAUNCH-CHECKLIST.md) once before going live.

---

## The header

Two bars, as in the mockup:

```
Top    : logo · city · search · Get Best Price · Dashboard/Notifications/Help · account
Bottom : Projects · Products · Around Us · Artistry · Blog ·
         Consult Nearby · Membership · Merchandise · Advertisement

Under the Membership dropdown : Designers Associates · PIN Code PACT · Club Membership
```

Home, PACT and Club are deliberately not top-level: Home is the logo's job,
and PACT and Club sit under Membership rather than being listed twice.

The items that open a mega-menu (Projects, Products, Around Us, Artistry,
Blog, Consult Nearby, Membership) take their categories straight from
`src/config/taxonomy.ts` — change it in one place and the menu, the posting
forms and the search filters all change together.

Typing a six-digit PIN code into the top search goes directly to Consult Nearby.

---

## Layout

Every page runs the full width of the window with exactly **15px** of padding
on each side, on phones as well as desktops. There is one class for this, so
the padding can be changed everywhere at once:

```css
.container-af { @apply mx-auto w-full px-[15px]; }
```

Use `container-af` for any page container. Do not reach for `mx-auto max-w-*`
— that is what made the pages narrow before.

---

## How video works

Instead of uploading an MP4, only a **link** is taken — YouTube or Dailymotion.

| Benefit | |
|---|---|
| Storage | Not a single MB is used |
| Bandwidth | YouTube and Dailymotion carry it |
| Quality | Their own adaptive streaming |
| The limit | The PDF's 20 MB cap barely fits one minute of video |

All of these forms work:

```
youtube.com/watch?v=ID    youtu.be/ID       youtube.com/shorts/ID
youtube.com/embed/ID      youtube.com/live/ID
dailymotion.com/video/ID  dai.ly/ID         dailymotion.com/embed/video/ID
```

Vimeo, direct `.mp4` files, spoofed domains (`youtube.com.evil.com`) and
`javascript:` are all rejected. Embedding runs through
`youtube-nocookie.com`, so a viewer gets no tracking cookie.

---

## Adding Razorpay later

**Mock payments** are running today — no real money is taken, but the full
flow (reserve → payment → activate) behaves exactly as the real one will.

Once the Razorpay account exists, fill in three keys in `.env`:

```bash
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="xxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxx"
```

That is all. The app leaves the mock behind and switches to Razorpay on its
own — no code changes. Add the webhook in the Razorpay dashboard too:

| | |
|---|---|
| URL | `https://archfacing.com/api/payments/webhook` |
| Events | `payment.captured`, `payment.failed`, `refund.processed` |

> **A safety measure:** with `NODE_ENV=production` and no keys present, the
> app refuses to start. That is deliberate — a mock provider running in
> production would hand out free PACTs, and PACT is what this platform earns from.

---

## Nightly maintenance

Releasing held seats, expiring terms, cessation checks, reminders, closing
finished advertisements and reclaiming expired Portal Space all run from one
endpoint:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://archfacing.com/api/cron/pact
```

Set it in Hostinger hPanel → **Cron Jobs** for 2 AM daily:

```
0 2 * * *
```

If `CRON_SECRET` is empty the endpoint stays closed (401).

---

## Setting up Hostinger SMTP

OTPs are printed to the terminal today (dev mode). To send real email:

1. Hostinger hPanel → **Emails** → create a mailbox
   (for example `noreply@archfacing.com`)
2. Fill in `.env`:

```bash
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="noreply@archfacing.com"
SMTP_PASS="your mailbox password"
EMAIL_FROM="ArchFacing <noreply@archfacing.com>"
```

3. Restart the dev server

While `SMTP_USER` is empty the code keeps appearing on screen and in the
terminal, so the whole registration flow can be tested without SMTP.

> **Mobile OTP** comes after the website is finished. The schema is already
> ready — `OtpRequest.channel` has an `SMS` value and `User.mobile` is
> optional for now. Only a provider needs to be added.

---

## Running it

Everything is set up. Two commands a day:

```bash
pnpm pg:start
```

```bash
pnpm dev
```

Then open → **http://localhost:3000**

> If the browser will not connect (`ERR_CONNECTION_REFUSED` or similar), try
> **http://127.0.0.1:3000**. On some Windows setups `localhost` resolves to
> IPv6 (`::1`) first, where nothing is listening.

To stop:

```bash
pnpm pg:stop
```

### First login

| | |
|---|---|
| URL | http://localhost:3000/login |
| Email | `admin@archfacing.com` |
| Password | `ChangeMe@123` |

> ⚠️ This password is in `.env`. Change it before production.

---

---

## Why the dev server feels slow

`pnpm dev` renders every page from scratch on every request, in React's
development build, with no caching. That costs roughly a second before any of
your own code runs. It is not the database and it is not the code — measured
here, the whole home page's worth of queries takes **106ms**.

Same pages, same machine:

| Page | `pnpm dev` | `pnpm preview` (production) |
|---|---|---|
| `/` | 2.48s | **0.28s** |
| `/products` | 2.74s | **0.26s** |
| `/projects` | 3.26s | **0.15s** |
| `/blog` | 1.98s | **0.13s** |
| `/competition` | 1.78s | **0.13s** |

So: **never judge speed from `pnpm dev`.** To see what visitors actually get:

```bash
pnpm preview
```

That builds for production and serves it. This is also the number worth
optimising against — a slow page in `preview` is a real problem; a slow page
in `dev` usually is not.

A few notes on the numbers above:

- Even a page with **no database at all** (`/login`, `/legal/privacy`) takes
  1.0–1.7s in dev. That is the floor, and it is all framework overhead.
- `--turbopack` was measured and made **no difference to page render time**.
  It speeds up compilation and hot reload while you edit, which is worth
  having, so it is available as `pnpm dev:turbo` — but it will not make pages
  render faster.
- The first request to any page in dev is much slower still, because that is
  when the route compiles. The timings above are all warm.

## All commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (localhost:3000) |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm pg:start` | Start Postgres |
| `pnpm pg:stop` | Stop Postgres |
| `pnpm pg:status` | Is Postgres up? Prints the log tail if not |
| `pnpm db:migrate` | Create a new migration |
| `pnpm db:seed` | Reseed the categories |
| `pnpm db:studio` | Browse the database in a GUI |
| `pnpm db:reset` | ⚠️ Wipe everything and start over |
| `pnpm test` | Every test (650) |
| `pnpm test:otp` | OTP security (17) |
| `pnpm test:pact` | PACT engine (41), race condition included |
| `pnpm test:purchase` | The full purchase flow (24) |
| `pnpm test:video` | YouTube/Dailymotion links (32) |
| `pnpm test:content` | Permissions and uploads (42) |
| `pnpm test:e2e` | Post → moderation → public (19) |
| `pnpm test:routing` | Lead routing (31) |
| `pnpm test:admin` | Employees and verification (29) |
| `pnpm test:commerce` | Cart, stock, orders (30) |
| `pnpm test:da` | Design Associate 80/20 (42) |
| `pnpm test:legal` | Legal pages and SEO (59) |
| `pnpm test:phase9` | Club, Portal Space, Advertisements (97) |
| `pnpm test:club` | Club menu, events and pricing (77) |
| `pnpm test:content2` | Blog, Podcast and breadcrumbs (87) |
| `pnpm test:safenext` | ★ open-redirect guard on the login redirect (23) |
| `pnpm db:pincodes` | Load 19,238 PIN codes |
| `pnpm db:pricing` | Load PACT prices |
| `pnpm db:phase9` | Load club plans and ad placements |
| `pnpm db:club` | Load Club events, speakers and agendas |
| `pnpm db:content` | Load blog articles and podcast episodes |
| `pnpm db:artistry` | Load Artistry artworks, artists and comments |
| `pnpm db:projects` | Load Projects and architect profiles |

---

## Project layout

```
ArchFacing/
├─ docs/                      ← the whole plan (read this first)
│  ├─ 01-REQUIREMENTS.md          the full spec from the PDF
│  ├─ 02-ARCHITECTURE.md          technical decisions
│  ├─ 03-DATABASE-SCHEMA.prisma   the original copy of the schema
│  ├─ 04-ROADMAP.md               the phases
│  ├─ 05-DESIGN-SYSTEM.md         colours, sizes, components
│  └─ 06-LAUNCH-CHECKLIST.md      what to do before launch
│
├─ prisma/
│  ├─ schema.prisma           27 models · 8 migrations
│  ├─ seed.ts                 taxonomy + Super Admin
│  └─ seed-phase9.ts          club plans + ad placements
│
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx           fonts, metadata, SEO
│  │  ├─ page.tsx             homepage
│  │  ├─ (auth)/              login + registration wizard
│  │  │  ├─ actions.ts            ★ OTP and registration server actions
│  │  │  ├─ login/
│  │  │  └─ register/
│  │  ├─ (public)/            listings and detail pages (SEO)
│  │  │  ├─ club/                 Club landing, join, events
│  │  │  ├─ membership/           the three-route comparison hub
│  │  │  ├─ advertisements/       the public rate card
│  │  │  └─ legal/                the seven legal pages
│  │  ├─ dashboard/           dashboards for all seven roles, and posting forms
│  │  │  ├─ club/                 my membership
│  │  │  ├─ portal-space/         storage usage and packs
│  │  │  └─ advertisements/       book and track ads
│  │  ├─ admin/               moderation, users, PACT, categories, settings, ads
│  │  └─ api/                 Auth.js routes and the nightly cron
│  ├─ components/
│  │  ├─ logo.tsx             official logo (ImageKit)
│  │  ├─ form.tsx             Field, Input, Select, Steps
│  │  ├─ site-header.tsx      §6.1.1 menu
│  │  ├─ site-footer.tsx      §6.1.2 links
│  │  ├─ breadcrumb.tsx       ★ SEO-only trail — in the DOM, not on screen
│  │  ├─ page-hero.tsx        the full-width hero used on marketing pages
│  │  ├─ legal-page.tsx       the shared legal page layout
│  │  └─ dashboard-shell.tsx  sidebar + layout
│  ├─ config/
│  │  ├─ taxonomy.ts          ★ every category, from the PDF
│  │  ├─ permissions.ts       ★ the §7.4 matrix + business rules
│  │  ├─ dashboard-nav.ts     each role's menu (§5)
│  │  ├─ nav.ts               header + mega-menu (§6.1.1)
│  │  ├─ post-types.ts        the shape of the six posting types
│  │  ├─ portal-space.ts      the storage packs
│  │  ├─ club-media.ts        Unsplash photo ids for the Club
│  │  ├─ content-media.ts     Unsplash photo ids for Blog and Podcast
│  │  ├─ site-settings.ts     the settings the admin can edit
│  │  └─ states.ts            India's 36 states
│  └─ lib/
│     ├─ prisma.ts            DB client
│     ├─ auth.ts              auth + dashboardPathFor()
│     ├─ otp.ts               ★ sending and checking OTPs + rate limits
│     ├─ mailer.ts            Hostinger SMTP + email templates
│     ├─ pact.ts              ★ the PACT engine — seats, reserve, expire
│     ├─ video.ts             ★ YouTube and Dailymotion link parsing
│     ├─ enquiry.ts           ★ lead routing — finding the PACT holder
│     ├─ commerce.ts          ★ cart, stock, checkout
│     ├─ design-associate.ts  ★ DA — 80/20, invoices, KYC
│     ├─ club.ts              ★ Club Membership — terms that stack, free for DAs
│     ├─ portal-space.ts      ★ storage quota, 5-year packs, reclaim
│     ├─ ads.ts               ★ ad slots — overlap counting, review, serving
│     ├─ club-events.ts       ★ events — seats, pricing tiers, JSON parsing
│     ├─ content.ts           ★ blog + podcast — meta and block parsing
│     ├─ artistry.ts          ★ artworks — gallery, specs, comments
│     ├─ projects.ts          ★ projects — filters, facets, pagination
│     ├─ safe-next.ts         ★ open-redirect guard for ?next=
│     ├─ settings.ts          reads the admin-editable Site Settings
│     ├─ upload.ts            §7.10 rules + quota + EXIF stripping
│     ├─ storage/             local disk + R2 (chosen from env)
│     ├─ payments/            mock + razorpay (chosen from env)
│     ├─ guard.ts             server-side permission checks
│     └─ utils.ts             helpers
│
├─ tests/                     650 tests
├─ public/img/                47 SVG illustrations
├─ .data/                     PIN code source (not in git)
├─ .postgres/                 local DB (not in git)
└─ scripts/                   pg-start / pg-stop / image generators
```

---

## The two most important files

**`src/config/taxonomy.ts`** — every category from the PDF: Designa (8),
Designi (6), Consultants (24), Projects (111), Products (34) and so on. To
change anything, change it here and run `pnpm db:seed`.

**`src/config/permissions.ts`** — the §7.4 permission matrix, the PACT seat
rules (Designa 1, Designi 1, Consultant 24, BMF 1), the upload limits
(§7.10), and every business rule (10-year PACT, 25% refund cap, 80/20 DA
split).

---

## One important thing about PACT

A PACT seat is identified by `(pincode, serviceType, subCategory)` — not by
the PIN code alone. Its unique index in the database is **partial**:

```sql
CREATE UNIQUE INDEX pact_seat_taken_unique
  ON "Pact" (pincode, "serviceType", "subCategory")
  WHERE status IN ('RESERVED', 'ACTIVE');
```

The `WHERE` clause is essential. Without it an expired PACT would keep that
seat blocked forever. Do not turn this into a Prisma `@@unique`.

---

## Environment

`.env` already exists. These keys are filled in as you need them:

| Key | When it is needed |
|---|---|
| `AUTH_SECRET` | ✅ already set — session encryption |
| `SMTP_*` | now — while empty, the OTP appears in the terminal |
| `RAZORPAY_*` | when you have the account — payments |
| `R2_*` | optional — local disk is in use |
| `MSG91_AUTH_KEY` | later — mobile OTP |
