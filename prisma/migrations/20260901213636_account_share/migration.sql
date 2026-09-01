-- CreateTable
CREATE TABLE "AccountShare" (
    "id" SERIAL NOT NULL,
    "ownerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountShare_email_key" ON "AccountShare"("email");

-- AddForeignKey
ALTER TABLE "AccountShare" ADD CONSTRAINT "AccountShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
