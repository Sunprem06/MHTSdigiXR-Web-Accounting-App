import { useState, useEffect, useMemo } from "react";
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
import { VOUCHER_TYPES, GST_RATES } from "@shared/schema";
import type { LedgerAccount, Product, Party } from "@shared/schema";
import { Plus, Trash2, Loader2, Save, Package } from "lucide-react";

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

interface ProductLine {
  productId: string;
  description: string;
  quantity: string;
  rate: string;
  gstRate: string;
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
  const [partyId, setPartyId] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [useProducts, setUseProducts] = useState(false);
  const [productLines, setProductLines] = useState<ProductLine[]>([
    { productId: "", description: "", quantity: "1", rate: "", gstRate: "18" },
  ]);
  const [entries, setEntries] = useState<EntryRow[]>([
    { ledgerAccountId: "", debit: "", credit: "" },
    { ledgerAccountId: "", debit: "", credit: "" },
  ]);

  useEffect(() => {
    setType(presetType);
    setNarration("");
    setPartyId("");
    setUseProducts(false);
    setProductLines([{ productId: "", description: "", quantity: "1", rate: "", gstRate: "18" }]);
    setEntries([
      { ledgerAccountId: "", debit: "", credit: "" },
      { ledgerAccountId: "", debit: "", credit: "" },
    ]);
  }, [presetType]);

