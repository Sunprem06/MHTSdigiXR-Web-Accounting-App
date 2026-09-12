import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PayrollPayslip, PayrollEmployee, CompanySettings } from "@shared/schema";
import { Loader2, Printer } from "lucide-react";
import mhtsdigixrLogo from "@assets/MHTSdigiXR_logo_1080x1080_1773540695277.jpg";

const ONES = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
  "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function chunk(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n] + " ";
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] + " " : " ");
  return ONES[Math.floor(n / 100)] + " HUNDRED " + (n % 100 ? chunk(n % 100) : "");
}

function toWords(amount: number): string {
  let n = Math.round(amount);
  if (n === 0) return "ZERO ONLY";
  let s = "";
  if (n >= 10000000) { s += chunk(Math.floor(n / 10000000)) + "CRORE "; n %= 10000000; }
  if (n >= 100000) { s += chunk(Math.floor(n / 100000)) + "LAKH "; n %= 100000; }
  if (n >= 1000) { s += chunk(Math.floor(n / 1000)) + "THOUSAND "; n %= 1000; }
  if (n > 0) s += chunk(n);
  return s.trim() + " ONLY";
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", submitted: "Submitted (Awaiting Approval)", approved: "Approved (Awaiting Payment)", paid: "Paid", rejected: "Rejected",
};

