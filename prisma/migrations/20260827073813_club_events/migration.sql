-- CreateEnum
CREATE TYPE "ClubEventType" AS ENUM ('SEMINAR', 'EXHIBITION', 'WEBINAR', 'NETWORKING', 'CONFERENCE', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "ClubEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClubRegistrationStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'ATTENDED');

-- CreateTable
CREATE TABLE "ClubEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ClubEventType" NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "heroImage" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "city" TEXT,
    "organizer" TEXT NOT NULL DEFAULT 'ArchFacing Club',
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "totalSeats" INTEGER NOT NULL,
    "seatsTaken" INTEGER NOT NULL DEFAULT 0,
    "earlyBirdPrice" DECIMAL(10,2),
    "earlyBirdTill" TIMESTAMP(3),
    "standardPrice" DECIMAL(10,2) NOT NULL,
    "spotPrice" DECIMAL(10,2),
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "audience" TEXT[],
    "includes" TEXT[],
    "highlights" JSONB,
    "sponsors" JSONB,
    "gallery" TEXT[],
    "status" "ClubEventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEventSpeaker" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "bio" TEXT,
    "linkedin" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubEventSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAgendaItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "speaker" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEventFaq" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubEventFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "ClubRegistrationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentId" TEXT,
    "ticketCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubEvent_slug_key" ON "ClubEvent"("slug");

-- CreateIndex
CREATE INDEX "ClubEvent_status_startsAt_idx" ON "ClubEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "ClubEvent_type_startsAt_idx" ON "ClubEvent"("type", "startsAt");

-- CreateIndex
CREATE INDEX "ClubEventSpeaker_eventId_sortOrder_idx" ON "ClubEventSpeaker"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "ClubAgendaItem_eventId_sortOrder_idx" ON "ClubAgendaItem"("eventId", "sortOrder");

-- CreateIndex
CREATE INDEX "ClubEventFaq_eventId_sortOrder_idx" ON "ClubEventFaq"("eventId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ClubRegistration_ticketCode_key" ON "ClubRegistration"("ticketCode");

-- CreateIndex
CREATE INDEX "ClubRegistration_userId_status_idx" ON "ClubRegistration"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClubRegistration_eventId_userId_key" ON "ClubRegistration"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "ClubEventSpeaker" ADD CONSTRAINT "ClubEventSpeaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubAgendaItem" ADD CONSTRAINT "ClubAgendaItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventFaq" ADD CONSTRAINT "ClubEventFaq_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubRegistration" ADD CONSTRAINT "ClubRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubRegistration" ADD CONSTRAINT "ClubRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
