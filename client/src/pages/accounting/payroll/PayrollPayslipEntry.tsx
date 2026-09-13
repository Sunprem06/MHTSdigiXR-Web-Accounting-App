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
import type { PayrollEmployee, PayrollCompensationStructure, PayrollPayslip, PayrollStatutoryConfigVersion, PayrollStatutoryConfig } from "@shared/schema";
import { PAYSLIP_FORMATS, DEFAULT_PAYROLL_STATUTORY_CONFIG } from "@shared/schema";
import { Loader2, Save } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const FORMAT_LABELS: Record<string, string> = { no_pf_esi: "No PF/ESI", with_pf_esi: "With PF/ESI" };

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

function parsePayMonthToDate(payMonth: string): string | null {
  const match = payMonth.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const idx = MONTH_NAMES.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
  if (idx === -1) return null;
  return `${match[2]}-${String(idx + 1).padStart(2, "0")}-01`;
}

type FinancialYearLite = { startDate: string; endDate: string };

// Mirrors computeIncomeTaxOnAnnualIncome + computeIncomeTaxForPayslip in
// server/routes.ts — preview only, the server always recomputes authoritatively.
function computeIncomeTaxPreview(input: {
  payMonthInput: string; currentMonthGrossEarnings: number; fullMonthlyGrossRate: number;
  config: PayrollStatutoryConfig; financialYears: FinancialYearLite[] | undefined;
  otherPayslipsForEmployee: PayrollPayslip[] | undefined; excludePayslipId: number | null;
}): { error?: string; annualProjectedGross: number; annualTaxableIncome: number; annualTaxPayable: number; tdsThisMonth: number; tdsDeductedTillDate: number } {
  const zero = { annualProjectedGross: 0, annualTaxableIncome: 0, annualTaxPayable: 0, tdsThisMonth: 0, tdsDeductedTillDate: 0 };
  if (!input.payMonthInput) return zero;
  const asOfDate = `${input.payMonthInput}-01`;
  const fy = input.financialYears?.find(f => asOfDate >= f.startDate && asOfDate <= f.endDate);
  if (!fy) return { ...zero, error: "No financial year is configured covering this month" };

  const priorInFy = (input.otherPayslipsForEmployee || []).filter(p => {
    if (p.id === input.excludePayslipId || p.status === "rejected") return false;
    const d = parsePayMonthToDate(p.payMonth);
    return !!d && d >= fy.startDate && d <= fy.endDate && d < asOfDate;
  });
  const grossSoFar = priorInFy.reduce((sum, p) => sum + parseFloat(p.grossEarnings), 0);
  const tdsSoFar = priorInFy.reduce((sum, p) => sum + parseFloat(p.tdsThisMonth || "0"), 0);

  const [asOfYear, asOfMonth] = asOfDate.split("-").map(Number);
  const [endYear, endMonth] = fy.endDate.split("-").map(Number);
  const remainingMonths = (endYear * 12 + endMonth) - (asOfYear * 12 + asOfMonth) + 1;
  if (remainingMonths <= 0) return zero;
  const futureMonthsCount = remainingMonths - 1;

  const annualProjectedGross = Math.round(grossSoFar + input.currentMonthGrossEarnings + futureMonthsCount * input.fullMonthlyGrossRate);
  const annualTaxableIncome = Math.max(0, annualProjectedGross - input.config.incomeTaxStandardDeduction);

  let tax = 0, lowerBound = 0;
  for (const slab of input.config.incomeTaxSlabs) {
    const upperBound = slab.upTo ?? Infinity;
    if (annualTaxableIncome > lowerBound) {
      tax += (Math.min(annualTaxableIncome, upperBound) - lowerBound) * (slab.ratePercent / 100);
    }
    lowerBound = upperBound;
    if (annualTaxableIncome <= upperBound) break;
  }
  tax = Math.round(tax);
  let taxAfterRebate = tax;
  if (annualTaxableIncome <= input.config.incomeTaxRebateThreshold) {
    taxAfterRebate = Math.max(0, tax - Math.min(tax, input.config.incomeTaxRebateCap));
  } else {
    const excess = annualTaxableIncome - input.config.incomeTaxRebateThreshold;
    if (tax > excess) taxAfterRebate = excess;
  }
  const cess = Math.round(taxAfterRebate * (input.config.incomeTaxCessPercent / 100));
  const annualTaxPayable = taxAfterRebate + cess;

  const remainingTaxLiability = Math.max(0, annualTaxPayable - tdsSoFar);
  const tdsThisMonth = Math.round(remainingTaxLiability / remainingMonths);

  return { annualProjectedGross, annualTaxableIncome, annualTaxPayable, tdsThisMonth, tdsDeductedTillDate: tdsSoFar + tdsThisMonth };
}

