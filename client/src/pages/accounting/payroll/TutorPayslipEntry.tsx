import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute, useSearch } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tutor, TutorPayslip } from "@shared/schema";
import { Loader2, Save } from "lucide-react";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function round2(n: number) { return Math.round(n * 100) / 100; }

// Client-side preview ONLY — the server always recomputes these authoritatively on save.
function computePreview(input: {
  liveRate: number; liveH: number; liveM: number;
  preRate: number; preH: number; preM: number;
  contentRate: number; contentH: number; contentM: number;
  lwpH: number; lwpM: number;
  otherDeduction: number;
  pan: string;
  tdsOverride: number | null;
}) {
  const liveHours = input.liveH + input.liveM / 60;
  const preHours = input.preH + input.preM / 60;
  const contentHours = input.contentH + input.contentM / 60;
  const a1 = round2(input.liveRate * liveHours);
  const a2 = round2(input.preRate * preHours);
  const a3 = round2(input.contentRate * contentHours);
  const grossBeforeLwp = a1 + a2 + a3;

  const lwpHours = input.lwpH + input.lwpM / 60;
  const primaryRate = input.liveRate || input.preRate || input.contentRate || 0;
  const lwpDeduct = round2(lwpHours * primaryRate);
  const grossEarnings = Math.max(0, round2(grossBeforeLwp - lwpDeduct));

  const validPan = PAN_REGEX.test(input.pan.trim().toUpperCase());
  const tdsRatePercent = input.tdsOverride ?? (validPan ? 10 : 20);
  const tdsAmount = round2(grossEarnings * tdsRatePercent / 100);
  const netPay = Math.max(0, round2(grossEarnings - tdsAmount - input.otherDeduction));

  return { a1, a2, a3, grossEarnings, tdsAmount, netPay, tdsRatePercent, validPan, lwpDeduct };
}

