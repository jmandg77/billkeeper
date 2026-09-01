-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "linkedAccountId" TEXT;

-- CreateTable
CREATE TABLE "BankAccount" (
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("userId","accountId")
);

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
