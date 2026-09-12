import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { PayrollStatutoryConfigVersion, PayrollStatutoryConfig, IncomeTaxSlab } from "@shared/schema";
import { DEFAULT_PAYROLL_STATUTORY_CONFIG } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Pencil, Trash2, CheckCircle, Loader2, Users, X } from "lucide-react";

type SlabForm = { upTo: string; ratePercent: string }; // upTo: "" means no upper bound (top slab)

type ConfigForm = {
  effectiveFrom: string; label: string; notes: string;
  esiHeadcountThreshold: string; epfHeadcountThreshold: string;
  pfRatePercent: string; pfEmployerRatePercent: string; pfWageCeilingApplied: boolean; pfWageCeiling: string;
  esiEmployeeRatePercent: string; esiEmployerRatePercent: string; esiWageCeiling: string;
  incomeTaxStandardDeduction: string; incomeTaxRebateThreshold: string; incomeTaxRebateCap: string; incomeTaxCessPercent: string;
  incomeTaxSlabs: SlabForm[];
};

const defaultSlabForm: SlabForm[] = DEFAULT_PAYROLL_STATUTORY_CONFIG.incomeTaxSlabs.map(s => ({ upTo: s.upTo === null ? "" : String(s.upTo), ratePercent: String(s.ratePercent) }));

const emptyForm: ConfigForm = {
  effectiveFrom: "", label: "", notes: "",
  esiHeadcountThreshold: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.esiHeadcountThreshold),
  epfHeadcountThreshold: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.epfHeadcountThreshold),
  pfRatePercent: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.pfRatePercent),
  pfEmployerRatePercent: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.pfEmployerRatePercent),
  pfWageCeilingApplied: DEFAULT_PAYROLL_STATUTORY_CONFIG.pfWageCeilingApplied,
  pfWageCeiling: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.pfWageCeiling),
  esiEmployeeRatePercent: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.esiEmployeeRatePercent),
  esiEmployerRatePercent: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.esiEmployerRatePercent),
  esiWageCeiling: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.esiWageCeiling),
  incomeTaxStandardDeduction: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.incomeTaxStandardDeduction),
  incomeTaxRebateThreshold: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.incomeTaxRebateThreshold),
  incomeTaxRebateCap: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.incomeTaxRebateCap),
  incomeTaxCessPercent: String(DEFAULT_PAYROLL_STATUTORY_CONFIG.incomeTaxCessPercent),
  incomeTaxSlabs: defaultSlabForm,
};

export default function PayrollStatutoryConfigPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("payroll_employees.manage");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<PayrollStatutoryConfigVersion | null>(null);
  const [form, setForm] = useState<ConfigForm>(emptyForm);

  const { data: versions, isLoading } = useQuery<PayrollStatutoryConfigVersion[]>({
    queryKey: ["/api/accounting/payroll-statutory-config"],
  });
  const { data: headcount } = useQuery<{ totalActive: number; pfApplicableCount: number; esiApplicableCount: number }>({
    queryKey: ["/api/accounting/payroll-employees/headcount-summary"],
  });
  const activeVersion = versions?.find(v => v.isActive);
  const activeConfig: PayrollStatutoryConfig = { ...DEFAULT_PAYROLL_STATUTORY_CONFIG, ...(activeVersion?.config as Partial<PayrollStatutoryConfig> | undefined) };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/payroll-statutory-config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-statutory-config"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Statutory config version created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/payroll-statutory-config/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-statutory-config"] });
      setEditOpen(false);
      setEditingVersion(null);
      toast({ title: "Statutory config version updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/payroll-statutory-config/${id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-statutory-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-statutory-config/active"] });
      toast({ title: "Statutory config version activated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/accounting/payroll-statutory-config/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-statutory-config"] });
      toast({ title: "Statutory config version deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const buildPayload = () => ({
    effectiveFrom: form.effectiveFrom,
    label: form.label,
    notes: form.notes || null,
    config: {
      esiHeadcountThreshold: parseInt(form.esiHeadcountThreshold) || 0,
      epfHeadcountThreshold: parseInt(form.epfHeadcountThreshold) || 0,
      pfRatePercent: parseFloat(form.pfRatePercent) || 0,
      pfEmployerRatePercent: parseFloat(form.pfEmployerRatePercent) || 0,
      pfWageCeilingApplied: form.pfWageCeilingApplied,
      pfWageCeiling: parseFloat(form.pfWageCeiling) || 0,
      esiEmployeeRatePercent: parseFloat(form.esiEmployeeRatePercent) || 0,
      esiEmployerRatePercent: parseFloat(form.esiEmployerRatePercent) || 0,
      esiWageCeiling: parseFloat(form.esiWageCeiling) || 0,
      incomeTaxStandardDeduction: parseFloat(form.incomeTaxStandardDeduction) || 0,
      incomeTaxRebateThreshold: parseFloat(form.incomeTaxRebateThreshold) || 0,
      incomeTaxRebateCap: parseFloat(form.incomeTaxRebateCap) || 0,
      incomeTaxCessPercent: parseFloat(form.incomeTaxCessPercent) || 0,
      incomeTaxSlabs: form.incomeTaxSlabs.map(s => ({ upTo: s.upTo === "" ? null : parseFloat(s.upTo) || 0, ratePercent: parseFloat(s.ratePercent) || 0 })) as IncomeTaxSlab[],
    },
  });

  const openEdit = (v: PayrollStatutoryConfigVersion) => {
    const c: PayrollStatutoryConfig = { ...DEFAULT_PAYROLL_STATUTORY_CONFIG, ...(v.config as Partial<PayrollStatutoryConfig> | undefined) };
    setEditingVersion(v);
    setForm({
      effectiveFrom: v.effectiveFrom, label: v.label, notes: v.notes || "",
      esiHeadcountThreshold: String(c.esiHeadcountThreshold), epfHeadcountThreshold: String(c.epfHeadcountThreshold),
      pfRatePercent: String(c.pfRatePercent), pfEmployerRatePercent: String(c.pfEmployerRatePercent),
      pfWageCeilingApplied: c.pfWageCeilingApplied, pfWageCeiling: String(c.pfWageCeiling),
      esiEmployeeRatePercent: String(c.esiEmployeeRatePercent), esiEmployerRatePercent: String(c.esiEmployerRatePercent),
      esiWageCeiling: String(c.esiWageCeiling),
      incomeTaxStandardDeduction: String(c.incomeTaxStandardDeduction), incomeTaxRebateThreshold: String(c.incomeTaxRebateThreshold),
      incomeTaxRebateCap: String(c.incomeTaxRebateCap), incomeTaxCessPercent: String(c.incomeTaxCessPercent),
      incomeTaxSlabs: c.incomeTaxSlabs.map(s => ({ upTo: s.upTo === null ? "" : String(s.upTo), ratePercent: String(s.ratePercent) })),
    });
    setEditOpen(true);
  };

  const updateSlab = (index: number, field: keyof SlabForm, value: string) => {
    setForm(f => ({ ...f, incomeTaxSlabs: f.incomeTaxSlabs.map((s, i) => i === index ? { ...s, [field]: value } : s) }));
  };
  const addSlab = () => setForm(f => ({ ...f, incomeTaxSlabs: [...f.incomeTaxSlabs, { upTo: "", ratePercent: "" }] }));
  const removeSlab = (index: number) => setForm(f => ({ ...f, incomeTaxSlabs: f.incomeTaxSlabs.filter((_, i) => i !== index) }));

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label>Effective From *</Label><Input type="date" value={form.effectiveFrom} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} data-testid="input-config-effective-from" /></div>
        <div><Label>Label *</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="FY 2026-27 Statutory Rates" data-testid="input-config-label" /></div>
      </div>
      <div>
        <Label>Notes (optional)</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} data-testid="textarea-config-notes" />
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Headcount Thresholds (informational — doesn't auto-flip employee flags)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>ESI Headcount Threshold</Label><Input type="number" min="0" value={form.esiHeadcountThreshold} onChange={e => setForm({ ...form, esiHeadcountThreshold: e.target.value })} data-testid="input-config-esi-headcount" /></div>
          <div><Label>EPF Headcount Threshold</Label><Input type="number" min="0" value={form.epfHeadcountThreshold} onChange={e => setForm({ ...form, epfHeadcountThreshold: e.target.value })} data-testid="input-config-epf-headcount" /></div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Provident Fund (PF)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Employee Rate (%)</Label><Input type="number" min="0" step="0.01" value={form.pfRatePercent} onChange={e => setForm({ ...form, pfRatePercent: e.target.value })} data-testid="input-config-pf-rate" /></div>
          <div><Label>Employer Rate (%)</Label><Input type="number" min="0" step="0.01" value={form.pfEmployerRatePercent} onChange={e => setForm({ ...form, pfEmployerRatePercent: e.target.value })} data-testid="input-config-pf-employer-rate" /></div>
          <div className="flex items-center justify-between sm:col-span-2">
            <div>
              <Label>Apply Statutory Wage Ceiling</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">On: PF computed on min(Basic, ceiling). Off: PF computed on full actual Basic.</p>
            </div>
            <Switch checked={form.pfWageCeilingApplied} onCheckedChange={v => setForm({ ...form, pfWageCeilingApplied: v })} data-testid="switch-config-pf-ceiling-applied" />
          </div>
          <div><Label>Wage Ceiling (₹)</Label><Input type="number" min="0" value={form.pfWageCeiling} onChange={e => setForm({ ...form, pfWageCeiling: e.target.value })} disabled={!form.pfWageCeilingApplied} data-testid="input-config-pf-ceiling" /></div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Employees' State Insurance (ESI)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Employee Rate (%)</Label><Input type="number" min="0" step="0.01" value={form.esiEmployeeRatePercent} onChange={e => setForm({ ...form, esiEmployeeRatePercent: e.target.value })} data-testid="input-config-esi-employee-rate" /></div>
          <div><Label>Employer Rate (%)</Label><Input type="number" min="0" step="0.01" value={form.esiEmployerRatePercent} onChange={e => setForm({ ...form, esiEmployerRatePercent: e.target.value })} data-testid="input-config-esi-employer-rate" /></div>
          <div><Label>Gross Wage Ceiling (₹)</Label><Input type="number" min="0" value={form.esiWageCeiling} onChange={e => setForm({ ...form, esiWageCeiling: e.target.value })} data-testid="input-config-esi-ceiling" /></div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">ESI only applies when that month's gross earnings are at or below the ceiling.</p>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Income Tax — Sec 192 TDS (New Regime only)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><Label>Standard Deduction (₹)</Label><Input type="number" min="0" value={form.incomeTaxStandardDeduction} onChange={e => setForm({ ...form, incomeTaxStandardDeduction: e.target.value })} data-testid="input-config-std-deduction" /></div>
          <div><Label>Cess (%)</Label><Input type="number" min="0" step="0.01" value={form.incomeTaxCessPercent} onChange={e => setForm({ ...form, incomeTaxCessPercent: e.target.value })} data-testid="input-config-cess" /></div>
          <div><Label>Sec 87A Rebate Threshold (₹)</Label><Input type="number" min="0" value={form.incomeTaxRebateThreshold} onChange={e => setForm({ ...form, incomeTaxRebateThreshold: e.target.value })} data-testid="input-config-rebate-threshold" /></div>
          <div><Label>Sec 87A Rebate Cap (₹)</Label><Input type="number" min="0" value={form.incomeTaxRebateCap} onChange={e => setForm({ ...form, incomeTaxRebateCap: e.target.value })} data-testid="input-config-rebate-cap" /></div>
        </div>
        <Label>Tax Slabs (progressive — each row applies to income above the previous row's ceiling)</Label>
        <div className="space-y-2 mt-1">
          {form.incomeTaxSlabs.map((slab, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <Input type="number" min="0" placeholder="No upper bound" value={slab.upTo} onChange={e => updateSlab(i, "upTo", e.target.value)} data-testid={`input-slab-upto-${i}`} />
              </div>
              <span className="text-sm text-slate-500">up to, at</span>
              <div className="w-24">
                <Input type="number" min="0" step="0.01" value={slab.ratePercent} onChange={e => updateSlab(i, "ratePercent", e.target.value)} data-testid={`input-slab-rate-${i}`} />
              </div>
              <span className="text-sm text-slate-500">%</span>
              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => removeSlab(i)} data-testid={`button-remove-slab-${i}`}><X className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={addSlab} data-testid="button-add-slab"><Plus className="w-3.5 h-3.5 mr-1" />Add Slab</Button>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Leave the last row's "up to" blank for the top, uncapped slab. Old Regime (investment declarations, HRA/80C exemptions) is not supported — this is New Regime only.</p>
      </div>
    </div>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Statutory Config</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">PF/ESI rates and ceilings for the With-PF/ESI payslip format, plus Sec 192 TDS (New Regime) slabs used on every payslip</p>
          </div>
          {canManage && (
            <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} data-testid="button-add-config">
              <Plus className="w-4 h-4 mr-2" />New Config Version
            </Button>
          )}
        </div>

        {headcount && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 p-4" data-testid="banner-headcount-summary">
            <Users className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <p><strong>{headcount.totalActive}</strong> active payroll employee{headcount.totalActive === 1 ? "" : "s"} — {headcount.pfApplicableCount} PF-applicable, {headcount.esiApplicableCount} ESI-applicable.</p>
              {activeVersion ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Active config's headcount thresholds: ESI at {activeConfig.esiHeadcountThreshold}+, EPF at {activeConfig.epfHeadcountThreshold}+.
                  {headcount.totalActive >= activeConfig.esiHeadcountThreshold && " You're at or above the ESI threshold — review ESI coverage."}
                  {headcount.totalActive >= activeConfig.epfHeadcountThreshold && " You're at or above the EPF threshold — review PF coverage."}
                </p>
              ) : (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No active statutory config — the With-PF/ESI payslip format can't be used until one is activated below.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">These rates are configurable, not legal advice.</p>
            <p className="mt-1">The defaults shown match the published EPF/ESI Act rates and the New Tax Regime slabs/standard deduction/rebate for FY 2026-27 as of this build, but law can change independently of this app (a future Budget could revise these). Review with a Chartered Accountant before relying on these for a real payroll run.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !versions?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No statutory config versions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-statutory-config">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Effective From</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Label</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">PF</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">ESI</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Tax (New Regime)</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map(v => {
                      const c: PayrollStatutoryConfig = { ...DEFAULT_PAYROLL_STATUTORY_CONFIG, ...(v.config as Partial<PayrollStatutoryConfig> | undefined) };
                      return (
                        <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-config-${v.id}`}>
                          <td className="px-4 py-3 text-sm">{v.effectiveFrom}</td>
                          <td className="px-4 py-3 text-sm">{v.label}</td>
                          <td className="px-4 py-3 text-sm">{c.pfRatePercent}% (cap ₹{c.pfWageCeilingApplied ? c.pfWageCeiling.toLocaleString("en-IN") : "none"})</td>
                          <td className="px-4 py-3 text-sm">{c.esiEmployeeRatePercent}% (≤₹{c.esiWageCeiling.toLocaleString("en-IN")})</td>
                          <td className="px-4 py-3 text-sm">SD ₹{c.incomeTaxStandardDeduction.toLocaleString("en-IN")}, rebate ≤₹{c.incomeTaxRebateThreshold.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-center">
                            {v.isActive ? <Badge data-testid={`badge-active-${v.id}`}>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {canManage && !v.isActive && (
                                <Button size="sm" variant="ghost" className="text-green-700 text-xs"
                                  onClick={() => activateMutation.mutate(v.id)} disabled={activateMutation.isPending} data-testid={`button-activate-config-${v.id}`}>
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />Activate
                                </Button>
                              )}
                              {canManage && (
                                <>
                                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)} data-testid={`button-edit-config-${v.id}`}><Pencil className="w-4 h-4" /></Button>
                                  {!v.isActive && (
                                    <Button size="icon" variant="ghost" className="text-red-600"
                                      onClick={() => { if (confirm("Delete this statutory config version?")) deleteMutation.mutate(v.id); }}
                                      disabled={deleteMutation.isPending} data-testid={`button-delete-config-${v.id}`}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-add-config">
            <DialogHeader><DialogTitle>New Statutory Config Version</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(buildPayload())} disabled={createMutation.isPending || !form.effectiveFrom || !form.label} data-testid="button-submit-add-config">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-config">
            <DialogHeader><DialogTitle>Edit Statutory Config Version</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => editingVersion && updateMutation.mutate({ id: editingVersion.id, data: buildPayload() })}
                disabled={updateMutation.isPending || !form.label}
                data-testid="button-submit-edit-config"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
