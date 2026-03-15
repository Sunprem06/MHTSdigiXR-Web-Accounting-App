import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Trash2, FileText, ExternalLink } from "lucide-react";
import { Link, useSearch } from "wouter";
import type { JobPosting, JobApplication } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "received", label: "Received", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "reviewed", label: "Reviewed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "hired", label: "Hired", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

export default function JobApplications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialJobFilter = urlParams.get("jobPostingId") || "all";

  const [filterJob, setFilterJob] = useState<string>(initialJobFilter);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewApp, setViewApp] = useState<JobApplication | null>(null);
  const [notes, setNotes] = useState("");

  const { data: postings = [] } = useQuery<JobPosting[]>({
    queryKey: ["/api/accounting/job-postings"],
  });

  const { data: applications = [], isLoading } = useQuery<JobApplication[]>({
    queryKey: ["/api/accounting/job-applications"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: string; notes?: string } }) =>
      apiRequest("PATCH", `/api/accounting/job-applications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-applications"] });
      toast({ title: "Application updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/accounting/job-applications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/job-applications"] });
      setViewApp(null);
      toast({ title: "Application deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = applications.filter(a => {
    if (filterJob !== "all" && a.jobPostingId !== parseInt(filterJob)) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const getJobTitle = (jobPostingId: number) => postings.find(p => p.id === jobPostingId)?.title || `Job #${jobPostingId}`;
  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status);
    return <Badge className={s?.color || ""} data-testid={`badge-status-${status}`}>{s?.label || status}</Badge>;
  };

  const canEdit = user?.role === "super_admin" || user?.role === "admin" || user?.role === "senior_accountant";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/accounting/job-postings">
              <Button variant="ghost" size="sm" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Job Applications</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} application{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Select value={filterJob} onValueChange={setFilterJob}>
            <SelectTrigger className="w-48" data-testid="select-filter-job"><SelectValue placeholder="All Jobs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {postings.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40" data-testid="select-filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No applications found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Applicant</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Position</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Experience</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Applied</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app.id} className="border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => { setViewApp(app); setNotes(app.notes || ""); }} data-testid={`row-app-${app.id}`}>
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-white">{app.applicantName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {app.applicantEmail}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{getJobTitle(app.jobPostingId)}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{app.experience || "—"}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">{getStatusBadge(app.status)}</td>
                    <td className="p-3">
                      {canEdit && (
                        <Select value={app.status} onValueChange={v => { updateMutation.mutate({ id: app.id, data: { status: v } }); }}>
                          <SelectTrigger className="w-32 h-8 text-xs" onClick={e => e.stopPropagation()} data-testid={`select-status-${app.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={!!viewApp} onOpenChange={() => setViewApp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {viewApp && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Applicant</p>
                    <p className="font-medium text-slate-900 dark:text-white" data-testid="text-applicant-name">{viewApp.applicantName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Position</p>
                    <p className="font-medium text-slate-900 dark:text-white">{getJobTitle(viewApp.jobPostingId)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${viewApp.applicantEmail}`} className="text-sky-600 dark:text-sky-400 hover:underline" data-testid="link-email">{viewApp.applicantEmail}</a>
                  </div>
                  {viewApp.applicantPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{viewApp.applicantPhone}</span>
                    </div>
                  )}
                </div>
                {viewApp.experience && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Experience</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{viewApp.experience}</p>
                  </div>
                )}
                {viewApp.message && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Message</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 rounded p-3">{viewApp.message}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  {viewApp.linkedinUrl && (
                    <a href={viewApp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1" data-testid="link-linkedin">
                      <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                  {viewApp.portfolioUrl && (
                    <a href={viewApp.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1" data-testid="link-portfolio">
                      <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                  {getStatusBadge(viewApp.status)}
                </div>
                {canEdit && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</p>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add internal notes..." data-testid="input-notes" />
                    <Button size="sm" className="mt-2 bg-sky-500 hover:bg-sky-600" onClick={() => { updateMutation.mutate({ id: viewApp.id, data: { notes } }); setViewApp(null); }} data-testid="button-save-notes">Save Notes</Button>
                  </div>
                )}
                {isSuperAdmin && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this application?")) deleteMutation.mutate(viewApp.id); }} data-testid="button-delete-app">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Application
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
