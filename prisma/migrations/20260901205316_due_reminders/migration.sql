-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "notifyDaysBefore" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "notifiedAt" TIMESTAMP(3);
