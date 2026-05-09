-- Add approved state for Senior CRM-reviewed quotation submissions.
ALTER TYPE "LeadSubStatus" ADD VALUE IF NOT EXISTS 'QUOTATION_APPROVED' AFTER 'QUOTATION_COMPLETED';
