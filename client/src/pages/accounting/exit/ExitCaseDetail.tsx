import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AttachmentsPanel } from "@/components/accounting/AttachmentsPanel";
import { ArrowLeft, Loader2, CheckCircle2, Circle, Plus } from "lucide-react";

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
function fmtMoney(v: string | number) {
  return `₹${parseFloat(String(v)).toLocaleString("en-IN")}`;
}

interface ChecklistItem { id: number; itemLabel: string; isCompleted: boolean; notes: string | null }
interface AssetReturnItem { id: number; fixedAssetId: number; assetName: string; assetCode?: string; isReturned: boolean; conditionNotes: string | null }
interface Settlement {
  id: number; status: string; payrollEmployeeId: number | null;
  pendingSalaryDays: string; pendingSalaryAmount: string;
  leaveEncashmentDays: string; leaveEncashmentAmount: string;
  gratuityEligible: boolean; gratuityYearsOfService: string; gratuityAmount: string;
  otherEarnings: string; otherEarningsNote: string | null;
  otherDeductions: string; otherDeductionsNote: string | null;
  netSettlementAmount: string;
}
interface ExitCaseDetailView {
  id: number; employeeId: number; employeeName: string; exitType: string;
  resignationDate: string; noticePeriodDays: number; proposedLastWorkingDay: string; actualLastWorkingDay: string | null;
  reason: string | null; status: string; accessRevoked: boolean;
  checklist: ChecklistItem[]; assetReturns: AssetReturnItem[]; settlement: Settlement | null;
}

