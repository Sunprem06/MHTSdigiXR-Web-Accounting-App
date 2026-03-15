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
import { Plus, Pencil, Trash2, Eye, EyeOff, Briefcase, Users } from "lucide-react";
import { Link } from "wouter";
import type { JobPosting } from "@shared/schema";

const JOB_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "remote", label: "Remote" },
];

const DEPARTMENTS = [
  "Engineering", "Design", "Marketing", "Content", "Sales", "Operations", "HR", "Finance", "Other"
];

export default function JobPostings() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "", department: "Engineering", location: "Chennai, India",
    type: "full_time", experience: "", description: "",
    requirements: "", responsibilities: "", salaryRange: "",
    closingDate: "", isOpen: true,
  });

  const { data: postings = [], isLoading } = useQuery<JobPosting[]>({
    queryKey: ["/api/accounting/job-postings"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/accounting/job-postings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Job posting created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/accounting/job-postings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Job posting updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/accounting/job-postings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      toast({ title: "Job posting deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isOpen }: { id: number; isOpen: boolean }) =>
      apiRequest("PATCH", `/api/accounting/job-postings/${id}`, { isOpen }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-postings"] });
      toast({ title: "Status updated" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "", department: "Engineering", location: "Chennai, India",
      type: "full_time", experience: "", description: "",
      requirements: "", responsibilities: "", salaryRange: "",
      closingDate: "", isOpen: true,
    });
    setEditingId(null);
  };

  const openEdit = (p: JobPosting) => {
    setEditingId(p.id);
    setFormData({
      title: p.title, department: p.department, location: p.location,
      type: p.type, experience: p.experience, description: p.description,
      requirements: (p.requirements as string[])?.join("\n") || "",
      responsibilities: (p.responsibilities as string[])?.join("\n") || "",
      salaryRange: p.salaryRange || "", closingDate: p.closingDate || "",
      isOpen: p.isOpen,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      requirements: formData.requirements.split("\n").map(s => s.trim()).filter(Boolean),
      responsibilities: formData.responsibilities.split("\n").map(s => s.trim()).filter(Boolean),
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
  const canDelete = hasPermission("jobs.delete");

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
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Location</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Type</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700" data-testid={`row-job-${p.id}`}>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{p.title}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{p.department}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{p.location}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{JOB_TYPES.find(t => t.value === p.type)?.label || p.type}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={p.isOpen ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}>
                        {p.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {canEdit && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => toggleMutation.mutate({ id: p.id, isOpen: !p.isOpen })} data-testid={`button-toggle-${p.id}`}>
                              {p.isOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(p)} data-testid={`button-edit-${p.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { if (confirm("Delete this job posting?")) deleteMutation.mutate(p.id); }} data-testid={`button-delete-${p.id}`}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience *</label>
                  <Input value={formData.experience} onChange={e => setFormData(d => ({ ...d, experience: e.target.value }))} placeholder="e.g. 3-5 years" data-testid="input-experience" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Salary Range</label>
                  <Input value={formData.salaryRange} onChange={e => setFormData(d => ({ ...d, salaryRange: e.target.value }))} placeholder="e.g. 8-12 LPA" data-testid="input-salary" />
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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Requirements (one per line)</label>
                <Textarea value={formData.requirements} onChange={e => setFormData(d => ({ ...d, requirements: e.target.value }))} rows={4} placeholder="3+ years of experience&#10;Strong proficiency in React" data-testid="input-requirements" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Responsibilities (one per line)</label>
                <Textarea value={formData.responsibilities} onChange={e => setFormData(d => ({ ...d, responsibilities: e.target.value }))} rows={4} placeholder="Design and develop web applications&#10;Collaborate with team members" data-testid="input-responsibilities" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)} data-testid="button-cancel">Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.title || !formData.experience || !formData.description} className="bg-sky-500 hover:bg-sky-600" data-testid="button-save-job">
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
