import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, EXPENSE_STATUSES } from "@shared/schema";
import type { ExpenseClaim } from "@shared/schema";
import { Plus, Loader2, X, Save, Receipt, CheckCircle, XCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  reimbursed: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

export default function Expenses() {
  const { user, canApprove } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "other" as string,
    description: "",
    amount: "",
    receiptRef: "",
  });

  const { data: expenses, isLoading } = useQuery<ExpenseClaim[]>({
    queryKey: ["/api/accounting/expenses"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/accounting/expenses", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/expenses"] });
      toast({ title: "Expense claim submitted" });
      setShowForm(false);
      setFormData({ date: new Date().toISOString().split("T")[0], category: "other", description: "", amount: "", receiptRef: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: number; status: string; remarks?: string }) => {
      await apiRequest("PATCH", `/api/accounting/expenses/${id}`, { status, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/expenses"] });
      toast({ title: "Expense updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = expenses?.filter(e => statusFilter === "all" || e.status === statusFilter);

  const totalPending = expenses?.filter(e => e.status === "pending").reduce((s, e) => s + parseFloat(e.amount), 0) || 0;
  const totalApproved = expenses?.filter(e => e.status === "approved" || e.status === "reimbursed").reduce((s, e) => s + parseFloat(e.amount), 0) || 0;

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-expenses-title">Expense Claims</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Submit and manage expense reimbursements</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-new-expense">
            <Plus className="w-4 h-4 mr-2" />New Claim
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Claims</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{expenses?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">Pending Amount</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalPending.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Approved / Reimbursed</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalApproved.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
        </div>

        {showForm && (
          <Card className="border-sky-200 dark:border-sky-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg text-slate-900 dark:text-white">New Expense Claim</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                  <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} data-testid="input-expense-date" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Category</label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                    <SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Amount (INR)</label>
                  <Input type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" data-testid="input-expense-amount" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
                  <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What was this expense for?" rows={2} className="resize-none" data-testid="input-expense-description" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Receipt Reference</label>
                  <Input value={formData.receiptRef} onChange={e => setFormData({...formData, receiptRef: e.target.value})} placeholder="Bill/receipt number" data-testid="input-expense-receipt" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!formData.description || !formData.amount || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-submit-expense">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Submit Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
          {["all", ...EXPENSE_STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${statusFilter === s ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm" : "text-slate-500 dark:text-slate-400"}`} data-testid={`tab-expense-${s}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filtered?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No expense claims found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-expenses">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Claim #</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Description</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Amount</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    {canApprove && <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-expense-${e.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">{e.claimNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800">{EXPENSE_CATEGORY_LABELS[e.category as keyof typeof EXPENSE_CATEGORY_LABELS] || e.category}</Badge></td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{e.description}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">₹{parseFloat(e.amount).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                      </td>
                      {canApprove && (
                        <td className="px-4 py-3 text-right">
                          {e.status === "pending" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="text-green-600 dark:text-green-400" onClick={() => updateMutation.mutate({ id: e.id, status: "approved" })} disabled={updateMutation.isPending} data-testid={`button-approve-expense-${e.id}`}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => updateMutation.mutate({ id: e.id, status: "rejected", remarks: "Rejected" })} disabled={updateMutation.isPending} data-testid={`button-reject-expense-${e.id}`}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
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
