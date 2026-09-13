import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { PayrollCompensationStructure, PayrollEmployee } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const emptyForm = {
  payrollEmployeeId: "", effectiveFrom: "", reason: "", refNo: "",
  basicAnnual: "", hraAnnual: "", conveyanceAnnual: "", medicalAnnual: "", otherAllowancesAnnual: "",
};

function computeCtc(form: typeof emptyForm): number {
  return (parseFloat(form.basicAnnual) || 0) + (parseFloat(form.hraAnnual) || 0) + (parseFloat(form.conveyanceAnnual) || 0)
    + (parseFloat(form.medicalAnnual) || 0) + (parseFloat(form.otherAllowancesAnnual) || 0);
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// The "current" structure for today's date — the row with the latest effectiveFrom
// that has already passed. Mirrors storage.getCurrentPayrollCompensationStructure.
function findCurrentStructureId(structures: PayrollCompensationStructure[]): number | undefined {
  const today = new Date().toISOString().split("T")[0];
  const applicable = structures.filter(s => s.effectiveFrom <= today).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return applicable[0]?.id;
}

export default function PayrollCompensation() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("payroll_employees.manage");
  const search = useSearch();
  const employeeIdFilter = new URLSearchParams(search).get("payrollEmployeeId");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<PayrollCompensationStructure | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: structures, isLoading } = useQuery<PayrollCompensationStructure[]>({
    queryKey: ["/api/accounting/payroll-compensation-structures"],
  });
  const { data: employees } = useQuery<PayrollEmployee[]>({ queryKey: ["/api/accounting/payroll-employees"] });
  const employeeMap = new Map((employees || []).map(e => [e.id, e]));

  const filtered = employeeIdFilter ? structures?.filter(s => s.payrollEmployeeId === parseInt(employeeIdFilter)) : structures;
  const currentId = findCurrentStructureId(filtered || []);

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/payroll-compensation-structures", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-compensation-structures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-employees"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Compensation structure created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/payroll-compensation-structures/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-compensation-structures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-employees"] });
      setEditOpen(false);
      setEditingStructure(null);
      toast({ title: "Compensation structure updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/accounting/payroll-compensation-structures/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-compensation-structures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-employees"] });
      toast({ title: "Compensation structure deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const buildPayload = () => ({
    payrollEmployeeId: parseInt(form.payrollEmployeeId),
    effectiveFrom: form.effectiveFrom,
    reason: form.reason || null,
    refNo: form.refNo || null,
    basicAnnual: form.basicAnnual || "0",
    hraAnnual: form.hraAnnual || "0",
    conveyanceAnnual: form.conveyanceAnnual || "0",
    medicalAnnual: form.medicalAnnual || "0",
    otherAllowancesAnnual: form.otherAllowancesAnnual || "0",
  });

  const openAdd = () => {
    setForm({ ...emptyForm, payrollEmployeeId: employeeIdFilter || "" });
    setAddOpen(true);
  };

  const openEdit = (s: PayrollCompensationStructure) => {
    setEditingStructure(s);
    setForm({
      payrollEmployeeId: String(s.payrollEmployeeId), effectiveFrom: s.effectiveFrom,
      reason: s.reason || "", refNo: s.refNo || "",
      basicAnnual: s.basicAnnual, hraAnnual: s.hraAnnual, conveyanceAnnual: s.conveyanceAnnual,
      medicalAnnual: s.medicalAnnual, otherAllowancesAnnual: s.otherAllowancesAnnual,
    });
    setEditOpen(true);
  };

  const ctcAnnual = computeCtc(form);
  const ctcMonthly = ctcAnnual / 12;

  const renderFormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Payroll Employee *</Label>
          <Select value={form.payrollEmployeeId} onValueChange={v => setForm({ ...form, payrollEmployeeId: v })} disabled={!!editingStructure || !!employeeIdFilter}>
            <SelectTrigger data-testid="select-comp-employee"><SelectValue placeholder="Select an employee" /></SelectTrigger>
            <SelectContent>
              {employees?.filter(e => e.status === "active").map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.employeeCode} — {e.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Effective From *</Label><Input type="date" value={form.effectiveFrom} onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} data-testid="input-comp-effective-from" /></div>
        <div><Label>Reason</Label><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Joining / Annual Increment" data-testid="input-comp-reason" /></div>
        <div><Label>Ref No (optional)</Label><Input value={form.refNo} onChange={e => setForm({ ...form, refNo: e.target.value })} placeholder="MHTS/CR/2026/001" data-testid="input-comp-ref-no" /></div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Salary Components (Annual, ₹)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Basic Salary</Label><Input type="number" min="0" value={form.basicAnnual} onChange={e => setForm({ ...form, basicAnnual: e.target.value })} data-testid="input-comp-basic" /></div>
          <div><Label>House Rent Allowance (HRA)</Label><Input type="number" min="0" value={form.hraAnnual} onChange={e => setForm({ ...form, hraAnnual: e.target.value })} data-testid="input-comp-hra" /></div>
          <div><Label>Conveyance Allowance</Label><Input type="number" min="0" value={form.conveyanceAnnual} onChange={e => setForm({ ...form, conveyanceAnnual: e.target.value })} data-testid="input-comp-conveyance" /></div>
          <div><Label>Medical Allowance</Label><Input type="number" min="0" value={form.medicalAnnual} onChange={e => setForm({ ...form, medicalAnnual: e.target.value })} data-testid="input-comp-medical" /></div>
          <div><Label>Other Allowances</Label><Input type="number" min="0" value={form.otherAllowancesAnnual} onChange={e => setForm({ ...form, otherAllowancesAnnual: e.target.value })} data-testid="input-comp-other" /></div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Gross Total (CTC)</span>
        <span className="text-right">
          <span className="block text-lg font-bold text-slate-900 dark:text-white" data-testid="text-comp-ctc-annual">{inr(ctcAnnual)} / year</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400" data-testid="text-comp-ctc-monthly">{inr(ctcMonthly)} / month</span>
        </span>
      </div>
    </div>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Compensation Structures</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {employeeIdFilter && employeeMap.get(parseInt(employeeIdFilter))
                ? `Compensation history for ${employeeMap.get(parseInt(employeeIdFilter))?.fullName}`
                : "One row per joining/revision event — past payslips stay correct after a raise"}
            </p>
          </div>
          {canManage && (
            <Button onClick={openAdd} data-testid="button-add-compensation">
              <Plus className="w-4 h-4 mr-2" />New Compensation Structure
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !filtered?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No compensation structures found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-compensation-structures">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Effective From</th>
                      {!employeeIdFilter && <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Employee</th>}
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Reason</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">CTC (Annual)</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">CTC (Monthly)</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-compensation-${s.id}`}>
                        <td className="px-4 py-3 text-sm">{s.effectiveFrom}</td>
                        {!employeeIdFilter && <td className="px-4 py-3 text-sm">{employeeMap.get(s.payrollEmployeeId)?.fullName || "-"}</td>}
                        <td className="px-4 py-3 text-sm">{s.reason || "-"}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{inr(parseFloat(s.ctcAnnual))}</td>
                        <td className="px-4 py-3 text-right text-sm">{inr(parseFloat(s.ctcAnnual) / 12)}</td>
                        <td className="px-4 py-3 text-center">
                          {s.id === currentId
                            ? <Badge data-testid={`badge-current-${s.id}`}>Current</Badge>
                            : <Badge variant="outline">{s.effectiveFrom > new Date().toISOString().split("T")[0] ? "Upcoming" : "Superseded"}</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canManage && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`button-edit-compensation-${s.id}`}><Pencil className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-red-600"
                                  onClick={() => { if (confirm("Delete this compensation structure? This cannot be undone.")) deleteMutation.mutate(s.id); }}
                                  disabled={deleteMutation.isPending} data-testid={`button-delete-compensation-${s.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-add-compensation">
            <DialogHeader><DialogTitle>New Compensation Structure</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(buildPayload())}
                disabled={createMutation.isPending || !form.payrollEmployeeId || !form.effectiveFrom}
                data-testid="button-submit-add-compensation"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-compensation">
            <DialogHeader><DialogTitle>Edit Compensation Structure</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => editingStructure && updateMutation.mutate({ id: editingStructure.id, data: buildPayload() })}
                disabled={updateMutation.isPending || !form.effectiveFrom}
                data-testid="button-submit-edit-compensation"
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