  const { data: ledgers } = useQuery<LedgerAccount[]>({
    queryKey: ["/api/accounting/ledgers"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/accounting/products"],
    enabled: type === "sales" || type === "purchase",
  });

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/accounting/parties"],
    enabled: type === "sales" || type === "purchase",
  });

  const { data: nextNumber } = useQuery<{ voucherNumber: string }>({
    queryKey: [`/api/accounting/vouchers/next-number/${type}`],
    enabled: !!type,
  });

  useEffect(() => {
    if (nextNumber?.voucherNumber) {
      setVoucherNumber(nextNumber.voucherNumber);
    }
  }, [nextNumber]);

  const isSalesPurchase = type === "sales" || type === "purchase";

  const filteredParties = useMemo(() => {
    if (!parties) return [];
    if (type === "sales") return parties.filter(p => p.type === "customer" || p.type === "both");
    if (type === "purchase") return parties.filter(p => p.type === "vendor" || p.type === "both");
    return parties;
  }, [parties, type]);

  const productMap = useMemo(() => new Map(products?.map(p => [String(p.id), p]) || []), [products]);

  const productCalcs = useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    const lines = productLines.map(line => {
      const qty = parseFloat(line.quantity) || 0;
      const rate = parseFloat(line.rate) || 0;
      const amount = qty * rate;
      const gstRate = parseFloat(line.gstRate) || 0;
      const gstAmount = amount * gstRate / 100;
      subtotal += amount;
      if (isInterState) {
        igst += gstAmount;
      } else {
        cgst += gstAmount / 2;
        sgst += gstAmount / 2;
      }
      return { amount, gstAmount };
    });
    return { subtotal, cgst, sgst, igst, grandTotal: subtotal + cgst + sgst + igst, lines };
  }, [productLines, isInterState]);

  const generateEntriesFromProducts = (): EntryRow[] => {
    if (!ledgers || productCalcs.subtotal === 0) return entries;
    const findLedger = (name: string) => ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()));

    const salesAccount = findLedger("Sales Account") || findLedger("Sales");
    const purchaseAccount = findLedger("Purchase Account") || findLedger("Purchases");
    const cgstPayable = findLedger("CGST Payable");
    const sgstPayable = findLedger("SGST Payable");
    const igstPayable = findLedger("IGST Payable");
    const cgstReceivable = findLedger("CGST Receivable");
    const sgstReceivable = findLedger("SGST Receivable");
    const igstReceivable = findLedger("IGST Receivable");
    const sundryDebtors = findLedger("Sundry Debtors");
    const sundryCreditors = findLedger("Sundry Creditors");

    const newEntries: EntryRow[] = [];

    if (type === "sales") {
      if (sundryDebtors) {
        newEntries.push({ ledgerAccountId: String(sundryDebtors.id), debit: productCalcs.grandTotal.toFixed(2), credit: "" });
      }
      if (salesAccount) {
        newEntries.push({ ledgerAccountId: String(salesAccount.id), debit: "", credit: productCalcs.subtotal.toFixed(2) });
      }
      if (!isInterState) {
        if (cgstPayable && productCalcs.cgst > 0) newEntries.push({ ledgerAccountId: String(cgstPayable.id), debit: "", credit: productCalcs.cgst.toFixed(2) });
        if (sgstPayable && productCalcs.sgst > 0) newEntries.push({ ledgerAccountId: String(sgstPayable.id), debit: "", credit: productCalcs.sgst.toFixed(2) });
      } else {
        if (igstPayable && productCalcs.igst > 0) newEntries.push({ ledgerAccountId: String(igstPayable.id), debit: "", credit: productCalcs.igst.toFixed(2) });
      }
    } else if (type === "purchase") {
      if (purchaseAccount) {
        newEntries.push({ ledgerAccountId: String(purchaseAccount.id), debit: productCalcs.subtotal.toFixed(2), credit: "" });
      }
      if (!isInterState) {
        if (cgstReceivable && productCalcs.cgst > 0) newEntries.push({ ledgerAccountId: String(cgstReceivable.id), debit: productCalcs.cgst.toFixed(2), credit: "" });
        if (sgstReceivable && productCalcs.sgst > 0) newEntries.push({ ledgerAccountId: String(sgstReceivable.id), debit: productCalcs.sgst.toFixed(2), credit: "" });
      } else {
        if (igstReceivable && productCalcs.igst > 0) newEntries.push({ ledgerAccountId: String(igstReceivable.id), debit: productCalcs.igst.toFixed(2), credit: "" });
      }
      if (sundryCreditors) {
        newEntries.push({ ledgerAccountId: String(sundryCreditors.id), debit: "", credit: productCalcs.grandTotal.toFixed(2) });
      }
    }

    return newEntries.length >= 2 ? newEntries : entries;
  };

  const updateProductLine = (idx: number, field: keyof ProductLine, value: string) => {
    const updated = [...productLines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "productId" && value) {
      const product = productMap.get(value);
      if (product) {
        updated[idx].description = product.name;
        updated[idx].rate = product.rate;
        updated[idx].gstRate = product.gstRate;
      }
    }
    setProductLines(updated);
  };

  const addProductLine = () => setProductLines([...productLines, { productId: "", description: "", quantity: "1", rate: "", gstRate: "18" }]);
  const removeProductLine = (idx: number) => { if (productLines.length > 1) setProductLines(productLines.filter((_, i) => i !== idx)); };

  const finalEntries = useProducts && isSalesPurchase ? generateEntriesFromProducts() : entries;
  const totalDebit = finalEntries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredit = finalEntries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

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
      const submitEntries = finalEntries
        .filter(e => e.ledgerAccountId && (parseFloat(e.debit) || parseFloat(e.credit)))
        .map(e => ({
          ledgerAccountId: parseInt(e.ledgerAccountId),
          debit: (parseFloat(e.debit) || 0).toFixed(2),
          credit: (parseFloat(e.credit) || 0).toFixed(2),
        }));

      const body: any = {
        voucherNumber,
        date,
        type,
        narration,
        totalAmount: totalDebit.toFixed(2),
        status,
        entries: submitEntries,
      };

      if (isSalesPurchase && partyId) {
        body.partyId = parseInt(partyId);
      }
      if (useProducts && isSalesPurchase) {
        body.taxableAmount = productCalcs.subtotal.toFixed(2);
        body.cgstAmount = productCalcs.cgst.toFixed(2);
        body.sgstAmount = productCalcs.sgst.toFixed(2);
        body.igstAmount = productCalcs.igst.toFixed(2);
        body.isInterState = isInterState;
      }

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

  const missingLedgers = useMemo(() => {
    if (!useProducts || !isSalesPurchase || !ledgers) return [];
    const missing: string[] = [];
    const find = (name: string) => ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()));
    if (type === "sales") {
      if (!find("Sales Account") && !find("Sales")) missing.push("Sales Account");
      if (!find("Sundry Debtors")) missing.push("Sundry Debtors");
    } else {
      if (!find("Purchase Account") && !find("Purchases")) missing.push("Purchase Account");
      if (!find("Sundry Creditors")) missing.push("Sundry Creditors");
    }
    if (!isInterState) {
      if (!find("CGST " + (type === "sales" ? "Payable" : "Receivable"))) missing.push("CGST " + (type === "sales" ? "Payable" : "Receivable"));
      if (!find("SGST " + (type === "sales" ? "Payable" : "Receivable"))) missing.push("SGST " + (type === "sales" ? "Payable" : "Receivable"));
    } else {
      if (!find("IGST " + (type === "sales" ? "Payable" : "Receivable"))) missing.push("IGST " + (type === "sales" ? "Payable" : "Receivable"));
    }
    return missing;
  }, [useProducts, isSalesPurchase, ledgers, type, isInterState]);

  const handleSubmit = () => {
    if (!voucherNumber) {
      toast({ title: "Voucher number is required", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date is required", variant: "destructive" });
      return;
    }
    if (isSalesPurchase && !partyId) {
      toast({ title: `Please select a ${type === "sales" ? "customer" : "vendor"}`, variant: "destructive" });
      return;
    }
    if (useProducts && isSalesPurchase && missingLedgers.length > 0) {
      toast({ title: "Missing required ledger accounts", description: missingLedgers.join(", "), variant: "destructive" });
      return;
    }
    if (!isBalanced) {
      toast({ title: "Total debits must equal total credits", variant: "destructive" });
      return;
    }
    const validEntries = finalEntries.filter(e => e.ledgerAccountId && (parseFloat(e.debit) || parseFloat(e.credit)));
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
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-voucher-date" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Voucher Number</label>
                <Input value={voucherNumber} readOnly className="bg-slate-50 dark:bg-slate-800" data-testid="input-voucher-number" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-voucher-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOUCHER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Narration</label>
                <Textarea value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Description of the transaction..." className="resize-none" rows={1} data-testid="input-voucher-narration" />
              </div>
            </div>

            {isSalesPurchase && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                    {type === "sales" ? "Customer" : "Vendor"}
                  </label>
                  <Select value={partyId} onValueChange={setPartyId}>
                    <SelectTrigger data-testid="select-voucher-party"><SelectValue placeholder="Select party..." /></SelectTrigger>
                    <SelectContent>
                      {filteredParties.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 pb-2">
                    <input type="checkbox" checked={isInterState} onChange={e => setIsInterState(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" data-testid="checkbox-inter-state" />
                    Inter-State (IGST)
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isSalesPurchase && (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-sky-500" />
                <CardTitle className="text-lg text-slate-900 dark:text-white">Products / Services</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={useProducts} onChange={e => setUseProducts(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" data-testid="checkbox-use-products" />
                  Use product items
                </label>
                {useProducts && (
                  <Button variant="outline" size="sm" onClick={addProductLine} data-testid="button-add-product-line">
                    <Plus className="w-4 h-4 mr-1" />Add
                  </Button>
                )}
              </div>
            </CardHeader>
            {useProducts && (
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-product-lines">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-6">#</th>
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2">Product/Service</th>
                        <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2">Description</th>
                        <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-20">Qty</th>
                        <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-28">Rate</th>
                        <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-20">GST%</th>
                        <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-2 py-2 w-28">Amount</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productLines.map((line, idx) => (
                        <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-2 py-2 text-sm text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-2 min-w-[150px]">
                            <Select value={line.productId} onValueChange={v => updateProductLine(idx, "productId", v)}>
                              <SelectTrigger data-testid={`select-vproduct-${idx}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {products?.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-2">
                            <Input value={line.description} onChange={e => updateProductLine(idx, "description", e.target.value)} placeholder="Description" data-testid={`input-vproduct-desc-${idx}`} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min="1" value={line.quantity} onChange={e => updateProductLine(idx, "quantity", e.target.value)} className="text-right" data-testid={`input-vproduct-qty-${idx}`} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min="0" step="0.01" value={line.rate} onChange={e => updateProductLine(idx, "rate", e.target.value)} className="text-right" data-testid={`input-vproduct-rate-${idx}`} />
                          </td>
                          <td className="px-2 py-2">
                            <Select value={line.gstRate} onValueChange={v => updateProductLine(idx, "gstRate", v)}>
                              <SelectTrigger data-testid={`select-vgst-${idx}`}><SelectValue /></SelectTrigger>
                              <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-2 text-right text-sm font-medium text-slate-900 dark:text-white">
                            ₹{productCalcs.lines[idx]?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
                          </td>
                          <td className="px-2 py-2">
                            {productLines.length > 1 && (
                              <Button size="icon" variant="ghost" className="text-red-500 dark:text-red-400" onClick={() => removeProductLine(idx)} data-testid={`button-remove-vproduct-${idx}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Subtotal</span>
                      <span>₹{productCalcs.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {!isInterState ? (
                      <>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>CGST</span>
                          <span>₹{productCalcs.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>SGST</span>
                          <span>₹{productCalcs.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>IGST</span>
                        <span>₹{productCalcs.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                      <span>Total</span>
                      <span>₹{productCalcs.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                {missingLedgers.length > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded" data-testid="text-missing-ledgers-warning">
                    Missing ledger accounts: {missingLedgers.join(", ")}. Please create these ledgers first or entries won't generate correctly.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
            <CardTitle className="text-lg text-slate-900 dark:text-white">
              {useProducts && isSalesPurchase ? "Auto-Generated Entry Lines" : "Entry Lines"}
            </CardTitle>
            {!(useProducts && isSalesPurchase) && (
              <Button variant="outline" size="sm" onClick={addRow} data-testid="button-add-entry-row">
                <Plus className="w-4 h-4 mr-1" />Add Row
              </Button>
            )}
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
                  {(useProducts && isSalesPurchase ? finalEntries : entries).map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800" data-testid={`row-entry-${idx}`}>
                      <td className="px-2 py-2 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-2">
                        {useProducts && isSalesPurchase ? (
                          <div className="text-sm text-slate-900 dark:text-white px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded">
                            {activeLedgers.find(l => String(l.id) === entry.ledgerAccountId)?.name || "—"}
                          </div>
                        ) : (
                          <Select value={entry.ledgerAccountId} onValueChange={(val) => updateEntry(idx, "ledgerAccountId", val)}>
                            <SelectTrigger data-testid={`select-ledger-${idx}`}><SelectValue placeholder="Select account..." /></SelectTrigger>
                            <SelectContent>
                              {activeLedgers.map(l => (
                                <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {useProducts && isSalesPurchase ? (
                          <div className="text-right text-sm font-medium text-slate-900 dark:text-white px-2 py-1.5">
                            {parseFloat(entry.debit) ? parseFloat(entry.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                          </div>
                        ) : (
                          <Input type="number" min="0" step="0.01" placeholder="0.00" value={entry.debit} onChange={(e) => updateEntry(idx, "debit", e.target.value)} className="text-right" data-testid={`input-debit-${idx}`} />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {useProducts && isSalesPurchase ? (
                          <div className="text-right text-sm font-medium text-slate-900 dark:text-white px-2 py-1.5">
                            {parseFloat(entry.credit) ? parseFloat(entry.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                          </div>
                        ) : (
                          <Input type="number" min="0" step="0.01" placeholder="0.00" value={entry.credit} onChange={(e) => updateEntry(idx, "credit", e.target.value)} className="text-right" data-testid={`input-credit-${idx}`} />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {!(useProducts && isSalesPurchase) && entries.length > 2 && (
                          <Button size="icon" variant="ghost" className="text-red-500 dark:text-red-400" onClick={() => removeRow(idx)} data-testid={`button-remove-entry-${idx}`}>
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
                      <span className={`text-sm font-semibold ${isBalanced ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"}`} data-testid="text-total-debit">
                        {totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className={`text-sm font-semibold ${isBalanced ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-white"}`} data-testid="text-total-credit">
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
                {user?.role === "data_entry" ? "Voucher will be saved as Draft" : "Voucher will be saved as Pending"}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setLocation("/accounting/vouchers")} data-testid="button-cancel-voucher">Cancel</Button>
                <Button onClick={handleSubmit} disabled={!isBalanced || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-save-voucher">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
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
