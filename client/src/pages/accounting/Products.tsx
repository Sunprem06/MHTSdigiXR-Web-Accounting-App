import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, GST_RATES } from "@shared/schema";
import type { Product } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Package, Loader2, X, Save, Trash2 } from "lucide-react";

export default function Products() {
  const { canDelete } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    productCode: "", name: "", category: "other" as string,
    description: "", hsnSacCode: "", unit: "project",
    rate: "", gstRate: "18",
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/accounting/products"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body = { ...formData, rate: formData.rate || "0", gstRate: formData.gstRate || "18" };
      if (editingId) {
        await apiRequest("PATCH", `/api/accounting/products/${editingId}`, body);
      } else {
        await apiRequest("POST", "/api/accounting/products", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/products"] });
      toast({ title: editingId ? "Product updated" : "Product created" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/products"] });
      toast({ title: "Product deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ productCode: "", name: "", category: "other", description: "", hsnSacCode: "", unit: "project", rate: "", gstRate: "18" });
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      productCode: p.productCode, name: p.name, category: p.category,
      description: p.description || "", hsnSacCode: p.hsnSacCode || "",
      unit: p.unit || "project", rate: p.rate, gstRate: p.gstRate,
    });
    setShowForm(true);
  };

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.productCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-products-title">Products & Services</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your service catalog</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-2" />New Product
          </Button>
        </div>

        {showForm && (
          <Card className="border-sky-200 dark:border-sky-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg text-slate-900 dark:text-white">{editingId ? "Edit Product" : "New Product"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Product Code</label>
                  <Input value={formData.productCode} onChange={e => setFormData({...formData, productCode: e.target.value})} placeholder="SRV-WEB-001" data-testid="input-product-code" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Name</label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Website Development" data-testid="input-product-name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Category</label>
                  <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                    <SelectTrigger data-testid="select-product-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{PRODUCT_CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">HSN/SAC Code</label>
                  <Input value={formData.hsnSacCode} onChange={e => setFormData({...formData, hsnSacCode: e.target.value})} placeholder="998314" data-testid="input-hsn-sac" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Unit</label>
                  <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                    <SelectTrigger data-testid="select-product-unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["project", "month", "hour", "year", "unit", "nos"].map(u => <SelectItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Rate (INR)</label>
                  <Input type="number" min="0" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} placeholder="25000" data-testid="input-product-rate" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">GST Rate (%)</label>
                  <Select value={formData.gstRate} onValueChange={v => setFormData({...formData, gstRate: v})}>
                    <SelectTrigger data-testid="select-gst-rate"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
                  <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Service description..." rows={2} className="resize-none" data-testid="input-product-description" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!formData.productCode || !formData.name || createMutation.isPending} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-save-product">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-products" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filteredProducts?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No products found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-products">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Code</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Category</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">SAC</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Rate</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">GST</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-product-${p.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">{p.productCode}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800">{PRODUCT_CATEGORY_LABELS[p.category as keyof typeof PRODUCT_CATEGORY_LABELS] || p.category}</Badge></td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{p.hsnSacCode || "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">₹{parseFloat(p.rate).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-300">{p.gstRate}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(p)} data-testid={`button-edit-product-${p.id}`}>Edit</Button>
                          {canDelete && (
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={() => { if (confirm("Are you sure you want to delete this product?")) deleteMutation.mutate(p.id); }} disabled={deleteMutation.isPending} data-testid={`button-delete-product-${p.id}`}>
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
