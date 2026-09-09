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
import type { Tutor, TutorAgreement, TutorPayslip } from "@shared/schema";
import { Loader2, Save } from "lucide-react";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const COMPENSATION_LABELS: Record<string, string> = {
  per_session: "Per Session", per_course: "Per Course", per_hour: "Per Hour", revenue_share: "Revenue Share",
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthInputToLabel(value: string): string {
  const [y, m] = value.split("-");
  if (!y || !m) return "";
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function monthLabelToInput(label: string): string {
  const match = label.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return "";
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
  if (idx === -1) return "";
  return `${match[2]}-${String(idx + 1).padStart(2, "0")}`;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

// Client-side preview ONLY — the server always recomputes these authoritatively on save.
function computePreview(input: {
  compensationType: string; rateFee: number; unitsDelivered: number; revenueAmount: number;
  platformCommissionPercent: number; otherDeduction: number; deductTds: boolean; pan: string; tdsOverride: number | null;
}) {
  let grossEarnings = 0;
  if (input.compensationType === "per_session" || input.compensationType === "per_hour") {
    grossEarnings = round2(input.rateFee * input.unitsDelivered);
  } else if (input.compensationType === "per_course") {
    grossEarnings = round2(input.rateFee * (Math.min(100, Math.max(0, input.unitsDelivered)) / 100));
  } else if (input.compensationType === "revenue_share") {
    grossEarnings = round2(input.revenueAmount * (input.rateFee / 100));
  }
  grossEarnings = Math.max(0, grossEarnings);

  const platformCommissionAmount = round2(grossEarnings * (input.platformCommissionPercent || 0) / 100);
  const netOfCommission = Math.max(0, round2(grossEarnings - platformCommissionAmount));

  const validPan = PAN_REGEX.test(input.pan.trim().toUpperCase());
  const tdsRatePercent = !input.deductTds ? 0 : (input.tdsOverride ?? (validPan ? 10 : 20));
  const tdsAmount = round2(netOfCommission * tdsRatePercent / 100);
  const netPay = Math.max(0, round2(netOfCommission - tdsAmount - input.otherDeduction));

  return { grossEarnings, platformCommissionAmount, tdsAmount, netPay, tdsRatePercent, validPan };
}

export default function TutorPayslipEntry() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, editParams] = useRoute("/accounting/payroll/tutor-payslips/:id/edit");
  const editId = editParams?.id ? parseInt(editParams.id) : null;
  const isEditMode = !!editId;
  const search = useSearch();
  const preselectedAgreementId = new URLSearchParams(search).get("agreementId");

  const { data: agreements } = useQuery<TutorAgreement[]>({ queryKey: ["/api/accounting/tutor-agreements"] });
  const { data: tutors } = useQuery<Tutor[]>({ queryKey: ["/api/accounting/tutors"] });
  const { data: existing, isLoading: loadingExisting } = useQuery<TutorPayslip>({
    queryKey: ["/api/accounting/tutor-payslips", editId],
    enabled: isEditMode,
  });

  const [agreementId, setAgreementId] = useState(preselectedAgreementId || "");
  const [payMonthInput, setPayMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [unitsDelivered, setUnitsDelivered] = useState("0");
  const [revenueAmount, setRevenueAmount] = useState("0");
  const [otherDeduction, setOtherDeduction] = useState("0");
  const [pan, setPan] = useState("");
  const [tdsSelection, setTdsSelection] = useState<string>("auto"); // "auto" | "10" | "20" | "0" (no TDS)
  const [loaded, setLoaded] = useState(false);

  const deductTds = tdsSelection !== "0";

  const selectedAgreement = agreements?.find(a => String(a.id) === agreementId);
  const selectedTutor = tutors?.find(t => t.id === selectedAgreement?.tutorId);

  useEffect(() => {
    if (!isEditMode && selectedTutor && !loaded) {
      setPan(selectedTutor.panNumber || "");
    }
  }, [selectedTutor, isEditMode, loaded]);

  useEffect(() => {
    if (isEditMode && existing && !loaded) {
      setAgreementId(String(existing.agreementId));
      setPayMonthInput(monthLabelToInput(existing.payMonth) || payMonthInput);
      setUnitsDelivered(existing.unitsDelivered || "0");
      setRevenueAmount(existing.revenueAmount || "0");
      setOtherDeduction(existing.otherDeduction || "0");
      setPan(existing.panAtPayment || "");
      setTdsSelection(!existing.deductTds ? "0" : (existing.tdsRatePercent === 10 || existing.tdsRatePercent === 20 ? String(existing.tdsRatePercent) : "auto"));
      setLoaded(true);
    }
  }, [existing, isEditMode, loaded]);

  const preview = useMemo(() => computePreview({
    compensationType: selectedAgreement?.compensationType || "per_hour",
    rateFee: parseFloat(selectedAgreement?.rateFee || "0") || 0,
    unitsDelivered: parseFloat(unitsDelivered) || 0,
    revenueAmount: parseFloat(revenueAmount) || 0,
    platformCommissionPercent: parseFloat(selectedAgreement?.platformCommissionPercent || "0") || 0,
    otherDeduction: parseFloat(otherDeduction) || 0,
    deductTds,
    pan,
    tdsOverride: deductTds && tdsSelection !== "auto" ? parseInt(tdsSelection) : null,
  }), [selectedAgreement, unitsDelivered, revenueAmount, otherDeduction, deductTds, pan, tdsSelection]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        agreementId: parseInt(agreementId),
        payMonth: monthInputToLabel(payMonthInput),
        unitsDelivered,
        revenueAmount,
        otherDeduction,
        deductTds,
        panAtPayment: pan,
        tdsRatePercent: deductTds && tdsSelection !== "auto" ? parseInt(tdsSelection) : undefined,
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

  const compensationType = selectedAgreement?.compensationType;
  const unitsLabel = compensationType === "per_session" ? "Sessions Delivered This Month"
    : compensationType === "per_hour" ? "Hours Worked This Month"
    : compensationType === "per_course" ? "% of Course Delivered This Month (0-100)"
    : "";

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
          {isEditMode ? "Edit Tutor Payslip" : "New Tutor Payslip"}
        </h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Agreement & Period</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Tutor Agreement *</Label>
              <Select value={agreementId} onValueChange={v => { setAgreementId(v); setLoaded(false); }} disabled={isEditMode}>
                <SelectTrigger data-testid="select-payslip-agreement"><SelectValue placeholder="Select an agreement" /></SelectTrigger>
                <SelectContent>
                  {agreements?.map(a => {
                    const t = tutors?.find(tt => tt.id === a.tutorId);
                    return (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.agreementRef} — {t?.fullName || "?"} — {a.subject}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedAgreement && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {COMPENSATION_LABELS[selectedAgreement.compensationType]} @ {selectedAgreement.compensationType === "revenue_share" ? `${selectedAgreement.rateFee}%` : `₹${selectedAgreement.rateFee}`}
                  {parseFloat(selectedAgreement.platformCommissionPercent) > 0 ? ` — Platform Commission ${selectedAgreement.platformCommissionPercent}%` : ""}
                </p>
              )}
            </div>
            <div>
              <Label>Pay Month *</Label>
              <Input type="month" value={payMonthInput} onChange={e => setPayMonthInput(e.target.value)} data-testid="input-pay-month" />
            </div>
          </CardContent>
        </Card>

        {selectedAgreement && (
          <Card>
            <CardHeader><CardTitle className="text-base">This Month's Earnings</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {compensationType === "revenue_share" ? (
                <div>
                  <Label>Gross Revenue This Month (INR)</Label>
                  <Input type="number" min="0" value={revenueAmount} onChange={e => setRevenueAmount(e.target.value)} data-testid="input-revenue-amount" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter the course's gross revenue for this month — not tracked automatically.</p>
                </div>
              ) : (
                <div>
                  <Label>{unitsLabel}</Label>
                  <Input type="number" min="0" value={unitsDelivered} onChange={e => setUnitsDelivered(e.target.value)} data-testid="input-units-delivered" />
                </div>
              )}
              <div>
                <Label>Penalty / Other Deduction (INR)</Label>
                <Input type="number" min="0" value={otherDeduction} onChange={e => setOtherDeduction(e.target.value)} data-testid="input-other-deduction" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">TDS — Sec 194J</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>TDS Rate</Label>
                <Select value={tdsSelection} onValueChange={setTdsSelection}>
                  <SelectTrigger data-testid="select-tds-rate"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (from PAN validity)</SelectItem>
                    <SelectItem value="10">10% (With PAN)</SelectItem>
                    <SelectItem value="20">20% (No PAN — Sec 206AA)</SelectItem>
                    <SelectItem value="0">No TDS — pay in full</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  TDS is only legally required once aggregate FY payments to this tutor cross ₹30,000 — choose "No TDS" if this payment is below that threshold.
                </p>
              </div>
              {deductTds && (
                <div>
                  <Label>PAN at Payment</Label>
                  <Input value={pan} onChange={e => { setPan(e.target.value.toUpperCase()); if (tdsSelection !== "0") setTdsSelection("auto"); }} placeholder="AAAAA9999A" className="uppercase" data-testid="input-payslip-pan" />
                  <p className={`text-xs mt-1 ${preview.validPan ? "text-green-600" : "text-amber-600"}`}>
                    {preview.validPan ? "Valid PAN — 10% TDS" : "No valid PAN — 20% TDS (Sec 206AA)"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Gross Earnings</span><span className="font-medium">₹{preview.grossEarnings.toLocaleString("en-IN")}</span></div>
            {preview.platformCommissionAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600"><span>Platform Commission</span><span>-₹{preview.platformCommissionAmount.toLocaleString("en-IN")}</span></div>
            )}
            <div className="flex justify-between text-sm text-red-600"><span>TDS ({preview.tdsRatePercent}%)</span><span>-₹{preview.tdsAmount.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm text-red-600"><span>Other Deduction</span><span>-₹{(parseFloat(otherDeduction) || 0).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-sky-200 dark:border-sky-800"><span>Net Pay</span><span data-testid="text-preview-net-pay">₹{preview.netPay.toLocaleString("en-IN")}</span></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/accounting/payroll/tutor-payslips")}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !agreementId || !payMonthInput}
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
