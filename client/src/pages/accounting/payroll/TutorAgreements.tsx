import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { TutorAgreement, Tutor } from "@shared/schema";
import { COMPENSATION_TYPES, PAYMENT_FREQUENCIES, AGREEMENT_STATUSES, TUTOR_ACCEPTANCE_STATUSES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Eye, Download } from "lucide-react";

const COMPENSATION_LABELS: Record<string, string> = {
  per_session: "Per Session", per_course: "Per Course", per_hour: "Per Hour", revenue_share: "Revenue Share",
};
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly", on_completion: "On Completion of Course",
};
const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  sent: "Sent", in_progress: "In Progress", yts: "YTS (Yet To Start)", on_hold: "On Hold",
  completed: "Completed", cancelled: "Cancelled", signed: "Signed", swapped: "Swapped",
};
const ACCEPTANCE_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted", rejected: "Rejected", under_review: "Under Review",
  on_hold: "On Hold", pending_response: "Pending Response", withdrawn: "Withdrawn",
};
const ACCEPTANCE_COLORS: Record<string, string> = {
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  under_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  on_hold: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  pending_response: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  withdrawn: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const emptyForm = {
  tutorId: "", agreementRef: "", subject: "", startDate: "", endDate: "",
  totalClasses: "", hoursPerClass: "2", scheduleDays: "2", startTime: "", endTime: "",
  compensationType: "per_hour", rateFee: "", platformCommissionPercent: "0",
  paymentFrequency: "monthly", agreementStatus: "in_progress", tutorAcceptanceStatus: "pending_response",
  postCourseSupportMonths: "",
};

const HOURS_PER_CLASS_OPTIONS: string[] = [];
for (let h = 1; h <= 8; h += 0.5) HOURS_PER_CLASS_OPTIONS.push(String(h));

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let mins = 6 * 60; mins <= 21 * 60 + 30; mins += 30) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    slots.push(`${h12}:${String(m).padStart(2, "0")} ${period}`);
  }
  return slots;
})();

function composeSessionsSummary(totalClasses: string, hoursPerClass: string): string {
  if (!totalClasses) return "";
  return `${totalClasses} classes | ${hoursPerClass} hrs per class`;
}

function parseSessionsSummary(s: string | null): { totalClasses: string; hoursPerClass: string } {
  const match = (s || "").match(/(\d+)\s*classes?\s*\|\s*([\d.]+)\s*hrs?/i);
  return match ? { totalClasses: match[1], hoursPerClass: match[2] } : { totalClasses: "", hoursPerClass: "2" };
}

function composeWeeklySchedule(days: string, startTime: string, endTime: string): string {
  if (!startTime || !endTime) return days ? `Day(s): ${days}` : "";
  return `Day(s): ${days}  Time: ${startTime} to ${endTime}`;
}

function parseWeeklySchedule(s: string | null): { scheduleDays: string; startTime: string; endTime: string } {
  const dayMatch = (s || "").match(/Day\(s\):\s*(\d+)/i);
  const timeMatch = (s || "").match(/Time:\s*([\d:apm ]+)\s*to\s*([\d:apm ]+)/i);
  return {
    scheduleDays: dayMatch ? dayMatch[1] : "2",
    startTime: timeMatch ? timeMatch[1].trim() : "",
    endTime: timeMatch ? timeMatch[2].trim() : "",
  };
}

