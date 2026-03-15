import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { CaseStudy } from "@shared/schema";

const CATEGORIES = ["Web Development", "Mobile App", "Digital Marketing", "SEO", "Branding", "UI/UX Design", "E-commerce"];

export default function CaseStudiesManagement() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CaseStudy | null>(null);
  const [form, setForm] = useState({ title: "", client: "", category: "Web Development", description: "", image: "", results: "" });

  const { data: items = [], isLoading } = useQuery<CaseStudy[]>({
    queryKey: ["/api/accounting/case-studies"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = { ...data, results: data.results ? data.results.split("\n").filter(Boolean) : [] };
      if (editingItem) {
        await apiRequest("PATCH", `/api/accounting/case-studies/${editingItem.id}`, payload);
      } else {
        await apiRequest("POST", "/api/accounting/case-studies", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/case-studies"] });
      setDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem ? "Case study updated" : "Case study created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/case-studies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/case-studies"] });
      toast({ title: "Case study deleted" });
    },
  });

  const openNew = () => {
    setEditingItem(null);
    setForm({ title: "", client: "", category: "Web Development", description: "", image: "", results: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: CaseStudy) => {
    setEditingItem(item);
    const resultsStr = Array.isArray(item.results) ? (item.results as string[]).join("\n") : "";
    setForm({ title: item.title, client: item.client, category: item.category || "Web Development", description: item.description, image: item.image, results: resultsStr });
    setDialogOpen(true);
  };

  return (
    <AccountingLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Case Studies</h1>
        {hasPermission("content.create") && (
          <Button onClick={openNew} className="gap-2 bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-new-case-study">
            <Plus className="w-4 h-4" /> Add Case Study
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No case studies yet</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden" data-testid={`card-case-study-${item.id}`}>
              {item.image && (
                <img src={item.image} alt={item.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Client: {item.client}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{item.description}</p>
                <div className="flex justify-end gap-1">
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
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Case Study" : "New Case Study"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="input-title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client</Label>
                <Input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} data-testid="input-client" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} data-testid="input-description" />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} data-testid="input-image" />
            </div>
            <div>
              <Label>Results (one per line)</Label>
              <Textarea value={form.results} onChange={e => setForm(f => ({ ...f, results: e.target.value }))} rows={3} placeholder="200% increase in sales&#10;50% faster load time" data-testid="input-results" />
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
