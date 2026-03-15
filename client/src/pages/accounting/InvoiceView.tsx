import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute } from "wouter";
import type { Voucher, VoucherEntry, Party, CompanySettings } from "@shared/schema";
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
  const paise = Math.round((num % 1) * 100);

  let result = "";
  if (crore) result += convertLessThanThousand(crore) + " Crore ";
  if (lakh) result += convertLessThanThousand(lakh) + " Lakh ";
  if (thousand) result += convertLessThanThousand(thousand) + " Thousand ";
  if (rest) result += convertLessThanThousand(rest);
  result = result.trim() + " Rupees";
  if (paise) result += " and " + convertLessThanThousand(paise) + " Paise";
  return result + " Only";
}

export default function InvoiceView() {
  const [, params] = useRoute("/accounting/invoice/:id");
  const voucherId = params?.id ? parseInt(params.id) : 0;

  const { data: voucher, isLoading: loadingVoucher } = useQuery<Voucher & { entries: VoucherEntry[] }>({
    queryKey: [`/api/accounting/vouchers/${voucherId}`],
    enabled: !!voucherId,
  });

  const { data: parties } = useQuery<Party[]>({ queryKey: ["/api/accounting/parties"] });
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/accounting/company-settings"] });

  if (loadingVoucher) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  if (!voucher) {
    return <AccountingLayout><div className="text-center py-12 text-slate-500">Voucher not found</div></AccountingLayout>;
  }

  const party = parties?.find(p => p.id === voucher.partyId);
  const totalAmount = parseFloat(voucher.totalAmount || "0");
  const taxableAmount = parseFloat(voucher.taxableAmount || voucher.totalAmount || "0");
  const cgst = parseFloat(voucher.cgstAmount || "0");
  const sgst = parseFloat(voucher.sgstAmount || "0");
  const igst = parseFloat(voucher.igstAmount || "0");

  return (
    <AccountingLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/accounting/invoices">
            <Button variant="outline" size="sm" data-testid="button-back-invoices"><ArrowLeft className="w-4 h-4 mr-1" />Back to Invoices</Button>
          </Link>
          <Button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-print-invoice">
            <Printer className="w-4 h-4 mr-2" />Print Invoice
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 print:border print:shadow-none">
          <CardContent className="p-8 print:p-6 space-y-6">
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{company?.companyName || "Maanagarram Hi Tech Solutions"}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{company?.address}</p>
              {company?.gstin && <p className="text-sm text-slate-500 dark:text-slate-400">GSTIN: {company.gstin}</p>}
              {company?.phone && <p className="text-sm text-slate-500 dark:text-slate-400">Phone: {company.phone} | Email: {company.email}</p>}
              <h2 className="text-lg font-bold mt-3 text-sky-600 dark:text-sky-400">TAX INVOICE</h2>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Bill To:</p>
                {party ? (
                  <>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{party.name}</p>
                    {party.address && <p className="text-slate-500 dark:text-slate-400">{party.address}</p>}
                    {party.city && <p className="text-slate-500 dark:text-slate-400">{party.city}, {party.state} {party.pincode}</p>}
                    {party.gstin && <p className="text-slate-500 dark:text-slate-400">GSTIN: {party.gstin}</p>}
                  </>
                ) : (
                  <p className="text-slate-400">-</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Invoice No: <span className="font-medium text-slate-900 dark:text-white">{voucher.voucherNumber}</span></p>
                <p className="text-slate-500 dark:text-slate-400">Date: <span className="font-medium text-slate-900 dark:text-white">{new Date(voucher.date).toLocaleDateString("en-IN")}</span></p>
              </div>
            </div>

            {voucher.entries?.length > 0 && (
              <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 text-slate-500 dark:text-slate-400">#</th>
                    <th className="text-left px-3 py-2 text-slate-500 dark:text-slate-400">Particulars</th>
                    <th className="text-right px-3 py-2 text-slate-500 dark:text-slate-400">Debit (₹)</th>
                    <th className="text-right px-3 py-2 text-slate-500 dark:text-slate-400">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.entries.map((e, idx) => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Ledger #{e.ledgerAccountId}</td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{parseFloat(e.debit) > 0 ? parseFloat(e.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{parseFloat(e.credit) > 0 ? parseFloat(e.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Taxable Amount</span>
                  <span>₹{taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {cgst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>CGST</span><span>₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                {sgst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>SGST</span><span>₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                {igst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>IGST</span><span>₹{igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-600 pt-1">
                  <span>Total</span>
                  <span>₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
              <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium">Amount in Words:</span> {numberToWords(totalAmount)}</p>
            </div>

            {voucher.narration && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium">Narration:</span> {voucher.narration}</p>
              </div>
            )}

            {company?.bankName && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <p className="font-medium mb-1">Bank Details:</p>
                <p>Bank: {company.bankName} | Branch: {company.bankBranch}</p>
                <p>A/c No: {company.bankAccount} | IFSC: {company.bankIfsc}</p>
              </div>
            )}

            <div className="flex justify-end pt-8">
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
