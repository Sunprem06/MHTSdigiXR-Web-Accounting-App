import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Star } from "lucide-react";
import type { PricingPlan } from "@shared/schema";

const emptyPlan: Partial<PricingPlan> = {
  name: "",
  price: "",
  period: "one-time",
  description: "",
  features: [],
  isPopular: false,
  ctaLabel: "Get Started",
  displayOrder: 0,
  isActive: true,
};

export default function PricingPlansManagement() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [editItem, setEditItem] = useState<Partial<PricingPlan> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [featuresText, setFeaturesText] = useState("");

  const { data: items = [], isLoading } = useQuery<PricingPlan[]>({ queryKey: ["/api/accounting/pricing-plans"] });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PricingPlan>) => {
      await apiRequest("POST", "/api/accounting/pricing-plans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/pricing-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-plans"] });
      toast({ title: "Plan created" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PricingPlan> }) => {
      await apiRequest("PATCH", `/api/accounting/pricing-plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/pricing-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-plans"] });
      toast({ title: "Plan updated" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/pricing-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/pricing-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-plans"] });
      toast({ title: "Plan deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const handleNew = () => {
    setEditItem({ ...emptyPlan, displayOrder: items.length + 1 });
    setFeaturesText("");
    setIsNew(true);
    setDialogOpen(true);
  };

  const handleEdit = (item: PricingPlan) => {
    setEditItem({ ...item });
    setFeaturesText((item.features as string[] || []).join("\n"));
    setIsNew(false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    const data = { ...editItem, features: featuresText.split("\n").filter(f => f.trim()) };
    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: editItem.id!, data });
    }
  };

  const handleReorder = (item: PricingPlan, direction: "up" | "down") => {
    const idx = items.findIndex(i => i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const other = items[swapIdx];
    updateMutation.mutate({ id: item.id, data: { displayOrder: other.displayOrder } });
    updateMutation.mutate({ id: other.id, data: { displayOrder: item.displayOrder } });
  };

  const canCreate = hasPermission("content.create");
  const canEdit = hasPermission("content.edit");
  const canDelete = hasPermission("content.delete");

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-pricing-title">Pricing Plans</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage pricing tiers displayed on the Services page</p>
          </div>
          {canCreate && (
            <Button onClick={handleNew} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full" data-testid="button-add-plan">
              <Plus className="w-4 h-4 mr-2" /> Add Plan
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">No pricing plans yet. Add your first plan.</div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Order</th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Name</th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Price</th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Period</th>
                  <th className="text-center p-4 font-semibold text-slate-700 dark:text-slate-300">Popular</th>
                  <th className="text-center p-4 font-semibold text-slate-700 dark:text-slate-300">Active</th>
                  <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`row-plan-${item.id}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => handleReorder(item, "up")} data-testid={`button-plan-up-${item.id}`}>
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled={idx === items.length - 1} onClick={() => handleReorder(item, "down")} data-testid={`button-plan-down-${item.id}`}>
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      {item.name}
                      {item.isPopular && <Star className="w-4 h-4 text-amber-500 inline ml-2" />}
                    </td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{item.price !== "Custom" ? `₹${item.price}` : "Custom"}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{item.period}</td>
                    <td className="p-4 text-center">{item.isPopular ? <span className="text-amber-500 font-bold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                    <td className="p-4 text-center">{item.isActive ? <span className="text-green-500 font-bold">Active</span> : <span className="text-red-500">Inactive</span>}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} data-testid={`button-edit-plan-${item.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this plan?")) deleteMutation.mutate(item.id); }} data-testid={`button-delete-plan-${item.id}`}>
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
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Pricing Plan" : "Edit Pricing Plan"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan Name</label>
                <Input value={editItem.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value })} data-testid="input-plan-name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Price</label>
                  <Input value={editItem.price || ""} onChange={e => setEditItem({ ...editItem, price: e.target.value })} placeholder='e.g. 15,000 or Custom' data-testid="input-plan-price" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Period</label>
                  <Select value={editItem.period || "one-time"} onValueChange={v => setEditItem({ ...editItem, period: v })}>
                    <SelectTrigger data-testid="select-plan-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one-time">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="quote">Quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <Textarea value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} data-testid="input-plan-description" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Features (one per line)</label>
                <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={6} data-testid="input-plan-features" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">CTA Button Label</label>
                <Input value={editItem.ctaLabel || ""} onChange={e => setEditItem({ ...editItem, ctaLabel: e.target.value })} data-testid="input-plan-cta" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as Popular</label>
                <Switch checked={editItem.isPopular || false} onCheckedChange={v => setEditItem({ ...editItem, isPopular: v })} data-testid="switch-plan-popular" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</label>
                <Switch checked={editItem.isActive !== false} onCheckedChange={v => setEditItem({ ...editItem, isActive: v })} data-testid="switch-plan-active" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-plan">Cancel</Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-sky-500 hover:bg-sky-600 text-white" data-testid="button-save-plan">
                  {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : isNew ? "Create Plan" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
