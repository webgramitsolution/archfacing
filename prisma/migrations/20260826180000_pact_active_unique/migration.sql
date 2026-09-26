-- PACT seat exclusivity — PDF §3.1.8
--
-- "In any case archfacing is not sailing one PACT area with same services
--  to two persons."
--
-- ★ Prisma's @@unique applies to every row, which would let an EXPIRED/SUSPENDED
-- PACT block that very seat forever. We must block only when the seat is
-- genuinely occupied — that is, RESERVED or ACTIVE.
--
-- ⚠️ That is why the full unique index from Prisma is dropped and a partial index
-- is put in its place, BY HAND, here. NEVER turn this back into a Prisma @@unique
-- — a paid seat would be blocked forever.

DROP INDEX IF EXISTS "Pact_pincode_serviceType_subCategory_key";

CREATE UNIQUE INDEX "pact_seat_taken_unique"
  ON "Pact" ("pincode", "serviceType", "subCategory")
  WHERE "status" IN ('RESERVED', 'ACTIVE');

-- For sweeping up reservations that were left behind past their time
CREATE INDEX IF NOT EXISTS "pact_reservation_sweep"
  ON "Pact" ("reservedTill")
  WHERE "status" = 'RESERVED';
