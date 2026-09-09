import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";
import { useActiveFinancialYear } from "@/hooks/use-active-financial-year";

interface ProfitLossItem {
  name: string;
  amount: number;
}

interface ProfitLossData {
  directIncome: ProfitLossItem[];
  indirectIncome: ProfitLossItem[];
  directExpenses: ProfitLossItem[];
  indirectExpenses: ProfitLossItem[];
  grossProfit: number;
  netProfit: number;
}

export default function ProfitLoss() {
  const activeFy = useActiveFinancialYear();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Default the range to the active FY once it's loaded — still fully editable afterward.
  useEffect(() => {
    if (activeFy && !initialized) {
      setStartDate(activeFy.startDate);
      setEndDate(activeFy.endDate);
      setInitialized(true);
    }
  }, [activeFy, initialized]);

  const qs = new URLSearchParams();
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  const url = `/api/accounting/reports/profit-loss${qs.toString() ? `?${qs.toString()}` : ""}`;

  const { data, isLoading } = useQuery<ProfitLossData>({
    queryKey: [url],
  });

  const fmt = (val: number) => val.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const renderSection = (title: string, items: ProfitLossItem[], colorClass: string, testId: string) => (
    <Table data-testid={testId}>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell className="text-center text-slate-400">None</TableCell></TableRow>
        ) : (
          items.map((item, idx) => (
            <TableRow key={idx}>
              <TableCell>{item.name}</TableCell>
              <TableCell className="text-right font-mono">{fmt(item.amount)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

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

        <div className="flex flex-wrap items-end gap-4 print:hidden">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} data-testid="input-pl-start-date" />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} data-testid="input-pl-end-date" />
          </div>
          {activeFy && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">Defaulted to active FY: {activeFy.name}</p>
          )}
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Profit & Loss Statement</h2>
          <p className="text-sm text-slate-600">{startDate || "Inception"} to {endDate || new Date().toLocaleDateString("en-IN")}</p>
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
              <CardHeader className="pb-2"><CardTitle className="text-lg text-green-700 dark:text-green-400">Direct Income</CardTitle></CardHeader>
              <CardContent className="p-0">{renderSection("Direct Income", data.directIncome, "text-green-700", "table-direct-income")}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg text-red-700 dark:text-red-400">Direct Expenses</CardTitle></CardHeader>
              <CardContent className="p-0">{renderSection("Direct Expenses", data.directExpenses, "text-red-700", "table-direct-expenses")}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg text-green-700 dark:text-green-400">Indirect Income</CardTitle></CardHeader>
              <CardContent className="p-0">{renderSection("Indirect Income", data.indirectIncome, "text-green-700", "table-indirect-income")}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-lg text-red-700 dark:text-red-400">Indirect Expenses</CardTitle></CardHeader>
              <CardContent className="p-0">{renderSection("Indirect Expenses", data.indirectExpenses, "text-red-700", "table-indirect-expenses")}</CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="py-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-base font-semibold text-slate-700 dark:text-slate-300">Gross Profit</span>
                  <span className="text-lg font-bold font-mono" data-testid="text-gross-profit">{fmt(data.grossProfit)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    Net {data.netProfit >= 0 ? "Profit" : "Loss"}
                  </span>
                  <span
                    className={`text-xl font-bold font-mono ${data.netProfit >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                    data-testid="text-net-profit-loss"
                  >
                    {fmt(data.netProfit)}
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
