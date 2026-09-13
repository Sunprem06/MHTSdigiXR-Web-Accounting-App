import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { DEFAULT_NOTICE_PERIOD_DAYS } from "@shared/schema";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted — awaiting HR approval",
  approved: "Approved",
  settled: "Settled",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  settled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface ExitCaseView {
  id: number;
  employeeId: number;
  exitType: string;
  resignationDate: string;
  noticePeriodDays: number;
  proposedLastWorkingDay: string;
  actualLastWorkingDay: string | null;
  reason: string | null;
  status: string;
  accessRevoked: boolean;
  checklist: { id: number; itemLabel: string; isCompleted: boolean }[];
  assetReturns: { id: number; assetName: string; assetCode?: string; isReturned: boolean }[];
  settlement: { status: string; netSettlementAmount: string } | null;
}

export default function MyExit() {
  const { toast } = useToast();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [resignationDate, setResignationDate] = useState("");
  const [noticePeriodDays, setNoticePeriodDays] = useState(String(DEFAULT_NOTICE_PERIOD_DAYS));
  const [reason, setReason] = useState("");

  const { data: exit, isLoading } = useQuery<ExitCaseView | null>({ queryKey: ["/api/accounting/exits/mine"] });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounting/exits", {
        resignationDate, noticePeriodDays: parseInt(noticePeriodDays), reason: reason || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/exits/mine"] });
      setSubmitOpen(false);
      setResignationDate("");
      setNoticePeriodDays(String(DEFAULT_NOTICE_PERIOD_DAYS));
      setReason("");
      toast({ title: "Resignation submitted" });
    },
    onError: (err: Error) => toast({ title: "Could not submit resignation", description: err.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/exits/${id}/cancel`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/exits/mine"] });
      toast({ title: "Resignation cancelled" });
    },
    onError: (err: Error) => toast({ title: "Could not cancel", description: err.message, variant: "destructive" }),
  });

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">My Exit</h1>
          {!exit && !isLoading && (
            <Button onClick={() => setSubmitOpen(true)} data-testid="button-submit-resignation">Submit Resignation</Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
        ) : !exit ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400" data-testid="text-no-exit">
              You have no resignation or exit case on file.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card data-testid="card-exit-summary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Case Summary</CardTitle>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[exit.status]}`}>
                  {STATUS_LABELS[exit.status] || exit.status}
                </span>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500 dark:text-slate-400">Resignation Date</p><p className="font-medium">{fmtDate(exit.resignationDate)}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Notice Period</p><p className="font-medium">{exit.noticePeriodDays} day(s)</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Proposed Last Working Day</p><p className="font-medium">{fmtDate(exit.proposedLastWorkingDay)}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">Confirmed Last Working Day</p><p className="font-medium">{fmtDate(exit.actualLastWorkingDay)}</p></div>
                {exit.reason && <div className="col-span-2"><p className="text-slate-500 dark:text-slate-400">Reason</p><p className="font-medium">{exit.reason}</p></div>}
                {exit.status === "submitted" && (
                  <div className="col-span-2 pt-2">
                    <Button
                      size="sm" variant="outline" className="text-red-600" data-testid="button-cancel-resignation"
                      disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(exit.id)}
                    >
                      Withdraw Resignation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {exit.checklist.length > 0 && (
              <Card data-testid="card-exit-checklist">
                <CardHeader><CardTitle className="text-base">Exit Checklist</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {exit.checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm" data-testid={`row-checklist-${item.id}`}>
                      {item.isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                      <span className={item.isCompleted ? "text-slate-500 line-through" : ""}>{item.itemLabel}</span>
                    </div>
                  ))}
                  {exit.assetReturns.map(item => (
                    <div key={`asset-${item.id}`} className="flex items-center gap-2 text-sm" data-testid={`row-asset-return-${item.id}`}>
                      {item.isReturned ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
                      <span className={item.isReturned ? "text-slate-500 line-through" : ""}>Return: {item.assetName}{item.assetCode ? ` (${item.assetCode})` : ""}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {exit.settlement && (
              <Card data-testid="card-exit-settlement">
                <CardHeader><CardTitle className="text-base">Full & Final Settlement</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>Status: <span className="font-medium capitalize">{exit.settlement.status}</span></p>
                  <p>Net Amount: <span className="font-medium">₹{parseFloat(exit.settlement.netSettlementAmount).toLocaleString("en-IN")}</span></p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <DialogContent data-testid="dialog-submit-resignation">
            <DialogHeader><DialogTitle>Submit Resignation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Resignation Date</Label>
                <Input type="date" value={resignationDate} onChange={e => setResignationDate(e.target.value)} data-testid="input-resignation-date" />
              </div>
              <div>
                <Label>Notice Period (days)</Label>
                <Input type="number" min="0" value={noticePeriodDays} onChange={e => setNoticePeriodDays(e.target.value)} data-testid="input-notice-period" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Draft default of {DEFAULT_NOTICE_PERIOD_DAYS} days — HR will confirm your final last working day.</p>
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} data-testid="input-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitOpen(false)} data-testid="button-cancel-submit">Cancel</Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !resignationDate}
                data-testid="button-confirm-submit"
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
