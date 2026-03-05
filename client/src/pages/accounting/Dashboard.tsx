import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DollarSign, TrendingDown, Clock, ArrowUpRight, ArrowDownRight,
  Wallet, Landmark, FileText, ShoppingCart, Receipt, CreditCard,
  Loader2, Calendar
} from "lucide-react";

export default function AccountingDashboard() {
  const { user, canWrite } = useAuth();
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/accounting/dashboard"],
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back, {user?.fullName}</p>
          </div>
          {stats?.activeFinancialYear && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800" data-testid="badge-financial-year">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-medium text-sky-700 dark:text-sky-300">{stats.activeFinancialYear.name}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12" data-testid="loading-dashboard">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-cash-in-hand">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Cash in Hand</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{(stats?.cashInHand || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-bank-balance">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Bank Balance</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{(stats?.bankBalance || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center">
                      <Landmark className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-receivables">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receivables</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{(stats?.totalReceivables || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-payables">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Payables</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{(stats?.totalPayables || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-total-income">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Income</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₹{(stats?.totalIncome || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-total-expenses">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Total Expenses</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        ₹{(stats?.totalExpenses || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700" data-testid="card-pending-approvals">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Pending Approvals</p>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats?.pendingApprovals || 0}</p>
                    </div>
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {canWrite && (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-900 dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/accounting/vouchers/new?type=sales">
                      <Button variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" data-testid="button-quick-sales">
                        <ShoppingCart className="w-4 h-4 mr-2" />New Sales
                      </Button>
                    </Link>
                    <Link href="/accounting/vouchers/new?type=payment">
                      <Button variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" data-testid="button-quick-payment">
                        <CreditCard className="w-4 h-4 mr-2" />New Payment
                      </Button>
                    </Link>
                    <Link href="/accounting/vouchers/new?type=receipt">
                      <Button variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" data-testid="button-quick-receipt">
                        <Receipt className="w-4 h-4 mr-2" />New Receipt
                      </Button>
                    </Link>
                    <Link href="/accounting/quotations/new">
                      <Button variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" data-testid="button-quick-quotation">
                        <FileText className="w-4 h-4 mr-2" />New Quotation
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

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
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Narration</th>
                          <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Amount</th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentVouchers.map((v: any) => (
                          <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-2 px-3 text-slate-900 dark:text-white font-mono text-xs">{v.voucherNumber}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{new Date(v.date).toLocaleDateString("en-IN")}</td>
                            <td className="py-2 px-3">
                              <span className="capitalize text-slate-700 dark:text-slate-300">{v.type}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{v.narration || "-"}</td>
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
