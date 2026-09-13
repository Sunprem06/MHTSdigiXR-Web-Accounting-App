import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { LeaveType, LeaveRequest } from "@shared/schema";
import { Plus, Loader2, X } from "lucide-react";

interface LeaveBalanceView extends Record<string, unknown> {
  id: number;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  isPaid: boolean;
  availableBalance: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pending_admin_approval: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
// Over-5-day requests need a second sign-off (Super Admin/Admin) after the
// manager's own approval — see LONG_LEAVE_THRESHOLD_DAYS in shared/schema.ts.
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", pending_admin_approval: "Awaiting Admin Approval", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled",
};

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MyLeave() {
  const { toast } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startDayPortion, setStartDayPortion] = useState("full");
  const [endDayPortion, setEndDayPortion] = useState("full");
  const [reason, setReason] = useState("");

  const { data: leaveTypes } = useQuery<LeaveType[]>({ queryKey: ["/api/accounting/leave-types"] });
  const { data: balances, isLoading: balancesLoading } = useQuery<LeaveBalanceView[]>({ queryKey: ["/api/accounting/leave-balances/mine"] });
  const { data: requests, isLoading: requestsLoading } = useQuery<LeaveRequest[]>({ queryKey: ["/api/accounting/leave-requests/mine"] });

  const leaveTypeById = useMemo(() => new Map((leaveTypes || []).map(t => [t.id, t])), [leaveTypes]);
  const isSingleDay = startDate && startDate === endDate;

  const resetForm = () => {
    setLeaveTypeId("");
    setStartDate("");
    setEndDate("");
    setStartDayPortion("full");
    setEndDayPortion("full");
    setReason("");
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/leave-requests", {
        leaveTypeId: parseInt(leaveTypeId), startDate, endDate,
        startDayPortion: isSingleDay ? startDayPortion : "full",
        endDayPortion: isSingleDay ? "full" : endDayPortion,
        reason: reason || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-requests/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-balances/mine"] });
      setApplyOpen(false);
      resetForm();
      toast({ title: "Leave request submitted" });
    },
    onError: (err: Error) => toast({ title: "Could not submit request", description: err.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/leave-requests/${id}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-requests/mine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-balances/mine"] });
      toast({ title: "Leave request cancelled" });
    },
    onError: (err: Error) => toast({ title: "Could not cancel request", description: err.message, variant: "destructive" }),
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">My Leave</h1>
          <Button onClick={() => setApplyOpen(true)} data-testid="button-apply-leave">
            <Plus className="w-4 h-4 mr-2" />
            Apply for Leave
          </Button>
        </div>

        {balancesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {balances?.map(b => (
              <Card key={b.id} data-testid={`card-balance-${b.leaveTypeCode}`}>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{b.leaveTypeName}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {b.availableBalance === null ? "—" : b.availableBalance}
                  </p>
                  {!b.isPaid && <p className="text-[10px] text-slate-400 mt-1">Unpaid</p>}
                </CardContent>
              </Card>
            ))}
            {!balances?.length && (
              <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
                No leave balances set up yet — contact HR to have this financial year initialized.
              </p>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {requestsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !requests?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-requests">
                No leave requests yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-my-leave-requests">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Dates</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Days</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Reason</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-leave-request-${r.id}`}>
                        <td className="px-4 py-3 text-sm">{leaveTypeById.get(r.leaveTypeId)?.name || r.leaveTypeId}</td>
                        <td className="px-4 py-3 text-sm">{fmtDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${fmtDate(r.endDate)}` : ""}</td>
                        <td className="px-4 py-3 text-right text-sm">{r.numberOfDays}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status] || r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {r.status === "rejected" && r.rejectionReason ? `Rejected: ${r.rejectionReason}` : (r.reason || "-")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(r.status === "pending" || r.status === "pending_admin_approval") && (
                            <Button
                              size="icon" variant="ghost" className="text-red-600"
                              title="Cancel request" data-testid={`button-cancel-request-${r.id}`}
                              disabled={cancelMutation.isPending}
                              onClick={() => cancelMutation.mutate(r.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogContent data-testid="dialog-apply-leave">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Leave Type</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue placeholder="Select a leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes?.map(t => (
                      <SelectItem key={t.id} value={String(t.id)} data-testid={`option-leave-type-${t.code}`}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-start-date" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} data-testid="input-end-date" />
                </div>
              </div>
              {isSingleDay && (
                <div>
                  <Label>Portion</Label>
                  <Select value={startDayPortion} onValueChange={setStartDayPortion}>
                    <SelectTrigger data-testid="select-day-portion">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full day</SelectItem>
                      <SelectItem value="first_half">First half</SelectItem>
                      <SelectItem value="second_half">Second half</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyOpen(false)} data-testid="button-cancel-apply">Cancel</Button>
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || !leaveTypeId || !startDate || !endDate}
                data-testid="button-submit-apply"
              >
                {applyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
