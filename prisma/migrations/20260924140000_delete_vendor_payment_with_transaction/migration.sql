-- Keep Accounts Payable in sync when a finance transaction is deleted outside
-- the vendor-payment screen. The application also performs the deletion so it
-- can reopen any affected milestone; this constraint protects direct database
-- deletes as well.
DO $$
BEGIN
  IF to_regclass('"VendorPayment"') IS NOT NULL THEN
    ALTER TABLE "VendorPayment"
      DROP CONSTRAINT IF EXISTS "VendorPayment_transactionId_fkey";

    ALTER TABLE "VendorPayment"
      ADD CONSTRAINT "VendorPayment_transactionId_fkey"
      FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
