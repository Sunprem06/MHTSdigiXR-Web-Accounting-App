import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AttachmentsPanel } from "@/components/accounting/AttachmentsPanel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PARTY_TYPES } from "@shared/schema";
import type { Party } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Users, Loader2, X, Save, Trash2, Paperclip } from "lucide-react";

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

export default function Parties() {
  const { canDelete } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [attachmentsFor, setAttachmentsFor] = useState<Party | null>(null);

  const [formData, setFormData] = useState({
    name: "", type: "customer" as string, email: "", phone: "",
    address: "", city: "", state: "", pincode: "", gstin: "",
    panNumber: "", creditPeriod: "30", creditLimit: "0",
    openingBalance: "0", balanceType: "debit" as string,
  });

  const { data: parties, isLoading } = useQuery<Party[]>({
    queryKey: ["/api/accounting/parties"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        await apiRequest("PATCH", `/api/accounting/parties/${editingId}`, formData);
      } else {
        await apiRequest("POST", "/api/accounting/parties", formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/parties"] });
      toast({ title: editingId ? "Party updated" : "Party created" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/parties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/parties"] });
      toast({ title: "Party deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", type: "customer", email: "", phone: "", address: "", city: "", state: "", pincode: "", gstin: "", panNumber: "", creditPeriod: "30", creditLimit: "0", openingBalance: "0", balanceType: "debit" });
  };

  const startEdit = (p: Party) => {
    setEditingId(p.id);
    setFormData({
      name: p.name, type: p.type, email: p.email || "", phone: p.phone || "",
      address: p.address || "", city: p.city || "", state: p.state || "",
      pincode: p.pincode || "", gstin: p.gstin || "", panNumber: p.panNumber || "",
      creditPeriod: String(p.creditPeriod || 30), creditLimit: p.creditLimit || "0",
      openingBalance: p.openingBalance || "0", balanceType: p.balanceType || "debit",
    });
    setShowForm(true);
  };

  const filtered = parties?.filter(p => {
    if (tab !== "all" && p.type !== tab && p.type !== "both") return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.gstin || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-parties-title">Parties</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage customers and vendors</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-add-party">
            <Plus className="w-4 h-4 mr-2" />New Party
          </Button>
        </div>

        {showForm && (
          <Card className="border-sky-200 dark:border-sky-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg text-slate-900 dark:text-white">{editingId ? "Edit Party" : "New Party"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Party Name</label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Company / Individual name" data-testid="input-party-name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                  <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                    <SelectTrigger data-testid="select-party-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PARTY_TYPES.map(t => <SelectItem key={t} value={t}>{PARTY_TYPE_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Email</label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" data-testid="input-party-email" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Phone</label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 9876543210" data-testid="input-party-phone" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">GSTIN</label>
                  <Input value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})} placeholder="22AAAAA0000A1Z5" maxLength={15} data-testid="input-party-gstin" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">PAN Number</label>
                  <Input value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value.toUpperCase()})} placeholder="AAAAA0000A" maxLength={10} data-testid="input-party-pan" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Address</label>
                  <Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address" rows={2} className="resize-none" data-testid="input-party-address" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">City</label>
                  <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Chennai" data-testid="input-party-city" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">State</label>
                  <Select value={formData.state} onValueChange={v => setFormData({...formData, state: v})}>
                    <SelectTrigger data-testid="select-party-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Pincode</label>
                  <Input value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} placeholder="600001" maxLength={6} data-testid="input-party-pincode" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Credit Period (days)</label>
                  <Input type="number" min="0" value={formData.creditPeriod} onChange={e => setFormData({...formData, creditPeriod: e.target.value})} data-testid="input-party-credit-period" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Credit Limit (INR)</label>
                  <Input type="number" min="0" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} data-testid="input-party-credit-limit" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Opening Balance</label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" value={formData.openingBalance} onChange={e => setFormData({...formData, openingBalance: e.target.value})} className="flex-1" data-testid="input-party-opening-balance" />
                    <Select value={formData.balanceType} onValueChange={v => setFormData({...formData, balanceType: v})}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Dr</SelectItem>
                        <SelectItem value="credit">Cr</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!formData.name || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-save-party">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {["all", "customer", "vendor"].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`} data-testid={`tab-${t}`}>
                {t === "all" ? "All" : PARTY_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by name or GSTIN..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-parties" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filtered?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No parties found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-parties">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">GSTIN</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">City</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Phone</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Balance</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-party-${p.id}`}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={p.type === "customer" ? "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" : p.type === "vendor" ? "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" : "text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800"}>
                          {PARTY_TYPE_LABELS[p.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono text-xs">{p.gstin || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{p.city || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{p.phone || "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">
                        {parseFloat(p.openingBalance || "0") > 0 ? `₹${parseFloat(p.openingBalance || "0").toLocaleString("en-IN")} ${p.balanceType === "credit" ? "Cr" : "Dr"}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setAttachmentsFor(p)} data-testid={`button-attachments-party-${p.id}`}>
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(p)} data-testid={`button-edit-party-${p.id}`}>Edit</Button>
                          {canDelete && (
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={() => { if (confirm("Are you sure you want to delete this party?")) deleteMutation.mutate(p.id); }} disabled={deleteMutation.isPending} data-testid={`button-delete-party-${p.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={!!attachmentsFor} onOpenChange={(open) => !open && setAttachmentsFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attachments — {attachmentsFor?.name}</DialogTitle>
          </DialogHeader>
          {attachmentsFor && (
            <AttachmentsPanel entityType="party" entityId={attachmentsFor.id} uploadPermission="parties.create" managePermission="parties.delete" />
          )}
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
