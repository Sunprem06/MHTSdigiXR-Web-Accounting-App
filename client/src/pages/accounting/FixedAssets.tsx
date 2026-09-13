import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { FixedAsset, LedgerAccount } from "@shared/schema";
import { FIXED_ASSET_CATEGORY_DEFAULTS, DEPRECIATION_METHODS, FIXED_ASSET_DISPOSAL_METHODS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttachmentsPanel } from "@/components/accounting/AttachmentsPanel";
import { FixedAssetDepreciationSchedule } from "@/components/accounting/FixedAssetDepreciationSchedule";
import { AlertTriangle, Plus, Pencil, Loader2, Trash2, Paperclip, TrendingDown, Archive } from "lucide-react";

const emptyForm = {
  assetCode: "", name: "", category: "other", ledgerAccountId: "",
  acquisitionDate: "", originalCost: "", usefulLifeYears: "5",
  depreciationMethod: "wdv", residualValue: "0", residualValueJustification: "",
  location: "", vendorName: "", invoiceRef: "", serialNumber: "", notes: "",
  assignedToEmployeeId: "",
};

const emptyDisposalForm = {
  disposalDate: "", disposalMethod: "sold", disposalProceeds: "0", disposalReason: "",
};

const DISPOSAL_METHOD_LABELS: Record<string, string> = {
  sold: "Sold", scrapped: "Scrapped", written_off: "Written Off",
};

