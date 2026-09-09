import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { Tutor, Employee } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Loader2, FileText, Trash2 } from "lucide-react";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+65", "+61"];

const emptyForm = {
  tutorCode: "", fullName: "", gender: "", countryCode: "+91", contactPhone: "", email: "", panNumber: "",
  bankName: "", bankAccountNumber: "", bankIfsc: "", gstNumber: "",
  city: "Chennai", status: "active", loginEmployeeId: "",
};

export default function Tutors() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("payroll_tutors.manage");
  const canLinkLogin = hasPermission("employees.view");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState<Tutor | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: tutors, isLoading } = useQuery<Tutor[]>({
    queryKey: ["/api/accounting/tutors"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/accounting/employees"],
    enabled: canLinkLogin,
  });
  const tutorRoleEmployees = employees?.filter(e => e.role === "tutor") || [];

  const panError = form.panNumber && !PAN_REGEX.test(form.panNumber.toUpperCase())
    ? "PAN must be in the format AAAAA9999A"
    : "";

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/tutors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutors"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Tutor created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/tutors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutors"] });
      setEditOpen(false);
      setEditingTutor(null);
      toast({ title: "Tutor updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/accounting/tutors/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutors"] });
      toast({ title: "Tutor deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const buildPayload = () => ({
    ...form,
    loginEmployeeId: form.loginEmployeeId ? parseInt(form.loginEmployeeId) : null,
    panNumber: form.panNumber ? form.panNumber.toUpperCase() : form.panNumber,
  });

  const openAdd = async () => {
    let suggestedCode = "";
    try {
      const res = await apiRequest("GET", "/api/accounting/tutors/next-code");
      suggestedCode = (await res.json()).tutorCode;
    } catch {
      // Non-fatal — the field stays editable, they can type a code manually.
    }
    setForm({ ...emptyForm, tutorCode: suggestedCode });
    setAddOpen(true);
  };

  const openEdit = (t: Tutor) => {
    setEditingTutor(t);
    setForm({
      tutorCode: t.tutorCode, fullName: t.fullName, gender: t.gender || "",
      countryCode: t.countryCode || "+91", contactPhone: t.contactPhone || "",
      email: t.email || "", panNumber: t.panNumber || "", bankName: t.bankName || "",
      bankAccountNumber: t.bankAccountNumber || "", bankIfsc: t.bankIfsc || "", gstNumber: t.gstNumber || "",
      city: t.city || "Chennai", status: t.status,
      loginEmployeeId: t.loginEmployeeId ? String(t.loginEmployeeId) : "",
    });
    setEditOpen(true);
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label>Tutor Code</Label>
        <Input value={form.tutorCode} onChange={e => setForm({ ...form, tutorCode: e.target.value })} placeholder="2026001" data-testid="input-tutor-code" />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-suggested — overwrite with your existing code when backfilling a tutor.</p>
      </div>
      <div><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} data-testid="input-tutor-fullname" /></div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="input-tutor-email" /></div>
      <div>
        <Label>Contact Phone</Label>
        <div className="flex gap-2">
          <Select value={form.countryCode} onValueChange={v => setForm({ ...form, countryCode: v })}>
            <SelectTrigger className="w-24" data-testid="select-tutor-country-code"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} data-testid="input-tutor-phone" />
        </div>
      </div>
      <div>
        <Label>Gender</Label>
        <Select value={form.gender || "unspecified"} onValueChange={v => setForm({ ...form, gender: v === "unspecified" ? "" : v })}>
          <SelectTrigger data-testid="select-tutor-gender"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unspecified">Not specified</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} data-testid="input-tutor-city" /></div>
      <div>
        <Label>PAN Number</Label>
        <Input
          value={form.panNumber}
          onChange={e => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
          placeholder="AAAAA9999A"
          className="uppercase"
          data-testid="input-tutor-pan"
        />
        {panError && <p className="text-xs text-red-600 mt-1">{panError}</p>}
        {!form.panNumber && <p className="text-xs text-amber-600 mt-1">Without a valid PAN, TDS defaults to 20% (Sec 206AA).</p>}
      </div>
      <div>
        <Label>Tutor's GST Number (if registered)</Label>
        <Input value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} data-testid="input-tutor-gst" />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The tutor's own GSTIN, not MHTS's — leave blank if they aren't GST-registered.</p>
      </div>
      <div><Label>Bank Name</Label><Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} data-testid="input-tutor-bank" /></div>
      <div><Label>Bank Account No.</Label><Input value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} data-testid="input-tutor-bank-account" /></div>
      <div><Label>Bank IFSC</Label><Input value={form.bankIfsc} onChange={e => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })} className="uppercase" data-testid="input-tutor-ifsc" /></div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger data-testid="select-tutor-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {canLinkLogin && (
        <div className="sm:col-span-2">
          <Label>Self-Service Login (optional)</Label>
          <Select value={form.loginEmployeeId || "none"} onValueChange={v => setForm({ ...form, loginEmployeeId: v === "none" ? "" : v })}>
            <SelectTrigger data-testid="select-tutor-login"><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked</SelectItem>
              {tutorRoleEmployees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.fullName} ({e.username})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create a login account with the "Tutor" role under Employees first, then link it here so this tutor can view/print their own payslips and courses.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Tutors</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Independent contractors — KoodaldigiXS Learning (Sec 194J, no PF/ESI)</p>
          </div>
          {canManage && (
            <Button onClick={openAdd} data-testid="button-add-tutor">
              <Plus className="w-4 h-4 mr-2" />Add Tutor
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !tutors?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No tutors found.</div>
            ) : (
              <Table data-testid="table-tutors">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tutors.map(t => (
                    <TableRow key={t.id} data-testid={`row-tutor-${t.id}`}>
                      <TableCell className="font-mono text-xs">{t.tutorCode}</TableCell>
                      <TableCell className="font-medium">{t.fullName}</TableCell>
                      <TableCell>{t.contactPhone ? `${t.countryCode || "+91"} ${t.contactPhone}` : "-"}</TableCell>
                      <TableCell>{t.panNumber || <span className="text-amber-600">Missing</span>}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "active" ? "default" : "outline"}>{t.status === "active" ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link href={`/accounting/payroll/tutor-agreements?tutorId=${t.id}`}>
                            <Button size="icon" variant="ghost" title="Agreements" data-testid={`button-agreements-tutor-${t.id}`}>
                              <FileText className="w-4 h-4" />
                            </Button>
                          </Link>
                          {canManage && (
                            <Button size="icon" variant="ghost" onClick={() => openEdit(t)} data-testid={`button-edit-tutor-${t.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canManage && (
                            <Button size="icon" variant="ghost" className="text-red-600"
                              onClick={() => { if (confirm(`Delete tutor "${t.fullName}"? This cannot be undone.`)) deleteMutation.mutate(t.id); }}
                              disabled={deleteMutation.isPending} title="Delete" data-testid={`button-delete-tutor-${t.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-add-tutor">
            <DialogHeader><DialogTitle>Add New Tutor</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(buildPayload())}
                disabled={createMutation.isPending || !form.fullName || !!panError}
                data-testid="button-submit-add-tutor"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-tutor">
            <DialogHeader><DialogTitle>Edit Tutor</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => editingTutor && updateMutation.mutate({ id: editingTutor.id, data: buildPayload() })}
                disabled={updateMutation.isPending || !form.fullName || !!panError}
                data-testid="button-submit-edit-tutor"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
