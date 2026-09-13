import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
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
import type { LeaveType } from "@shared/schema";
import { Plus, Pencil, Loader2, RefreshCw, PlayCircle } from "lucide-react";

const ACCRUAL_LABELS: Record<string, string> = { annual: "Annual grant", monthly: "Monthly accrual", manual: "Manual only" };

export default function LeaveTypes() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    code: "", name: "", annualEntitlementDays: "", accrualFrequency: "annual",
    carryForwardCap: "", isPaid: true, requiresApproval: true, isActive: true,
  });

  const { data: leaveTypes, isLoading } = useQuery<LeaveType[]>({ queryKey: ["/api/accounting/leave-types?all=true"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.toUpperCase().replace(/\s+/g, "_"),
        name: form.name,
        annualEntitlementDays: form.annualEntitlementDays === "" ? null : form.annualEntitlementDays,
        accrualFrequency: form.accrualFrequency,
        carryForwardCap: form.carryForwardCap === "" ? null : form.carryForwardCap,
        isPaid: form.isPaid, requiresApproval: form.requiresApproval, isActive: form.isActive,
      };
      const res = editing
        ? await apiRequest("PATCH", `/api/accounting/leave-types/${editing.id}`, payload)
        : await apiRequest("POST", "/api/accounting/leave-types", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-types?all=true"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-types"] });
      setDialogOpen(false);
      toast({ title: editing ? "Leave type updated" : "Leave type created" });
    },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  const initializeMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/accounting/leave-balances/initialize", {})).json(),
    onSuccess: (data: { financialYear: string; created: number }) => {
      toast({ title: "Balances initialized", description: `${data.created} row(s) created for ${data.financialYear}` });
    },
    onError: (err: Error) => toast({ title: "Could not initialize balances", description: err.message, variant: "destructive" }),
  });

  const accrualMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/accounting/leave-balances/run-monthly-accrual", {})).json(),
    onSuccess: (data: { updated: number }) => {
      toast({ title: "Monthly accrual run", description: `${data.updated} balance(s) updated` });
    },
    onError: (err: Error) => toast({ title: "Could not run accrual", description: err.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ code: "", name: "", annualEntitlementDays: "", accrualFrequency: "annual", carryForwardCap: "", isPaid: true, requiresApproval: true, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (t: LeaveType) => {
    setEditing(t);
    setForm({
      code: t.code, name: t.name,
      annualEntitlementDays: t.annualEntitlementDays ?? "",
      accrualFrequency: t.accrualFrequency,
      carryForwardCap: t.carryForwardCap ?? "",
      isPaid: t.isPaid, requiresApproval: t.requiresApproval, isActive: t.isActive,
    });
    setDialogOpen(true);
  };

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Leave Types</h1>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Entitlement numbers are a draft baseline — confirm with HR/CA before relying on them for a real leave cycle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => accrualMutation.mutate()} disabled={accrualMutation.isPending} data-testid="button-run-accrual">
              {accrualMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
              Run Monthly Accrual
            </Button>
            <Button variant="outline" onClick={() => initializeMutation.mutate()} disabled={initializeMutation.isPending} data-testid="button-initialize-balances">
              {initializeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Initialize Balances (Active FY)
            </Button>
            <Button onClick={openAdd} data-testid="button-add-leave-type">
              <Plus className="w-4 h-4 mr-2" />
              Add Leave Type
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : (
              <Table data-testid="table-leave-types">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Entitlement/yr</TableHead>
                    <TableHead>Accrual</TableHead>
                    <TableHead>Carry-fwd cap</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes?.map(t => (
                    <TableRow key={t.id} data-testid={`row-leave-type-${t.code}`}>
                      <TableCell className="font-mono text-xs">{t.code}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.annualEntitlementDays ?? "—"}</TableCell>
                      <TableCell>{ACCRUAL_LABELS[t.accrualFrequency] || t.accrualFrequency}</TableCell>
                      <TableCell>{t.carryForwardCap === null ? "Unlimited" : t.carryForwardCap}</TableCell>
                      <TableCell>{t.isPaid ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Badge variant={t.isActive ? "default" : "outline"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)} data-testid={`button-edit-leave-type-${t.code}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent data-testid="dialog-leave-type">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} data-testid="input-code" />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
              </div>
              <div>
                <Label>Annual Entitlement (days, blank = no fixed ceiling)</Label>
                <Input type="number" step="0.5" value={form.annualEntitlementDays} onChange={(e) => setForm({ ...form, annualEntitlementDays: e.target.value })} data-testid="input-entitlement" />
              </div>
              <div>
                <Label>Accrual Frequency</Label>
                <Select value={form.accrualFrequency} onValueChange={(v) => setForm({ ...form, accrualFrequency: v })}>
                  <SelectTrigger data-testid="select-accrual-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual grant</SelectItem>
                    <SelectItem value="monthly">Monthly accrual</SelectItem>
                    <SelectItem value="manual">Manual only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carry-forward Cap (days, blank = unlimited, 0 = lapses)</Label>
                <Input type="number" step="0.5" value={form.carryForwardCap} onChange={(e) => setForm({ ...form, carryForwardCap: e.target.value })} data-testid="input-carry-forward-cap" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Paid</Label>
                <Switch checked={form.isPaid} onCheckedChange={(v) => setForm({ ...form, isPaid: v })} data-testid="switch-is-paid" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Requires Approval</Label>
                <Switch checked={form.requiresApproval} onCheckedChange={(v) => setForm({ ...form, requiresApproval: v })} data-testid="switch-requires-approval" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} data-testid="switch-is-active" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-leave-type">Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.code || !form.name}
                data-testid="button-save-leave-type"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
