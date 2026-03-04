import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";

interface TrialBalanceEntry {
  accountName: string;
  group: string;
  debit: string;
  credit: string;
}

interface TrialBalanceData {
  entries: TrialBalanceEntry[];
  totals: { debit: string; credit: string };
}

export default function TrialBalance() {
  const { data, isLoading } = useQuery<TrialBalanceData>({
    queryKey: ["/api/accounting/reports/trial-balance"],
  });

  const fmt = (val: string) =>
    parseFloat(val).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
            Trial Balance
          </h1>
          <Button onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Trial Balance</h2>
          <p className="text-sm text-slate-600">As on {new Date().toLocaleDateString("en-IN")}</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="loading-trial-balance">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !data || data.entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-entries">
                No account data available.
              </div>
            ) : (
              <Table data-testid="table-trial-balance">
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((entry, idx) => (
                    <TableRow key={idx} data-testid={`row-trial-balance-${idx}`}>
                      <TableCell>{entry.accountName}</TableCell>
                      <TableCell>{entry.group}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.debit) > 0 ? fmt(entry.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.credit) > 0 ? fmt(entry.credit) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow data-testid="row-trial-balance-totals">
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-mono font-bold">{fmt(data.totals.debit)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{fmt(data.totals.credit)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
