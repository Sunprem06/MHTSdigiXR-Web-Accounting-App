import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PayrollPayslip, PayrollEmployee } from "@shared/schema";
import { Eye, Loader2, FileText } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};
const STATUS_LABELS: Record<string, string> = { approved: "Approved", paid: "Paid" };

export default function MyPayrollPayslips() {
  const { data: profile } = useQuery<PayrollEmployee>({ queryKey: ["/api/accounting/my-payroll-profile"] });
  const { data: payslips, isLoading, error } = useQuery<PayrollPayslip[]>({
    queryKey: ["/api/accounting/my-payroll-payslips"],
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">My Payslips</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {profile ? `${profile.employeeCode} — ${profile.fullName}` : "Your payslip history"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : error ? (
          <Card><CardContent className="p-12 text-center text-slate-500 dark:text-slate-400" data-testid="text-no-payroll-profile">
            No payroll profile is linked to this login yet. Please contact your administrator.
          </CardContent></Card>
        ) : !payslips?.length ? (
          <Card><CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No payslips available yet</p>
          </CardContent></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-my-payroll-payslips">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Month</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Gross</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Prof. Tax</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Net Pay</th>
                    <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-my-payslip-${p.id}`}>
                      <td className="px-4 py-3 text-sm">{p.payMonth}</td>
                      <td className="px-4 py-3 text-right text-sm">₹{parseFloat(p.grossEarnings).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">₹{parseFloat(p.professionalTax).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(p.netPay).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/accounting/payroll/my-payroll-payslips/${p.id}`}>
                          <Button size="icon" variant="ghost" className="text-sky-600" title="View / Print" data-testid={`button-view-my-payslip-${p.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AccountingLayout>
  );
}
