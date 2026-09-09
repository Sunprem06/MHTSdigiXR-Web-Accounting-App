import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TutorPayslip, Tutor, TutorAgreement } from "@shared/schema";
import { Eye, Loader2, FileText, BookOpen } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};
const STATUS_LABELS: Record<string, string> = { approved: "Approved", paid: "Paid" };
const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  sent: "Sent", in_progress: "In Progress", yts: "Yet To Start", on_hold: "On Hold",
  completed: "Completed", cancelled: "Cancelled", signed: "Signed", swapped: "Swapped",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function MyPayslips() {
  const { data: tutor } = useQuery<Tutor>({ queryKey: ["/api/accounting/my-tutor-profile"] });
  const { data: agreements } = useQuery<TutorAgreement[]>({
    queryKey: ["/api/accounting/my-agreements"],
    enabled: !!tutor,
  });
  const { data: payslips, isLoading, error } = useQuery<TutorPayslip[]>({
    queryKey: ["/api/accounting/my-payslips"],
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">My Payslips</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {tutor ? `${tutor.tutorCode} — ${tutor.fullName}` : "Your tutor payslip history"}
          </p>
        </div>

        {agreements && agreements.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">My Courses</h2>
              </div>
              <div className="space-y-2">
                {agreements.map(a => (
                  <div key={a.id} className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded p-3" data-testid={`row-my-agreement-${a.id}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{a.subject}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {a.weeklySchedule || "Schedule not set"} · {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                      </p>
                    </div>
                    <Badge variant="outline">{AGREEMENT_STATUS_LABELS[a.agreementStatus]}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : error ? (
          <Card><CardContent className="p-12 text-center text-slate-500 dark:text-slate-400" data-testid="text-no-tutor-profile">
            No tutor profile is linked to this login yet. Please contact your administrator.
          </CardContent></Card>
        ) : !payslips?.length ? (
          <Card><CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No payslips available yet</p>
          </CardContent></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-my-payslips">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Month</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Gross</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">TDS</th>
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
                      <td className="px-4 py-3 text-right text-sm text-red-600">₹{parseFloat(p.tdsAmount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(p.netPay).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/accounting/payroll/my-payslips/${p.id}`}>
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
