-- CreateTable
CREATE TABLE "Pincode" (
    "code" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "localities" TEXT[],
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Pincode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PactPrice" (
    "id" TEXT NOT NULL,
    "serviceType" "PactServiceType" NOT NULL,
    "state" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "renewalPrice" DECIMAL(10,2),
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PactPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pincode_state_district_idx" ON "Pincode"("state", "district");

-- CreateIndex
CREATE INDEX "Pincode_district_idx" ON "Pincode"("district");

-- CreateIndex
CREATE INDEX "PactPrice_serviceType_isActive_idx" ON "PactPrice"("serviceType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PactPrice_serviceType_state_key" ON "PactPrice"("serviceType", "state");
