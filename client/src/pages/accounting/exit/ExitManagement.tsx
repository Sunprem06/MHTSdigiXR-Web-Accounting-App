import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { EXIT_TYPES, DEFAULT_NOTICE_PERIOD_DAYS } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted", approved: "Approved", settled: "Settled", cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  settled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface ExitCaseRow {
  id: number; employeeId: number; employeeName: string; exitType: string;
  resignationDate: string; proposedLastWorkingDay: string; actualLastWorkingDay: string | null;
  status: string; accessRevoked: boolean;
}

interface AssignableEmployee { id: number; fullName: string; employeeCode: string | null }

export default function ExitManagement() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("exit.manage");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: "", exitType: "resignation", resignationDate: "", noticePeriodDays: String(DEFAULT_NOTICE_PERIOD_DAYS), reason: "" });

  const { data: cases, isLoading } = useQuery<ExitCaseRow[]>({
    queryKey: ["/api/accounting/exits", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/accounting/exits" : `/api/accounting/exits?status=${statusFilter}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  // Reuses the Fixed Assets "assignable employees" list — a plain active-employee
  // directory gated on a permission every exit.manage holder also has, avoiding
  // the same employees.view gap documented elsewhere in this HR project.
  const { data: employees } = useQuery<AssignableEmployee[]>({
    queryKey: ["/api/accounting/fixed-assets/assignable-employees"],
    enabled: canManage && initiateOpen,
  });

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/exits", {
        employeeId: parseInt(form.employeeId), exitType: form.exitType,
        resignationDate: form.resignationDate, noticePeriodDays: parseInt(form.noticePeriodDays),
        reason: form.reason || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/exits"] });
      setInitiateOpen(false);
      setForm({ employeeId: "", exitType: "resignation", resignationDate: "", noticePeriodDays: String(DEFAULT_NOTICE_PERIOD_DAYS), reason: "" });
      toast({ title: "Exit case created" });
    },
    onError: (err: Error) => toast({ title: "Could not create exit case", description: err.message, variant: "destructive" }),
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Exit Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Resignation / termination cases, checklists, and Full & Final settlements</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <Button onClick={() => setInitiateOpen(true)} data-testid="button-initiate-exit">
                <Plus className="w-4 h-4 mr-2" />
                Initiate Exit
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !cases?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-cases">No exit cases found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-exit-cases">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Employee</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Resignation Date</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Last Working Day</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer" data-testid={`row-exit-case-${c.id}`}>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/accounting/exit/${c.id}`} className="text-sky-600 hover:underline" data-testid={`link-exit-case-${c.id}`}>{c.employeeName}</Link>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">{c.exitType}</td>
                        <td className="px-4 py-3 text-sm">{fmtDate(c.resignationDate)}</td>
                        <td className="px-4 py-3 text-sm">{fmtDate(c.actualLastWorkingDay || c.proposedLastWorkingDay)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status] || c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">{c.accessRevoked ? "Revoked" : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={initiateOpen} onOpenChange={setInitiateOpen}>
          <DialogContent data-testid="dialog-initiate-exit">
            <DialogHeader><DialogTitle>Initiate Exit Case</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger data-testid="select-exit-employee"><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.fullName}{e.employeeCode ? ` (${e.employeeCode})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exit Type</Label>
                <Select value={form.exitType} onValueChange={v => setForm({ ...form, exitType: v })}>
                  <SelectTrigger data-testid="select-exit-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXIT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{form.exitType === "termination" ? "Termination Date" : "Resignation Date"}</Label>
                  <Input type="date" value={form.resignationDate} onChange={e => setForm({ ...form, resignationDate: e.target.value })} data-testid="input-exit-resignation-date" />
                </div>
                <div>
                  <Label>Notice Period (days)</Label>
                  <Input type="number" min="0" value={form.noticePeriodDays} onChange={e => setForm({ ...form, noticePeriodDays: e.target.value })} data-testid="input-exit-notice-period" />
                </div>
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} data-testid="input-exit-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInitiateOpen(false)} data-testid="button-cancel-initiate">Cancel</Button>
              <Button
                onClick={() => initiateMutation.mutate()}
                disabled={initiateMutation.isPending || !form.employeeId || !form.resignationDate}
                data-testid="button-confirm-initiate"
              >
                {initiateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