// Finds the compensation structure effective as of the first day of the selected
// pay month — the same "latest effectiveFrom <= asOfDate" rule the server uses.
function resolveStructure(structures: PayrollCompensationStructure[] | undefined, payMonthInput: string): PayrollCompensationStructure | undefined {
  if (!structures || !payMonthInput) return undefined;
  const asOfDate = `${payMonthInput}-01`;
  return structures
    .filter(s => s.effectiveFrom <= asOfDate)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

// Client-side preview ONLY — the server always recomputes these authoritatively on save.
// Each component is pro-rated for LOP and rounded individually, matching the
// business's own payslip and Full & Final Settlement documents. PF/ESI mirror
// computePayrollPayslipWithPfEsi in server/routes.ts — see that function for the
// full reasoning (independent employee/PF/ESI gating, ceilings not pro-rated).
function computePreview(input: {
  structure: PayrollCompensationStructure | undefined;
  standardWorkingDays: number; lopDays: number; professionalTax: number;
  payslipFormat: string; pfApplicable: boolean; esiApplicable: boolean; config: PayrollStatutoryConfig;
}) {
  const s = input.structure;
  const factor = input.standardWorkingDays > 0
    ? Math.max(0, Math.min(1, (input.standardWorkingDays - input.lopDays) / input.standardWorkingDays))
    : 1;
  // Rounded to the nearest whole rupee (not paise) — matches every one of the
  // business's actual payslip/compensation documents, none of which show paise.
  const earned = (annual: string | undefined) => Math.round(Math.round((parseFloat(annual || "0")) / 12) * factor);

  const basicEarned = earned(s?.basicAnnual);
  const hraEarned = earned(s?.hraAnnual);
  const conveyanceEarned = earned(s?.conveyanceAnnual);
  const medicalEarned = earned(s?.medicalAnnual);
  const otherAllowancesEarned = earned(s?.otherAllowancesAnnual);
  const grossEarnings = basicEarned + hraEarned + conveyanceEarned + medicalEarned + otherAllowancesEarned;
  const professionalTax = Math.round(Math.max(0, input.professionalTax || 0));

  let pfApplied = false, pfEmployeeAmount = 0, esiApplied = false, esiEmployeeAmount = 0;
  if (input.payslipFormat === "with_pf_esi") {
    pfApplied = input.pfApplicable;
    const pfWageBase = input.config.pfWageCeilingApplied ? Math.min(basicEarned, input.config.pfWageCeiling) : basicEarned;
    pfEmployeeAmount = pfApplied ? Math.round(pfWageBase * (input.config.pfRatePercent / 100)) : 0;

    const esiEligible = grossEarnings <= input.config.esiWageCeiling;
    esiApplied = input.esiApplicable && esiEligible;
    esiEmployeeAmount = esiApplied ? Math.round(grossEarnings * (input.config.esiEmployeeRatePercent / 100)) : 0;
  }

  return { basicEarned, hraEarned, conveyanceEarned, medicalEarned, otherAllowancesEarned, grossEarnings, professionalTax, pfApplied, pfEmployeeAmount, esiApplied, esiEmployeeAmount };
}

export default function PayrollPayslipEntry() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, editParams] = useRoute("/accounting/payroll/payslips/:id/edit");
  const editId = editParams?.id ? parseInt(editParams.id) : null;
  const isEditMode = !!editId;
  const search = useSearch();
  const preselectedEmployeeId = new URLSearchParams(search).get("payrollEmployeeId");

  const { data: employees } = useQuery<PayrollEmployee[]>({ queryKey: ["/api/accounting/payroll-employees"] });
  const { data: existing, isLoading: loadingExisting } = useQuery<PayrollPayslip>({
    queryKey: ["/api/accounting/payroll-payslips", editId],
    enabled: isEditMode,
  });
  const { data: activeConfig } = useQuery<PayrollStatutoryConfigVersion>({
    queryKey: ["/api/accounting/payroll-statutory-config/active"],
    retry: false,
  });
  const { data: financialYears } = useQuery<FinancialYearLite[]>({ queryKey: ["/api/accounting/financial-years"] });

  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || "");
  const [payMonthInput, setPayMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [standardWorkingDays, setStandardWorkingDays] = useState("26");
  const [lopDays, setLopDays] = useState("0");
  const [professionalTax, setProfessionalTax] = useState("0");
  const [payslipFormat, setPayslipFormat] = useState<string>("no_pf_esi");
  const [formatTouched, setFormatTouched] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data: structures } = useQuery<PayrollCompensationStructure[]>({
    queryKey: ["/api/accounting/payroll-compensation-structures", { payrollEmployeeId: employeeId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting/payroll-compensation-structures?payrollEmployeeId=${employeeId}`);
      return res.json();
    },
    enabled: !!employeeId,
  });
  // For the Sec 192 TDS worksheet — this employee's other payslips already in the
  // financial year, to sum "gross/TDS so far" the same way the server does.
  const { data: employeePayslips } = useQuery<PayrollPayslip[]>({
    queryKey: ["/api/accounting/payroll-payslips", { payrollEmployeeId: employeeId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting/payroll-payslips?payrollEmployeeId=${employeeId}`);
      return res.json();
    },
    enabled: !!employeeId,
  });

  const selectedEmployee = employees?.find(e => String(e.id) === employeeId);
  const applicableStructure = useMemo(() => resolveStructure(structures, payMonthInput), [structures, payMonthInput]);
  const config: PayrollStatutoryConfig = { ...DEFAULT_PAYROLL_STATUTORY_CONFIG, ...(activeConfig?.config as Partial<PayrollStatutoryConfig> | undefined) };

  // Format defaults from the employee's own pfApplicable/esiApplicable flags, but
  // stays a per-payslip override once the preparer has touched the dropdown.
  useEffect(() => {
    if (!isEditMode && selectedEmployee && !formatTouched) {
      setPayslipFormat(selectedEmployee.pfApplicable || selectedEmployee.esiApplicable ? "with_pf_esi" : "no_pf_esi");
    }
  }, [selectedEmployee, isEditMode, formatTouched]);

  useEffect(() => {
    if (isEditMode && existing && !loaded) {
      setEmployeeId(String(existing.payrollEmployeeId));
      setPayMonthInput(monthLabelToInput(existing.payMonth) || payMonthInput);
      setStandardWorkingDays(String(existing.standardWorkingDays));
      setLopDays(existing.lopDays);
      setProfessionalTax(existing.professionalTax);
      setPayslipFormat(existing.payslipFormat);
      setFormatTouched(true);
      setLoaded(true);
    }
  }, [existing, isEditMode, loaded]);

  const earningsPreview = useMemo(() => computePreview({
    structure: applicableStructure,
    standardWorkingDays: parseFloat(standardWorkingDays) || 0,
    lopDays: parseFloat(lopDays) || 0,
    professionalTax: parseFloat(professionalTax) || 0,
    payslipFormat,
    pfApplicable: selectedEmployee?.pfApplicable || false,
    esiApplicable: selectedEmployee?.esiApplicable || false,
    config,
  }), [applicableStructure, standardWorkingDays, lopDays, professionalTax, payslipFormat, selectedEmployee, config]);

  // Full (non-LOP-prorated) monthly rate, for projecting the FY's remaining months —
  // mirrors fullMonthlyGrossRate in server/routes.ts.
  const fullMonthlyGrossRate = useMemo(() => computePreview({
    structure: applicableStructure,
    standardWorkingDays: parseFloat(standardWorkingDays) || 0,
    lopDays: 0,
    professionalTax: 0,
    payslipFormat: "no_pf_esi",
    pfApplicable: false, esiApplicable: false, config,
  }).grossEarnings, [applicableStructure, standardWorkingDays, config]);

  const taxPreview = useMemo(() => computeIncomeTaxPreview({
    payMonthInput,
    currentMonthGrossEarnings: earningsPreview.grossEarnings,
    fullMonthlyGrossRate,
    config,
    financialYears,
    otherPayslipsForEmployee: employeePayslips,
    excludePayslipId: editId,
  }), [payMonthInput, earningsPreview.grossEarnings, fullMonthlyGrossRate, config, financialYears, employeePayslips, editId]);

  const preview = {
    ...earningsPreview,
    ...taxPreview,
    totalDeductions: earningsPreview.professionalTax + earningsPreview.pfEmployeeAmount + earningsPreview.esiEmployeeAmount + taxPreview.tdsThisMonth,
    netPay: Math.max(0, earningsPreview.grossEarnings - (earningsPreview.professionalTax + earningsPreview.pfEmployeeAmount + earningsPreview.esiEmployeeAmount + taxPreview.tdsThisMonth)),
  };

  // Every payslip now needs an active statutory config — it also carries the Sec 192
  // tax slab settings used regardless of payslipFormat, not just PF/ESI.
  const needsConfig = !activeConfig;
  const needsFinancialYear = !!taxPreview.error;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        payrollEmployeeId: parseInt(employeeId),
        payMonth: monthInputToLabel(payMonthInput),
        standardWorkingDays,
        lopDays,
        professionalTax,
        payslipFormat,
      };
      const res = isEditMode
        ? await apiRequest("PATCH", `/api/accounting/payroll-payslips/${editId}`, payload)
        : await apiRequest("POST", "/api/accounting/payroll-payslips", payload);
      return res.json();
    },
    onSuccess: (data: PayrollPayslip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/payroll-payslips"] });
      toast({ title: isEditMode ? "Payslip updated" : "Draft payslip created" });
      setLocation(`/accounting/payroll/payslips/${data.id}/view`);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (isEditMode && loadingExisting) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
          {isEditMode ? "Edit Payroll Payslip" : "New Payroll Payslip"}
        </h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Employee & Period</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Payroll Employee *</Label>
              <Select value={employeeId} onValueChange={v => { setEmployeeId(v); setLoaded(false); setFormatTouched(false); }} disabled={isEditMode}>
                <SelectTrigger data-testid="select-payslip-employee"><SelectValue placeholder="Select an employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.filter(e => e.status === "active").map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.employeeCode} — {e.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pay Month *</Label>
              <Input type="month" value={payMonthInput} onChange={e => setPayMonthInput(e.target.value)} data-testid="input-pay-month" />
            </div>
            <div>
              <Label>Payslip Format</Label>
              <Select value={payslipFormat} onValueChange={v => { setPayslipFormat(v); setFormatTouched(true); }}>
                <SelectTrigger data-testid="select-payslip-format"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYSLIP_FORMATS.map(f => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Defaults from this employee's PF/ESI Applicable flags — override here only for a one-off exception.
              </p>
            </div>
            {employeeId && !applicableStructure && (
              <p className="sm:col-span-2 text-xs text-red-600">
                No compensation structure is effective for this month — set one up on the employee's Compensation page first.
              </p>
            )}
            {applicableStructure && (
              <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                Using compensation structure effective {applicableStructure.effectiveFrom} — CTC ₹{parseFloat(applicableStructure.ctcAnnual).toLocaleString("en-IN")}/yr
              </p>
            )}
            {needsConfig && (
              <p className="sm:col-span-2 text-xs text-red-600">
                No statutory configuration is active — set one up in Payroll → Statutory Config first.
              </p>
            )}
            {!needsConfig && needsFinancialYear && (
              <p className="sm:col-span-2 text-xs text-red-600">{taxPreview.error} — set one up in Settings → Financial Years first.</p>
            )}
          </CardContent>
        </Card>

        {applicableStructure && (
          <Card>
            <CardHeader><CardTitle className="text-base">Attendance</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Standard Working Days (Month)</Label>
                <Input type="number" min="1" value={standardWorkingDays} onChange={e => setStandardWorkingDays(e.target.value)} data-testid="input-standard-working-days" />
              </div>
              <div>
                <Label>LOP Days</Label>
                <Input type="number" min="0" value={lopDays} onChange={e => setLopDays(e.target.value)} data-testid="input-lop-days" />
              </div>
              <div>
                <Label>Professional Tax (INR)</Label>
                <Input type="number" min="0" value={professionalTax} onChange={e => setProfessionalTax(e.target.value)} data-testid="input-professional-tax" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Entered manually per payslip, per the Tamil Nadu PT half-yearly slab — not auto-calculated.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {applicableStructure && !needsConfig && !needsFinancialYear && (
          <Card>
            <CardHeader><CardTitle className="text-base">Income Tax Worksheet — Sec 192 TDS (New Regime)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Annual Projected Gross</span><span data-testid="text-annual-gross">₹{preview.annualProjectedGross.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Standard Deduction</span><span>-₹{config.incomeTaxStandardDeduction.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between sm:col-span-2 font-medium border-t border-slate-200 dark:border-slate-700 pt-1"><span>Annual Taxable Income</span><span data-testid="text-annual-taxable">₹{preview.annualTaxableIncome.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between sm:col-span-2"><span className="text-slate-500">Annual Tax Payable (after rebate + cess)</span><span data-testid="text-annual-tax">₹{preview.annualTaxPayable.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">TDS Deducted Till Date (this FY)</span><span>₹{preview.tdsDeductedTillDate.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between font-medium"><span>TDS This Month</span><span data-testid="text-tds-this-month">₹{preview.tdsThisMonth.toLocaleString("en-IN")}</span></div>
            </CardContent>
          </Card>
        )}

        {applicableStructure && (
          <Card className="border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20">
            <CardContent className="p-4 space-y-1">
              <div className="flex justify-between text-sm"><span>Basic Salary</span><span>₹{preview.basicEarned.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-sm"><span>House Rent Allowance</span><span>₹{preview.hraEarned.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-sm"><span>Conveyance Allowance</span><span>₹{preview.conveyanceEarned.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-sm"><span>Medical Allowance</span><span>₹{preview.medicalEarned.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-sm"><span>Other Allowances</span><span>₹{preview.otherAllowancesEarned.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-sm font-medium pt-2 border-t border-sky-200 dark:border-sky-800"><span>Gross Earnings</span><span data-testid="text-preview-gross">₹{preview.grossEarnings.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between text-sm text-red-600"><span>Professional Tax</span><span>-₹{preview.professionalTax.toLocaleString("en-IN")}</span></div>
              {payslipFormat === "with_pf_esi" && (
                <>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Provident Fund (Employee){!preview.pfApplied && " — not applicable"}</span>
                    <span>-₹{preview.pfEmployeeAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>ESI (Employee){!preview.esiApplied && (selectedEmployee?.esiApplicable ? " — gross exceeds ESI ceiling" : " — not applicable")}</span>
                    <span>-₹{preview.esiEmployeeAmount.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
              {!needsConfig && !needsFinancialYear && (
                <div className="flex justify-between text-sm text-red-600"><span>TDS (Sec 192)</span><span data-testid="text-preview-tds">-₹{preview.tdsThisMonth.toLocaleString("en-IN")}</span></div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-sky-200 dark:border-sky-800"><span>Net Pay</span><span data-testid="text-preview-net-pay">₹{preview.netPay.toLocaleString("en-IN")}</span></div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/accounting/payroll/payslips")}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !employeeId || !payMonthInput || !applicableStructure || needsConfig || needsFinancialYear}
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
