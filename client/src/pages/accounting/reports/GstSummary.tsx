import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Printer } from "lucide-react";

export default function GstSummary() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const qs = new URLSearchParams();
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);

  const url = `/api/accounting/reports/gst-summary${qs.toString() ? `?${qs.toString()}` : ""}`;
  const { data, isLoading } = useQuery<{
    outputTax: { cgst: number; sgst: number; igst: number; total: number };
    inputTax: { cgst: number; sgst: number; igst: number; total: number };
    netLiability: number;
  }>({
    queryKey: [url],
  });

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-gst-summary-title">GST Summary</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Tax liability overview</p>
          </div>
          <Button variant="outline" onClick={() => window.print()} data-testid="button-print-gst">
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">From</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} data-testid="input-gst-start-date" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">To</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} data-testid="input-gst-end-date" />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : data ? (
          <div className="space-y-4 print:space-y-6">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader><CardTitle className="text-lg text-slate-900 dark:text-white">Output Tax (Sales)</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm" data-testid="table-output-tax">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 text-slate-500 dark:text-slate-400">Component</th>
                      <th className="text-right py-2 text-slate-500 dark:text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">CGST</td>
                      <td className="py-2 text-right text-slate-900 dark:text-white">{fmt(data.outputTax.cgst)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">SGST</td>
                      <td className="py-2 text-right text-slate-900 dark:text-white">{fmt(data.outputTax.sgst)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">IGST</td>
                      <td className="py-2 text-right text-slate-900 dark:text-white">{fmt(data.outputTax.igst)}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <td className="py-2 font-semibold text-slate-900 dark:text-white">Total Output Tax</td>
                      <td className="py-2 text-right font-semibold text-slate-900 dark:text-white">{fmt(data.outputTax.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader><CardTitle className="text-lg text-slate-900 dark:text-white">Input Tax (Purchases)</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm" data-testid="table-input-tax">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 text-slate-500 dark:text-slate-400">Component</th>
                      <th className="text-right py-2 text-slate-500 dark:text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">CGST</td>
                      <td className="py-2 text-right text-slate-900 dark:text-white">{fmt(data.inputTax.cgst)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">SGST</td>
                      <td className="py-2 text-right text-slate-900 dark:text-white">{fmt(data.inputTax.sgst)}</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">IGST</td>
                      <td className="py-2 text-right text-slate-900 dark:text-white">{fmt(data.inputTax.igst)}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <td className="py-2 font-semibold text-slate-900 dark:text-white">Total Input Tax</td>
                      <td className="py-2 text-right font-semibold text-slate-900 dark:text-white">{fmt(data.inputTax.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className={`border-2 ${data.netLiability >= 0 ? "border-red-200 dark:border-red-800" : "border-green-200 dark:border-green-800"}`}>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net GST Liability</p>
                <p className={`text-3xl font-bold ${data.netLiability >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} data-testid="text-net-liability">
                  {fmt(Math.abs(data.netLiability))}
                  <span className="text-base ml-2">{data.netLiability >= 0 ? "(Payable)" : "(Refundable)"}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AccountingLayout>
  );
}
