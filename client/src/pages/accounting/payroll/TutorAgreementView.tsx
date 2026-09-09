import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TutorAgreement, Tutor, CompanySettings } from "@shared/schema";
import { Loader2, Printer } from "lucide-react";

const COMPENSATION_LABELS: Record<string, string> = {
  per_session: "Per Session", per_course: "Per Course", per_hour: "Per Hour", revenue_share: "Revenue Share",
};
const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly", on_completion: "On Completion of Course (after Company verification)",
};
const AGREEMENT_STATUS_LABELS: Record<string, string> = {
  sent: "Sent", in_progress: "In Progress", yts: "YTS (Yet To Start)", on_hold: "On Hold",
  completed: "Completed", cancelled: "Cancelled", signed: "Signed", swapped: "Swapped",
};
const ACCEPTANCE_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted", rejected: "Rejected", under_review: "Under Review",
  on_hold: "On Hold", pending_response: "Pending Response", withdrawn: "Withdrawn",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TutorAgreementView() {
  const [, params] = useRoute("/accounting/payroll/tutor-agreements/:id/view");
  const id = params?.id ? parseInt(params.id) : null;

  const { data: agreement, isLoading } = useQuery<TutorAgreement>({
    queryKey: ["/api/accounting/tutor-agreements", id],
    enabled: !!id,
  });
  const { data: tutor } = useQuery<Tutor>({
    queryKey: ["/api/accounting/tutors", agreement?.tutorId],
    enabled: !!agreement?.tutorId,
  });
  const { data: company } = useQuery<CompanySettings>({ queryKey: ["/api/accounting/company-settings"] });

  if (isLoading || !agreement) {
    return <AccountingLayout><div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div></AccountingLayout>;
  }

  const row = (label: string, value: React.ReactNode) => (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 w-1/3">{label}</td>
      <td className="px-4 py-2.5 text-sm text-slate-900 dark:text-white">{value}</td>
    </tr>
  );

  return (
    <AccountingLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Tutor Agreement Summary</h1>
          <Button onClick={() => window.print()} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-print-agreement">
            <Printer className="w-4 h-4 mr-2" />Print
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-700 print:border print:shadow-none">
          <CardContent className="p-8 print:p-6 space-y-6">
            <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                KoodaldigiXS Learning — {company?.companyName || "Maanagarram Hi Tech Solutions"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{company?.address}</p>
              <p className="text-sm font-semibold mt-2">Agreement Ref: {agreement.agreementRef}</p>
            </div>

            <table className="w-full border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
              <tbody>
                {row("Tutor", tutor ? `${tutor.tutorCode} — ${tutor.fullName}` : "-")}
                {row("Subject / Course Area", agreement.subject)}
                {row("Start Date", fmtDate(agreement.startDate))}
                {row("End Date (Completion Deadline)", fmtDate(agreement.endDate))}
                {row("Total No. of Classes / Sessions", agreement.sessionsSummary || "-")}
                {row("Weekly Class Schedule", agreement.weeklySchedule || "-")}
                {row("Compensation Type", COMPENSATION_LABELS[agreement.compensationType])}
                {row("Rate / Fee", agreement.compensationType === "revenue_share" ? `${agreement.rateFee}% of Gross Earnings` : `INR ${agreement.rateFee}`)}
                {row("Platform Commission %", `${agreement.platformCommissionPercent}%`)}
                {row("Payment Frequency", FREQUENCY_LABELS[agreement.paymentFrequency])}
                {row("Post-Course Support Duration", agreement.postCourseSupportMonths ? `${agreement.postCourseSupportMonths} Months` : "-")}
                {row("Agreement Status", AGREEMENT_STATUS_LABELS[agreement.agreementStatus])}
                {row("Tutor Acceptance Status", ACCEPTANCE_STATUS_LABELS[agreement.tutorAcceptanceStatus])}
              </tbody>
            </table>

            <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-3">
              This is a data summary of the signed agreement's Schedule A held on file — it is not the legal
              agreement document itself. Sec 194J TDS applies per the Individual Tutor Agreement; PF/ESI/Gratuity
              do not apply (Clause 15.13, independent contractor status).
            </p>
          </CardContent>
        </Card>
      </div>
    </AccountingLayout>
  );
}
