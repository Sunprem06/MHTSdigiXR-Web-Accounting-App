import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { QUOTATION_STATUSES } from "@shared/schema";
import type { Quotation, Party } from "@shared/schema";
import { Plus, Loader2, FileText, Eye, ArrowRight, Trash2, Search, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sent: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  converted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function Quotations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/accounting/quotations"],
  });

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/accounting/parties"],
  });

  const partyMap = new Map(parties?.map(p => [p.id, p.name]) || []);

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

  const filtered = quotations?.filter(q => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const partyName = partyMap.get(q.partyId) || "";
      if (!q.quotationNumber.toLowerCase().includes(search.toLowerCase()) && !partyName.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-quotations-title">Quotations</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage quotations</p>
          </div>
          <Link href="/accounting/quotations/new">
            <Button className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-new-quotation">
              <Plus className="w-4 h-4 mr-2" />New Quotation
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by number or party..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-quotations" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-quotation-status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {QUOTATION_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
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
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">₹{parseFloat(q.grandTotal).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/accounting/quotations/${q.id}/view`}>
                            <Button size="icon" variant="ghost" className="text-sky-600 dark:text-sky-400" title="View" data-testid={`button-view-quotation-${q.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {isAdmin && q.status !== "converted" && (
                            <Link href={`/accounting/quotations/${q.id}/edit`}>
                              <Button size="icon" variant="ghost" className="text-amber-600 dark:text-amber-400" title="Edit" data-testid={`button-edit-quotation-${q.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {q.status !== "converted" && q.status !== "rejected" && (
                            <Button size="sm" variant="ghost" className="text-sky-600 dark:text-sky-400" onClick={() => { if (confirm("Convert this quotation to a Sales Invoice?")) convertMutation.mutate(q.id); }} disabled={convertMutation.isPending} data-testid={`button-convert-quotation-${q.id}`}>
                              <ArrowRight className="w-4 h-4 mr-1" />Invoice
                            </Button>
                          )}
                          {isAdmin && (
                            <Button size="icon" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => { if (confirm("Delete this quotation?")) deleteMutation.mutate(q.id); }} disabled={deleteMutation.isPending} data-testid={`button-delete-quotation-${q.id}`}>
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
    </AccountingLayout>
  );
}
