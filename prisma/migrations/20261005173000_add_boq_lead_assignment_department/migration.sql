-- Add BOQ as a valid lead assignment department.
ALTER TYPE "LeadAssignmentDepartment" ADD VALUE IF NOT EXISTS 'BOQ';
