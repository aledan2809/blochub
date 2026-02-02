-- Migration: Add SMTP Config and Reminder History
-- Run this in Supabase SQL Editor

-- Create ReminderType enum
DO $$ BEGIN
    CREATE TYPE "ReminderType" AS ENUM ('BEFORE_DUE', 'ON_DUE', 'AFTER_DUE', 'ESCALATION', 'WEEKLY_SUMMARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ReminderChannel enum
DO $$ BEGIN
    CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create smtp_configs table
CREATE TABLE IF NOT EXISTS "smtp_configs" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTest" TIMESTAMP(3),
    "lastTestSuccess" BOOLEAN,
    "lastTestError" TEXT,
    "asociatieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_configs_pkey" PRIMARY KEY ("id")
);

-- Create reminder_history table
CREATE TABLE IF NOT EXISTS "reminder_history" (
    "id" TEXT NOT NULL,
    "tip" "ReminderType" NOT NULL,
    "canal" "ReminderChannel" NOT NULL,
    "mesaj" TEXT NOT NULL,
    "trimisLa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deschisLa" TIMESTAMP(3),
    "apartamentId" TEXT NOT NULL,
    "chitantaId" TEXT,
    "asociatieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_history_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on smtp_configs
CREATE UNIQUE INDEX IF NOT EXISTS "smtp_configs_asociatieId_key" ON "smtp_configs"("asociatieId");

-- Add foreign keys
ALTER TABLE "smtp_configs"
ADD CONSTRAINT "smtp_configs_asociatieId_fkey"
FOREIGN KEY ("asociatieId") REFERENCES "asociatii"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reminder_history"
ADD CONSTRAINT "reminder_history_apartamentId_fkey"
FOREIGN KEY ("apartamentId") REFERENCES "apartamente"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reminder_history"
ADD CONSTRAINT "reminder_history_chitantaId_fkey"
FOREIGN KEY ("chitantaId") REFERENCES "chitante"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reminder_history"
ADD CONSTRAINT "reminder_history_asociatieId_fkey"
FOREIGN KEY ("asociatieId") REFERENCES "asociatii"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Done!
SELECT 'Migration completed successfully!' as status;
