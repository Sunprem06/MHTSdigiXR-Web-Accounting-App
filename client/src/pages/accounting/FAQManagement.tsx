import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { FaqItem } from "@shared/schema";

const FAQ_CATEGORIES = ["General Questions", "Web Development", "Mobile App Development", "Digital Marketing", "SEO", "Design", "Pricing", "Support"];

export default function FAQManagement() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "General Questions", displayOrder: 0, isActive: true });

  const { data: items = [], isLoading } = useQuery<FaqItem[]>({
    queryKey: ["/api/accounting/faqs"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        await apiRequest("PATCH", `/api/accounting/faqs/${editingItem.id}`, data);
      } else {
        await apiRequest("POST", "/api/accounting/faqs", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/faqs"] });
      setDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem ? "FAQ updated" : "FAQ created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/faqs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/faqs"] });
      toast({ title: "FAQ deleted" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: number; newOrder: number }) => {
      await apiRequest("PATCH", `/api/accounting/faqs/${id}`, { displayOrder: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/faqs"] });
    },
  });

  const moveItem = (item: FaqItem, direction: "up" | "down") => {
    const categoryItems = items
      .filter(i => i.category === item.category)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = categoryItems.findIndex(i => i.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categoryItems.length) return;

    const swapItem = categoryItems[swapIdx];
    reorderMutation.mutate({ id: item.id, newOrder: swapItem.displayOrder });
    reorderMutation.mutate({ id: swapItem.id, newOrder: item.displayOrder });
  };

  const openNew = () => {
    setEditingItem(null);
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) : 0;
    setForm({ question: "", answer: "", category: "General Questions", displayOrder: maxOrder + 1, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditingItem(item);
    setForm({ question: item.question, answer: item.answer, category: item.category, displayOrder: item.displayOrder, isActive: item.isActive });
    setDialogOpen(true);
  };

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <AccountingLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">FAQ Management</h1>
        {hasPermission("content.create") && (
          <Button onClick={openNew} className="gap-2 bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-new-faq">
            <Plus className="w-4 h-4" /> Add FAQ
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No FAQ items yet</div>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => {
            const categoryItems = items.filter(i => i.category === cat).sort((a, b) => a.displayOrder - b.displayOrder);
            return (
              <div key={cat}>
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">{cat}</h2>
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {categoryItems.map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-3 p-4" data-testid={`row-faq-${item.id}`}>
                      {hasPermission("content.edit") && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={idx === 0 || reorderMutation.isPending}
                            onClick={() => moveItem(item, "up")}
                            data-testid={`button-move-up-${item.id}`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={idx === categoryItems.length - 1 || reorderMutation.isPending}
                            onClick={() => moveItem(item, "down")}
                            data-testid={`button-move-down-${item.id}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 dark:text-white text-sm">{item.question}</span>
                          {!item.isActive && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{item.answer}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
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
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit FAQ" : "New FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAQ_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Question</Label>
              <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} data-testid="input-question" />
            </div>
            <div>
              <Label>Answer</Label>
              <Textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={4} data-testid="input-answer" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-active" />
              <Label>Active (visible on website)</Label>
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
