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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Check, X, Repeat } from "lucide-react";

interface DayView {
  date: string;
  weekday: number;
  rosterType: "wfo" | "wfh" | "off" | null;
  effectiveType: "wfo" | "wfh" | "off" | null;
  swapId: number | null;
}

interface SwapRow {
  id: number;
  date: string;
  requesterId: number;
  partnerId: number;
  status: string;
  reason: string | null;
  requesterName: string;
  partnerName: string;
}

interface Colleague { id: number; fullName: string }

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPE_LABELS: Record<string, string> = { wfo: "Office", wfh: "Home", off: "Off" };
const TYPE_COLORS: Record<string, string> = {
  wfo: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  wfh: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  off: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function currentWeekStart(): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  utc.setUTCDate(utc.getUTCDate() - utc.getUTCDay());
  return utc.toISOString().slice(0, 10);
}

export default function MyAttendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapDate, setSwapDate] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");

  const { data: week, isLoading: weekLoading } = useQuery<DayView[]>({ queryKey: [`/api/accounting/attendance/week/mine?startDate=${weekStart}`] });
  const { data: colleagues } = useQuery<Colleague[]>({ queryKey: ["/api/accounting/attendance/colleagues"] });
  const { data: swaps, isLoading: swapsLoading } = useQuery<SwapRow[]>({ queryKey: ["/api/accounting/attendance/swaps/mine"] });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/attendance/swaps", { date: swapDate, partnerId: parseInt(partnerId), reason: reason || undefined });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/attendance/swaps/mine"] });
      setSwapOpen(false);
      setSwapDate(""); setPartnerId(""); setReason("");
      toast({ title: "Swap request sent" });
    },
    onError: (err: Error) => toast({ title: "Could not request swap", description: err.message, variant: "destructive" }),
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "accept" | "reject" | "cancel" }) => {
      const res = await apiRequest("POST", `/api/accounting/attendance/swaps/${id}/${action}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/attendance/swaps/mine"] });
      queryClient.invalidateQueries({ queryKey: [`/api/accounting/attendance/week/mine?startDate=${weekStart}`] });
    },
    onError: (err: Error) => toast({ title: "Could not update swap", description: err.message, variant: "destructive" }),
  });

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">My Attendance</h1>
          <Button onClick={() => setSwapOpen(true)} data-testid="button-request-swap">
            <Repeat className="w-4 h-4 mr-2" />
            Request a Swap
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(`${weekStart}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 7); setWeekStart(d.toISOString().slice(0, 10));
              }} data-testid="button-prev-week">Previous Week</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const d = new Date(`${weekStart}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 7); setWeekStart(d.toISOString().slice(0, 10));
              }} data-testid="button-next-week">Next Week</Button>
            </div>
            {weekLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : (
              <div className="grid grid-cols-7 gap-2" data-testid="week-grid">
                {week?.map(d => (
                  <div key={d.date} className="border border-slate-200 dark:border-slate-700 rounded p-2 text-center" data-testid={`day-${d.date}`}>
                    <p className="text-xs text-slate-500">{WEEKDAY_LABELS[d.weekday]}</p>
                    <p className="text-sm font-medium">{fmtDate(d.date)}</p>
                    {d.effectiveType ? (
                      <Badge className={`mt-1 text-[10px] ${TYPE_COLORS[d.effectiveType]}`}>{TYPE_LABELS[d.effectiveType]}</Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-[10px]">Not set</Badge>
                    )}
                    {d.swapId && <p className="text-[10px] text-slate-400 mt-1">Swapped</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 pb-0">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">My Swap Requests</h2>
            </div>
            {swapsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : !swaps?.length ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm" data-testid="text-no-swaps">No swap requests yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-my-swaps">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Date</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Requester</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Colleague</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Reason</th>
                      <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Status</th>
                      <th className="text-right text-xs font-medium text-slate-500 px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swaps.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-swap-${s.id}`}>
                        <td className="px-4 py-3 text-sm">{fmtDate(s.date)}</td>
                        <td className="px-4 py-3 text-sm">{s.requesterName}</td>
                        <td className="px-4 py-3 text-sm">{s.partnerName}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{s.reason || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          {s.status === "pending" && s.partnerId === user?.id && (
                            <>
                              <Button size="icon" variant="ghost" className="text-green-600" title="Accept" data-testid={`button-accept-swap-${s.id}`}
                                onClick={() => decideMutation.mutate({ id: s.id, action: "accept" })}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" title="Reject" data-testid={`button-reject-swap-${s.id}`}
                                onClick={() => decideMutation.mutate({ id: s.id, action: "reject" })}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {s.status === "pending" && s.requesterId === user?.id && (
                            <Button size="icon" variant="ghost" className="text-slate-500" title="Cancel" data-testid={`button-cancel-swap-${s.id}`}
                              onClick={() => decideMutation.mutate({ id: s.id, action: "cancel" })}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
          <DialogContent data-testid="dialog-request-swap">
            <DialogHeader>
              <DialogTitle>Request an Attendance Swap</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Swaps your day-type with a colleague's for one specific date — e.g. you take their WFH day, they take your WFO day. Needs their acceptance.
              </p>
              <div>
                <Label>Date</Label>
                <Input type="date" value={swapDate} onChange={(e) => setSwapDate(e.target.value)} data-testid="input-swap-date" />
              </div>
              <div>
                <Label>Colleague</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger data-testid="select-swap-partner"><SelectValue placeholder="Select a colleague" /></SelectTrigger>
                  <SelectContent>
                    {colleagues?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)} data-testid={`option-colleague-${c.id}`}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} data-testid="input-swap-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSwapOpen(false)} data-testid="button-cancel-swap-dialog">Cancel</Button>
              <Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending || !swapDate || !partnerId} data-testid="button-submit-swap">
                {requestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
