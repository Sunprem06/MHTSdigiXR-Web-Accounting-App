import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { SiteStat } from "@shared/schema";

const ICON_OPTIONS = ["Star", "Award", "Code", "Users", "TrendingUp", "Trophy", "Target", "Zap", "Shield", "Clock", "Heart", "Globe"];

export default function SiteStatsManagement() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SiteStat | null>(null);
  const [form, setForm] = useState({ label: "", value: "", suffix: "", icon: "Star", displayOrder: 0 });

  const { data: items = [], isLoading } = useQuery<SiteStat[]>({
    queryKey: ["/api/accounting/site-stats"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        await apiRequest("PATCH", `/api/accounting/site-stats/${editingItem.id}`, data);
      } else {
        await apiRequest("POST", "/api/accounting/site-stats", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/site-stats"] });
      setDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem ? "Stat updated" : "Stat created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/site-stats/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/site-stats"] });
      toast({ title: "Stat deleted" });
    },
  });

  const openNew = () => {
    setEditingItem(null);
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) : 0;
    setForm({ label: "", value: "", suffix: "", icon: "Star", displayOrder: maxOrder + 1 });
    setDialogOpen(true);
  };

  const openEdit = (item: SiteStat) => {
    setEditingItem(item);
    setForm({ label: item.label, value: item.value, suffix: item.suffix || "", icon: item.icon || "Star", displayOrder: item.displayOrder });
    setDialogOpen(true);
  };

  return (
    <AccountingLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Site Statistics</h1>
        {hasPermission("content.create") && (
          <Button onClick={openNew} className="gap-2 bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-new-stat">
            <Plus className="w-4 h-4" /> Add Stat
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No stats configured yet</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center" data-testid={`card-stat-${item.id}`}>
              <div className="text-3xl font-bold text-sky-500 mb-1">
                {item.value}{item.suffix}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{item.label}</p>
              <p className="text-xs text-slate-400 mb-3">Icon: {item.icon}</p>
              <div className="flex justify-center gap-1">
                {hasPermission("content.edit") && (
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} data-testid={`button-edit-${item.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {hasPermission("content.delete") && (
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-${item.id}`}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Stat" : "New Stat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Label</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Happy Clients" data-testid="input-label" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Value</Label>
                <Input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 150" data-testid="input-value" />
              </div>
              <div>
                <Label>Suffix</Label>
                <Input value={form.suffix} onChange={e => setForm(f => ({ ...f, suffix: e.target.value }))} placeholder="e.g. + or %" data-testid="input-suffix" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={v => setForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger data-testid="select-icon"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} data-testid="input-order" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-save">
                {saveMutation.isPending ? "Saving..." : editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