export default function TutorPayslipEntry() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, editParams] = useRoute("/accounting/payroll/tutor-payslips/:id/edit");
  const editId = editParams?.id ? parseInt(editParams.id) : null;
  const isEditMode = !!editId;
  const search = useSearch();
  const preselectedTutorId = new URLSearchParams(search).get("tutorId");

  const { data: tutors } = useQuery<Tutor[]>({ queryKey: ["/api/accounting/tutors"] });
  const { data: existing, isLoading: loadingExisting } = useQuery<TutorPayslip>({
    queryKey: ["/api/accounting/tutor-payslips", editId],
    enabled: isEditMode,
  });

  const [tutorId, setTutorId] = useState(preselectedTutorId || "");
  const [payMonth, setPayMonth] = useState("");
  const [liveRate, setLiveRate] = useState("0");
  const [liveH, setLiveH] = useState("0");
  const [liveM, setLiveM] = useState("0");
  const [preRate, setPreRate] = useState("0");
  const [preH, setPreH] = useState("0");
  const [preM, setPreM] = useState("0");
  const [contentRate, setContentRate] = useState("0");
  const [contentH, setContentH] = useState("0");
  const [contentM, setContentM] = useState("0");
  const [lwpH, setLwpH] = useState("0");
  const [lwpM, setLwpM] = useState("0");
  const [otherDeduction, setOtherDeduction] = useState("0");
  const [pan, setPan] = useState("");
  const [tdsOverride, setTdsOverride] = useState<string>("auto");
  const [loaded, setLoaded] = useState(false);

  const selectedTutor = tutors?.find(t => String(t.id) === tutorId);

  useEffect(() => {
    if (!isEditMode && selectedTutor && !loaded) {
      setPan(selectedTutor.panNumber || "");
      setLiveRate(selectedTutor.defaultRate || "0");
    }
  }, [selectedTutor, isEditMode, loaded]);

  useEffect(() => {
    if (isEditMode && existing && !loaded) {
      setTutorId(String(existing.tutorId));
      setPayMonth(existing.payMonth);
      setLiveRate(existing.liveCoachingRate || "0");
      setLiveH(String(Math.floor(parseFloat(existing.liveCoachingHours || "0"))));
      setLiveM(String(Math.round((parseFloat(existing.liveCoachingHours || "0") % 1) * 60)));
      setPreRate(existing.prerecordedRate || "0");
      setPreH(String(Math.floor(parseFloat(existing.prerecordedHours || "0"))));
      setPreM(String(Math.round((parseFloat(existing.prerecordedHours || "0") % 1) * 60)));
      setContentRate(existing.contentCreationRate || "0");
      setContentH(String(Math.floor(parseFloat(existing.contentCreationHours || "0"))));
      setContentM(String(Math.round((parseFloat(existing.contentCreationHours || "0") % 1) * 60)));
      setLwpH(String(Math.floor(parseFloat(existing.lwpHours || "0"))));
      setLwpM(String(Math.round((parseFloat(existing.lwpHours || "0") % 1) * 60)));
      setOtherDeduction(existing.otherDeduction || "0");
      setPan(existing.panAtPayment || "");
      setTdsOverride(String(existing.tdsRatePercent));
      setLoaded(true);
    }
  }, [existing, isEditMode, loaded]);

  const preview = useMemo(() => computePreview({
    liveRate: parseFloat(liveRate) || 0, liveH: parseFloat(liveH) || 0, liveM: parseFloat(liveM) || 0,
    preRate: parseFloat(preRate) || 0, preH: parseFloat(preH) || 0, preM: parseFloat(preM) || 0,
    contentRate: parseFloat(contentRate) || 0, contentH: parseFloat(contentH) || 0, contentM: parseFloat(contentM) || 0,
    lwpH: parseFloat(lwpH) || 0, lwpM: parseFloat(lwpM) || 0,
    otherDeduction: parseFloat(otherDeduction) || 0,
    pan,
    tdsOverride: tdsOverride === "auto" ? null : parseInt(tdsOverride),
  }), [liveRate, liveH, liveM, preRate, preH, preM, contentRate, contentH, contentM, lwpH, lwpM, otherDeduction, pan, tdsOverride]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tutorId: parseInt(tutorId),
        payMonth,
        liveCoachingRate: liveRate, liveCoachingHours: String((parseFloat(liveH) || 0) + (parseFloat(liveM) || 0) / 60),
        prerecordedRate: preRate, prerecordedHours: String((parseFloat(preH) || 0) + (parseFloat(preM) || 0) / 60),
        contentCreationRate: contentRate, contentCreationHours: String((parseFloat(contentH) || 0) + (parseFloat(contentM) || 0) / 60),
        lwpHours: String((parseFloat(lwpH) || 0) + (parseFloat(lwpM) || 0) / 60),
        otherDeduction,
        panAtPayment: pan,
        tdsRatePercent: tdsOverride === "auto" ? undefined : parseInt(tdsOverride),
      };
      const res = isEditMode
        ? await apiRequest("PATCH", `/api/accounting/tutor-payslips/${editId}`, payload)
        : await apiRequest("POST", "/api/accounting/tutor-payslips", payload);
      return res.json();
    },
    onSuccess: (data: TutorPayslip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/tutor-payslips"] });
      toast({ title: isEditMode ? "Payslip updated" : "Draft payslip created" });
      setLocation(`/accounting/payroll/tutor-payslips/${data.id}/view`);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isEditMode && loadingExisting) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  const hmRow = (label: string, rate: string, setRate: (v: string) => void, h: string, setH: (v: string) => void, m: string, setM: (v: string) => void, amount: number) => (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-4"><Label className="text-xs">{label}</Label></div>
      <div className="col-span-3"><Label className="text-xs">Rate/hr</Label><Input type="number" min="0" value={rate} onChange={e => setRate(e.target.value)} /></div>
      <div className="col-span-2"><Label className="text-xs">Hrs</Label><Input type="number" min="0" max="23" value={h} onChange={e => setH(e.target.value)} /></div>
      <div className="col-span-2"><Label className="text-xs">Mins</Label><Input type="number" min="0" max="59" value={m} onChange={e => setM(e.target.value)} /></div>
      <div className="col-span-1 text-right text-sm font-medium pb-2">₹{amount.toLocaleString("en-IN")}</div>
    </div>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
          {isEditMode ? "Edit Tutor Payslip" : "New Tutor Payslip"}
        </h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Tutor & Period</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tutor *</Label>
              <Select value={tutorId} onValueChange={v => { setTutorId(v); setLoaded(false); }} disabled={isEditMode}>
                <SelectTrigger data-testid="select-payslip-tutor"><SelectValue placeholder="Select a tutor" /></SelectTrigger>
                <SelectContent>
                  {tutors?.filter(t => t.status === "active").map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.tutorCode} — {t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pay Month * (e.g. April 2026)</Label>
              <Input value={payMonth} onChange={e => setPayMonth(e.target.value)} placeholder="April 2026" data-testid="input-pay-month" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Earnings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {hmRow("Live Coaching Sessions", liveRate, setLiveRate, liveH, setLiveH, liveM, setLiveM, preview.a1)}
            {hmRow("Pre-recorded Sessions", preRate, setPreRate, preH, setPreH, preM, setPreM, preview.a2)}
            {hmRow("Content Creation / Prep", contentRate, setContentRate, contentH, setContentH, contentM, setContentM, preview.a3)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Deductions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4"><Label className="text-xs text-red-600">LWP (Loss of Work Pay)</Label></div>
              <div className="col-span-3" />
              <div className="col-span-2"><Label className="text-xs">Hrs</Label><Input type="number" min="0" max="23" value={lwpH} onChange={e => setLwpH(e.target.value)} data-testid="input-lwp-hours" /></div>
              <div className="col-span-2"><Label className="text-xs">Mins</Label><Input type="number" min="0" max="59" value={lwpM} onChange={e => setLwpM(e.target.value)} data-testid="input-lwp-mins" /></div>
              <div className="col-span-1 text-right text-sm font-medium text-red-600 pb-2">-₹{preview.lwpDeduct.toLocaleString("en-IN")}</div>
            </div>
            <div>
              <Label>Penalty / Set-off (other deduction)</Label>
              <Input type="number" min="0" value={otherDeduction} onChange={e => setOtherDeduction(e.target.value)} data-testid="input-other-deduction" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">TDS — Sec 194J</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>PAN at Payment</Label>
              <Input value={pan} onChange={e => { setPan(e.target.value.toUpperCase()); setTdsOverride("auto"); }} placeholder="AAAAA9999A" className="uppercase" data-testid="input-payslip-pan" />
              <p className={`text-xs mt-1 ${preview.validPan ? "text-green-600" : "text-amber-600"}`}>
                {preview.validPan ? "Valid PAN — 10% TDS" : "No valid PAN — 20% TDS (Sec 206AA)"}
              </p>
            </div>
            <div>
              <Label>TDS Rate</Label>
              <Select value={tdsOverride} onValueChange={setTdsOverride}>
                <SelectTrigger data-testid="select-tds-rate"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (from PAN validity)</SelectItem>
                  <SelectItem value="10">10% (With PAN)</SelectItem>
                  <SelectItem value="20">20% (No PAN — Sec 206AA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Gross Earnings</span><span className="font-medium">₹{preview.grossEarnings.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm text-red-600"><span>TDS ({preview.tdsRatePercent}%)</span><span>-₹{preview.tdsAmount.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm text-red-600"><span>Other Deduction</span><span>-₹{(parseFloat(otherDeduction) || 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-sky-200 dark:border-sky-800"><span>Net Pay</span><span data-testid="text-preview-net-pay">₹{preview.netPay.toLocaleString("en-IN")}</span></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/accounting/payroll/tutor-payslips")}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !tutorId || !payMonth}
            data-testid="button-save-payslip"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save as Draft
          </Button>
        </div>
      </div>
    </AccountingLayout>
  );
}
