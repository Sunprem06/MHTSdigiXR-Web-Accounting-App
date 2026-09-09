import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TUTOR_PAYSLIP_STATUSES } from "@shared/schema";
import type { TutorPayslip, Tutor } from "@shared/schema";
import { Plus, Loader2, FileText, Eye, Send, CheckCircle, XCircle, Banknote, Pencil } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", approved: "Approved", paid: "Paid", rejected: "Rejected",
};

export default function TutorPayslips() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const tutorIdFilter = urlParams.get("tutorId");

  const canProcess = hasPermission("payroll_tutors.process");
  const canApprove = hasPermission("payroll_tutors.approve");

  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: payslips, isLoading } = useQuery<TutorPayslip[]>({
    queryKey: ["/api/accounting/tutor-payslips"],
  });
  const { data: tutors } = useQuery<Tutor[]>({ queryKey: ["/api/accounting/tutors"] });
  const tutorMap = new Map(tutors?.map(t => [t.id, t]) || []);

  const useStatusMutation = (action: string, successMessage: string) => useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/tutor-payslips/${id}/${action}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutor-payslips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: successMessage });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const submitMutation = useStatusMutation("submit", "Payslip submitted for approval");
  const approveMutation = useStatusMutation("approve", "Payslip approved");
  const markPaidMutation = useStatusMutation("mark-paid", "Payslip marked paid and posted to ledger");

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/accounting/tutor-payslips/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutor-payslips"] });
      toast({ title: "Payslip rejected" });
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = payslips?.filter(p => {
    if (tutorIdFilter && p.tutorId !== parseInt(tutorIdFilter)) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Tutor Payslips</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {tutorIdFilter && tutorMap.get(parseInt(tutorIdFilter))
                ? `History for ${tutorMap.get(parseInt(tutorIdFilter))?.fullName}`
                : "Sec 194J payslips for independent contractor tutors"}
            </p>
          </div>
          {canProcess && (
            <Link href="/accounting/payroll/tutor-payslips/new">
              <Button data-testid="button-new-payslip"><Plus className="w-4 h-4 mr-2" />New Payslip</Button>
            </Link>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-payslip-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TUTOR_PAYSLIP_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filtered?.length ? (
          <Card><CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No payslips found</p>
          </CardContent></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-payslips">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Tutor</th>
                    <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Month</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Gross</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">TDS</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Net Pay</th>
                    <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-payslip-${p.id}`}>
                      <td className="px-4 py-3 text-sm">{tutorMap.get(p.tutorId)?.fullName || "-"}</td>
                      <td className="px-4 py-3 text-sm">{p.payMonth}</td>
                      <td className="px-4 py-3 text-right text-sm">₹{parseFloat(p.grossEarnings).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">₹{parseFloat(p.tdsAmount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(p.netPay).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]}`} data-testid={`status-payslip-${p.id}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Link href={`/accounting/payroll/tutor-payslips/${p.id}/view`}>
                            <Button size="icon" variant="ghost" className="text-sky-600" title="View" data-testid={`button-view-payslip-${p.id}`}><Eye className="w-4 h-4" /></Button>
                          </Link>
                          {canProcess && (p.status === "draft" || p.status === "rejected") && (
                            <Link href={`/accounting/payroll/tutor-payslips/${p.id}/edit`}>
                              <Button size="icon" variant="ghost" className="text-amber-600" title="Edit" data-testid={`button-edit-payslip-${p.id}`}><Pencil className="w-4 h-4" /></Button>
                            </Link>
                          )}
                          {canProcess && p.status === "draft" && (
                            <Button size="sm" variant="ghost" className="text-amber-700 text-xs"
                              onClick={() => { if (confirm("Submit this payslip for approval?")) submitMutation.mutate(p.id); }}
                              disabled={submitMutation.isPending} data-testid={`button-submit-payslip-${p.id}`}>
                              <Send className="w-3.5 h-3.5 mr-1" />Submit
                            </Button>
                          )}
                          {canApprove && p.status === "submitted" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-700 text-xs"
                                onClick={() => { if (confirm("Approve this payslip?")) approveMutation.mutate(p.id); }}
                                disabled={approveMutation.isPending} data-testid={`button-approve-payslip-${p.id}`}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-600 text-xs"
                                onClick={() => { setRejectingId(p.id); setRejectReason(""); setRejectDialogOpen(true); }}
                                disabled={rejectMutation.isPending} data-testid={`button-reject-payslip-${p.id}`}>
                                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                              </Button>
                            </>
                          )}
                          {canApprove && p.status === "approved" && (
                            <Button size="sm" variant="ghost" className="text-green-700 text-xs"
                              onClick={() => { if (confirm("Mark this payslip as paid and post it to the ledger?")) markPaidMutation.mutate(p.id); }}
                              disabled={markPaidMutation.isPending} data-testid={`button-mark-paid-payslip-${p.id}`}>
                              <Banknote className="w-3.5 h-3.5 mr-1" />Mark Paid
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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payslip</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason for rejection (optional)</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} data-testid="textarea-reject-payslip-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive"
              onClick={() => { if (rejectingId) rejectMutation.mutate({ id: rejectingId, reason: rejectReason }); }}
              disabled={rejectMutation.isPending} data-testid="button-confirm-reject-payslip">
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
