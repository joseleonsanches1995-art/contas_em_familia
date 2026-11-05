-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'revoked');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active_household_id" UUID;

-- CreateTable
CREATE TABLE "household_invites" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "invited_by" UUID NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "household_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "household_invites_household_id_status_idx" ON "household_invites"("household_id", "status");

-- CreateIndex
CREATE INDEX "household_invites_email_status_idx" ON "household_invites"("email", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_household_id_fkey" FOREIGN KEY ("active_household_id") REFERENCES "households"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
