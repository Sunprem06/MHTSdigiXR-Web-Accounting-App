import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { VOUCHER_TYPES, VOUCHER_STATUSES } from "@shared/schema";
import type { Voucher } from "@shared/schema";
import {
  Search, Plus, CheckCircle, Trash2, Eye, Loader2, FileText, Filter
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  sales: "Sales",
  purchase: "Purchase",
  payment: "Payment",
  receipt: "Receipt",
  journal: "Journal",
  contra: "Contra",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function VoucherList() {
  const { canApprove, canDelete, canWrite } = useAuth();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  const qs = queryParams.toString();

  const { data: vouchers, isLoading } = useQuery<Voucher[]>({
    queryKey: ["/api/accounting/vouchers", qs ? `?${qs}` : ""],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/accounting/vouchers/${id}/status`, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: "Voucher approved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error approving voucher", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/vouchers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/vouchers"] });
      toast({ title: "Voucher deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting voucher", description: err.message, variant: "destructive" });
    },
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-voucher-list-title">
              Vouchers
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all transaction vouchers</p>
          </div>
          {canWrite && (
            <Link href="/accounting/vouchers/new">
              <Button className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-new-voucher">
                <Plus className="w-4 h-4 mr-2" />
                New Voucher
              </Button>
            </Link>
          )}
        </div>

        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search voucher number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-vouchers"
                  />
                </div>
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger data-testid="select-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {VOUCHER_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {VOUCHER_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  data-testid="input-date-from"
                />
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12" data-testid="loading-vouchers">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : !vouchers?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400" data-testid="text-no-vouchers">No vouchers found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-vouchers">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Voucher No.</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Type</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                      data-testid={`row-voucher-${v.id}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm text-slate-900 dark:text-white" data-testid={`text-voucher-number-${v.id}`}>
                          {v.voucherNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300" data-testid={`text-voucher-date-${v.id}`}>
                        {new Date(v.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" data-testid={`badge-voucher-type-${v.id}`}>
                          {TYPE_LABELS[v.type] || v.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white" data-testid={`text-voucher-amount-${v.id}`}>
                        {parseFloat(v.totalAmount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[v.status] || ""}`}
                          data-testid={`badge-voucher-status-${v.id}`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/accounting/vouchers/${v.id}`}>
                            <Button size="icon" variant="ghost" data-testid={`button-view-voucher-${v.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {canApprove && v.status !== "approved" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 dark:text-green-400"
                              onClick={() => approveMutation.mutate(v.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`button-approve-voucher-${v.id}`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 dark:text-red-400"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this voucher?")) {
                                  deleteMutation.mutate(v.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-voucher-${v.id}`}
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
    </AccountingLayout>
  );
}
