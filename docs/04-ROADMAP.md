# ArchFacing — Build Roadmap

> Do not build the whole platform at once. These are 8 phases — after each phase
> something working will be visible. The biggest mistake in a first project is
> trying to build everything at the same time.

---

## Phase 0 — Foundations (3–5 days)

| # | Task |
|---|---|
| 1 | `npx create-next-app@latest` — TypeScript, Tailwind, App Router |
| 2 | `docker-compose.yml` — Postgres 16 + Redis |
| 3 | Prisma setup, copy `03-DATABASE-SCHEMA.prisma` and `migrate dev` |
| 4 | Auth.js — mobile OTP + password provider |
| 5 | Install shadcn/ui, base layout (header/footer) |
| 6 | Category taxonomy seed script (all the categories from the PDF) |

**Deliverable:** the site opens on localhost, the DB exists, a dummy login works.

> **Write the seed script first** — put all the categories from the PDF (Designa 8,
> Designi 6, Consultant 24, Projects 60+, Products) into one JSON file and load
> them into the DB. Every feature afterwards will depend on it.

---

## Phase 1 — Auth + Registration (1–1.5 weeks)

| # | Task |
|---|---|
| 1 | Mobile OTP flow (MSG91) + rate limiting |
| 2 | Multi-step registration wizard: `Mobile → OTP → Role → Basic → Profession → PACT → Payment` |
| 3 | A separate profile form for each role (Professional, Consultant, BMF, Corporate, Client) |
| 4 | Qualification form (10th → PhD) with certificate upload |
| 5 | A single `/login` that looks at the role and sends the user to the right dashboard |
| 6 | Client + Student — free registration path (payment skipped) |

**Deliverable:** all five kinds of user can register and reach their empty dashboard.

---

## Phase 2 — PACT Engine (1.5–2 weeks) ★ the most important

This is the heart of the platform — give it the most time and the most testing.

| # | Task |
|---|---|
| 1 | Import the PIN code master data for India (~19,000 pincodes + state/city) |
| 2 | **Check Availability API** — is the `(pincode, serviceType, subCategory)` seat free? |
| 3 | Seat rules: Designa 1, Designi 1, BMF 1, Consultant 24 |
| 4 | Reservation: 15-min TTL + DB unique constraint (partial index) |
| 5 | Razorpay order + webhook → `RESERVED` to `ACTIVE` |
| 6 | 10-year expiry, renewal reminders (90/30/7 days) |
| 7 | Transfer flow — with admin approval |
| 8 | Cessation cron — 30 days no response, 5 complaints |

**⚠️ Be sure to test:** two users buying the same PACT at the same moment — only one may get it.

**Deliverable:** a PACT can be bought, and nobody else can buy that same PACT again.

---

## Phase 3 — Content System (2 weeks)

| # | Task |
|---|---|
| 1 | Upload pipeline — R2/S3, MIME validation, image re-encode, thumbnails |
| 2 | Quota check — look at storage before uploading |
| 3 | One generic Post form component, with config per type |
| 4 | Projects, Products, Around Us, Artistry, Blog — posting forms |
| 5 | Enforce the permission matrix (§7.4.1) — BMF gets Blog + Competition only |
| 6 | Design Competition form (prize money, jury, deadline) |
| 7 | Around Us: free (Social Welfare) vs paid (Reporting) categories |
| 8 | Public listing pages + all the filters (year, state, category, sub-category) |
| 9 | Detail pages with SEO metadata |
| 10 | Edit Posting screen |

**Deliverable:** a Professional posts a project, it appears on the homepage and is found by filters.

---

## Phase 4 — Consult Nearby + Lead Routing (1 week)

| # | Task |
|---|---|
| 1 | Public "Consult Nearby" form — PIN + category + sub-category |
| 2 | Routing engine: find a PACT holder → if none, a nearby PIN → otherwise the admin queue |
| 3 | "My Enquiry" (received) and "My Consultation" (sent) screens |
| 4 | SMS + email notification to the holder |
| 5 | Response thread, status tracking |
| 6 | Complaint filing |

**Deliverable:** a Client sends an enquiry and it shows up in the right PACT holder's dashboard.

---

## Phase 5 — Admin Panel (1.5 weeks)

| # | Task |
|---|---|
| 1 | Super Admin dashboard — stats, PACT map, revenue |
| 2 | User management — verify, suspend, ban, KYC review |
| 3 | Content moderation queue (approve/reject with a reason) |
| 4 | Category CRUD + custom fields (§7.11.1.1–2) |
| 5 | **Employee management** — create email+password, assign territory |
| 6 | PACT management — manual assign, approve transfers, cessation |
| 7 | Payments + refunds (with the 25% cap enforced) |
| 8 | Site settings — header/footer/menu layout (§7.11.1.9, 12) |
| 9 | Audit log viewer |

**Deliverable:** an admin creates an employee, who logs in from the frontend and sees their dashboard.

---

## Phase 6 — Commerce (2 weeks)

| # | Task |
|---|---|
| 1 | **Admin-Seller panel** — Merchandise + Podcast posting |
| 2 | Merchandise catalogue, variants, cart, checkout |
| 3 | Order management, shipping status |
| 4 | Club Membership plans + purchase |
| 5 | Portal Space purchase (+5 years) |
| 6 | Advertisement panel — Corporate + External Advertiser, slot booking |
| 7 | Podcast player + episodes |

**Deliverable:** Merchandise can be bought and an ad slot can be booked.

---

## Phase 7 — Design Associate + Polish (1.5 weeks)

| # | Task |
|---|---|
| 1 | DA registration + KYC upload |
| 2 | Auto-generate the DA email convention (`name+pact@gmail.com`) |
| 3 | Monthly invoice generation (on the 1st of every month), 80/20 split |
| 4 | DA project coordination workflow |
| 5 | Notifications centre |
| 6 | Search optimisation (Meilisearch if needed) |
| 7 | Mobile responsive audit |
| 8 | Performance + security audit |

---

## Phase 8 — Launch

- [ ] Legal pages (Privacy, Cookies, Refund, T&C) — content from PDF §6.1.2.2
- [ ] Google Analytics + Search Console
- [ ] Sitemap + robots.txt
- [ ] Razorpay live mode
- [ ] Backup strategy (daily DB dump)
- [ ] Error monitoring (Sentry)
- [ ] Load test — 100 concurrent users
- [ ] Beta: onboard 10–20 real professionals

---

## Time estimate

| Phase | Alone | Team of 2–3 |
|---|---|---|
| 0–2 (Core + PACT) | 4–5 weeks | 2–3 weeks |
| 3–5 (Content + Admin) | 5–6 weeks | 3 weeks |
| 6–8 (Commerce + Launch) | 4 weeks | 2 weeks |
| **Total** | **~3.5 months** | **~2 months** |

---

## Advice — for a first project

1. **Put the most attention on PACT.** Everything else is ordinary marketplace
   functionality; PACT is what makes ArchFacing different. If its logic goes wrong,
   one territory gets sold to two people — fatal for the business.

2. **Keep payments mocked until Phase 3.** Stay in Razorpay test mode; go live later.

3. **Gather the PIN code master data first.** A CSV of every Indian pincode with
   district and state is available for free (India Post / data.gov.in). Without it
   PACT cannot be built.

4. **Deploy after every phase.** Do not deploy everything at once after 3 months —
   a great many problems will arrive together.

5. **Have content moderation from day one.** The PDF says the responsibility for a
   posting lies with the registrant, but legally you should be reviewing it too.
