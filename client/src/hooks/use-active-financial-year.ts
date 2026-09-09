import { useQuery } from "@tanstack/react-query";

interface FinancialYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// Shared across report pages so each one can default its date range to the
// active financial year (still overridable — this only supplies the default).
export function useActiveFinancialYear() {
  const { data: financialYears } = useQuery<FinancialYear[]>({
    queryKey: ["/api/accounting/financial-years"],
  });
  return financialYears?.find(fy => fy.isActive);
}
