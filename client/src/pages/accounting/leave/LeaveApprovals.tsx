import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { LeaveRequest } from "@shared/schema";
import { Check, X, Loader2 } from "lucide-react";

type LeaveApprovalRow = LeaveRequest & { employeeName: string; leaveTypeName: string };

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeaveApprovals() {
  const { toast } = useToast();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests, isLoading } = useQuery<LeaveApprovalRow[]>({ queryKey: ["/api/accounting/leave-requests/for-approval"] });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/leave-requests/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-requests/for-approval"] });
      toast({ title: "Leave request approved" });
    },
    onError: (err: Error) => toast({ title: "Could not approve", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/accounting/leave-requests/${id}/reject`, { rejectionReason: reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/leave-requests/for-approval"] });
      setRejectingId(null);
      setRejectionReason("");
      toast({ title: "Leave request rejected" });
    },
    onError: (err: Error) => toast({ title: "Could not reject", description: err.message, variant: "destructive" }),
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Leave Approvals</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Pending requests routed to you as the applicant's manager.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !requests?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-pending-approvals">
                Nothing pending your approval.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-leave-approvals">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Employee</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Dates</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Days</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Reason</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-approval-${r.id}`}>
                        <td className="px-4 py-3 text-sm font-medium">{r.employeeName}</td>
                        <td className="px-4 py-3 text-sm">{r.leaveTypeName}</td>
                        <td className="px-4 py-3 text-sm">{fmtDate(r.startDate)}{r.startDate !== r.endDate ? ` – ${fmtDate(r.endDate)}` : ""}</td>
                        <td className="px-4 py-3 text-right text-sm">{r.numberOfDays}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{r.reason || "-"}</td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <Button
                            size="icon" variant="ghost" className="text-green-600"
                            title="Approve" data-testid={`button-approve-${r.id}`}
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(r.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="text-red-600"
                            title="Reject" data-testid={`button-reject-${r.id}`}
                            onClick={() => { setRejectingId(r.id); setRejectionReason(""); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={rejectingId !== null} onOpenChange={(open) => !open && setRejectingId(null)}>
          <DialogContent data-testid="dialog-reject-leave">
            <DialogHeader>
              <DialogTitle>Reject Leave Request</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Reason for rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              data-testid="input-rejection-reason"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingId(null)} data-testid="button-cancel-reject">Cancel</Button>
              <Button
                variant="destructive"
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                onClick={() => rejectingId && rejectMutation.mutate({ id: rejectingId, reason: rejectionReason })}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
