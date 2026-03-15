import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Post } from "@shared/schema";

export default function BlogPosts() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", content: "", summary: "", coverImage: "", author: "Admin", status: "draft" });

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/accounting/posts"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      if (editingPost) {
        await apiRequest("PATCH", `/api/accounting/posts/${editingPost.id}`, data);
      } else {
        await apiRequest("POST", "/api/accounting/posts", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/posts"] });
      setDialogOpen(false);
      setEditingPost(null);
      toast({ title: editingPost ? "Post updated" : "Post created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/posts"] });
      toast({ title: "Post deleted" });
    },
  });

  const openNew = () => {
    setEditingPost(null);
    setForm({ title: "", slug: "", content: "", summary: "", coverImage: "", author: "Admin", status: "draft" });
    setDialogOpen(true);
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setForm({ title: post.title, slug: post.slug, content: post.content, summary: post.summary || "", coverImage: post.coverImage || "", author: post.author || "Admin", status: post.status || "draft" });
    setDialogOpen(true);
  };

  return (
    <AccountingLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Blog Posts</h1>
        {hasPermission("content.create") && (
          <Button onClick={openNew} className="gap-2 bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-new-post">
            <Plus className="w-4 h-4" /> New Post
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No blog posts yet</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Title</th>
                <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Author</th>
                <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Date</th>
                <th className="text-right p-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`row-post-${post.id}`}>
                  <td className="p-3 text-slate-900 dark:text-white font-medium">{post.title}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{post.author || "Admin"}</td>
                  <td className="p-3">
                    <Badge className={post.status === "published" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}>
                      {post.status === "published" ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                      {post.status || "draft"}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      {hasPermission("content.edit") && (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(post)} data-testid={`button-edit-${post.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission("content.delete") && (
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(post.id)} data-testid={`button-delete-${post.id}`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "New Blog Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} data-testid="input-title" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from title" data-testid="input-slug" />
            </div>
            <div>
              <Label>Summary</Label>
              <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} data-testid="input-summary" />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} data-testid="input-content" />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input value={form.coverImage} onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))} data-testid="input-cover-image" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Author</Label>
                <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} data-testid="input-author" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="button-save">
                {saveMutation.isPending ? "Saving..." : editingPost ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
