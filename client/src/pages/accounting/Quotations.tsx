import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Link, useLocation } from "wouter";
import { QUOTATION_STATUSES } from "@shared/schema";
import type { Quotation, Party, Employee } from "@shared/schema";
import { Plus, Loader2, FileText, Eye, ArrowRight, Trash2, Search, Pencil, Send, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sent: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  converted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

export default function Quotations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const canApprove = user?.role === "super_admin" || user?.role === "admin" || user?.role === "senior_accountant";
  const canCreate = user?.role !== "auditor" && user?.role !== "viewer";

  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/accounting/quotations"],
  });

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/accounting/parties"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/accounting/employees"],
  });

  const partyMap = new Map(parties?.map(p => [p.id, p.name]) || []);
  const employeeMap = new Map(employees?.map(e => [e.id, e.fullName]) || []);

  const convertMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/quotations/${id}/convert`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/quotations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: "Quotation converted to Sales Invoice" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/quotations"] });
      toast({ title: "Quotation deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/quotations/${id}/submit`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/quotations"] });
      toast({ title: "Quotation submitted for review" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/quotations/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/quotations"] });
      toast({ title: "Quotation approved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/accounting/quotations/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/quotations"] });
      toast({ title: "Quotation rejected" });
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = quotations?.filter(q => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const partyName = partyMap.get(q.partyId) || "";
      if (!q.quotationNumber.toLowerCase().includes(search.toLowerCase()) && !partyName.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const handleRejectClick = (id: number) => {
    setRejectingId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const canSubmitQuotation = (q: Quotation) => {
    if (q.status !== "draft") return false;
    if (canApprove) return true;
    return q.createdBy === user?.id || q.assignedTo === user?.id;
  };

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-quotations-title">Quotations</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage customer quotations</p>
          </div>
          {canCreate && (
            <Link href="/accounting/quotations/new">
              <Button className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-new-quotation">
                <Plus className="w-4 h-4 mr-2" />New Quotation
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by number or party..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-quotations" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px]" data-testid="select-quotation-status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {QUOTATION_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filtered?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No quotations found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-quotations">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Quotation #</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Party</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Assigned To</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(q => (
                    <tr key={q.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-quotation-${q.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white font-medium">{q.quotationNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(q.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{partyMap.get(q.partyId) || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {employeeMap.get(q.assignedTo ?? q.createdBy ?? 0) || "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">₹{parseFloat(q.grandTotal).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[q.status] || STATUS_COLORS.draft}`} data-testid={`status-quotation-${q.id}`}>
                          {STATUS_LABELS[q.status] || q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <Link href={`/accounting/quotations/${q.id}/view`}>
                            <Button size="icon" variant="ghost" className="text-sky-600 dark:text-sky-400" title="View" data-testid={`button-view-quotation-${q.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>

                          {isAdmin && (
                            <Link href={`/accounting/quotations/${q.id}/edit`}>
                              <Button size="icon" variant="ghost" className="text-amber-600 dark:text-amber-400" title="Edit" data-testid={`button-edit-quotation-${q.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}

                          {canSubmitQuotation(q) && (
                            <Button
                              size="sm" variant="ghost"
                              className="text-amber-700 dark:text-amber-400 text-xs"
                              onClick={() => { if (confirm("Submit this quotation for manager review?")) submitMutation.mutate(q.id); }}
                              disabled={submitMutation.isPending}
                              title="Submit for Review"
                              data-testid={`button-submit-quotation-${q.id}`}
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />Submit
                            </Button>
                          )}

                          {canApprove && q.status === "submitted" && (
                            <>
                              <Button
                                size="sm" variant="ghost"
                                className="text-green-700 dark:text-green-400 text-xs"
                                onClick={() => { if (confirm("Approve this quotation?")) approveMutation.mutate(q.id); }}
                                disabled={approveMutation.isPending}
                                title="Approve"
                                data-testid={`button-approve-quotation-${q.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="text-red-600 dark:text-red-400 text-xs"
                                onClick={() => handleRejectClick(q.id)}
                                disabled={rejectMutation.isPending}
                                title="Reject"
                                data-testid={`button-reject-quotation-${q.id}`}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                              </Button>
                            </>
                          )}

                          {canApprove && q.status !== "converted" && q.status !== "rejected" && q.status !== "draft" && q.status !== "submitted" && (
                            <Button
                              size="sm" variant="ghost"
                              className="text-sky-600 dark:text-sky-400 text-xs"
                              onClick={() => { if (confirm("Convert this quotation to a Sales Invoice?")) convertMutation.mutate(q.id); }}
                              disabled={convertMutation.isPending}
                              data-testid={`button-convert-quotation-${q.id}`}
                            >
                              <ArrowRight className="w-3.5 h-3.5 mr-1" />Invoice
                            </Button>
                          )}

                          {isAdmin && (
                            <Button
                              size="icon" variant="ghost"
                              className="text-red-600 dark:text-red-400"
                              onClick={() => { if (confirm("Delete this quotation?")) deleteMutation.mutate(q.id); }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-quotation-${q.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
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
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-reason">Reason for rejection (optional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain why this quotation is being rejected..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              data-testid="textarea-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="button-cancel-reject">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { if (rejectingId) rejectMutation.mutate({ id: rejectingId, reason: rejectReason }); }}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
