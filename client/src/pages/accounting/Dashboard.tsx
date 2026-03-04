import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function AccountingDashboard() {
  const { user, canWrite } = useAuth();
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/accounting/dashboard"],
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user?.fullName}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12" data-testid="loading-dashboard">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-total-income">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Income</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{(stats?.totalIncome || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-total-expenses">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Expenses</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{(stats?.totalExpenses || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-net-balance">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Net Balance</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{((stats?.totalIncome || 0) - (stats?.totalExpenses || 0)).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-pending-approvals">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Pending Approvals</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.pendingApprovals || 0}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900 dark:text-white">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentVouchers?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-recent-transactions">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Voucher #</th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Date</th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Type</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Amount</th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentVouchers.map((v: any) => (
                          <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-2 px-3 text-slate-900 dark:text-white font-mono text-xs">{v.voucherNumber}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{v.date}</td>
                            <td className="py-2 px-3">
                              <span className="capitalize text-slate-700 dark:text-slate-300">{v.type}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-white">₹{parseFloat(v.totalAmount).toLocaleString("en-IN")}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                v.status === "approved" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                                v.status === "pending" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                                "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}>
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8" data-testid="text-no-transactions">No transactions yet. Create your first voucher to get started.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AccountingLayout>
  );
}
