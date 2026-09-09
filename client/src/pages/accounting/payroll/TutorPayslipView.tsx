import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TutorPayslip, TutorAgreement, Tutor, CompanySettings } from "@shared/schema";
import { Loader2, Printer } from "lucide-react";

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
const COMPENSATION_LABELS: Record<string, string> = {
  per_session: "Sessions Delivered", per_course: "% of Course Delivered", per_hour: "Hours Worked", revenue_share: "Revenue Share",
};
const COMPENSATION_TYPE_LABELS: Record<string, string> = {
  per_session: "Per Session", per_course: "Per Course", per_hour: "Per Hour", revenue_share: "Revenue Share",
};

export default function TutorPayslipView() {
  const { hasPermission } = useAuth();
  const [isAdminRoute, adminParams] = useRoute("/accounting/payroll/tutor-payslips/:id/view");
  const [isSelfRoute, selfParams] = useRoute("/accounting/payroll/my-payslips/:id");
  // Prefer the admin API only when the viewer actually has admin-level payroll access —
  // a tutor account never has payroll_tutors.view, so this always resolves to the
  // self-scoped /api/accounting/my-payslips endpoints for them, even if the route matcher
  // ever overlaps.
  const useSelfService = isSelfRoute || !hasPermission("payroll_tutors.view");
  const id = (isAdminRoute ? adminParams?.id : selfParams?.id) ? parseInt((isAdminRoute ? adminParams!.id : selfParams!.id)) : null;

  const { data: payslip, isLoading } = useQuery<TutorPayslip>({
    queryKey: [useSelfService ? "/api/accounting/my-payslips" : "/api/accounting/tutor-payslips", id],
    enabled: !!id,
  });
  const { data: tutor } = useQuery<Tutor>({
    queryKey: useSelfService ? ["/api/accounting/my-tutor-profile"] : ["/api/accounting/tutors", payslip?.tutorId],
    enabled: useSelfService ? true : !!payslip?.tutorId,
  });
  const { data: agreement } = useQuery<TutorAgreement>({
    queryKey: ["/api/accounting/tutor-agreements", payslip?.agreementId],
    enabled: !useSelfService && !!payslip?.agreementId,
  });
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/accounting/company-settings"] });

  if (isLoading || !payslip) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  const gross = parseFloat(payslip.grossEarnings);
  const commission = parseFloat(payslip.platformCommissionAmount || "0");
  const tds = parseFloat(payslip.tdsAmount);
  const other = parseFloat(payslip.otherDeduction || "0");
  const net = parseFloat(payslip.netPay);
  const units = parseFloat(payslip.unitsDelivered || "0");
  const compType = agreement?.compensationType;

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Tutor Payslip</h1>
          <Button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-print-payslip">
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 print:border print:shadow-none">
          <CardContent className="p-8 print:p-6 space-y-6">
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                KoodaldigiXS Learning — {company?.companyName || "Maanagarram Hi Tech Solutions"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {company?.address} {company?.gstin ? `| GSTIN: ${company.gstin}` : ""}
              </p>
              <p className="text-sm font-semibold mt-2">Pay Slip for the month of {payslip.payMonth}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">All amounts are in INR | Independent Contractor</p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-slate-500">Tutor Code:</span> <span className="font-medium">{tutor?.tutorCode || "-"}</span></div>
              <div><span className="text-slate-500">Tutor Name:</span> <span className="font-medium">{tutor?.fullName || "-"}</span></div>
              <div><span className="text-slate-500">Subject:</span> <span className="font-medium">{agreement?.subject || "-"}</span></div>
              <div><span className="text-slate-500">Agreement Ref:</span> <span className="font-medium">{agreement?.agreementRef || "-"}</span></div>
              <div><span className="text-slate-500">PAN:</span> <span className="font-medium">{payslip.panAtPayment || "Not provided"}</span></div>
              <div><span className="text-slate-500">Designation:</span> <span className="font-medium">Independent Contractor</span></div>
              <div><span className="text-slate-500">Compensation Type:</span> <span className="font-medium">{compType ? COMPENSATION_TYPE_LABELS[compType] : "-"}</span></div>
              <div><span className="text-slate-500">Status:</span> <span className="font-medium">{STATUS_LABELS[payslip.status]}</span></div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2">Rate / Fee</th>
                    <th className="text-right px-3 py-2">{compType === "revenue_share" ? "Revenue" : "Units"}</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">{compType ? COMPENSATION_LABELS[compType] : "Earnings"}</td>
                    <td className="text-right px-3 py-2">
                      {compType === "revenue_share" ? `${agreement?.rateFee}%` : `₹${agreement?.rateFee || "-"}`}
                    </td>
                    <td className="text-right px-3 py-2">
                      {compType === "revenue_share" ? `₹${parseFloat(payslip.revenueAmount || "0").toLocaleString("en-IN")}` : units}
                    </td>
                    <td className="text-right px-3 py-2 font-medium">₹{gross.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 font-bold">
                    <td className="px-3 py-2" colSpan={3}>GROSS EARNINGS</td>
                    <td className="text-right px-3 py-2" data-testid="text-gross-earnings">₹{gross.toLocaleString("en-IN")}</td>
                  </tr>
                  {commission > 0 && (
                    <tr className="border-t border-slate-100 dark:border-slate-800 text-red-600">
                      <td className="px-3 py-2" colSpan={3}>Platform Commission ({agreement?.platformCommissionPercent}%)</td>
                      <td className="text-right px-3 py-2 font-medium">-₹{commission.toLocaleString("en-IN")}</td>
                    </tr>
                  )}
                  {payslip.deductTds ? (
                    <tr className="border-t border-slate-100 dark:border-slate-800 text-red-600">
                      <td className="px-3 py-2" colSpan={3}>TDS — Sec 194J ({payslip.tdsRatePercent}%)</td>
                      <td className="text-right px-3 py-2 font-medium" data-testid="text-tds-amount">-₹{tds.toLocaleString("en-IN")}</td>
                    </tr>
                  ) : (
                    <tr className="border-t border-slate-100 dark:border-slate-800 text-slate-500">
                      <td className="px-3 py-2" colSpan={3}>TDS — not deducted (below Sec 194J threshold)</td>
                      <td className="text-right px-3 py-2 font-medium">₹0.00</td>
                    </tr>
                  )}
                  {other > 0 && (
                    <tr className="border-t border-slate-100 dark:border-slate-800 text-red-600">
                      <td className="px-3 py-2" colSpan={3}>Penalty / Set-off</td>
                      <td className="text-right px-3 py-2 font-medium">-₹{other.toLocaleString("en-IN")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-sky-600 text-white rounded px-4 py-3 text-center font-semibold" data-testid="text-net-pay">
              Net Pay: ₹{net.toLocaleString("en-IN")} ( {toWords(net)} )
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
              This is a system-generated payslip for an Independent Contractor and does not require a signature for processing.
              {payslip.deductTds ? ` TDS deducted under Section 194J of the Income Tax Act, 1961 @ ${payslip.tdsRatePercent}%${payslip.tdsRatePercent === 20 ? " under Sec 206AA (no valid PAN on file)" : ""}.` : " No TDS deducted on this payment."}
              {" "}No PF / ESI / Gratuity applicable — Clause 15.13 of the Agreement.
              {agreement?.agreementRef ? ` Agreement Ref: ${agreement.agreementRef}.` : ""}
            </p>
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
