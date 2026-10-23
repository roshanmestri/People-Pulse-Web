-- M2: reshape auth tables for Better Auth, add price-per-person and verified-host fields.
-- Hand-edited from `prisma migrate diff` to preserve existing data.

-- Auth.js-shaped rows can't be reused by Better Auth (and these tables are empty in dev).
DELETE FROM "Session";
DELETE FROM "Account";

-- DropIndex
DROP INDEX "Session_sessionToken_key";

-- AlterTable
ALTER TABLE "Account" DROP CONSTRAINT "Account_pkey",
DROP COLUMN "access_token",
DROP COLUMN "expires_at",
DROP COLUMN "id_token",
DROP COLUMN "provider",
DROP COLUMN "providerAccountId",
DROP COLUMN "refresh_token",
DROP COLUMN "session_state",
DROP COLUMN "token_type",
DROP COLUMN "type",
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "idToken" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD CONSTRAINT "Account_pkey" PRIMARY KEY ("id");

-- AlterTable — hand-edited: keep the old free-text cost note as the new price note.
ALTER TABLE "Activity" RENAME COLUMN "costNote" TO "priceNote";
ALTER TABLE "Activity" ADD COLUMN "pricePerPerson" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "expires",
DROP COLUMN "sessionToken",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "token" TEXT NOT NULL,
ADD COLUMN     "userAgent" TEXT,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");

-- AlterTable — hand-edited: convert emailVerified (timestamp) to boolean in place.
ALTER TABLE "User" ADD COLUMN     "verificationRevokedAt" TIMESTAMP(3),
ADD COLUMN     "verificationRevokedReason" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "emailVerified" TYPE BOOLEAN USING ("emailVerified" IS NOT NULL),
ALTER COLUMN "emailVerified" SET DEFAULT false,
ALTER COLUMN "emailVerified" SET NOT NULL;

-- DropTable
DROP TABLE "VerificationToken";

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
