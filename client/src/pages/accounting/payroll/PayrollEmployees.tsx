import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { PayrollEmployee, Employee } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Plus, Pencil, Loader2, Trash2 } from "lucide-react";

const emptyForm = {
  employeeCode: "", fullName: "", designation: "", dateOfJoining: "",
  panNumber: "", pfApplicable: false, esiApplicable: false, ctcAnnual: "", status: "active",
  loginEmployeeId: "",
};

export default function PayrollEmployees() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("payroll_employees.manage");
  // GET /api/accounting/employees requires employees.manage server-side (not
  // employees.view) — gate on the same permission the fetch actually needs, so
  // this dropdown never renders empty-looking for a user who can see it but
  // whose underlying employees-list request would 403.
  const canLinkLogin = hasPermission("employees.manage");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: employees, isLoading } = useQuery<PayrollEmployee[]>({
    queryKey: ["/api/accounting/payroll-employees"],
  });

  const { data: loginAccounts } = useQuery<Employee[]>({
    queryKey: ["/api/accounting/employees"],
    enabled: canLinkLogin,
  });
  // Salaried staff already log in with their real functional role (Senior
  // Accountant, Admin, etc.) — unlike tutors, there's no single dedicated role
  // to filter on, so any active login account can be linked. Tutors are on a
  // separate track and excluded here to avoid cross-linking the two.
  const linkableAccounts = loginAccounts?.filter(e => e.isActive && e.role !== "tutor") || [];

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/payroll-employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-employees"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Payroll employee master created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/payroll-employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-employees"] });
      setEditOpen(false);
      setEditingEmployee(null);
      toast({ title: "Payroll employee master updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/accounting/payroll-employees/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-employees"] });
      toast({ title: "Payroll employee master deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const buildPayload = () => ({
    ...form,
    dateOfJoining: form.dateOfJoining || null,
    ctcAnnual: form.ctcAnnual || null,
    loginEmployeeId: form.loginEmployeeId ? parseInt(form.loginEmployeeId) : null,
  });

  const openEdit = (e: PayrollEmployee) => {
    setEditingEmployee(e);
    setForm({
      employeeCode: e.employeeCode, fullName: e.fullName, designation: e.designation || "",
      dateOfJoining: e.dateOfJoining || "", panNumber: e.panNumber || "",
      pfApplicable: e.pfApplicable, esiApplicable: e.esiApplicable,
      ctcAnnual: e.ctcAnnual || "", status: e.status,
      loginEmployeeId: e.loginEmployeeId ? String(e.loginEmployeeId) : "",
    });
    setEditOpen(true);
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><Label>Employee Code *</Label><Input value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} data-testid="input-pe-code" /></div>
      <div><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} data-testid="input-pe-name" /></div>
      <div><Label>Designation</Label><Input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} data-testid="input-pe-designation" /></div>
      <div><Label>Date of Joining</Label><Input type="date" value={form.dateOfJoining} onChange={e => setForm({ ...form, dateOfJoining: e.target.value })} data-testid="input-pe-doj" /></div>
      <div><Label>PAN Number</Label><Input value={form.panNumber} onChange={e => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} className="uppercase" data-testid="input-pe-pan" /></div>
      <div><Label>Annual CTC (INR)</Label><Input type="number" min="0" value={form.ctcAnnual} onChange={e => setForm({ ...form, ctcAnnual: e.target.value })} data-testid="input-pe-ctc" /></div>
      <div className="flex items-center justify-between"><Label>PF Applicable</Label><Switch checked={form.pfApplicable} onCheckedChange={v => setForm({ ...form, pfApplicable: v })} data-testid="switch-pe-pf" /></div>
      <div className="flex items-center justify-between"><Label>ESI Applicable</Label><Switch checked={form.esiApplicable} onCheckedChange={v => setForm({ ...form, esiApplicable: v })} data-testid="switch-pe-esi" /></div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger data-testid="select-pe-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {canLinkLogin && (
        <div className="sm:col-span-2">
          <Label>Self-Service Login (optional)</Label>
          <Select value={form.loginEmployeeId || "none"} onValueChange={v => setForm({ ...form, loginEmployeeId: v === "none" ? "" : v })}>
            <SelectTrigger data-testid="select-pe-login"><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked</SelectItem>
              {linkableAccounts.map(acc => (
                <SelectItem key={acc.id} value={String(acc.id)}>{acc.fullName} ({acc.username})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Link this profile to the employee's existing ERP login so they see "My Payslips" on their own Dashboard once payslips exist.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Employees (Payroll)</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">MHTSdigiXR salaried staff — master data only</p>
          </div>
          {canManage && (
            <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} data-testid="button-add-payroll-employee">
              <Plus className="w-4 h-4 mr-2" />Add Employee
            </Button>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4" data-testid="banner-ca-review-required">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Statutory pay-run calculations are not implemented.</p>
            <p className="mt-1">
              This page stores employee master data only. Sec 192 salary TDS, PF, ESI, and Gratuity formulas
              require review and sign-off by a Chartered Accountant before any real payroll run relies on this
              data — the Labour Codes (effective 21 Nov 2025) were still being finalized per state as of early
              2026. No payslip, pay-run, or calculation feature exists here yet.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !employees?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No payroll employees found.</div>
            ) : (
              <Table data-testid="table-payroll-employees">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>PF</TableHead>
                    <TableHead>ESI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(e => (
                    <TableRow key={e.id} data-testid={`row-payroll-employee-${e.id}`}>
                      <TableCell className="font-mono text-xs">{e.employeeCode}</TableCell>
                      <TableCell className="font-medium">{e.fullName}</TableCell>
                      <TableCell>{e.designation || "-"}</TableCell>
                      <TableCell><Badge variant={e.pfApplicable ? "default" : "outline"}>{e.pfApplicable ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell><Badge variant={e.esiApplicable ? "default" : "outline"}>{e.esiApplicable ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell><Badge variant={e.status === "active" ? "default" : "outline"}>{e.status === "active" ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canManage && (
                            <Button size="icon" variant="ghost" onClick={() => openEdit(e)} data-testid={`button-edit-payroll-employee-${e.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canManage && (
                            <Button size="icon" variant="ghost" className="text-red-600"
                              onClick={() => { if (confirm(`Delete payroll employee "${e.fullName}"? This cannot be undone.`)) deleteMutation.mutate(e.id); }}
                              disabled={deleteMutation.isPending} title="Delete" data-testid={`button-delete-payroll-employee-${e.id}`}>
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
          <DialogContent className="max-w-xl" data-testid="dialog-add-payroll-employee">
            <DialogHeader><DialogTitle>Add Payroll Employee (Master Data)</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(buildPayload())} disabled={createMutation.isPending || !form.employeeCode || !form.fullName} data-testid="button-submit-add-payroll-employee">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-xl" data-testid="dialog-edit-payroll-employee">
            <DialogHeader><DialogTitle>Edit Payroll Employee</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => editingEmployee && updateMutation.mutate({ id: editingEmployee.id, data: buildPayload() })}
                disabled={updateMutation.isPending || !form.employeeCode || !form.fullName}
                data-testid="button-submit-edit-payroll-employee"
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
