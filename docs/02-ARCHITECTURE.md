# ArchFacing — System Architecture

## 1. Tech Stack (recommended)

This is your first project, it has dashboards for 9 roles, it takes payments, it
needs SEO, and later it needs a mobile app too. Given all of that:

| Layer | Choice | Why |
|---|---|---|
| **Frontend + Backend** | **Next.js 15** (App Router, TypeScript) | one codebase; SSR gets projects/products ranking on Google — essential for a marketplace |
| **Database** | **PostgreSQL 16** | proper transactions are needed for PACT seat locking; it supports JSON fields too |
| **ORM** | **Prisma** | type-safe, easy migrations, beginner-friendly |
| **Auth** | **Auth.js (NextAuth v5)** | both mobile OTP and email/password; role-based sessions |
| **File Storage** | **Cloudflare R2** (or AWS S3) | do not keep images/videos on the server — bandwidth is cheaper |
| **Payments** | **Razorpay** | the best option for India; UPI, cards, netbanking |
| **SMS OTP** | **MSG91** or Twilio | the first step of the registration flow |
| **Email** | **Resend** or AWS SES | transactional + notifications |
| **Search** | Postgres full-text (Phase 1) → **Meilisearch** (Phase 2) | the DB is enough to begin with |
| **Cache/Queue** | **Redis** + BullMQ | lead routing, email queue, PACT expiry jobs |
| **UI** | Tailwind CSS + shadcn/ui | dashboards get built quickly |
| **Hosting** | VPS (Hostinger/DigitalOcean) + Docker | you already have Hostinger |

### 1.1 Alternative — if you prefer PHP
If you are comfortable in PHP (a MySQL dump was visible in your Downloads), then
**Laravel 11 + Filament 3 + MySQL** is also a fine choice — Filament builds an admin
panel very quickly. But for SEO and the mobile app, Next.js will serve you better
in the long run.

---

## 2. Monorepo Structure

```
archfacing/
├─ apps/
│  ├─ web/                    # Next.js — public site + all dashboards
│  └─ admin/                  # (optional) a separate admin app, or /admin inside web
├─ packages/
│  ├─ db/                     # Prisma schema + migrations + seed
│  ├─ ui/                     # shared components
│  ├─ auth/                   # Auth.js config, RBAC helpers
│  └─ config/                 # constants, category taxonomy, upload rules
├─ docs/                      # these documents
└─ docker-compose.yml         # postgres + redis local dev
```

### 2.1 The internal layout of `apps/web`

```
src/app/
├─ (public)/                  # pages visible without logging in
│  ├─ page.tsx                       # Homepage — 3 banners + brand logos
│  ├─ projects/                      # + [slug], filters
│  ├─ products/
│  ├─ around-us/
│  ├─ artistry/
│  ├─ blog/
│  ├─ consult-nearby/                # PACT lead form ← the main conversion page
│  ├─ merchandise/                   # e-commerce
│  ├─ podcast/
│  ├─ membership/
│  ├─ advertisements/
│  └─ legal/                         # privacy, cookies, refund, about, contact
│
├─ (auth)/
│  ├─ login/                         # one login — redirects based on role
│  ├─ register/                      # multi-step wizard
│  └─ verify-otp/
│
├─ dashboard/                 # a different layout per role
│  ├─ client/
│  ├─ professional/                  # Designa + Designi
│  ├─ consultant/
│  ├─ bmf/
│  ├─ corporate/
│  ├─ design-associate/
│  └─ employee/                      # RM Employee
│
├─ admin/                     # Super Admin + Admin-Seller
│  ├─ users/  pact/  content/  employees/  payments/  settings/
│  └─ seller/                        # Merchandise + Podcast posting
│
└─ api/                       # route handlers (or Server Actions)
```

---

## 3. Role & Permission Model

### 3.1 Roles

```
SUPER_ADMIN          — everything
├─ ADMIN             — whatever permissions the Super Admin grants
├─ ADMIN_SELLER      — Merchandise + Podcast only
├─ RM_EMPLOYEE       — assigned leads/territories
│
├─ CLIENT            — free
├─ PROFESSIONAL      — designaType: DESIGNA | DESIGNI
│                      tier: PROFESSIONAL | LEGEND | INNOVATOR | STUDENT
├─ CONSULTANT        — 4 groups, 24 sub-categories
├─ BMF
├─ CORPORATE
└─ DESIGN_ASSOCIATE  — an add-on to PROFESSIONAL (not a separate role, it is a flag)
```

### 3.2 How the permission check will work

Do not write hard-coded `if (role === 'X')` — turn the matrix from PDF §7.4 into **data**:

```ts
// packages/config/permissions.ts
export const PERMISSIONS = {
  'post:project':      ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'],
  'post:product':      ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'],
  'post:around_us':    ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'post:artistry':     ['CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'post:blog':         ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'post:competition':  ['CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
  'pact:buy':          ['PROFESSIONAL', 'CONSULTANT', 'BMF'],
  'product:sell':      ['PROFESSIONAL', 'CONSULTANT', 'CORPORATE'],
  'ad:create':         ['CORPORATE', 'EXTERNAL_ADVERTISER'],
  'membership:buy':    ['PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE'],
} as const
```

The benefit: the table from the PDF is visible directly in the code, and when it
needs changing you change it in one place.

