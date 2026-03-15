import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Lock, Shield } from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from "@shared/schema";
import type { Permission, DbRole } from "@shared/schema";

export default function Roles() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<DbRole | null>(null);

  const [formSlug, setFormSlug] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<Permission[]>([]);

  const canManage = hasPermission("roles.manage");

  const { data: roles, isLoading } = useQuery<DbRole[]>({
    queryKey: ["/api/accounting/roles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { slug: string; label: string; description: string; permissions: Permission[] }) => {
      const res = await apiRequest("POST", "/api/accounting/roles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/roles"] });
      setDialogOpen(false);
      toast({ title: "Role created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/roles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/roles"] });
      setDialogOpen(false);
      toast({ title: "Role updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/accounting/roles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/roles"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setEditingRole(null);
    setFormSlug("");
    setFormLabel("");
    setFormDescription("");
    setFormPermissions([]);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (role: DbRole) => {
    setEditingRole(role);
    setFormSlug(role.slug);
    setFormLabel(role.label);
    setFormDescription(role.description || "");
    setFormPermissions(Array.isArray(role.permissions) ? (role.permissions as Permission[]) : []);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        data: {
          label: formLabel,
          description: formDescription,
          permissions: formPermissions,
          ...(editingRole.isSystem ? {} : { slug: formSlug }),
        },
      });
    } else {
      createMutation.mutate({
        slug: formSlug,
        label: formLabel,
        description: formDescription,
        permissions: formPermissions,
      });
    }
  };

  const togglePermission = (perm: Permission) => {
    setFormPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const toggleGroup = (groupKey: string) => {
    const groupPerms = PERMISSION_GROUPS[groupKey].permissions;
    const allChecked = groupPerms.every(p => formPermissions.includes(p));
    if (allChecked) {
      setFormPermissions(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setFormPermissions(prev => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const selectAll = () => setFormPermissions([...ALL_PERMISSIONS]);
  const clearAll = () => setFormPermissions([]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!hasPermission("roles.view")) {
    return (
      <AccountingLayout>
        <div className="flex items-center justify-center py-20" data-testid="access-denied-roles">
          <p className="text-slate-500 dark:text-slate-400">You do not have permission to view roles.</p>
        </div>
      </AccountingLayout>
    );
  }

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
              Roles Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage system and custom roles with granular permissions
            </p>
          </div>
          {canManage && (
            <Button onClick={openAdd} data-testid="button-add-role">
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Role
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="loading-roles">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !roles || roles.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-roles">
                No roles found.
              </div>
            ) : (
              <Table data-testid="table-roles">
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Type</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const permCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
                    return (
                      <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                        <TableCell className="font-medium">{role.label}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {role.slug}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {role.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-perms-${role.id}`}>
                            {permCount} / {ALL_PERMISSIONS.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="w-3 h-3" /> System
                            </Badge>
                          ) : (
                            <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              Custom
                            </Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEdit(role)}
                                data-testid={`button-edit-role-${role.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {!role.isSystem && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => deleteMutation.mutate(role.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-role-${role.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-role">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Add Custom Role"}</DialogTitle>
              <DialogDescription>
                {editingRole?.isSystem
                  ? "You can modify permissions for this system role. The slug cannot be changed."
                  : "Create a new custom role with specific permissions."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g. Sales Director"
                    data-testid="input-role-label"
                  />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    placeholder="e.g. sales_director"
                    disabled={editingRole?.isSystem === true}
                    data-testid="input-role-slug"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this role's purpose"
                  rows={2}
                  data-testid="input-role-description"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Permissions</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all-perms">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAll} data-testid="button-clear-all-perms">
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-slate-800/50">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const allChecked = group.permissions.every(p => formPermissions.includes(p));
                    const someChecked = group.permissions.some(p => formPermissions.includes(p));

                    return (
                      <div key={groupKey} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allChecked}
                            onCheckedChange={() => toggleGroup(groupKey)}
                            data-testid={`checkbox-group-${groupKey}`}
                          />
                          <Label className="font-medium cursor-pointer" onClick={() => toggleGroup(groupKey)}>
                            {group.label}
                          </Label>
                          {someChecked && !allChecked && (
                            <span className="text-xs text-sky-500">(partial)</span>
                          )}
                        </div>
                        <div className="ml-6 flex flex-wrap gap-x-4 gap-y-2">
                          {group.permissions.map(perm => {
                            const action = perm.split(".")[1];
                            return (
                              <label key={perm} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <Checkbox
                                  checked={formPermissions.includes(perm)}
                                  onCheckedChange={() => togglePermission(perm)}
                                  data-testid={`checkbox-perm-${perm.replace(/\./g, '-')}`}
                                />
                                <span className="text-slate-600 dark:text-slate-300 capitalize">{action}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {formPermissions.length} of {ALL_PERMISSIONS.length} permissions selected
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-role">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !formSlug || !formLabel}
                data-testid="button-submit-role"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
