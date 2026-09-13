import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface SwapReportRow {
  id: number;
  date: string;
  status: string;
  reason: string | null;
  requesterName: string;
  partnerName: string;
}

interface SwapReport {
  swaps: SwapReportRow[];
  swapCountsByEmployee: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AttendanceReports() {
  const { data, isLoading } = useQuery<SwapReport>({ queryKey: ["/api/accounting/attendance/reports/swaps"] });

  const countsSorted = Object.entries(data?.swapCountsByEmployee || {}).sort((a, b) => b[1] - a[1]);

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Attendance Reports</h1>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Accepted Swaps by Employee</h2>
                {countsSorted.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No accepted swaps yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {countsSorted.map(([name, count]) => (
                      <div key={name} className="border border-slate-200 dark:border-slate-700 rounded p-3 text-center" data-testid={`card-swap-count-${name}`}>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{name}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="p-4 pb-0">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Swap Requests</h2>
                </div>
                {!data?.swaps.length ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-swap-history">No swap requests recorded.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="table-swap-history">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                          <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Date</th>
                          <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Requester</th>
                          <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Colleague</th>
                          <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Reason</th>
                          <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.swaps.map(s => (
                          <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-swap-history-${s.id}`}>
                            <td className="px-4 py-3 text-sm">{fmtDate(s.date)}</td>
                            <td className="px-4 py-3 text-sm">{s.requesterName}</td>
                            <td className="px-4 py-3 text-sm">{s.partnerName}</td>
                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{s.reason || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AccountingLayout>
  );
}
