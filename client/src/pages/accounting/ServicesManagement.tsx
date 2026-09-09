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
import { Pencil, Trash2, Globe, Plus } from "lucide-react";
import type { Service, InsertService } from "@shared/schema";

const EMPTY_SERVICE: InsertService = { title: "", slug: "", description: "", icon: "", image: "", features: [] };

export default function ServicesManagement() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [editItem, setEditItem] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<InsertService | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery<Service[]>({ queryKey: ["/api/accounting/services"] });

  const createMutation = useMutation({
    mutationFn: async (data: InsertService) => {
      await apiRequest("POST", "/api/accounting/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service created" });
      setCreateDialogOpen(false);
      setNewItem(null);
    },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Service> }) => {
      await apiRequest("PATCH", `/api/accounting/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service updated" });
      setDialogOpen(false);
      setEditItem(null);
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const handleEdit = (item: Service) => {
    setEditItem({ ...item });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    updateMutation.mutate({ id: editItem.id, data: { title: editItem.title, slug: editItem.slug, description: editItem.description, icon: editItem.icon, image: editItem.image, features: editItem.features } });
  };

  const canEdit = hasPermission("content.edit");
  const canDelete = hasPermission("content.delete");
  const canCreate = hasPermission("content.create");

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-services-title">Services Management</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your service offerings displayed on the website</p>
          </div>
          {canCreate && (
            <Button onClick={() => { setNewItem({ ...EMPTY_SERVICE }); setCreateDialogOpen(true); }} className="bg-sky-500 hover:bg-sky-600 text-white" data-testid="button-add-service">
              <Plus className="w-4 h-4 mr-2" /> Add Service
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">No services found. Services are seeded on first run.</div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Title</th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Slug</th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Icon</th>
                  <th className="text-left p-4 font-semibold text-slate-700 dark:text-slate-300">Features</th>
                  <th className="text-right p-4 font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`row-service-${item.id}`}>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{item.title}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{item.slug}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{item.icon}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{(item.features || []).length} features</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} data-testid={`button-edit-service-${item.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { if (confirm("Delete this service?")) deleteMutation.mutate(item.id); }} data-testid={`button-delete-service-${item.id}`}>
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
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                <Input value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} data-testid="input-service-title" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Slug</label>
                <Input value={editItem.slug} onChange={e => setEditItem({ ...editItem, slug: e.target.value })} data-testid="input-service-slug" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <Textarea value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} data-testid="input-service-description" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Icon Name (lucide icon)</label>
                <Input value={editItem.icon} onChange={e => setEditItem({ ...editItem, icon: e.target.value })} data-testid="input-service-icon" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Image URL</label>
                <Input value={editItem.image} onChange={e => setEditItem({ ...editItem, image: e.target.value })} data-testid="input-service-image" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Features (one per line)</label>
                <Textarea value={(editItem.features || []).join("\n")} onChange={e => setEditItem({ ...editItem, features: e.target.value.split("\n").filter(f => f.trim()) })} rows={5} data-testid="input-service-features" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-service">Cancel</Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-sky-500 hover:bg-sky-600 text-white" data-testid="button-save-service">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
          </DialogHeader>
          {newItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                <Input value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} data-testid="input-new-service-title" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Slug</label>
                <Input value={newItem.slug} onChange={e => setNewItem({ ...newItem, slug: e.target.value })} data-testid="input-new-service-slug" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <Textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} data-testid="input-new-service-description" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Icon Name (lucide icon)</label>
                <Input value={newItem.icon} onChange={e => setNewItem({ ...newItem, icon: e.target.value })} data-testid="input-new-service-icon" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Image URL</label>
                <Input value={newItem.image} onChange={e => setNewItem({ ...newItem, image: e.target.value })} data-testid="input-new-service-image" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Features (one per line)</label>
                <Textarea value={(newItem.features || []).join("\n")} onChange={e => setNewItem({ ...newItem, features: e.target.value.split("\n").filter(f => f.trim()) })} rows={5} data-testid="input-new-service-features" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-new-service">Cancel</Button>
                <Button
                  onClick={() => newItem && createMutation.mutate(newItem)}
                  disabled={createMutation.isPending || !newItem?.title || !newItem?.slug || !newItem?.description || !newItem?.icon || !newItem?.image}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                  data-testid="button-save-new-service"
                >
                  {createMutation.isPending ? "Creating..." : "Create Service"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