export default function ExitCaseDetail() {
  const [, params] = useRoute("/accounting/exit/:id");
  const exitId = params?.id ? parseInt(params.id) : 0;
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("exit.manage");
  const canApprove = hasPermission("exit.approve");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [settlementEdits, setSettlementEdits] = useState<Record<string, string>>({});

  const { data: exit, isLoading } = useQuery<ExitCaseDetailView>({
    queryKey: ["/api/accounting/exits", exitId],
    queryFn: async () => (await apiRequest("GET", `/api/accounting/exits/${exitId}`)).json(),
    enabled: !!exitId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/accounting/exits", exitId] });

  const approveMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/accounting/exits/${exitId}/approve`, {})).json(),
    onSuccess: () => { invalidate(); toast({ title: "Exit case approved" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/accounting/exits/${exitId}/cancel`, {})).json(),
    onSuccess: () => { invalidate(); toast({ title: "Exit case cancelled" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addChecklistMutation = useMutation({
    mutationFn: async (itemLabel: string) => (await apiRequest("POST", `/api/accounting/exits/${exitId}/checklist`, { itemLabel })).json(),
    onSuccess: () => { invalidate(); setNewChecklistItem(""); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      (await apiRequest("PATCH", `/api/accounting/exits/${exitId}/checklist/${id}`, { isCompleted })).json(),
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleAssetReturnMutation = useMutation({
    mutationFn: async ({ id, isReturned }: { id: number; isReturned: boolean }) =>
      (await apiRequest("PATCH", `/api/accounting/exits/${exitId}/asset-returns/${id}`, { isReturned })).json(),
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/accounting/exits/${exitId}/revoke-access`, {})).json(),
    onSuccess: () => { invalidate(); toast({ title: "Access revoked" }); },
    onError: (err: Error) => toast({ title: "Could not revoke access", description: err.message, variant: "destructive" }),
  });

  const computeSettlementMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/accounting/exits/${exitId}/settlement/compute`, {})).json(),
    onSuccess: () => { invalidate(); setSettlementEdits({}); toast({ title: "Settlement computed" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveSettlementMutation = useMutation({
    mutationFn: async () =>
      (await apiRequest("PATCH", `/api/accounting/exits/${exitId}/settlement`, settlementEdits)).json(),
    onSuccess: () => { invalidate(); setSettlementEdits({}); toast({ title: "Settlement updated" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Note: these settlement sub-routes are keyed by the EXIT case id in the URL
  // (/api/accounting/exits/:id/settlement/...), not the settlement row's own id.
  const approveSettlementMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/accounting/exits/${exitId}/settlement/approve`, {})).json(),
    onSuccess: () => { invalidate(); toast({ title: "Settlement approved" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const markPaidMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/accounting/exits/${exitId}/settlement/mark-paid`, {})).json(),
    onSuccess: () => { invalidate(); toast({ title: "Settlement marked paid — voucher posted" }); },
    onError: (err: Error) => toast({ title: "Could not mark paid", description: err.message, variant: "destructive" }),
  });

  if (isLoading || !exit) {
    return (
      <AccountingLayout>
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
      </AccountingLayout>
    );
  }

  const s = exit.settlement;
  const field = (name: string) => settlementEdits[name] ?? (s ? (s as any)[name] : "");
  const hasEdits = Object.keys(settlementEdits).length > 0;
  const checklistComplete = exit.checklist.every(c => c.isCompleted) && exit.assetReturns.every(a => a.isReturned);

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Link href="/accounting/exit"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">{exit.employeeName}</h1>
            <p className="text-slate-500 dark:text-slate-400 capitalize">{exit.exitType} case</p>
          </div>
          <span className={`ml-auto inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[exit.status]}`}>
            {STATUS_LABELS[exit.status] || exit.status}
          </span>
        </div>

        <Card data-testid="card-case-summary">
          <CardHeader><CardTitle className="text-base">Case Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500 dark:text-slate-400">Resignation Date</p><p className="font-medium">{fmtDate(exit.resignationDate)}</p></div>
            <div><p className="text-slate-500 dark:text-slate-400">Notice Period</p><p className="font-medium">{exit.noticePeriodDays} day(s)</p></div>
            <div><p className="text-slate-500 dark:text-slate-400">Proposed Last Working Day</p><p className="font-medium">{fmtDate(exit.proposedLastWorkingDay)}</p></div>
            <div><p className="text-slate-500 dark:text-slate-400">Confirmed Last Working Day</p><p className="font-medium">{fmtDate(exit.actualLastWorkingDay)}</p></div>
            {exit.reason && <div className="col-span-2"><p className="text-slate-500 dark:text-slate-400">Reason</p><p className="font-medium">{exit.reason}</p></div>}
            <div className="col-span-2 flex gap-2 pt-2">
              {canManage && exit.status === "submitted" && (
                <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} data-testid="button-approve-exit">
                  Approve
                </Button>
              )}
              {(canManage || exit.status === "submitted") && (exit.status === "submitted" || exit.status === "approved") && (
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} data-testid="button-cancel-exit">
                  Cancel Case
                </Button>
              )}
              {canApprove && exit.status === "approved" && !exit.accessRevoked && (
                <Button
                  size="sm" variant="destructive" data-testid="button-revoke-access"
                  disabled={revokeAccessMutation.isPending || !checklistComplete}
                  title={!checklistComplete ? "Complete the checklist and all asset returns first" : undefined}
                  onClick={() => revokeAccessMutation.mutate()}
                >
                  Revoke Access
                </Button>
              )}
              {exit.accessRevoked && <span className="text-sm text-green-600 self-center" data-testid="text-access-revoked">Access revoked</span>}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-checklist">
          <CardHeader><CardTitle className="text-base">Exit Checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {exit.checklist.map(item => (
              <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`row-checklist-${item.id}`}>
                <Checkbox
                  checked={item.isCompleted} disabled={!canManage}
                  onCheckedChange={(checked) => toggleChecklistMutation.mutate({ id: item.id, isCompleted: !!checked })}
                  data-testid={`checkbox-checklist-${item.id}`}
                />
                <span className={item.isCompleted ? "text-slate-500 line-through" : ""}>{item.itemLabel}</span>
              </label>
            ))}
            {exit.assetReturns.map(item => (
              <label key={`asset-${item.id}`} className="flex items-center gap-2 text-sm cursor-pointer" data-testid={`row-asset-return-${item.id}`}>
                <Checkbox
                  checked={item.isReturned} disabled={!canManage}
                  onCheckedChange={(checked) => toggleAssetReturnMutation.mutate({ id: item.id, isReturned: !!checked })}
                  data-testid={`checkbox-asset-return-${item.id}`}
                />
                <span className={item.isReturned ? "text-slate-500 line-through" : ""}>Return: {item.assetName}{item.assetCode ? ` (${item.assetCode})` : ""}</span>
              </label>
            ))}
            {canManage && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)}
                  placeholder="Add a checklist item" className="max-w-xs" data-testid="input-new-checklist-item"
                />
                <Button
                  size="sm" variant="outline" disabled={!newChecklistItem.trim() || addChecklistMutation.isPending}
                  onClick={() => addChecklistMutation.mutate(newChecklistItem.trim())} data-testid="button-add-checklist-item"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-settlement">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Full & Final Settlement</CardTitle>
            {s && <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 capitalize">{s.status}</span>}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Draft baseline math (notice period, gratuity, leave encashment) — HR/CA review required before relying on these figures. See documentation for details.
            </p>
            {!s ? (
              canManage && (exit.status === "approved" || exit.status === "submitted") ? (
                <Button size="sm" onClick={() => computeSettlementMutation.mutate()} disabled={computeSettlementMutation.isPending} data-testid="button-compute-settlement">
                  {computeSettlementMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Compute Settlement
                </Button>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No settlement computed yet.</p>
              )
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Pending Salary ({s.pendingSalaryDays} day(s))</Label>
                    <Input
                      type="number" value={field("pendingSalaryAmount")} disabled={!canManage || s.status !== "draft"}
                      onChange={e => setSettlementEdits({ ...settlementEdits, pendingSalaryAmount: e.target.value })}
                      data-testid="input-pending-salary"
                    />
                  </div>
                  <div>
                    <Label>Leave Encashment ({s.leaveEncashmentDays} day(s))</Label>
                    <Input
                      type="number" value={field("leaveEncashmentAmount")} disabled={!canManage || s.status !== "draft"}
                      onChange={e => setSettlementEdits({ ...settlementEdits, leaveEncashmentAmount: e.target.value })}
                      data-testid="input-leave-encashment"
                    />
                  </div>
                  <div>
                    <Label>Gratuity {s.gratuityEligible ? `(${s.gratuityYearsOfService} yrs, eligible)` : "(not eligible)"}</Label>
                    <Input
                      type="number" value={field("gratuityAmount")} disabled={!canManage || s.status !== "draft"}
                      onChange={e => setSettlementEdits({ ...settlementEdits, gratuityAmount: e.target.value })}
                      data-testid="input-gratuity"
                    />
                  </div>
                  <div>
                    <Label>Other Earnings</Label>
                    <Input
                      type="number" value={field("otherEarnings")} disabled={!canManage || s.status !== "draft"}
                      onChange={e => setSettlementEdits({ ...settlementEdits, otherEarnings: e.target.value })}
                      data-testid="input-other-earnings"
                    />
                  </div>
                  <div>
                    <Label>Other Deductions</Label>
                    <Input
                      type="number" value={field("otherDeductions")} disabled={!canManage || s.status !== "draft"}
                      onChange={e => setSettlementEdits({ ...settlementEdits, otherDeductions: e.target.value })}
                      data-testid="input-other-deductions"
                    />
                  </div>
                  <div>
                    <Label>Net Settlement Amount</Label>
                    <p className="text-lg font-bold pt-1" data-testid="text-net-settlement">{fmtMoney(s.netSettlementAmount)}</p>
                  </div>
                </div>
                {canManage && s.status === "draft" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => computeSettlementMutation.mutate()} disabled={computeSettlementMutation.isPending} data-testid="button-recompute-settlement">
                      Recompute
                    </Button>
                    {hasEdits && (
                      <Button size="sm" onClick={() => saveSettlementMutation.mutate()} disabled={saveSettlementMutation.isPending} data-testid="button-save-settlement">
                        Save Changes
                      </Button>
                    )}
                    {canApprove && (
                      <Button size="sm" onClick={() => approveSettlementMutation.mutate()} disabled={approveSettlementMutation.isPending || hasEdits} data-testid="button-approve-settlement">
                        Approve Settlement
                      </Button>
                    )}
                  </div>
                )}
                {canApprove && s.status === "approved" && (
                  <Button
                    size="sm" disabled={markPaidMutation.isPending || !exit.accessRevoked} data-testid="button-mark-paid"
                    title={!exit.accessRevoked ? "Revoke access before marking paid" : undefined}
                    onClick={() => markPaidMutation.mutate()}
                  >
                    {markPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Mark Paid
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <AttachmentsPanel entityType="employee_exit" entityId={exit.id} uploadPermission="exit.manage" managePermission="exit.manage" />
      </div>
    </AccountingLayout>
  );
}
