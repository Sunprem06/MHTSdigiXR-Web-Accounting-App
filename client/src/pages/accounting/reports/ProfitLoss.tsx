import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";

interface ProfitLossItem {
  accountName: string;
  amount: string;
}

interface ProfitLossData {
  income: ProfitLossItem[];
  expenses: ProfitLossItem[];
  totalIncome: string;
  totalExpenses: string;
  netProfitLoss: string;
}

export default function ProfitLoss() {
  const { data, isLoading } = useQuery<ProfitLossData>({
    queryKey: ["/api/accounting/reports/profit-loss"],
  });

  const fmt = (val: string) =>
    parseFloat(val).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
            Profit & Loss Statement
          </h1>
          <Button onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Profit & Loss Statement</h2>
          <p className="text-sm text-slate-600">As on {new Date().toLocaleDateString("en-IN")}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-profit-loss">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-data">
            No data available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-lg text-green-700 dark:text-green-400">Income</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table data-testid="table-income">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.income.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-400">No income entries</TableCell>
                      </TableRow>
                    ) : (
                      data.income.map((item, idx) => (
                        <TableRow key={idx} data-testid={`row-income-${idx}`}>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(item.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total Income</TableCell>
                      <TableCell className="text-right font-mono" data-testid="text-total-income">
                        {fmt(data.totalIncome)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-lg text-red-700 dark:text-red-400">Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table data-testid="table-expenses">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-400">No expense entries</TableCell>
                      </TableRow>
                    ) : (
                      data.expenses.map((item, idx) => (
                        <TableRow key={idx} data-testid={`row-expense-${idx}`}>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(item.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total Expenses</TableCell>
                      <TableCell className="text-right font-mono" data-testid="text-total-expenses">
                        {fmt(data.totalExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    Net {parseFloat(data.netProfitLoss) >= 0 ? "Profit" : "Loss"}
                  </span>
                  <span
                    className={`text-xl font-bold font-mono ${
                      parseFloat(data.netProfitLoss) >= 0
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                    data-testid="text-net-profit-loss"
                  >
                    {fmt(data.netProfitLoss)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AccountingLayout>
  );
}
