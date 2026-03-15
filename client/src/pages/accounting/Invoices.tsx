import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Voucher, Party } from "@shared/schema";
import { Plus, Loader2, FileText, Eye, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function Invoices() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const { data: vouchers, isLoading } = useQuery<Voucher[]>({
    queryKey: ["/api/accounting/vouchers", { type: "sales" }],
    queryFn: async () => {
      const res = await fetch("/api/accounting/vouchers?type=sales");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  const { data: parties } = useQuery<Party[]>({
    queryKey: ["/api/accounting/parties"],
  });

  const partyMap = new Map(parties?.map(p => [p.id, p.name]) || []);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/vouchers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: "Invoice deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = vouchers?.filter(v => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (search) {
      const partyName = v.partyId ? (partyMap.get(v.partyId) || "") : "";
      if (!v.voucherNumber.toLowerCase().includes(search.toLowerCase()) && !partyName.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-invoices-title">Invoices</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage sales invoices</p>
          </div>
          {(user?.role === "super_admin" || user?.role === "admin" || user?.role === "senior_accountant" || user?.role === "accountant") && (
            <Link href="/accounting/invoices/new">
              <Button className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-new-invoice">
                <Plus className="w-4 h-4 mr-2" />New Invoice
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by number or party..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-invoices" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-invoice-status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filtered?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-invoices">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Invoice #</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Party</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-invoice-${v.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white font-medium">{v.voucherNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(v.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{v.partyId ? (partyMap.get(v.partyId) || "-") : "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">₹{parseFloat(v.totalAmount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[v.status] || STATUS_COLORS.pending}`}>{v.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/accounting/invoice/${v.id}`}>
                            <Button size="icon" variant="ghost" className="text-sky-600 dark:text-sky-400" title="View Invoice" data-testid={`button-view-invoice-${v.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {isAdmin && v.status === "draft" && (
                            <Button size="icon" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => { if (confirm("Delete this invoice?")) deleteMutation.mutate(v.id); }} disabled={deleteMutation.isPending} data-testid={`button-delete-invoice-${v.id}`}>
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
