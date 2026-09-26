-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ADMIN_SELLER', 'RM_EMPLOYEE', 'CLIENT', 'PROFESSIONAL', 'CONSULTANT', 'BMF', 'CORPORATE', 'EXTERNAL_ADVERTISER');

-- CreateEnum
CREATE TYPE "DesignaType" AS ENUM ('DESIGNA', 'DESIGNI');

-- CreateEnum
CREATE TYPE "ProfessionalTier" AS ENUM ('PROFESSIONAL', 'LEGEND', 'INNOVATOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "ConsultantGroup" AS ENUM ('ENGINEERING', 'REAL_ESTATE', 'FINANCIAL', 'INDIAN_TRADITIONAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "PactServiceType" AS ENUM ('DESIGNA', 'DESIGNI', 'CONSULTANT', 'BMF', 'CORPORATE');

-- CreateEnum
CREATE TYPE "PactStatus" AS ENUM ('RESERVED', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('PROJECT', 'PRODUCT', 'AROUND_US', 'ARTISTRY', 'BLOG', 'DESIGN_COMPETITION', 'PODCAST', 'MERCHANDISE', 'ADVERTISEMENT');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDED', 'CONVERTED', 'CLOSED', 'UNROUTED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('PACT_PURCHASE', 'PACT_RENEWAL', 'REGISTRATION_FEE', 'CLUB_MEMBERSHIP', 'PORTAL_SPACE', 'MERCHANDISE_ORDER', 'ADVERTISEMENT', 'COMPETITION_ENTRY', 'DA_INVOICE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'PDF', 'PPT', 'DOCUMENT', 'YOUTUBE_LINK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "profilePhoto" TEXT,
    "logo" TEXT,
    "addressLine" TEXT,
    "pincode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "facebookUrl" TEXT,
    "youtubeUrl" TEXT,
    "instagramUrl" TEXT,
    "twitterUrl" TEXT,
    "linkedinUrl" TEXT,
    "storageQuotaMb" INTEGER NOT NULL DEFAULT 100,
    "storageUsedMb" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "department" TEXT,
    "assignedStates" TEXT[],
    "assignedPincodes" TEXT[],
    "termsAcceptedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designaType" "DesignaType" NOT NULL,
    "tier" "ProfessionalTier" NOT NULL DEFAULT 'PROFESSIONAL',
    "coaNumber" TEXT,
    "coaVerified" BOOLEAN NOT NULL DEFAULT false,
    "firmName" TEXT,
    "experience" INTEGER,
    "bio" TEXT,
    "categories" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "group" "ConsultantGroup" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "firmName" TEXT,
    "experience" INTEGER,
    "bio" TEXT,
    "licenseNumber" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BmfProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designaType" "DesignaType" NOT NULL,
    "businessName" TEXT NOT NULL,
    "gstNumber" TEXT,
    "productCategories" TEXT[],
    "commissionRate" DECIMAL(5,2),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BmfProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "gstNumber" TEXT NOT NULL,
    "panNumber" TEXT NOT NULL,
    "incorporationDate" TIMESTAMP(3),
    "companyLogo" TEXT,
    "website" TEXT,
    "productCategories" TEXT[],
    "freePostingsTotal" INTEGER NOT NULL DEFAULT 10,
    "freePostingsUsed" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CorporateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignAssociate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "daEmail" TEXT NOT NULL,
    "daCode" TEXT NOT NULL,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycDocuments" JSONB,
    "panNumber" TEXT,
    "gstNumber" TEXT,
    "revenueShare" DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    "clubValidTill" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignAssociate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "boardOrUniv" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "passingYear" INTEGER NOT NULL,
    "membershipNo" TEXT,
    "certificateUrl" TEXT,
    "professionalProfileId" TEXT,
    "consultantProfileId" TEXT,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pact" (
    "id" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT,
    "serviceType" "PactServiceType" NOT NULL,
    "subCategory" TEXT NOT NULL DEFAULT '-',
    "holderId" TEXT,
    "status" "PactStatus" NOT NULL DEFAULT 'RESERVED',
    "purchasedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reservedTill" TIMESTAMP(3),
    "price" DECIMAL(10,2),
    "paymentId" TEXT,
    "complaintCount" INTEGER NOT NULL DEFAULT 0,
    "lastResponseAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "transferredFromId" TEXT,
    "transferApprovedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "pincode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "year" INTEGER,
    "meta" JSONB,
    "prizeMoney" DECIMAL(12,2),
    "submissionDeadline" TIMESTAMP(3),
    "juryRequired" INTEGER,
    "needsDesignAssociate" BOOLEAN NOT NULL DEFAULT false,
    "visibleToDesigna" BOOLEAN NOT NULL DEFAULT true,
    "visibleToDesigni" BOOLEAN NOT NULL DEFAULT true,
    "isPaidCategory" BOOLEAN NOT NULL DEFAULT false,
    "eventDate" TIMESTAMP(3),
    "venue" TEXT,
    "entryFee" DECIMAL(10,2),
    "attendeeCount" INTEGER,
    "reportedBy" TEXT,
    "writtenBy" TEXT,
    "referenceUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pactId" TEXT,
    "holderId" TEXT,
    "employeeId" TEXT,
    "pincode" TEXT NOT NULL,
    "serviceType" "PactServiceType" NOT NULL,
    "subCategory" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "budget" DECIMAL(12,2),
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "respondedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryResponse" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "againstId" TEXT NOT NULL,
    "byId" TEXT NOT NULL,
    "pactId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "refundedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "invoiceNumber" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalSpace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "extraMb" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,

    CONSTRAINT "PortalSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaInvoice" (
    "id" TEXT NOT NULL,
    "daId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "projectRef" TEXT,
    "clientName" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "daShare" DECIMAL(12,2) NOT NULL,
    "afShare" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "dueOn" TIMESTAMP(3) NOT NULL,
    "paidOn" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DaInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shippingName" TEXT NOT NULL,
    "shippingPhone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "shippingPincode" TEXT NOT NULL,
    "shippingCity" TEXT NOT NULL,
    "shippingState" TEXT NOT NULL,
    "paymentId" TEXT,
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "variant" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHindi" TEXT,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customFields" JSONB,
    "parentId" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "OtpRequest" (
    "id" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_pincode_idx" ON "User"("pincode");

-- CreateIndex
CREATE INDEX "User_state_idx" ON "User"("state");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_designaType_tier_idx" ON "ProfessionalProfile"("designaType", "tier");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_isVerified_idx" ON "ProfessionalProfile"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantProfile_userId_key" ON "ConsultantProfile"("userId");

-- CreateIndex
CREATE INDEX "ConsultantProfile_group_subCategory_idx" ON "ConsultantProfile"("group", "subCategory");

-- CreateIndex
CREATE UNIQUE INDEX "BmfProfile_userId_key" ON "BmfProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateProfile_userId_key" ON "CorporateProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignAssociate_userId_key" ON "DesignAssociate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignAssociate_daEmail_key" ON "DesignAssociate"("daEmail");

-- CreateIndex
CREATE UNIQUE INDEX "DesignAssociate_daCode_key" ON "DesignAssociate"("daCode");

-- CreateIndex
CREATE UNIQUE INDEX "Pact_paymentId_key" ON "Pact"("paymentId");

-- CreateIndex
CREATE INDEX "Pact_holderId_status_idx" ON "Pact"("holderId", "status");

-- CreateIndex
CREATE INDEX "Pact_pincode_serviceType_idx" ON "Pact"("pincode", "serviceType");

-- CreateIndex
CREATE INDEX "Pact_status_expiresAt_idx" ON "Pact"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pact_pincode_serviceType_subCategory_key" ON "Pact"("pincode", "serviceType", "subCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_type_status_publishedAt_idx" ON "Post"("type", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_authorId_type_idx" ON "Post"("authorId", "type");

-- CreateIndex
CREATE INDEX "Post_category_subCategory_idx" ON "Post"("category", "subCategory");

-- CreateIndex
CREATE INDEX "Post_state_year_idx" ON "Post"("state", "year");

-- CreateIndex
CREATE INDEX "Post_pincode_idx" ON "Post"("pincode");

-- CreateIndex
CREATE INDEX "Media_postId_sortOrder_idx" ON "Media"("postId", "sortOrder");

-- CreateIndex
CREATE INDEX "Enquiry_holderId_status_createdAt_idx" ON "Enquiry"("holderId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_clientId_createdAt_idx" ON "Enquiry"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_status_pincode_idx" ON "Enquiry"("status", "pincode");

-- CreateIndex
CREATE INDEX "Enquiry_employeeId_status_idx" ON "Enquiry"("employeeId", "status");

-- CreateIndex
CREATE INDEX "EnquiryResponse_enquiryId_createdAt_idx" ON "EnquiryResponse"("enquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "Complaint_againstId_status_idx" ON "Complaint"("againstId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceNumber_key" ON "Payment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Payment_userId_purpose_status_idx" ON "Payment"("userId", "purpose", "status");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ClubMembership_userId_expiresAt_idx" ON "ClubMembership"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PortalSpace_userId_expiresAt_idx" ON "PortalSpace"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DaInvoice_invoiceNumber_key" ON "DaInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "DaInvoice_daId_status_idx" ON "DaInvoice"("daId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Category_type_parentId_sortOrder_idx" ON "Category"("type", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Category_type_slug_key" ON "Category"("type", "slug");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequest_mobile_createdAt_idx" ON "OtpRequest"("mobile", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantProfile" ADD CONSTRAINT "ConsultantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BmfProfile" ADD CONSTRAINT "BmfProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateProfile" ADD CONSTRAINT "CorporateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignAssociate" ADD CONSTRAINT "DesignAssociate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_consultantProfileId_fkey" FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pact" ADD CONSTRAINT "Pact_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_pactId_fkey" FOREIGN KEY ("pactId") REFERENCES "Pact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryResponse" ADD CONSTRAINT "EnquiryResponse_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_againstId_fkey" FOREIGN KEY ("againstId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalSpace" ADD CONSTRAINT "PortalSpace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaInvoice" ADD CONSTRAINT "DaInvoice_daId_fkey" FOREIGN KEY ("daId") REFERENCES "DesignAssociate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
