import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Loader2 } from "lucide-react";

interface DayBookEntry {
  id: number;
  date: string;
  voucherNumber: string;
  type: string;
  narration: string | null;
  totalAmount: string;
  status: string;
}

export default function DayBook() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const { data: entries, isLoading } = useQuery<DayBookEntry[]>({
    queryKey: ["/api/accounting/reports/day-book", `?startDate=${startDate}&endDate=${endDate}`],
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
            Day Book
          </h1>
          <Button onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="hidden print:block text-center mb-4">
          <h2 className="text-xl font-bold">Day Book</h2>
          <p className="text-sm text-slate-600">
            {startDate} to {endDate}
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="loading-daybook">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !entries || entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-entries">
                No transactions found for the selected period.
              </div>
            ) : (
              <Table data-testid="table-daybook">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-daybook-${entry.id}`}>
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.voucherNumber}</TableCell>
                      <TableCell className="capitalize">{entry.type}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{entry.narration || "—"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.status === "approved" ? "default" : entry.status === "pending" ? "secondary" : "outline"}
                          data-testid={`badge-status-${entry.id}`}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
