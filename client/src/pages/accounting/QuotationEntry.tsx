import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import type { Party, Product } from "@shared/schema";
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

interface LineItem {
  productId: string;
  description: string;
  quantity: string;
  rate: string;
  gstRate: string;
}

export default function QuotationEntry() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [partyId, setPartyId] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("1. Payment due within 30 days of invoice.\n2. All prices are in INR.\n3. GST will be charged as applicable.");
  const [items, setItems] = useState<LineItem[]>([
    { productId: "", description: "", quantity: "1", rate: "", gstRate: "18" },
  ]);

  const [showNewPartyDialog, setShowNewPartyDialog] = useState(false);
  const [newParty, setNewParty] = useState({
    name: "", type: "customer" as string, email: "", phone: "",
    gstin: "", address: "", city: "", state: "", pincode: "",
  });

  const { data: parties } = useQuery<Party[]>({ queryKey: ["/api/accounting/parties"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/accounting/products"] });
  const { data: nextNumber } = useQuery<{ quotationNumber: string }>({ queryKey: ["/api/accounting/quotations/next-number"] });

  const [quotationNumber, setQuotationNumber] = useState("");
  useEffect(() => {
    if (nextNumber?.quotationNumber) setQuotationNumber(nextNumber.quotationNumber);
  }, [nextNumber]);

  const productMap = useMemo(() => new Map(products?.map(p => [String(p.id), p]) || []), [products]);

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "productId" && value) {
      const product = productMap.get(value);
      if (product) {
        updated[idx].description = product.name;
        updated[idx].rate = product.rate;
        updated[idx].gstRate = product.gstRate;
      }
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { productId: "", description: "", quantity: "1", rate: "", gstRate: "18" }]);
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };

  const calculations = useMemo(() => {
    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const lineCalcs = items.map(item => {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = qty * rate;
      const gstRate = parseFloat(item.gstRate) || 0;
      const gstAmount = amount * gstRate / 100;

      subtotal += amount;
      if (isInterState) {
        igstTotal += gstAmount;
      } else {
        cgstTotal += gstAmount / 2;
        sgstTotal += gstAmount / 2;
      }

      return { amount, gstAmount };
    });

    const grandTotal = subtotal + cgstTotal + sgstTotal + igstTotal;
    return { subtotal, cgstTotal, sgstTotal, igstTotal, grandTotal, lineCalcs };
  }, [items, isInterState]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = {
        quotationNumber, date, validUntil: validUntil || null,
        partyId: parseInt(partyId),
        items: items.map((item, idx) => ({
          productId: item.productId ? parseInt(item.productId) : null,
          description: item.description,
          quantity: parseFloat(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          amount: calculations.lineCalcs[idx].amount,
          gstRate: parseFloat(item.gstRate) || 0,
        })),
        subtotal: calculations.subtotal.toFixed(2),
        cgstTotal: calculations.cgstTotal.toFixed(2),
        sgstTotal: calculations.sgstTotal.toFixed(2),
        igstTotal: calculations.igstTotal.toFixed(2),
        grandTotal: calculations.grandTotal.toFixed(2),
        isInterState, notes, termsAndConditions,
        status: "draft",
      };
      await apiRequest("POST", "/api/accounting/quotations", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/quotations"] });
      toast({ title: "Quotation created successfully" });
      setLocation("/accounting/quotations");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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

  const customers = parties?.filter(p => p.type === "customer" || p.type === "both") || [];

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-quotation-entry-title">New Quotation</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create a new quotation / estimate</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-4"><CardTitle className="text-lg text-slate-900 dark:text-white">Quotation Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Quotation Number</label>
                <Input value={quotationNumber} readOnly className="bg-slate-50 dark:bg-slate-800" data-testid="input-quotation-number" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-quotation-date" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Valid Until</label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} data-testid="input-quotation-valid-until" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Customer</label>
                <div className="flex gap-2">
                  <Select value={partyId} onValueChange={setPartyId}>
                    <SelectTrigger className="flex-1" data-testid="select-quotation-party"><SelectValue placeholder="Select customer..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setShowNewPartyDialog(true)} title="Add new customer" data-testid="button-quick-add-party">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={isInterState} onChange={e => setIsInterState(e.target.checked)} className="rounded border-slate-300 dark:border-slate-600" data-testid="checkbox-inter-state" />
                Inter-State Supply (IGST)
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg text-slate-900 dark:text-white">Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-line-item"><Plus className="w-4 h-4 mr-1" />Add Item</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-quotation-items">
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
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-2 min-w-[150px]">
                        <Select value={item.productId} onValueChange={v => updateItem(idx, "productId", v)}>
                          <SelectTrigger data-testid={`select-product-${idx}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {products?.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        <Input value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Description" data-testid={`input-item-desc-${idx}`} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} className="text-right" data-testid={`input-item-qty-${idx}`} />
                      </td>
                      <td className="px-2 py-2">
                        <Input type="number" min="0" step="0.01" value={item.rate} onChange={e => updateItem(idx, "rate", e.target.value)} className="text-right" data-testid={`input-item-rate-${idx}`} />
                      </td>
                      <td className="px-2 py-2">
                        <Select value={item.gstRate} onValueChange={v => updateItem(idx, "gstRate", v)}>
                          <SelectTrigger data-testid={`select-gst-${idx}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-medium text-slate-900 dark:text-white">
                        ₹{calculations.lineCalcs[idx]?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
                      </td>
                      <td className="px-2 py-2">
                        {items.length > 1 && (
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={() => removeItem(idx)} data-testid={`button-remove-item-${idx}`}>
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
                  <span>₹{calculations.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {!isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>CGST</span>
                      <span>₹{calculations.cgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>SGST</span>
                      <span>₹{calculations.sgstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>IGST</span>
                    <span>₹{calculations.igstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>Grand Total</span>
                  <span>₹{calculations.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} className="resize-none" data-testid="input-quotation-notes" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Terms & Conditions</label>
              <Textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)} rows={3} className="resize-none" data-testid="input-quotation-terms" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setLocation("/accounting/quotations")} data-testid="button-cancel-quotation">Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!partyId || items.every(i => !i.rate) || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-save-quotation">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Quotation
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
                <Input value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} placeholder="Company / Individual name" data-testid="input-new-party-name" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                <Select value={newParty.type} onValueChange={v => setNewParty({...newParty, type: v})}>
                  <SelectTrigger data-testid="select-new-party-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTY_TYPES.map(t => <SelectItem key={t} value={t}>{PARTY_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Phone</label>
                <Input value={newParty.phone} onChange={e => setNewParty({...newParty, phone: e.target.value})} placeholder="+91 9876543210" data-testid="input-new-party-phone" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Email</label>
                <Input type="email" value={newParty.email} onChange={e => setNewParty({...newParty, email: e.target.value})} placeholder="email@example.com" data-testid="input-new-party-email" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">GSTIN</label>
                <Input value={newParty.gstin} onChange={e => setNewParty({...newParty, gstin: e.target.value.toUpperCase()})} placeholder="22AAAAA0000A1Z5" maxLength={15} data-testid="input-new-party-gstin" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Address</label>
                <Input value={newParty.address} onChange={e => setNewParty({...newParty, address: e.target.value})} placeholder="Full address" data-testid="input-new-party-address" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">City</label>
                <Input value={newParty.city} onChange={e => setNewParty({...newParty, city: e.target.value})} placeholder="Chennai" data-testid="input-new-party-city" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">State</label>
                <Select value={newParty.state} onValueChange={v => setNewParty({...newParty, state: v})}>
                  <SelectTrigger data-testid="select-new-party-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Pincode</label>
                <Input value={newParty.pincode} onChange={e => setNewParty({...newParty, pincode: e.target.value})} placeholder="600001" maxLength={6} data-testid="input-new-party-pincode" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPartyDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createPartyMutation.mutate()}
              disabled={!newParty.name || createPartyMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white"
              data-testid="button-save-new-party"
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