---

## 4. PACT Engine — the most delicate part

### 4.1 The seat allocation rule

One PACT seat = a unique combination of **(pincode, serviceType, subCategory)**.

| serviceType | seats/PIN | How |
|---|---|---|
| DESIGNA | 1 | subCategory = null |
| DESIGNI | 1 | subCategory = null |
| BMF | 1 | subCategory = null |
| CONSULTANT | 24 | 1 seat for each sub-category |

### 4.2 Guarding against the race condition — essential

Two people can try to buy the same PACT at the same moment. Therefore:

1. Put a **unique constraint** on the database:
   `UNIQUE (pincode, serviceType, subCategory) WHERE status = 'ACTIVE'`
2. Wrap the purchase in a single **transaction**, with `SELECT ... FOR UPDATE`
3. Create a **15-minute soft reservation** before payment (status = `RESERVED`)
4. Only go `ACTIVE` when the Razorpay webhook arrives — never rely on the frontend

```
The user presses "Check Availability"
  → the seat is free → RESERVED (15 min TTL)
  → Razorpay checkout
  → webhook: payment.captured → ACTIVE, expiresAt = now + 10 years
  → webhook: failed / TTL elapsed → drop the RESERVED
```

### 4.3 Lead Routing (the heart of Consult Nearby)

```
The client fills in the "Consult Nearby" form
  → picks PIN + service category + sub-category
  → the system looks for the ACTIVE holder of that PACT
      │
      ├─ found     → the Enquiry lands in their "My Enquiry" + SMS/email notification
      └─ not found → look at nearby PINs (fallback radius)
                     → or put it in the Admin queue → an RM Employee assigns it manually
```

### 4.4 Cessation automation

A cron job (BullMQ) should run daily and check:
- no enquiry response for 30 days → warning → then suspend
- 5 complaints accumulated → flag to the Design Cell
- `expiresAt` approaching → renewal reminder (90/30/7 days beforehand)

---

## 5. Content Model — one common pattern

Projects, Products, Around Us, Artistry, Blog — the structure of all of them is
nearly identical. So build a single `Post` table with a `type` enum, and keep the
type-specific fields in a JSON column. This gives you:

- one upload pipeline
- one moderation queue
- one filter engine (year, state, category, sub-category)
- one "Edit Posting" screen

```
Post
├─ type: PROJECT | PRODUCT | AROUND_US | ARTISTRY | BLOG | COMPETITION | PODCAST | MERCHANDISE
├─ status: DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED
├─ common: title, description, category, subCategory, pincode, state, city, year
├─ media: images[], video, pdf, ppt, youtubeUrl
└─ meta: JSON  ← type-specific fields
```

---

## 6. Storage Quota (Portal Spaces)

PDF §4.4 (VII): every registrant gets some **free space** to begin with, after which
it has to be bought. Portal space is valid for **5 years** and is non-refundable
(§6.1.2.2.6 IX).

```
User
├─ storageQuotaMb      (according to the plan)
├─ storageUsedMb       (updated on every upload)
└─ PortalSpacePurchase[]  → extraMb, purchasedAt, expiresAt (+5 years)
```

Check the quota before every upload; otherwise send the user to "Buy Portal Space".

---

## 7. Payments — Razorpay

A single `Payment` table handles everything:

| purpose | When |
|---|---|
| `PACT_PURCHASE` | buying/renewing a PACT |
| `REGISTRATION_FEE` | Corporate/BMF registration |
| `CLUB_MEMBERSHIP` | Club membership |
| `PORTAL_SPACE` | Extra storage |
| `MERCHANDISE_ORDER` | E-commerce |
| `ADVERTISEMENT` | Ad slot |
| `COMPETITION_ENTRY` | Design competition |
| `DA_INVOICE` | the DA's monthly 20% |

**Rules:**
- every payment must be idempotent (`razorpayOrderId` unique)
- verify the webhook signature — never trust the frontend callback alone
- keep a separate `refundedAmount` column for refunds (enforce the 25% cap)

---

## 8. RM Employee Flow (your requirement)

```
Super Admin → Admin Panel → Employees → "Add Employee"
   name, email, password, department, assigned PACT areas / states
        ↓
   A User is created with role = RM_EMPLOYEE, mustChangePassword = true
        ↓
The employee enters that same email+password at the frontend /login
        ↓
   The system looks at the role → redirects to /dashboard/employee
```

**In the Employee Dashboard:** assigned leads, follow-up status, the list of PACT
holders, the complaints queue, the activity log. The Super Admin should be able to
see every employee's performance.

---

## 9. Security Checklist

- [ ] MIME + magic-byte validation on all uploads (not just the extension)
- [ ] Re-encode images (strip EXIF, ImageMagick)
- [ ] Rate limit: OTP (3/hour/number), login (5/15min), enquiry form
- [ ] Razorpay webhook signature verification
- [ ] Re-check `session.role` on every Server Action — do not trust the client
- [ ] A DB-level unique constraint on PACT purchase (not just an application check)
- [ ] KYC documents encrypted at rest, visible only to the Super Admin
- [ ] Audit log: which admin changed what

---

## 10. Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=https://archfacing.com

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

MSG91_AUTH_KEY=
RESEND_API_KEY=
```
