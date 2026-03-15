import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoute } from "wouter";
import type { Quotation, Party, Product, CompanySettings } from "@shared/schema";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-sky-100 text-sky-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-purple-100 text-purple-700",
};

export default function QuotationView() {
  const [, params] = useRoute("/accounting/quotations/:id/view");
  const quotationId = params?.id ? parseInt(params.id) : 0;

  const { data: quotation, isLoading } = useQuery<Quotation>({
    queryKey: ["/api/accounting/quotations", quotationId],
    enabled: !!quotationId,
  });

  const { data: parties } = useQuery<Party[]>({ queryKey: ["/api/accounting/parties"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/accounting/products"] });
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/accounting/company-settings"] });

  if (isLoading) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  if (!quotation) {
    return <AccountingLayout><div className="text-center py-12 text-slate-500">Quotation not found</div></AccountingLayout>;
  }

  const party = parties?.find(p => p.id === quotation.partyId);
  const productMap = new Map(products?.map(p => [p.id, p]) || []);
  const lineItems = (quotation.items as any[]) || [];
  const subtotal = parseFloat(quotation.subtotal);
  const cgst = parseFloat(quotation.cgstTotal || "0");
  const sgst = parseFloat(quotation.sgstTotal || "0");
  const igst = parseFloat(quotation.igstTotal || "0");
  const grandTotal = parseFloat(quotation.grandTotal);

  return (
    <AccountingLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/accounting/quotations">
            <Button variant="outline" size="sm" data-testid="button-back-quotations"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          </Link>
          <Button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-print-quotation">
            <Printer className="w-4 h-4 mr-2" />Print Quotation
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 print:border print:shadow-none">
          <CardContent className="p-8 print:p-6 space-y-6">
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{company?.companyName || "Maanagarram Hi Tech Solutions"}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{company?.address}</p>
              {company?.gstin && <p className="text-sm text-slate-500 dark:text-slate-400">GSTIN: {company.gstin}</p>}
              {company?.phone && <p className="text-sm text-slate-500 dark:text-slate-400">Phone: {company.phone} | Email: {company.email}</p>}
              <div className="flex items-center justify-center gap-3 mt-3">
                <h2 className="text-lg font-bold text-sky-600 dark:text-sky-400">QUOTATION / ESTIMATE</h2>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize print:hidden ${STATUS_COLORS[quotation.status]}`}>{quotation.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">To:</p>
                {party ? (
                  <>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{party.name}</p>
                    {party.address && <p className="text-slate-500 dark:text-slate-400">{party.address}</p>}
                    {party.city && <p className="text-slate-500 dark:text-slate-400">{party.city}, {party.state} {party.pincode}</p>}
                    {party.gstin && <p className="text-slate-500 dark:text-slate-400">GSTIN: {party.gstin}</p>}
                    {party.email && <p className="text-slate-500 dark:text-slate-400">Email: {party.email}</p>}
                  </>
                ) : (
                  <p className="text-slate-400">-</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-slate-500 dark:text-slate-400">Quotation No: <span className="font-medium text-slate-900 dark:text-white">{quotation.quotationNumber}</span></p>
                <p className="text-slate-500 dark:text-slate-400">Date: <span className="font-medium text-slate-900 dark:text-white">{new Date(quotation.date).toLocaleDateString("en-IN")}</span></p>
                {quotation.validUntil && (
                  <p className="text-slate-500 dark:text-slate-400">Valid Until: <span className="font-medium text-slate-900 dark:text-white">{new Date(quotation.validUntil).toLocaleDateString("en-IN")}</span></p>
                )}
              </div>
            </div>

            {lineItems.length > 0 && (
              <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 text-slate-500 dark:text-slate-400">#</th>
                    <th className="text-left px-3 py-2 text-slate-500 dark:text-slate-400">Description</th>
                    <th className="text-right px-3 py-2 text-slate-500 dark:text-slate-400">Qty</th>
                    <th className="text-right px-3 py-2 text-slate-500 dark:text-slate-400">Rate (₹)</th>
                    <th className="text-center px-3 py-2 text-slate-500 dark:text-slate-400">GST%</th>
                    <th className="text-right px-3 py-2 text-slate-500 dark:text-slate-400">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item: any, idx: number) => {
                    const product = item.productId ? productMap.get(item.productId) : null;
                    return (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                          {item.description || product?.name || "-"}
                          {product?.sacCode && <span className="text-xs text-slate-400 ml-2">(SAC: {product.sacCode})</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{parseFloat(item.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-center text-slate-900 dark:text-white">{item.gstRate}%</td>
                        <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{parseFloat(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className="flex justify-end">
              <div className="w-72 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {cgst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>CGST</span><span>₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                {sgst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>SGST</span><span>₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                {igst > 0 && <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>IGST</span><span>₹{igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-600 pt-1">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {quotation.notes && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-medium">Notes:</span> {quotation.notes}</p>
              </div>
            )}

            {quotation.termsAndConditions && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Terms & Conditions:</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{quotation.termsAndConditions}</p>
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
