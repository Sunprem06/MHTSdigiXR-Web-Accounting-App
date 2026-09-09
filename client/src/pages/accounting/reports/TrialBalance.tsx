import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";
import { useActiveFinancialYear } from "@/hooks/use-active-financial-year";

interface TrialBalanceEntry {
  accountId: number;
  accountName: string;
  groupName: string;
  debit: number;
  credit: number;
}

export default function TrialBalance() {
  const activeFy = useActiveFinancialYear();
  const [asOnDate, setAsOnDate] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (activeFy && !initialized) {
      setAsOnDate(activeFy.endDate);
      setInitialized(true);
    }
  }, [activeFy, initialized]);

  const url = `/api/accounting/reports/trial-balance${asOnDate ? `?asOnDate=${asOnDate}` : ""}`;
  const { data, isLoading } = useQuery<TrialBalanceEntry[]>({
    queryKey: [url],
  });

  const fmt = (val: number) => val.toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const totalDebit = (data || []).reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = (data || []).reduce((sum, e) => sum + e.credit, 0);

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

        <div className="flex flex-wrap items-end gap-4 print:hidden">
          <div>
            <Label>As On Date</Label>
            <Input type="date" value={asOnDate} onChange={e => setAsOnDate(e.target.value)} data-testid="input-tb-as-on-date" />
          </div>
          {activeFy && (
            <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">Defaulted to end of active FY: {activeFy.name}</p>
          )}
        </div>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Trial Balance</h2>
          <p className="text-sm text-slate-600">As on {asOnDate || new Date().toLocaleDateString("en-IN")}</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="loading-trial-balance">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !data || data.length === 0 ? (
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
                  {data.map((entry) => (
                    <TableRow key={entry.accountId} data-testid={`row-trial-balance-${entry.accountId}`}>
                      <TableCell>{entry.accountName}</TableCell>
                      <TableCell>{entry.groupName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.debit > 0 ? fmt(entry.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.credit > 0 ? fmt(entry.credit) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow data-testid="row-trial-balance-totals">
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-mono font-bold">{fmt(totalDebit)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{fmt(totalCredit)}</TableCell>
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
