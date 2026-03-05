import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute } from "wouter";
import type { Party, CompanySettings } from "@shared/schema";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertLessThanThousand(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertLessThanThousand(n % 100) : "");
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = Math.floor(num % 1000);

  let result = "";
  if (crore) result += convertLessThanThousand(crore) + " Crore ";
  if (lakh) result += convertLessThanThousand(lakh) + " Lakh ";
  if (thousand) result += convertLessThanThousand(thousand) + " Thousand ";
  if (rest) result += convertLessThanThousand(rest);
  return result.trim() + " Rupees Only";
}

export default function ReceiptView() {
  const [, params] = useRoute("/accounting/receipt/:id");
  const voucherId = params?.id ? parseInt(params.id) : 0;

  const { data: voucher, isLoading } = useQuery<any>({
    queryKey: [`/api/accounting/vouchers/${voucherId}`],
    enabled: !!voucherId,
  });

  const { data: parties } = useQuery<Party[]>({ queryKey: ["/api/accounting/parties"] });
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/accounting/company-settings"] });

  if (isLoading) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  if (!voucher) {
    return <AccountingLayout><div className="text-center py-12 text-slate-500">Voucher not found</div></AccountingLayout>;
  }

  const party = parties?.find(p => p.id === voucher.partyId);
  const totalAmount = parseFloat(voucher.totalAmount || "0");

  return (
    <AccountingLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/accounting/vouchers">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          </Link>
          <Button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-print-receipt">
            <Printer className="w-4 h-4 mr-2" />Print Receipt
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 print:border print:shadow-none">
          <CardContent className="p-8 print:p-6 space-y-6">
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{company?.companyName || "Maanagarram Hi Tech Solutions"}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{company?.address}</p>
              {company?.phone && <p className="text-sm text-slate-500 dark:text-slate-400">Phone: {company.phone} | Email: {company.email}</p>}
              <h2 className="text-lg font-bold mt-3 text-sky-600 dark:text-sky-400">PAYMENT RECEIPT</h2>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Receipt No: <span className="font-medium text-slate-900 dark:text-white">{voucher.voucherNumber}</span></p>
                <p className="text-slate-500 dark:text-slate-400">Date: <span className="font-medium text-slate-900 dark:text-white">{new Date(voucher.date).toLocaleDateString("en-IN")}</span></p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Status: <span className="font-medium capitalize text-slate-900 dark:text-white">{voucher.status}</span></p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Received From:</span>
                <span className="font-medium text-slate-900 dark:text-white">{party?.name || "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Amount:</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {voucher.narration && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Towards:</span>
                  <span className="text-slate-700 dark:text-slate-300">{voucher.narration}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium">Amount in Words:</span> {numberToWords(totalAmount)}</p>
            </div>

            <div className="flex justify-between items-end pt-8">
              <div className="text-center">
                <div className="border-t border-slate-300 dark:border-slate-600 pt-1 px-8">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Received By</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-300 dark:border-slate-600 pt-1 px-8">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