export default function FixedAssets() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canCreate = hasPermission("fixed_assets.create");
  const canManage = hasPermission("fixed_assets.edit");
  const canDispose = hasPermission("fixed_assets.dispose");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [attachmentsFor, setAttachmentsFor] = useState<FixedAsset | null>(null);
  const [depreciationFor, setDepreciationFor] = useState<FixedAsset | null>(null);
  const [disposingAsset, setDisposingAsset] = useState<FixedAsset | null>(null);
  const [disposalForm, setDisposalForm] = useState(emptyDisposalForm);
  const [form, setForm] = useState(emptyForm);

  const { data: assets, isLoading } = useQuery<FixedAsset[]>({
    queryKey: ["/api/accounting/fixed-assets"],
  });

  const { data: ledgerAccounts } = useQuery<LedgerAccount[]>({
    queryKey: ["/api/accounting/ledgers"],
  });

  const { data: assignableEmployees } = useQuery<{ id: number; fullName: string; employeeCode: string | null }[]>({
    queryKey: ["/api/accounting/fixed-assets/assignable-employees"],
  });

  const residualCap = form.originalCost ? parseFloat(form.originalCost) * 0.05 : 0;
  const residualExceedsCap = !!form.originalCost && parseFloat(form.residualValue || "0") > residualCap;

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/fixed-assets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/ledgers"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Fixed asset registered" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/fixed-assets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/fixed-assets"] });
      setEditOpen(false);
      setEditingAsset(null);
      toast({ title: "Fixed asset updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/accounting/fixed-assets/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/fixed-assets"] });
      toast({ title: "Fixed asset deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const disposeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("POST", `/api/accounting/fixed-assets/${id}/dispose`, data);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/fixed-assets"] });
      setDisposingAsset(null);
      const gainLossText = result.gainLoss >= 0
        ? `Gain of ₹${result.gainLoss.toLocaleString("en-IN")}`
        : `Loss of ₹${Math.abs(result.gainLoss).toLocaleString("en-IN")}`;
      toast({ title: "Asset disposed", description: `Book value at disposal: ₹${result.bookValueAtDisposal.toLocaleString("en-IN")}. ${gainLossText}.` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openDispose = (a: FixedAsset) => {
    setDisposingAsset(a);
    setDisposalForm(emptyDisposalForm);
  };

  const buildPayload = () => ({
    ...form,
    ledgerAccountId: form.ledgerAccountId ? parseInt(form.ledgerAccountId) : undefined,
    residualValueJustification: form.residualValueJustification || null,
    location: form.location || null,
    vendorName: form.vendorName || null,
    invoiceRef: form.invoiceRef || null,
    serialNumber: form.serialNumber || null,
    notes: form.notes || null,
    assignedToEmployeeId: form.assignedToEmployeeId ? parseInt(form.assignedToEmployeeId) : null,
  });

  const openAdd = async () => {
    let suggestedCode = "";
    try {
      const res = await apiRequest("GET", "/api/accounting/fixed-assets/next-code");
      const data = await res.json();
      suggestedCode = data.assetCode;
    } catch {
      // Suggested code is a convenience only — leave blank if the lookup fails.
    }
    setForm({ ...emptyForm, assetCode: suggestedCode });
    setAddOpen(true);
  };

  const openEdit = (a: FixedAsset) => {
    setEditingAsset(a);
    setForm({
      assetCode: a.assetCode, name: a.name, category: a.category,
      ledgerAccountId: String(a.ledgerAccountId), acquisitionDate: a.acquisitionDate,
      originalCost: a.originalCost, usefulLifeYears: a.usefulLifeYears,
      depreciationMethod: a.depreciationMethod, residualValue: a.residualValue,
      residualValueJustification: a.residualValueJustification || "",
      location: a.location || "", vendorName: a.vendorName || "",
      invoiceRef: a.invoiceRef || "", serialNumber: a.serialNumber || "",
      notes: a.notes || "",
      assignedToEmployeeId: a.assignedToEmployeeId ? String(a.assignedToEmployeeId) : "",
    });
    setEditOpen(true);
  };

  const onCategoryChange = (category: string) => {
    const categoryDefault = FIXED_ASSET_CATEGORY_DEFAULTS[category as keyof typeof FIXED_ASSET_CATEGORY_DEFAULTS];
    const matchingLedger = ledgerAccounts?.find(l => l.name === categoryDefault?.defaultLedgerAccountName);
    setForm({
      ...form,
      category,
      usefulLifeYears: String(categoryDefault?.defaultUsefulLifeYears ?? form.usefulLifeYears),
      ledgerAccountId: matchingLedger ? String(matchingLedger.id) : form.ledgerAccountId,
    });
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><Label>Asset Code *</Label><Input value={form.assetCode} onChange={e => setForm({ ...form, assetCode: e.target.value })} data-testid="input-fa-code" /></div>
      <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Laptop - Dell Latitude 5420" data-testid="input-fa-name" /></div>
      <div>
        <Label>Category</Label>
        <Select value={form.category} onValueChange={onCategoryChange}>
          <SelectTrigger data-testid="select-fa-category"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(FIXED_ASSET_CATEGORY_DEFAULTS).map(([key, def]) => (
              <SelectItem key={key} value={key}>{def.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Ledger Account</Label>
        <Select value={form.ledgerAccountId} onValueChange={v => setForm({ ...form, ledgerAccountId: v })}>
          <SelectTrigger data-testid="select-fa-ledger"><SelectValue placeholder="Auto-resolved from category" /></SelectTrigger>
          <SelectContent>
            {ledgerAccounts?.map(l => (
              <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Acquisition Date *</Label>
        <Input type="date" value={form.acquisitionDate} onChange={e => setForm({ ...form, acquisitionDate: e.target.value })} data-testid="input-fa-acquisition-date" />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Past dates are allowed — for assets bought years ago.</p>
      </div>
      <div><Label>Original Cost (INR) *</Label><Input type="number" min="0" value={form.originalCost} onChange={e => setForm({ ...form, originalCost: e.target.value })} data-testid="input-fa-cost" /></div>
      <div><Label>Useful Life (Years)</Label><Input type="number" min="0" step="0.5" value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: e.target.value })} data-testid="input-fa-useful-life" /></div>
      <div>
        <Label>Depreciation Method</Label>
        <Select value={form.depreciationMethod} onValueChange={v => setForm({ ...form, depreciationMethod: v })}>
          <SelectTrigger data-testid="select-fa-method"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPRECIATION_METHODS.map(m => (
              <SelectItem key={m} value={m}>{m === "slm" ? "Straight Line (SLM)" : "Written Down Value (WDV)"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Residual Value (INR)</Label><Input type="number" min="0" value={form.residualValue} onChange={e => setForm({ ...form, residualValue: e.target.value })} data-testid="input-fa-residual" /></div>
      {residualExceedsCap && (
        <div className="sm:col-span-2">
          <Label>Justification (required — residual exceeds 5% of cost)</Label>
          <Textarea value={form.residualValueJustification} onChange={e => setForm({ ...form, residualValueJustification: e.target.value })} placeholder="Technical justification per Schedule II Part C, note 4" data-testid="input-fa-residual-justification" />
        </div>
      )}
      <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Chennai Office - 2nd Floor" data-testid="input-fa-location" /></div>
      <div>
        <Label>Assigned To (optional)</Label>
        <Select value={form.assignedToEmployeeId || "none"} onValueChange={v => setForm({ ...form, assignedToEmployeeId: v === "none" ? "" : v })}>
          <SelectTrigger data-testid="select-fa-assigned-to"><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {assignableEmployees?.map(e => (
              <SelectItem key={e.id} value={String(e.id)}>{e.fullName}{e.employeeCode ? ` (${e.employeeCode})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lets the Resignation/Exit checklist auto-list this asset for return.</p>
      </div>
      <div><Label>Vendor Name</Label><Input value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} data-testid="input-fa-vendor" /></div>
      <div><Label>Invoice Ref</Label><Input value={form.invoiceRef} onChange={e => setForm({ ...form, invoiceRef: e.target.value })} data-testid="input-fa-invoice-ref" /></div>
      <div><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} data-testid="input-fa-serial" /></div>
      <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} data-testid="input-fa-notes" /></div>
    </div>
  );

  const isFormValid = !!(form.assetCode && form.name && form.acquisitionDate && form.originalCost && (!residualExceedsCap || form.residualValueJustification));

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Fixed Assets Register</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Per-item tracking for laptops, furniture, and other capital assets</p>
          </div>
          {canCreate && (
            <Button onClick={openAdd} data-testid="button-add-fixed-asset">
              <Plus className="w-4 h-4 mr-2" />Add Asset
            </Button>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4" data-testid="banner-ca-review-required">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">These rates are calculated, not legal advice.</p>
            <p className="mt-1">
              Depreciation is computed using this app's best-effort implementation of Companies Act 2013 Schedule II
              (SLM/WDV, day-based pro-rata for partial periods). Review with a Chartered Accountant before relying on
              these figures for statutory filings, audited financial statements, or tax computations.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !assets?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No fixed assets registered yet.</div>
            ) : (
              <Table data-testid="table-fixed-assets">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Acquisition Date</TableHead>
                    <TableHead>Original Cost</TableHead>
                    <TableHead>Accumulated Depreciation</TableHead>
                    <TableHead>Book Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(a => (
                    <TableRow key={a.id} data-testid={`row-fixed-asset-${a.id}`}>
                      <TableCell className="font-mono text-xs">{a.assetCode}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{FIXED_ASSET_CATEGORY_DEFAULTS[a.category as keyof typeof FIXED_ASSET_CATEGORY_DEFAULTS]?.label || a.category}</TableCell>
                      <TableCell>{a.acquisitionDate}</TableCell>
                      <TableCell>₹{parseFloat(a.originalCost).toLocaleString("en-IN")}</TableCell>
                      <TableCell>₹{parseFloat(a.accumulatedDepreciation).toLocaleString("en-IN")}</TableCell>
                      <TableCell>{a.currentBookValue !== null ? `₹${parseFloat(a.currentBookValue).toLocaleString("en-IN")}` : `₹${parseFloat(a.originalCost).toLocaleString("en-IN")}`}</TableCell>
                      <TableCell><Badge variant={a.status === "active" ? "default" : "outline"}>{a.status === "active" ? "Active" : a.status === "disposed" ? "Disposed" : "Scrapped"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setDepreciationFor(a)} title="Depreciation Schedule" data-testid={`button-depreciation-fixed-asset-${a.id}`}>
                            <TrendingDown className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setAttachmentsFor(a)} data-testid={`button-attachments-fixed-asset-${a.id}`}>
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          {canManage && (
                            <Button size="icon" variant="ghost" onClick={() => openEdit(a)} data-testid={`button-edit-fixed-asset-${a.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canDispose && a.status === "active" && (
                            <Button size="icon" variant="ghost" className="text-amber-600" onClick={() => openDispose(a)} title="Dispose" data-testid={`button-dispose-fixed-asset-${a.id}`}>
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                          {canManage && a.status === "active" && (
                            <Button size="icon" variant="ghost" className="text-red-600"
                              onClick={() => { if (confirm(`Delete fixed asset "${a.name}"? This cannot be undone.`)) deleteMutation.mutate(a.id); }}
                              disabled={deleteMutation.isPending} title="Delete" data-testid={`button-delete-fixed-asset-${a.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-add-fixed-asset">
            <DialogHeader><DialogTitle>Add Fixed Asset</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(buildPayload())} disabled={createMutation.isPending || !isFormValid} data-testid="button-submit-add-fixed-asset">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Register Asset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-fixed-asset">
            <DialogHeader><DialogTitle>Edit Fixed Asset</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => editingAsset && updateMutation.mutate({ id: editingAsset.id, data: buildPayload() })}
                disabled={updateMutation.isPending || !isFormValid}
                data-testid="button-submit-edit-fixed-asset"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!attachmentsFor} onOpenChange={(open) => !open && setAttachmentsFor(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Attachments — {attachmentsFor?.name}</DialogTitle></DialogHeader>
            {attachmentsFor && (
              <AttachmentsPanel entityType="fixed_asset" entityId={attachmentsFor.id} uploadPermission="fixed_assets.create" managePermission="fixed_assets.edit" />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!depreciationFor} onOpenChange={(open) => !open && setDepreciationFor(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-depreciation-schedule">
            <DialogHeader><DialogTitle>Depreciation Schedule — {depreciationFor?.name}</DialogTitle></DialogHeader>
            {depreciationFor && <FixedAssetDepreciationSchedule fixedAssetId={depreciationFor.id} />}
          </DialogContent>
        </Dialog>

        <Dialog open={!!disposingAsset} onOpenChange={(open) => !open && setDisposingAsset(null)}>
          <DialogContent className="max-w-md" data-testid="dialog-dispose-fixed-asset">
            <DialogHeader><DialogTitle>Dispose — {disposingAsset?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Current book value: {disposingAsset?.currentBookValue !== null && disposingAsset?.currentBookValue !== undefined
                  ? `₹${parseFloat(disposingAsset.currentBookValue).toLocaleString("en-IN")}`
                  : `₹${disposingAsset ? parseFloat(disposingAsset.originalCost).toLocaleString("en-IN") : "0"}`}
                {" "}(brought current as of the disposal date you enter below).
              </p>
              <div>
                <Label>Disposal Date *</Label>
                <Input type="date" value={disposalForm.disposalDate} onChange={e => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })} data-testid="input-disposal-date" />
              </div>
              <div>
                <Label>Disposal Method</Label>
                <Select value={disposalForm.disposalMethod} onValueChange={v => setDisposalForm({ ...disposalForm, disposalMethod: v })}>
                  <SelectTrigger data-testid="select-disposal-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIXED_ASSET_DISPOSAL_METHODS.map(m => (
                      <SelectItem key={m} value={m}>{DISPOSAL_METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sale Proceeds (INR)</Label>
                <Input type="number" min="0" value={disposalForm.disposalProceeds} onChange={e => setDisposalForm({ ...disposalForm, disposalProceeds: e.target.value })} data-testid="input-disposal-proceeds" />
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={disposalForm.disposalReason} onChange={e => setDisposalForm({ ...disposalForm, disposalReason: e.target.value })} data-testid="input-disposal-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisposingAsset(null)}>Cancel</Button>
              <Button
                onClick={() => disposingAsset && disposeMutation.mutate({
                  id: disposingAsset.id,
                  data: { ...disposalForm, disposalReason: disposalForm.disposalReason || null },
                })}
                disabled={disposeMutation.isPending || !disposalForm.disposalDate}
                data-testid="button-submit-dispose"
              >
                {disposeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirm Disposal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
