-- Apply AFTER migrations/0002_add_employee_code.sql has run and
-- `npm run backfill-employee-codes -- --apply` has filled in every existing row
-- (verify with: SELECT count(*) FROM employees WHERE employee_code IS NULL; -> 0).
ALTER TABLE "employees" ADD CONSTRAINT "employees_employee_code_unique" UNIQUE ("employee_code");
