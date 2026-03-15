import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { GST_RATES, PARTY_TYPES } from "@shared/schema";
import type { LedgerAccount, Product, Party } from "@shared/schema";
import { Plus, Trash2, Loader2, Save, UserPlus } from "lucide-react";

const PARTY_TYPE_LABELS: Record<string, string> = {
  customer: "Customer", vendor: "Vendor", both: "Both",
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman & Nicobar", "Dadra & Nagar Haveli", "Lakshadweep",
];

interface ProductLine {
  productId: string;
  description: string;
  quantity: string;
  rate: string;
  gstRate: string;
}

interface EntryRow {
  ledgerAccountId: string;
  debit: string;
  credit: string;
}

export default function InvoiceEntry() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [narration, setNarration] = useState("");
  const [partyId, setPartyId] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [productLines, setProductLines] = useState<ProductLine[]>([
    { productId: "", description: "", quantity: "1", rate: "", gstRate: "18" },
  ]);

  const [showNewPartyDialog, setShowNewPartyDialog] = useState(false);
  const [newParty, setNewParty] = useState({
    name: "", type: "customer" as string, email: "", phone: "",
    gstin: "", address: "", city: "", state: "", pincode: "",
  });

  const { data: ledgers } = useQuery<LedgerAccount[]>({ queryKey: ["/api/accounting/ledgers"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/accounting/products"] });
  const { data: parties } = useQuery<Party[]>({ queryKey: ["/api/accounting/parties"] });
  const { data: nextNumber } = useQuery<{ voucherNumber: string }>({
    queryKey: ["/api/accounting/vouchers/next-number/sales"],
  });

  useEffect(() => {
    if (nextNumber?.voucherNumber) setVoucherNumber(nextNumber.voucherNumber);
  }, [nextNumber]);

  const customers = parties?.filter(p => p.type === "customer" || p.type === "both") || [];
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

  const generateEntries = (): EntryRow[] => {
    if (!ledgers || productCalcs.subtotal === 0) return [];
    const findLedger = (name: string) => ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()));

    const salesAccount = findLedger("Sales Account") || findLedger("Sales");
    const cgstPayable = findLedger("CGST Payable");
    const sgstPayable = findLedger("SGST Payable");
    const igstPayable = findLedger("IGST Payable");
    const sundryDebtors = findLedger("Sundry Debtors");

    const newEntries: EntryRow[] = [];

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

    return newEntries;
  };

  const finalEntries = generateEntries();
  const totalDebit = finalEntries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredit = finalEntries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const missingLedgers = useMemo(() => {
    if (!ledgers) return [];
    const missing: string[] = [];
    const find = (name: string) => ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()));
    if (!find("Sales Account") && !find("Sales")) missing.push("Sales Account");
    if (!find("Sundry Debtors")) missing.push("Sundry Debtors");
    if (!isInterState) {
      if (!find("CGST Payable")) missing.push("CGST Payable");
      if (!find("SGST Payable")) missing.push("SGST Payable");
    } else {
      if (!find("IGST Payable")) missing.push("IGST Payable");
    }
    return missing;
  }, [ledgers, isInterState]);

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
        voucherNumber, date,
        type: "sales",
        narration,
        totalAmount: totalDebit.toFixed(2),
        status,
        entries: submitEntries,
        partyId: parseInt(partyId),
        taxableAmount: productCalcs.subtotal.toFixed(2),
        cgstAmount: productCalcs.cgst.toFixed(2),
        sgstAmount: productCalcs.sgst.toFixed(2),
        igstAmount: productCalcs.igst.toFixed(2),
        isInterState,
      };

      await apiRequest("POST", "/api/accounting/vouchers", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: "Invoice created successfully" });
      setLocation("/accounting/invoices");
    },
    onError: (err: Error) => {
      toast({ title: "Error creating invoice", description: err.message, variant: "destructive" });
    },
  });

  const createPartyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/parties", newParty);
      return res.json();
    },
    onSuccess: (data: Party) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/parties"] });
      toast({ title: "Party created successfully" });
      setPartyId(String(data.id));
      setShowNewPartyDialog(false);
      setNewParty({ name: "", type: "customer", email: "", phone: "", gstin: "", address: "", city: "", state: "", pincode: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error creating party", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!voucherNumber) {
      toast({ title: "Invoice number is required", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Date is required", variant: "destructive" });
      return;
    }
    if (!partyId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }
    if (missingLedgers.length > 0) {
      toast({ title: "Missing required ledger accounts", description: missingLedgers.join(", "), variant: "destructive" });
      return;
    }
    if (!isBalanced) {
      toast({ title: "Please add at least one line item with a rate", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const ledgerMap = new Map(ledgers?.map(l => [String(l.id), l.name]) || []);

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-invoice-entry-title">New Invoice</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create a new sales invoice</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-4"><CardTitle className="text-lg text-slate-900 dark:text-white">Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Invoice Number</label>
                <Input value={voucherNumber} readOnly className="bg-slate-50 dark:bg-slate-800" data-testid="input-invoice-number" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-invoice-date" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Customer</label>
                <div className="flex gap-2">
                  <Select value={partyId} onValueChange={setPartyId}>
                    <SelectTrigger className="flex-1" data-testid="select-invoice-party"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setShowNewPartyDialog(true)} title="Add new customer" data-testid="button-invoice-quick-add-party">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={isInterState} onChange={e => setIsInterState(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" data-testid="checkbox-invoice-inter-state" />
                Inter-State Supply (IGST)
              </label>
            </div>
          </CardContent>
        </Card>

        {missingLedgers.length > 0 && (
          <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Missing required ledger accounts:</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{missingLedgers.join(", ")}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Please create these ledger accounts in the Ledger Accounts section before creating invoices.</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg text-slate-900 dark:text-white">Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addProductLine} data-testid="button-invoice-add-line"><Plus className="w-4 h-4 mr-1" />Add Item</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-invoice-items">
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
                          <SelectTrigger data-testid={`select-invoice-product-${idx}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {products?.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Input value={line.description} onChange={e => updateProductLine(idx, "description", e.target.value)} placeholder="Description" data-testid={`input-invoice-desc-${idx}`} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="1" value={line.quantity} onChange={e => updateProductLine(idx, "quantity", e.target.value)} className="text-right" data-testid={`input-invoice-qty-${idx}`} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.01" value={line.rate} onChange={e => updateProductLine(idx, "rate", e.target.value)} className="text-right" data-testid={`input-invoice-rate-${idx}`} />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={line.gstRate} onValueChange={v => updateProductLine(idx, "gstRate", v)}>
                          <SelectTrigger data-testid={`select-invoice-gst-${idx}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-medium text-slate-900 dark:text-white">
                        ₹{productCalcs.lines[idx]?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
                      </td>
                      <td className="px-2 py-2">
                        {productLines.length > 1 && (
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeProductLine(idx)} data-testid={`button-invoice-remove-item-${idx}`}>
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
                  <span>Grand Total</span>
                  <span>₹{productCalcs.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {finalEntries.length > 0 && (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-4"><CardTitle className="text-lg text-slate-900 dark:text-white">Auto-Generated Ledger Entries</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Ledger Account</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Debit (₹)</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {finalEntries.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{ledgerMap.get(entry.ledgerAccountId) || `Ledger #${entry.ledgerAccountId}`}</td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{parseFloat(entry.debit) > 0 ? parseFloat(entry.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</td>
                      <td className="px-3 py-2 text-right text-slate-900 dark:text-white">{parseFloat(entry.credit) > 0 ? parseFloat(entry.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Narration / Notes</label>
            <Textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="Additional notes..." rows={2} className="resize-none" data-testid="input-invoice-narration" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setLocation("/accounting/invoices")} data-testid="button-cancel-invoice">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!partyId || productCalcs.subtotal === 0 || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-save-invoice">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Invoice
          </Button>
        </div>
      </div>

      <Dialog open={showNewPartyDialog} onOpenChange={setShowNewPartyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-500" />
              Quick Add Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Name *</label>
                <Input value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} placeholder="Company / Individual name" data-testid="input-invoice-new-party-name" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                <Select value={newParty.type} onValueChange={v => setNewParty({...newParty, type: v})}>
                  <SelectTrigger data-testid="select-invoice-new-party-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTY_TYPES.map(t => <SelectItem key={t} value={t}>{PARTY_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Phone</label>
                <Input value={newParty.phone} onChange={e => setNewParty({...newParty, phone: e.target.value})} placeholder="+91 9876543210" data-testid="input-invoice-new-party-phone" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Email</label>
                <Input type="email" value={newParty.email} onChange={e => setNewParty({...newParty, email: e.target.value})} placeholder="email@example.com" data-testid="input-invoice-new-party-email" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">GSTIN</label>
                <Input value={newParty.gstin} onChange={e => setNewParty({...newParty, gstin: e.target.value.toUpperCase()})} placeholder="22AAAAA0000A1Z5" maxLength={15} data-testid="input-invoice-new-party-gstin" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Address</label>
                <Input value={newParty.address} onChange={e => setNewParty({...newParty, address: e.target.value})} placeholder="Full address" data-testid="input-invoice-new-party-address" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">City</label>
                <Input value={newParty.city} onChange={e => setNewParty({...newParty, city: e.target.value})} placeholder="Chennai" data-testid="input-invoice-new-party-city" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">State</label>
                <Select value={newParty.state} onValueChange={v => setNewParty({...newParty, state: v})}>
                  <SelectTrigger data-testid="select-invoice-new-party-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Pincode</label>
                <Input value={newParty.pincode} onChange={e => setNewParty({...newParty, pincode: e.target.value})} placeholder="600001" maxLength={6} data-testid="input-invoice-new-party-pincode" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPartyDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createPartyMutation.mutate()}
              disabled={!newParty.name || createPartyMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white"
              data-testid="button-invoice-save-new-party"
            >
              {createPartyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Create & Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
