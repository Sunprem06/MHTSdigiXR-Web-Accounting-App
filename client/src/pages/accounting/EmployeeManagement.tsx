import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@shared/schema";
import type { DbRole } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Loader2 } from "lucide-react";

interface Employee {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function EmployeeManagement() {
  const { user, canManageEmployees } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("viewer");

  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("viewer");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/accounting/employees"],
  });

  const { data: dbRoles } = useQuery<DbRole[]>({
    queryKey: ["/api/accounting/roles"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; email: string; password: string; fullName: string; role: string }) => {
      const res = await apiRequest("POST", "/api/accounting/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/employees"] });
      setAddOpen(false);
      resetAddForm();
      toast({ title: "Employee created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/employees"] });
      setEditOpen(false);
      setEditingEmployee(null);
      toast({ title: "Employee updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetAddForm = () => {
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewRole("viewer");
  };

  const handleAdd = () => {
    createMutation.mutate({
      username: newUsername,
      email: newEmail,
      password: newPassword,
      fullName: newFullName,
      role: newRole,
    });
  };

  const handleEdit = () => {
    if (!editingEmployee) return;
    const data: Record<string, unknown> = {
      fullName: editFullName,
      email: editEmail,
      role: editRole,
      isActive: editIsActive,
    };
    if (editPassword) {
      data.password = editPassword;
    }
    updateMutation.mutate({ id: editingEmployee.id, data });
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFullName(emp.fullName);
    setEditEmail(emp.email);
    setEditRole(emp.role);
    setEditIsActive(emp.isActive);
    setEditPassword("");
    setEditOpen(true);
  };

  const availableRoles = (dbRoles || []).filter(r => {
    if (user?.role === "super_admin") return true;
    return r.slug !== "super_admin" && r.slug !== "admin";
  });

  const filteredEmployees = employees?.filter((emp) => {
    if (user?.role === "super_admin") return true;
    return emp.role !== "super_admin";
  });

  if (!canManageEmployees) {
    return (
      <AccountingLayout>
        <div className="flex items-center justify-center py-20" data-testid="access-denied-employees">
          <p className="text-slate-500 dark:text-slate-400">You do not have permission to manage employees.</p>
        </div>
      </AccountingLayout>
    );
  }

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
            Employee Management
          </h1>
          <Button onClick={() => { resetAddForm(); setAddOpen(true); }} data-testid="button-add-employee">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="loading-employees">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !filteredEmployees || filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-employees">
                No employees found.
              </div>
            ) : (
              <Table data-testid="table-employees">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell>{emp.username}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-role-${emp.id}`}>
                          {dbRoles?.find(r => r.slug === emp.role)?.label || ROLE_LABELS[emp.role] || emp.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={emp.isActive ? "default" : "outline"}
                          data-testid={`badge-status-${emp.id}`}
                        >
                          {emp.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(emp)}
                          data-testid={`button-edit-employee-${emp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent data-testid="dialog-add-employee">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} data-testid="input-new-fullname" />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} data-testid="input-new-username" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} data-testid="input-new-email" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="input-new-password" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.slug} value={r.slug} data-testid={`option-role-${r.slug}`}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending || !newUsername || !newEmail || !newPassword || !newFullName}
                data-testid="button-submit-add"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent data-testid="dialog-edit-employee">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} data-testid="input-edit-fullname" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} data-testid="input-edit-email" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.slug} value={r.slug} data-testid={`option-edit-role-${r.slug}`}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label>Active</Label>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                  data-testid="switch-edit-active"
                />
              </div>
              <div>
                <Label>Reset Password (leave empty to keep current)</Label>
                <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} data-testid="input-edit-password" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={updateMutation.isPending || !editFullName || !editEmail}
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
