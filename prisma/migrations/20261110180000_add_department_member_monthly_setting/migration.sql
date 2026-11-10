-- CreateTable
CREATE TABLE IF NOT EXISTS "DepartmentMemberMonthlySetting" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentMemberMonthlySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DepartmentMemberMonthlySetting_department_userId_monthKey_key" ON "DepartmentMemberMonthlySetting"("department", "userId", "monthKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepartmentMemberMonthlySetting_department_monthKey_idx" ON "DepartmentMemberMonthlySetting"("department", "monthKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepartmentMemberMonthlySetting_userId_idx" ON "DepartmentMemberMonthlySetting"("userId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DepartmentMemberMonthlySetting_userId_fkey'
  ) THEN
    ALTER TABLE "DepartmentMemberMonthlySetting" ADD CONSTRAINT "DepartmentMemberMonthlySetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
