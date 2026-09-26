# ArchFacing — Before Launch

> Work through this list item by item before going to production.
> The items at the top are essential; the ones lower down can wait.

---

## 1. Essential — do not launch without these

### Payment gateway

**mock** is running right now — it takes no real money.

```bash
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="xxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxx"
```

Add the webhook in the Razorpay dashboard as well:

| | |
|---|---|
| URL | `https://archfacing.com/api/payments/webhook` |
| Events | `payment.captured`, `payment.failed`, `refund.processed` |

> The app deliberately **will not start** in production without the keys — that
> is a safeguard, not a bug. Otherwise everyone would get a free PACT.

### Email (SMTP)

Right now the OTP is printed in the terminal. For real email:

```bash
SMTP_USER="noreply@archfacing.com"
SMTP_PASS="the mailbox password"
```

Create the mailbox from Hostinger hPanel → Emails.

### The Super Admin password

`SEED_SUPERADMIN_PASSWORD` in `.env` is still `ChangeMe@123`.
**Change it immediately after the first login.**

### Secrets

```bash
AUTH_SECRET   # generate with npx auth secret
CRON_SECRET   # openssl rand -hex 24
```

Generate **fresh** ones for production — do not carry the dev values over.

### Database

- [ ] A real Postgres (Hostinger or managed) — `.postgres/` is for dev only
- [ ] Run `pnpm db:migrate` to apply all migrations
- [ ] `pnpm db:seed` for categories and the admin
- [ ] `pnpm db:pincodes` for the 19,238 PIN codes
- [ ] `pnpm db:pricing` for the PACT prices

---

## 2. Better to have in place

### File storage (R2)

Right now files go to the server's disk. That is fine, but bandwidth will get
expensive as traffic grows.

```bash
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="archfacing"
R2_PUBLIC_URL="https://cdn.archfacing.com"
```

The R2 host is added to `next.config.ts` automatically.

### Cron

Every night at 2 a.m. — Hostinger hPanel → Cron Jobs:

```
0 2 * * *  curl -H "Authorization: Bearer $CRON_SECRET" https://archfacing.com/api/cron/pact
```

It does four things: releasing held seats, expiring terms, checking cessation,
and sending expiry reminders.

### Backup

- [ ] A daily DB dump — keep at least 30 days
- [ ] A backup of `public/uploads/` (until R2 is in place)
- [ ] Once a month, do a restore to confirm the backup actually works

---

## 3. Real images

44 SVG illustrations are in use right now. When the real photos arrive, drop in
a file of the same name — the code will not change at all.

| Place | File |
|---|---|
| Professional cards | `public/img/pro/*.svg` |
| Profession categories | `public/img/pro/cat-*.svg` |
| Products | `public/img/product/*.svg` |
| Legal page heroes | `public/img/legal/*.svg` |
| Banners | `public/img/hero-*.svg` |

The names are in `scripts/gen-placeholders.mjs` and `scripts/gen-legal-images.mjs`.

---

## 4. Verify

```bash
pnpm typecheck   # should come back with 0 errors
pnpm build       # should pass
pnpm test        # all the tests
```

Check by hand too:

- [ ] Register as a Client and send an enquiry
- [ ] Register as a Professional, get verified, then take a PACT
- [ ] Submit a posting and have an admin approve it
- [ ] Buy some Merchandise and complete the order
- [ ] Create an Employee and log in through the same `/login`
- [ ] Open every page on mobile and look at it

---

## 5. Launch day

- [ ] Point the domain at the server
- [ ] Set up SSL (free with Hostinger)
- [ ] Set `NEXT_PUBLIC_APP_URL="https://archfacing.com"`
- [ ] Submit the sitemap to Google Search Console — `/sitemap.xml`
- [ ] Open `/robots.txt` and confirm admin and dashboard are blocked
- [ ] Confirm all three are green under "System health" in the admin panel

---

## 6. After launch

- [ ] Set up error monitoring (Sentry)
- [ ] Google Analytics or Plausible
- [ ] Bring 10–20 real professionals into the beta
- [ ] Sit with them and watch the registration and PACT flow
- [ ] Check the moderation queue daily for the first month

---

## Still outstanding

These are in the PDF but have not been built yet:

| What | PDF § | How far |
|---|---|---|
| Club Membership pages | 5.2.10 · 9.1 | schema ready, page pending |
| Buying Portal Space | 5.2.9 | schema ready, page pending |
| Advertisement booking | 7.4.6 | schema ready, page pending |
| Category CRUD (admin) | 7.11.1.1 | runs from the seed for now |
| Site settings (admin) | 7.11.1.9 | runs from config for now |
| Mobile OTP | 4.4 | email OTP is running |
| ArchFacing credit card | 9.3 | for the future |
| DIY TV channel | 9.12 | for the future |

The platform runs fully without these — PACTs sell, leads arrive, content gets
published and merchandise sells.
