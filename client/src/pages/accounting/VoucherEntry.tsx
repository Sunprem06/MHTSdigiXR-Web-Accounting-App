import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { VOUCHER_TYPES } from "@shared/schema";
import type { LedgerAccount } from "@shared/schema";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

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

interface EntryRow {
  ledgerAccountId: string;
  debit: string;
  credit: string;
}

export default function VoucherEntry() {
  const { user, canWrite } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const presetType = params.get("type") || "journal";

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [type, setType] = useState(presetType);
  const [narration, setNarration] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([
    { ledgerAccountId: "", debit: "", credit: "" },
    { ledgerAccountId: "", debit: "", credit: "" },
  ]);

  useEffect(() => {
    setType(presetType);
    setNarration("");
    setEntries([
      { ledgerAccountId: "", debit: "", credit: "" },
      { ledgerAccountId: "", debit: "", credit: "" },
    ]);
  }, [presetType]);

  const { data: ledgers } = useQuery<LedgerAccount[]>({
    queryKey: ["/api/accounting/ledgers"],
  });

  const { data: nextNumber } = useQuery<{ voucherNumber: string }>({
    queryKey: ["/api/accounting/vouchers/next-number", type],
    enabled: !!type,
  });

  useEffect(() => {
    if (nextNumber?.voucherNumber) {
      setVoucherNumber(nextNumber.voucherNumber);
    }
  }, [nextNumber]);

  const totalDebit = entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const addRow = () => {
    setEntries([...entries, { ledgerAccountId: "", debit: "", credit: "" }]);
  };

  const removeRow = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof EntryRow, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const status = user?.role === "data_entry" ? "draft" : "pending";
      const body = {
        voucherNumber,
        date,
        type,
        narration,
        totalAmount: totalDebit.toFixed(2),
        status,
        entries: entries
          .filter(e => e.ledgerAccountId && (parseFloat(e.debit) || parseFloat(e.credit)))
          .map(e => ({
            ledgerAccountId: parseInt(e.ledgerAccountId),
            debit: (parseFloat(e.debit) || 0).toFixed(2),
            credit: (parseFloat(e.credit) || 0).toFixed(2),
          })),
      };
      await apiRequest("POST", "/api/accounting/vouchers", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: "Voucher created successfully" });
      setLocation("/accounting/vouchers");
    },
    onError: (err: Error) => {
      toast({ title: "Error creating voucher", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!voucherNumber) {
      toast({ title: "Voucher number is required", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date is required", variant: "destructive" });
      return;
    }
    if (!isBalanced) {
      toast({ title: "Total debits must equal total credits", variant: "destructive" });
      return;
    }
    const validEntries = entries.filter(e => e.ledgerAccountId && (parseFloat(e.debit) || parseFloat(e.credit)));
    if (validEntries.length < 2) {
      toast({ title: "At least 2 entry lines are required", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const activeLedgers = ledgers?.filter(l => l.isActive) || [];

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-voucher-entry-title">
            New {TYPE_LABELS[type] || "Journal"} Voucher
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {user?.role === "data_entry" ? "Create a draft voucher" : "Create a new voucher entry"}
          </p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-slate-900 dark:text-white">Voucher Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  data-testid="input-voucher-date"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Voucher Number</label>
                <Input
                  value={voucherNumber}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-800"
                  data-testid="input-voucher-number"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-voucher-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOUCHER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Narration</label>
                <Textarea
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Description of the transaction..."
                  className="resize-none"
                  rows={1}
                  data-testid="input-voucher-narration"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
            <CardTitle className="text-lg text-slate-900 dark:text-white">Entry Lines</CardTitle>
            <Button variant="outline" size="sm" onClick={addRow} data-testid="button-add-entry-row">
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-voucher-entries">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-6">#</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2">Ledger Account</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-36">Debit (₹)</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-36">Credit (₹)</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800" data-testid={`row-entry-${idx}`}>
                      <td className="px-2 py-2 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-2">
                        <Select
                          value={entry.ledgerAccountId}
                          onValueChange={(val) => updateEntry(idx, "ledgerAccountId", val)}
                        >
                          <SelectTrigger data-testid={`select-ledger-${idx}`}>
                            <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeLedgers.map(l => (
                              <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={entry.debit}
                          onChange={(e) => updateEntry(idx, "debit", e.target.value)}
                          className="text-right"
                          data-testid={`input-debit-${idx}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={entry.credit}
                          onChange={(e) => updateEntry(idx, "credit", e.target.value)}
                          className="text-right"
                          data-testid={`input-credit-${idx}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        {entries.length > 2 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 dark:text-red-400"
                            onClick={() => removeRow(idx)}
                            data-testid={`button-remove-entry-${idx}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                    <td className="px-2 py-3" colSpan={2}>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Totals</span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={`text-sm font-semibold ${isBalanced ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"}`}
                        data-testid="text-total-debit"
                      >
                        {totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={`text-sm font-semibold ${isBalanced ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"}`}
                        data-testid="text-total-credit"
                      >
                        {totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {!isBalanced && totalDebit > 0 && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-3" data-testid="text-balance-error">
                Difference: ₹{Math.abs(totalDebit - totalCredit).toLocaleString("en-IN", { minimumFractionDigits: 2 })} — Debits must equal Credits
              </p>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {user?.role === "data_entry"
                  ? "Voucher will be saved as Draft"
                  : "Voucher will be saved as Pending"}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/accounting/vouchers")}
                  data-testid="button-cancel-voucher"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isBalanced || createMutation.isPending}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  data-testid="button-save-voucher"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Voucher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
