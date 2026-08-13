-- Allow finance transaction categories to include user-defined income and expense labels.
ALTER TABLE "Transaction" ALTER COLUMN "category" TYPE TEXT USING "category"::text;
DROP TYPE IF EXISTS "ExpenseCategory";
