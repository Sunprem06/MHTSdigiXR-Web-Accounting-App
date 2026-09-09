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

interface BalanceSheetItem {
  name: string;
  amount: number;
}

interface BalanceSheetData {
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  capital: BalanceSheetItem[];
  netProfit: number;
}

export default function BalanceSheet() {
  const activeFy = useActiveFinancialYear();
  const [asOfDate, setAsOfDate] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (activeFy && !initialized) {
      setAsOfDate(activeFy.endDate);
      setInitialized(true);
    }
  }, [activeFy, initialized]);

  const url = `/api/accounting/reports/balance-sheet${asOfDate ? `?asOfDate=${asOfDate}` : ""}`;
  const { data, isLoading } = useQuery<BalanceSheetData>({
    queryKey: [url],
  });

  const fmt = (val: number) => val.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const renderSection = (
    title: string,
    items: BalanceSheetItem[],
    total: number,
    color: string,
    testIdPrefix: string
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className={`text-lg ${color}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table data-testid={`table-${testIdPrefix}`}>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-slate-400">No entries</TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={idx} data-testid={`row-${testIdPrefix}-${idx}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(item.amount)}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="font-bold border-t-2">
              <TableCell>Total {title}</TableCell>
              <TableCell className="text-right font-mono" data-testid={`text-total-${testIdPrefix}`}>
                {fmt(total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const totalAssets = (data?.assets || []).reduce((sum, i) => sum + i.amount, 0);
  const totalLiabilities = (data?.liabilities || []).reduce((sum, i) => sum + i.amount, 0);
  // Capital section includes the period's net profit/loss as a line item (standard
  // practice — retained earnings for the period aren't in a ledger account of their
  // own, they come from the P&L figure) so the section total is meaningful.
  const capitalWithProfit: BalanceSheetItem[] = data
    ? [...data.capital, { name: data.netProfit >= 0 ? "Net Profit (Current Period)" : "Net Loss (Current Period)", amount: data.netProfit }]
    : [];
  const totalCapital = (data?.capital || []).reduce((sum, i) => sum + i.amount, 0) + (data?.netProfit || 0);

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
            Balance Sheet
          </h1>
          <Button onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-4 print:hidden">
          <div>
            <Label>As On Date</Label>
            <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} data-testid="input-bs-as-of-date" />
          </div>
          {activeFy && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">Defaulted to end of active FY: {activeFy.name}</p>
          )}
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Balance Sheet</h2>
          <p className="text-sm text-slate-600">As on {asOfDate || new Date().toLocaleDateString("en-IN")}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-balance-sheet">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-data">
            No data available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderSection("Assets", data.assets, totalAssets, "text-sky-700 dark:text-sky-400", "assets")}
            {renderSection("Liabilities", data.liabilities, totalLiabilities, "text-amber-700 dark:text-amber-400", "liabilities")}
            {renderSection("Capital", capitalWithProfit, totalCapital, "text-emerald-700 dark:text-emerald-400", "capital")}
          </div>
        )}
      </div>
    </AccountingLayout>
  );
}
