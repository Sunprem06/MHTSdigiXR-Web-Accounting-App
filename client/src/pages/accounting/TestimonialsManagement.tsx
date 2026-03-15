import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Testimonial } from "@shared/schema";

export default function TestimonialsManagement() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ clientName: "", role: "", company: "", content: "", imageUrl: "", rating: 5, isActive: true, displayOrder: 0 });

  const { data: items = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/accounting/testimonials"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingItem) {
        await apiRequest("PATCH", `/api/accounting/testimonials/${editingItem.id}`, data);
      } else {
        await apiRequest("POST", "/api/accounting/testimonials", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/testimonials"] });
      setDialogOpen(false);
      setEditingItem(null);
      toast({ title: editingItem ? "Testimonial updated" : "Testimonial created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/testimonials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/testimonials"] });
      toast({ title: "Testimonial deleted" });
    },
  });

  const openNew = () => {
    setEditingItem(null);
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder)) : 0;
    setForm({ clientName: "", role: "", company: "", content: "", imageUrl: "", rating: 5, isActive: true, displayOrder: maxOrder + 1 });
    setDialogOpen(true);
  };

  const openEdit = (item: Testimonial) => {
    setEditingItem(item);
    setForm({ clientName: item.clientName, role: item.role, company: item.company || "", content: item.content, imageUrl: item.imageUrl || "", rating: item.rating, isActive: item.isActive, displayOrder: item.displayOrder });
    setDialogOpen(true);
  };

  return (
    <AccountingLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Testimonials</h1>
        {hasPermission("content.create") && (
          <Button onClick={openNew} className="gap-2 bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-new-testimonial">
            <Plus className="w-4 h-4" /> Add Testimonial
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No testimonials yet</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4" data-testid={`card-testimonial-${item.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.clientName} className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{item.clientName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.role}{item.company ? `, ${item.company}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!item.isActive && <Badge variant="outline" className="text-[10px] mr-2">Hidden</Badge>}
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
              <div className="flex mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < item.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                ))}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{item.content}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Testimonial" : "New Testimonial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client Name</Label>
                <Input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} data-testid="input-client-name" />
              </div>
              <div>
                <Label>Role / Title</Label>
                <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} data-testid="input-role" />
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} data-testid="input-company" />
            </div>
            <div>
              <Label>Testimonial Content</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} data-testid="input-content" />
            </div>
            <div>
              <Label>Photo URL</Label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} data-testid="input-image-url" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: parseInt(e.target.value) || 5 }))} data-testid="input-rating" />
              </div>
              <div>
                <Label>Order</Label>
                <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} data-testid="input-order" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-active" />
                <Label>Active</Label>
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
