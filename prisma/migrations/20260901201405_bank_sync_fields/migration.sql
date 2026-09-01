-- AlterTable
ALTER TABLE "BankConnection" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "enrollmentId" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'connected';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "matchedTxnId" TEXT;