export default function PayrollPayslipView() {
  const { hasPermission } = useAuth();
  const [isAdminRoute, adminParams] = useRoute("/accounting/payroll/payslips/:id/view");
  const [isSelfRoute, selfParams] = useRoute("/accounting/payroll/my-payroll-payslips/:id");
  // A payroll-employee self-service login never has payroll_employees.view (that's
  // the admin-side permission) — this always resolves to the self-scoped
  // /api/accounting/my-payroll-payslips endpoints for them, even if the route
  // matcher ever overlaps. Mirrors TutorPayslipView's dual-mode pattern.
  const useSelfService = isSelfRoute || !hasPermission("payroll_employees.view");
  const id = (isAdminRoute ? adminParams?.id : selfParams?.id) ? parseInt((isAdminRoute ? adminParams!.id : selfParams!.id)) : null;

  const { data: payslip, isLoading } = useQuery<PayrollPayslip>({
    queryKey: [useSelfService ? "/api/accounting/my-payroll-payslips" : "/api/accounting/payroll-payslips", id],
    enabled: !!id,
  });
  const { data: employee } = useQuery<PayrollEmployee>({
    queryKey: useSelfService ? ["/api/accounting/my-payroll-profile"] : ["/api/accounting/payroll-employees", payslip?.payrollEmployeeId],
    enabled: useSelfService ? true : !!payslip?.payrollEmployeeId,
  });
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/accounting/company-settings"] });

  if (isLoading || !payslip) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  const gross = parseFloat(payslip.grossEarnings);
  const pt = parseFloat(payslip.professionalTax);
  const net = parseFloat(payslip.netPay);
  const lop = parseFloat(payslip.lopDays);

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Payroll Payslip</h1>
          <Button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-print-payslip">
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 print:border print:shadow-none">
          <CardContent className="p-8 print:p-6 space-y-6">
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <img src={mhtsdigixrLogo} alt="MHTSdigiXR" className="h-14 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{company?.companyName || "Maanagarram Hi Tech Solutions"}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {company?.address} {company?.gstin ? `| GSTIN: ${company.gstin}` : ""}
              </p>
              <p className="text-sm font-semibold mt-2">Salary Slip for the month of {payslip.payMonth}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">All amounts are in INR</p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-slate-500">Employee Code:</span> <span className="font-medium">{employee?.employeeCode || "-"}</span></div>
              <div><span className="text-slate-500">Employee Name:</span> <span className="font-medium">{employee?.fullName || "-"}</span></div>
              <div><span className="text-slate-500">Designation:</span> <span className="font-medium">{employee?.designation || "-"}</span></div>
              <div><span className="text-slate-500">Department:</span> <span className="font-medium">{employee?.department || "-"}</span></div>
              <div><span className="text-slate-500">Date of Joining:</span> <span className="font-medium">{employee?.dateOfJoining || "-"}</span></div>
              <div><span className="text-slate-500">Pay Period:</span> <span className="font-medium">{payslip.payMonth}</span></div>
              <div><span className="text-slate-500">PAN:</span> <span className="font-medium">{employee?.panNumber || "Not provided"}</span></div>
              <div><span className="text-slate-500">Bank Account:</span> <span className="font-medium">{employee?.bankAccountNumber || "Not provided"}</span></div>
              <div><span className="text-slate-500">Working Days:</span> <span className="font-medium">{payslip.standardWorkingDays}</span></div>
              <div><span className="text-slate-500">LOP Days:</span> <span className="font-medium">{lop}</span></div>
              <div><span className="text-slate-500">Status:</span> <span className="font-medium">{STATUS_LABELS[payslip.status]}</span></div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-3 py-2">Earnings</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Deductions</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const earningsRows = [
                      { label: "Basic Salary", amount: parseFloat(payslip.basicEarned) },
                      { label: "House Rent Allowance", amount: parseFloat(payslip.hraEarned) },
                      { label: "Conveyance Allowance", amount: parseFloat(payslip.conveyanceEarned) },
                      { label: "Medical Allowance", amount: parseFloat(payslip.medicalEarned) },
                      { label: "Other Allowances", amount: parseFloat(payslip.otherAllowancesEarned) },
                    ];
                    const tdsThisMonth = parseFloat(payslip.tdsThisMonth || "0");
                    const deductionRows = [
                      { label: "Professional Tax", amount: pt, testId: "text-professional-tax" },
                      ...(payslip.pfApplied ? [{ label: "Provident Fund (Employee)", amount: parseFloat(payslip.pfEmployeeAmount), testId: "text-pf-employee" }] : []),
                      ...(payslip.esiApplied ? [{ label: "ESI (Employee)", amount: parseFloat(payslip.esiEmployeeAmount), testId: "text-esi-employee" }] : []),
                      ...(tdsThisMonth > 0 ? [{ label: "TDS (Sec 192)", amount: tdsThisMonth, testId: "text-tds-this-month" }] : []),
                    ];
                    const rowCount = Math.max(earningsRows.length, deductionRows.length);
                    return Array.from({ length: rowCount }).map((_, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">{earningsRows[i]?.label || ""}</td>
                        <td className="text-right px-3 py-2">{earningsRows[i] ? `₹${earningsRows[i].amount.toLocaleString("en-IN")}` : ""}</td>
                        <td className="px-3 py-2">{deductionRows[i]?.label || ""}</td>
                        <td className="text-right px-3 py-2" data-testid={deductionRows[i]?.testId}>{deductionRows[i] ? `₹${deductionRows[i].amount.toLocaleString("en-IN")}` : ""}</td>
                      </tr>
                    ));
                  })()}
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold">
                    <td className="px-3 py-2">Gross Earnings</td>
                    <td className="text-right px-3 py-2" data-testid="text-gross-earnings">₹{gross.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2">Total Deductions</td>
                    <td className="text-right px-3 py-2">₹{parseFloat(payslip.totalDeductions).toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold">Income Tax Worksheet — Sec 192 TDS (New Regime)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm p-3">
                <div className="flex justify-between"><span className="text-slate-500">Annual Projected Gross</span><span>₹{parseFloat(payslip.annualProjectedGross || "0").toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Annual Taxable Income</span><span data-testid="text-annual-taxable">₹{parseFloat(payslip.annualTaxableIncome || "0").toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Annual Tax Payable</span><span data-testid="text-annual-tax">₹{parseFloat(payslip.annualTaxPayable || "0").toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">TDS Deducted Till Date (this FY)</span><span>₹{parseFloat(payslip.tdsDeductedTillDate || "0").toLocaleString("en-IN")}</span></div>
              </div>
            </div>

            <div className="bg-sky-600 text-white rounded px-4 py-3 text-center font-semibold" data-testid="text-net-pay">
              Net Pay: ₹{net.toLocaleString("en-IN")} ( {toWords(net)} )
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
              This is a computer-generated payslip. No signature required for regular months.
              {payslip.payslipFormat === "with_pf_esi"
                ? ` PF ${payslip.pfApplied ? "deducted" : "not applicable"}, ESI ${payslip.esiApplied ? "deducted" : "not applicable"} on this payslip (Format: With PF/ESI).`
                : " No PF/ESI deducted on this payslip (Format: No PF/ESI)."}
              {" "}TDS computed under the New Tax Regime (Sec 192) — Old Regime is not supported.
            </p>
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
