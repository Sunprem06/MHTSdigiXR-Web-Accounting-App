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
import type { PayrollEmployee, PayrollCompensationStructure, PayrollPayslip } from "@shared/schema";
import { Loader2, Save } from "lucide-react";

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
// business's own payslip and Full & Final Settlement documents.
function computePreview(input: {
  structure: PayrollCompensationStructure | undefined;
  standardWorkingDays: number; lopDays: number; professionalTax: number;
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
  const netPay = Math.max(0, round2(grossEarnings - professionalTax));

  return { basicEarned, hraEarned, conveyanceEarned, medicalEarned, otherAllowancesEarned, grossEarnings, professionalTax, netPay };
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

  const [employeeId, setEmployeeId] = useState(preselectedEmployeeId || "");
  const [payMonthInput, setPayMonthInput] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [standardWorkingDays, setStandardWorkingDays] = useState("26");
  const [lopDays, setLopDays] = useState("0");
  const [professionalTax, setProfessionalTax] = useState("0");
  const [loaded, setLoaded] = useState(false);

  const { data: structures } = useQuery<PayrollCompensationStructure[]>({
    queryKey: ["/api/accounting/payroll-compensation-structures", { payrollEmployeeId: employeeId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting/payroll-compensation-structures?payrollEmployeeId=${employeeId}`);
      return res.json();
    },
    enabled: !!employeeId,
  });

  const selectedEmployee = employees?.find(e => String(e.id) === employeeId);
  const applicableStructure = useMemo(() => resolveStructure(structures, payMonthInput), [structures, payMonthInput]);

  useEffect(() => {
    if (isEditMode && existing && !loaded) {
      setEmployeeId(String(existing.payrollEmployeeId));
      setPayMonthInput(monthLabelToInput(existing.payMonth) || payMonthInput);
      setStandardWorkingDays(String(existing.standardWorkingDays));
      setLopDays(existing.lopDays);
      setProfessionalTax(existing.professionalTax);
      setLoaded(true);
    }
  }, [existing, isEditMode, loaded]);

  const preview = useMemo(() => computePreview({
    structure: applicableStructure,
    standardWorkingDays: parseFloat(standardWorkingDays) || 0,
    lopDays: parseFloat(lopDays) || 0,
    professionalTax: parseFloat(professionalTax) || 0,
  }), [applicableStructure, standardWorkingDays, lopDays, professionalTax]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        payrollEmployeeId: parseInt(employeeId),
        payMonth: monthInputToLabel(payMonthInput),
        standardWorkingDays,
        lopDays,
        professionalTax,
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
              <Select value={employeeId} onValueChange={v => { setEmployeeId(v); setLoaded(false); }} disabled={isEditMode}>
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
              <div className="flex justify-between text-base font-bold pt-2 border-t border-sky-200 dark:border-sky-800"><span>Net Pay</span><span data-testid="text-preview-net-pay">₹{preview.netPay.toLocaleString("en-IN")}</span></div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLocation("/accounting/payroll/payslips")}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !employeeId || !payMonthInput || !applicableStructure}
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
