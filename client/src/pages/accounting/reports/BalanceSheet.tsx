import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";

interface BalanceSheetItem {
  accountName: string;
  amount: string;
}

interface BalanceSheetData {
  assets: BalanceSheetItem[];
  liabilities: BalanceSheetItem[];
  capital: BalanceSheetItem[];
  totalAssets: string;
  totalLiabilities: string;
  totalCapital: string;
}

export default function BalanceSheet() {
  const { data, isLoading } = useQuery<BalanceSheetData>({
    queryKey: ["/api/accounting/reports/balance-sheet"],
  });

  const fmt = (val: string) =>
    parseFloat(val).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const renderSection = (
    title: string,
    items: BalanceSheetItem[],
    total: string,
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
                  <TableCell>{item.accountName}</TableCell>
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

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Balance Sheet</h2>
          <p className="text-sm text-slate-600">As on {new Date().toLocaleDateString("en-IN")}</p>
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
            {renderSection("Assets", data.assets, data.totalAssets, "text-sky-700 dark:text-sky-400", "assets")}
            {renderSection("Liabilities", data.liabilities, data.totalLiabilities, "text-amber-700 dark:text-amber-400", "liabilities")}
            {renderSection("Capital", data.capital, data.totalCapital, "text-emerald-700 dark:text-emerald-400", "capital")}
          </div>
        )}
      </div>
    </AccountingLayout>
  );
}