function toCsv(rows: TutorAgreement[], tutorMap: Map<number, Tutor>): string {
  const headers = ["Agreement Ref", "Tutor", "Subject", "Start Date", "End Date", "Compensation Type", "Rate/Fee", "Platform Commission %", "Payment Frequency", "Agreement Status", "Tutor Acceptance Status"];
  const lines = [headers.join(",")];
  for (const a of rows) {
    const cells = [
      a.agreementRef, tutorMap.get(a.tutorId)?.fullName || "", a.subject,
      a.startDate || "", a.endDate || "", COMPENSATION_LABELS[a.compensationType] || a.compensationType,
      a.rateFee, a.platformCommissionPercent, FREQUENCY_LABELS[a.paymentFrequency] || a.paymentFrequency,
      AGREEMENT_STATUS_LABELS[a.agreementStatus] || a.agreementStatus, ACCEPTANCE_STATUS_LABELS[a.tutorAcceptanceStatus] || a.tutorAcceptanceStatus,
    ];
    lines.push(cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}

export default function TutorAgreements() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canManage = hasPermission("payroll_tutors.manage");
  const search = useSearch();
  const tutorIdFilter = new URLSearchParams(search).get("tutorId");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<TutorAgreement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: agreements, isLoading } = useQuery<TutorAgreement[]>({
    queryKey: ["/api/accounting/tutor-agreements"],
  });
  const { data: tutors } = useQuery<Tutor[]>({ queryKey: ["/api/accounting/tutors"] });
  const tutorMap = new Map((tutors || []).map(t => [t.id, t]));

  const filtered = tutorIdFilter ? agreements?.filter(a => a.tutorId === parseInt(tutorIdFilter)) : agreements;

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/tutor-agreements", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutor-agreements"] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Agreement created successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/tutor-agreements/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutor-agreements"] });
      setEditOpen(false);
      setEditingAgreement(null);
      toast({ title: "Agreement updated successfully" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/accounting/tutor-agreements/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutor-agreements"] });
      toast({ title: "Agreement deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const buildPayload = () => ({
    tutorId: parseInt(form.tutorId),
    agreementRef: form.agreementRef,
    subject: form.subject,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    sessionsSummary: composeSessionsSummary(form.totalClasses, form.hoursPerClass),
    weeklySchedule: composeWeeklySchedule(form.scheduleDays, form.startTime, form.endTime),
    compensationType: form.compensationType,
    rateFee: form.rateFee || "0",
    platformCommissionPercent: form.platformCommissionPercent || "0",
    paymentFrequency: form.paymentFrequency,
    agreementStatus: form.agreementStatus,
    tutorAcceptanceStatus: form.tutorAcceptanceStatus,
    postCourseSupportMonths: form.postCourseSupportMonths ? parseInt(form.postCourseSupportMonths) : null,
  });

  const openAdd = async () => {
    let suggestedRef = "";
    try {
      const res = await apiRequest("GET", "/api/accounting/tutor-agreements/next-ref");
      suggestedRef = (await res.json()).agreementRef;
    } catch {
      // Non-fatal — field stays editable.
    }
    setForm({ ...emptyForm, agreementRef: suggestedRef, tutorId: tutorIdFilter || "" });
    setAddOpen(true);
  };

  const openEdit = (a: TutorAgreement) => {
    setEditingAgreement(a);
    const sessions = parseSessionsSummary(a.sessionsSummary);
    const schedule = parseWeeklySchedule(a.weeklySchedule);
    setForm({
      tutorId: String(a.tutorId), agreementRef: a.agreementRef, subject: a.subject,
      startDate: a.startDate || "", endDate: a.endDate || "",
      totalClasses: sessions.totalClasses, hoursPerClass: sessions.hoursPerClass,
      scheduleDays: schedule.scheduleDays, startTime: schedule.startTime, endTime: schedule.endTime,
      compensationType: a.compensationType, rateFee: a.rateFee,
      platformCommissionPercent: a.platformCommissionPercent,
      paymentFrequency: a.paymentFrequency, agreementStatus: a.agreementStatus,
      tutorAcceptanceStatus: a.tutorAcceptanceStatus,
      postCourseSupportMonths: a.postCourseSupportMonths ? String(a.postCourseSupportMonths) : "",
    });
    setEditOpen(true);
  };

  const handleExportCsv = () => {
    const rows = filtered || [];
    const csv = toCsv(rows, tutorMap);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutor-agreements-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label>Tutor *</Label>
        <Select value={form.tutorId} onValueChange={v => setForm({ ...form, tutorId: v })} disabled={!!editingAgreement}>
          <SelectTrigger data-testid="select-agreement-tutor"><SelectValue placeholder="Select a tutor" /></SelectTrigger>
          <SelectContent>
            {tutors?.filter(t => t.status === "active").map(t => (
              <SelectItem key={t.id} value={String(t.id)}>{t.tutorCode} — {t.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Agreement Ref</Label>
        <Input value={form.agreementRef} onChange={e => setForm({ ...form, agreementRef: e.target.value })} placeholder="KDXS-TUT-2026-0001" data-testid="input-agreement-ref" />
      </div>
      <div className="sm:col-span-2">
        <Label>Subject / Course Area *</Label>
        <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} data-testid="input-agreement-subject" />
      </div>
      <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} data-testid="input-agreement-start" /></div>
      <div><Label>End Date (Completion Deadline)</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} data-testid="input-agreement-end" /></div>
      <div>
        <Label>Total Classes / Sessions</Label>
        <Input type="number" min="0" value={form.totalClasses} onChange={e => setForm({ ...form, totalClasses: e.target.value })} placeholder="29" data-testid="input-agreement-total-classes" />
      </div>
      <div>
        <Label>Hours per Class</Label>
        <Select value={form.hoursPerClass} onValueChange={v => setForm({ ...form, hoursPerClass: v })}>
          <SelectTrigger data-testid="select-agreement-hours-per-class"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HOURS_PER_CLASS_OPTIONS.map(h => <SelectItem key={h} value={h}>{h} hr{h !== "1" ? "s" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Days per Week</Label>
        <Select value={form.scheduleDays} onValueChange={v => setForm({ ...form, scheduleDays: v })}>
          <SelectTrigger data-testid="select-agreement-schedule-days"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7].map(d => <SelectItem key={d} value={String(d)}>{d} day{d !== 1 ? "s" : ""}/week</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Start Time</Label>
          <Select value={form.startTime} onValueChange={v => setForm({ ...form, startTime: v })}>
            <SelectTrigger data-testid="select-agreement-start-time"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>End Time</Label>
          <Select value={form.endTime} onValueChange={v => setForm({ ...form, endTime: v })}>
            <SelectTrigger data-testid="select-agreement-end-time"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Compensation Type *</Label>
        <Select value={form.compensationType} onValueChange={v => setForm({ ...form, compensationType: v })}>
          <SelectTrigger data-testid="select-compensation-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {COMPENSATION_TYPES.map(t => <SelectItem key={t} value={t}>{COMPENSATION_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{form.compensationType === "revenue_share" ? "Rate (% of Gross Earnings)" : "Rate / Fee (INR)"}</Label>
        <Input type="number" min="0" value={form.rateFee} onChange={e => setForm({ ...form, rateFee: e.target.value })} data-testid="input-agreement-rate" />
      </div>
      <div><Label>Platform Commission %</Label><Input type="number" min="0" max="100" value={form.platformCommissionPercent} onChange={e => setForm({ ...form, platformCommissionPercent: e.target.value })} data-testid="input-agreement-commission" /></div>
      <div>
        <Label>Payment Frequency *</Label>
        <Select value={form.paymentFrequency} onValueChange={v => setForm({ ...form, paymentFrequency: v })}>
          <SelectTrigger data-testid="select-payment-frequency"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Post-Course Support (months)</Label>
        <Input type="number" min="3" max="6" value={form.postCourseSupportMonths} onChange={e => setForm({ ...form, postCourseSupportMonths: e.target.value })} data-testid="input-agreement-support-months" />
      </div>
      <div>
        <Label>Agreement Status</Label>
        <Select value={form.agreementStatus} onValueChange={v => setForm({ ...form, agreementStatus: v })}>
          <SelectTrigger data-testid="select-agreement-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AGREEMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{AGREEMENT_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tutor Acceptance Status</Label>
        <Select value={form.tutorAcceptanceStatus} onValueChange={v => setForm({ ...form, tutorAcceptanceStatus: v })}>
          <SelectTrigger data-testid="select-acceptance-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TUTOR_ACCEPTANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{ACCEPTANCE_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Tutor Agreements</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {tutorIdFilter && tutorMap.get(parseInt(tutorIdFilter))
                ? `Agreements for ${tutorMap.get(parseInt(tutorIdFilter))?.fullName}`
                : "One row per signed Schedule A — a tutor may hold several over time"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={!filtered?.length} data-testid="button-export-agreements">
              <Download className="w-4 h-4 mr-2" />Export to Excel
            </Button>
            {canManage && (
              <Button onClick={openAdd} data-testid="button-add-agreement">
                <Plus className="w-4 h-4 mr-2" />New Agreement
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !filtered?.length ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No agreements found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-agreements">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Agreement Ref</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Tutor</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Subject</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Compensation</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Agreement Status</th>
                      <th className="text-center text-xs font-medium text-slate-500 px-4 py-3">Acceptance</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-agreement-${a.id}`}>
                        <td className="px-4 py-3 font-mono text-xs">{a.agreementRef}</td>
                        <td className="px-4 py-3 text-sm">{tutorMap.get(a.tutorId)?.fullName || "-"}</td>
                        <td className="px-4 py-3 text-sm">{a.subject}</td>
                        <td className="px-4 py-3 text-sm">{COMPENSATION_LABELS[a.compensationType]} — ₹{a.rateFee}{a.compensationType === "revenue_share" ? "%" : ""}</td>
                        <td className="px-4 py-3 text-center"><Badge variant="outline">{AGREEMENT_STATUS_LABELS[a.agreementStatus]}</Badge></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ACCEPTANCE_COLORS[a.tutorAcceptanceStatus]}`}>
                            {ACCEPTANCE_STATUS_LABELS[a.tutorAcceptanceStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/accounting/payroll/tutor-agreements/${a.id}/view`}>
                              <Button size="icon" variant="ghost" className="text-sky-600" title="View / Print" data-testid={`button-view-agreement-${a.id}`}><Eye className="w-4 h-4" /></Button>
                            </Link>
                            {canManage && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => openEdit(a)} data-testid={`button-edit-agreement-${a.id}`}><Pencil className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-red-600"
                                  onClick={() => { if (confirm("Delete this agreement?")) deleteMutation.mutate(a.id); }}
                                  disabled={deleteMutation.isPending} data-testid={`button-delete-agreement-${a.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-add-agreement">
            <DialogHeader><DialogTitle>New Tutor Agreement</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(buildPayload())}
                disabled={createMutation.isPending || !form.tutorId || !form.subject}
                data-testid="button-submit-add-agreement"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-agreement">
            <DialogHeader><DialogTitle>Edit Tutor Agreement</DialogTitle></DialogHeader>
            {renderFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                onClick={() => editingAgreement && updateMutation.mutate({ id: editingAgreement.id, data: buildPayload() })}
                disabled={updateMutation.isPending || !form.subject}
                data-testid="button-submit-edit-agreement"
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
