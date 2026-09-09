import { useQuery } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttachmentsPanel } from "@/components/accounting/AttachmentsPanel";
import { useRoute, Link } from "wouter";
import type { Voucher, VoucherEntry, LedgerAccount, Party } from "@shared/schema";
import { Loader2, ArrowLeft } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  sales: "Sales",
  purchase: "Purchase",
  payment: "Payment",
  receipt: "Receipt",
  journal: "Journal",
  contra: "Contra",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

type VoucherWithEntries = Voucher & { entries: VoucherEntry[] };

export default function VoucherView() {
  const [, params] = useRoute("/accounting/vouchers/:id");
  const voucherId = params?.id ? parseInt(params.id) : 0;

  const { data: voucher, isLoading } = useQuery<VoucherWithEntries>({
    queryKey: ["/api/accounting/vouchers", voucherId],
    enabled: !!voucherId,
  });

  const { data: ledgers } = useQuery<LedgerAccount[]>({ queryKey: ["/api/accounting/ledgers"] });
  const { data: parties } = useQuery<Party[]>({ queryKey: ["/api/accounting/parties"] });

  const ledgerMap = new Map(ledgers?.map((l) => [l.id, l.name]) || []);
  const party = parties?.find((p) => p.id === voucher?.partyId);

  if (isLoading) {
    return (
      <AccountingLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        </div>
      </AccountingLayout>
    );
  }

  if (!voucher) {
    return (
      <AccountingLayout>
        <div className="text-center py-12 text-slate-500" data-testid="text-voucher-not-found">Voucher not found</div>
      </AccountingLayout>
    );
  }

  return (
    <AccountingLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <Link href="/accounting/vouchers">
            <Button variant="outline" size="sm" data-testid="button-back-vouchers">
              <ArrowLeft className="w-4 h-4 mr-1" />Back
            </Button>
          </Link>
        </div>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white" data-testid="text-voucher-view-number">
                  {voucher.voucherNumber}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {TYPE_LABELS[voucher.type] || voucher.type} Voucher · {new Date(voucher.date).toLocaleDateString("en-IN")}
                </p>
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[voucher.status] || ""}`}
                data-testid="badge-voucher-view-status"
              >
                {voucher.status}
              </span>
            </div>

            {party && (
              <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="text-voucher-view-party">
                {voucher.type === "sales" ? "Customer" : "Vendor"}: <span className="font-medium">{party.name}</span>
              </p>
            )}
            {voucher.narration && (
              <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="text-voucher-view-narration">
                Narration: {voucher.narration}
              </p>
            )}

            <div className="overflow-x-auto pt-2">
              <table className="w-full" data-testid="table-voucher-view-entries">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2">Ledger Account</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2">Debit (₹)</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.entries?.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2 text-sm text-slate-900 dark:text-white">{ledgerMap.get(e.ledgerAccountId) || "—"}</td>
                      <td className="px-2 py-2 text-right text-sm text-slate-700 dark:text-slate-200">
                        {parseFloat(e.debit) ? parseFloat(e.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                      </td>
                      <td className="px-2 py-2 text-right text-sm text-slate-700 dark:text-slate-200">
                        {parseFloat(e.credit) ? parseFloat(e.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                    <td className="px-2 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Total</td>
                    <td className="px-2 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white" data-testid="text-voucher-view-total">
                      {parseFloat(voucher.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <AttachmentsPanel entityType="voucher" entityId={voucher.id} uploadPermission="vouchers.create" managePermission="vouchers.approve" />
      </div>
    </AccountingLayout>
  );
}
