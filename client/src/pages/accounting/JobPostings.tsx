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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Briefcase, Users, Send, X as XIcon, RotateCcw, Ban } from "lucide-react";
import { Link } from "wouter";
import type { JobPosting } from "@shared/schema";

type JobPostingWithCount = JobPosting & { applicationCount: number };

const JOB_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const DEPARTMENTS = [
  "Engineering", "Design", "Marketing", "Content", "Sales", "Operations", "HR", "Finance", "Other"
];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300" },
  open: { label: "Open", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  closed: { label: "Closed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function ListBuilder({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  const addItem = () => {
    const val = input.trim();
    if (val && !items.includes(val)) {
      onChange([...items, val]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          data-testid="input-list-item"
        />
        <Button type="button" size="sm" variant="outline" onClick={addItem} data-testid="button-add-list-item">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800 rounded px-3 py-1.5">
              <span className="flex-1 text-slate-700 dark:text-slate-300">{item}</span>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JobPostings() {
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "", department: "Engineering", location: "Chennai, India",
    type: "full_time", experience: "", description: "",
    requirements: [] as string[], responsibilities: [] as string[],
    salaryRange: "", vacancies: 1, closingDate: "",
  });

  const { data: postings = [], isLoading } = useQuery<JobPostingWithCount[]>({
    queryKey: ["/api/accounting/job-postings"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/accounting/job-postings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Job posting created as draft" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/accounting/job-postings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Job posting updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/accounting/job-postings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      toast({ title: "Job posting deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/accounting/job-postings/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      toast({ title: "Job posting published" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/accounting/job-postings/${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      toast({ title: "Job posting closed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const reopenMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/accounting/job-postings/${id}/reopen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      toast({ title: "Job posting reopened" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({
      title: "", department: "Engineering", location: "Chennai, India",
      type: "full_time", experience: "", description: "",
      requirements: [], responsibilities: [], salaryRange: "",
      vacancies: 1, closingDate: "",
    });
    setEditingId(null);
  };

  const openEdit = (p: JobPosting) => {
    setEditingId(p.id);
    setFormData({
      title: p.title, department: p.department, location: p.location,
      type: p.type, experience: p.experience, description: p.description,
      requirements: (p.requirements as string[]) || [],
      responsibilities: (p.responsibilities as string[]) || [],
      salaryRange: p.salaryRange || "", vacancies: p.vacancies,
      closingDate: p.closingDate || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      closingDate: formData.closingDate || null,
      salaryRange: formData.salaryRange || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const canCreate = hasPermission("jobs.create");
  const canEdit = hasPermission("jobs.edit");
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Job Postings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage recruitment job listings</p>
          </div>
          <div className="flex gap-2">
            <Link href="/accounting/job-applications">
              <Button variant="outline" data-testid="button-view-applications">
                <Users className="w-4 h-4 mr-2" /> Applications
              </Button>
            </Link>
            {canCreate && (
              <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-sky-500 hover:bg-sky-600" data-testid="button-add-job">
                <Plus className="w-4 h-4 mr-2" /> New Job Posting
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : postings.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No job postings yet</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Title</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Department</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Vacancies</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Applications</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Posted</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Closing</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => {
                  const badge = STATUS_BADGES[p.status] || STATUS_BADGES.draft;
                  return (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700" data-testid={`row-job-${p.id}`}>
                      <td className="p-3">
                        <div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                        <div className="text-xs text-slate-500">{p.location} &middot; {JOB_TYPES.find(t => t.value === p.type)?.label || p.type}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{p.department}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{p.vacancies}</td>
                      <td className="p-3">
                        <Link href={`/accounting/job-applications?jobPostingId=${p.id}`}>
                          <span className="text-sky-600 hover:underline cursor-pointer" data-testid={`text-app-count-${p.id}`}>{p.applicationCount}</span>
                        </Link>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">
                        {p.postedAt ? new Date(p.postedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">
                        {p.closingDate || "—"}
                      </td>
                      <td className="p-3">
                        <Badge className={badge.className} data-testid={`badge-status-${p.id}`}>{badge.label}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {canEdit && p.status === "draft" && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => publishMutation.mutate(p.id)} title="Publish" data-testid={`button-publish-${p.id}`}>
                                <Send className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Edit" data-testid={`button-edit-${p.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {canEdit && p.status === "open" && (
                            <Button size="sm" variant="ghost" onClick={() => closeMutation.mutate(p.id)} title="Close" data-testid={`button-close-${p.id}`}>
                              <Ban className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                          {canEdit && p.status === "closed" && (
                            <Button size="sm" variant="ghost" onClick={() => reopenMutation.mutate(p.id)} title="Reopen" data-testid={`button-reopen-${p.id}`}>
                              <RotateCcw className="w-4 h-4 text-sky-500" />
                            </Button>
                          )}
                          {isSuperAdmin && p.applicationCount === 0 && (
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm("Delete this job posting?")) deleteMutation.mutate(p.id); }} data-testid={`button-delete-${p.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Job Posting" : "Create Job Posting"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title *</label>
                  <Input value={formData.title} onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Full Stack Developer" data-testid="input-job-title" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department *</label>
                  <Select value={formData.department} onValueChange={v => setFormData(d => ({ ...d, department: v }))}>
                    <SelectTrigger data-testid="select-department"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Location *</label>
                  <Input value={formData.location} onChange={e => setFormData(d => ({ ...d, location: e.target.value }))} data-testid="input-location" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Type</label>
                  <Select value={formData.type} onValueChange={v => setFormData(d => ({ ...d, type: v }))}>
                    <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience *</label>
                  <Input value={formData.experience} onChange={e => setFormData(d => ({ ...d, experience: e.target.value }))} placeholder="e.g. 3-5 years" data-testid="input-experience" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Salary Range</label>
                  <Input value={formData.salaryRange} onChange={e => setFormData(d => ({ ...d, salaryRange: e.target.value }))} placeholder="e.g. 8-12 LPA" data-testid="input-salary" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vacancies</label>
                  <Input type="number" min={1} value={formData.vacancies} onChange={e => setFormData(d => ({ ...d, vacancies: parseInt(e.target.value) || 1 }))} data-testid="input-vacancies" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Closing Date</label>
                <Input type="date" value={formData.closingDate} onChange={e => setFormData(d => ({ ...d, closingDate: e.target.value }))} data-testid="input-closing-date" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description *</label>
                <Textarea value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3} data-testid="input-description" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Requirements</label>
                <ListBuilder items={formData.requirements} onChange={items => setFormData(d => ({ ...d, requirements: items }))} placeholder="Add a requirement and press Enter" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Responsibilities</label>
                <ListBuilder items={formData.responsibilities} onChange={items => setFormData(d => ({ ...d, responsibilities: items }))} placeholder="Add a responsibility and press Enter" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)} data-testid="button-cancel">Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.title || !formData.experience || !formData.description} className="bg-sky-500 hover:bg-sky-600" data-testid="button-save-job">
                  {editingId ? "Update" : "Create Draft"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
