import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Spinner } from "@/components/ui/loading";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import type { PayrollEmployee } from "@shared/schema";
const SYM: Record<string,string> = { INR:"₹", USD:"$", AED:"د.إ", EUR:"€", GBP:"£" };
function Card({ label, value, color }: { label:string; value:string|number; color:string }) {
  return <div className={`rounded-2xl p-6 ${color}`}><p className="text-sm opacity-70 mb-1">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}
const NEUTRAL_CARD = "bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 text-slate-900 dark:text-white";
export default function AccountingDashboard() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [currency, setCurrency] = useState("INR");
  useEffect(() => { fetch("/api/accounting/dashboard").then(r=>r.json()).then(setData).catch(()=>setError("Failed to load. Please refresh.")).finally(()=>setLoading(false)); }, []);

  // Salaried staff whose payroll master profile has been linked to their login
  // (Settings/HR → Employees (Payroll) → Self-Service Login) see their own
  // profile here, alongside their normal accounting work — 404 just means
  // "not linked," not an error, so it resolves to null rather than surfacing.
  const { data: payrollProfile } = useQuery<PayrollEmployee | null>({
    queryKey: ["/api/accounting/my-payroll-profile"],
    queryFn: async () => {
      const res = await fetch("/api/accounting/my-payroll-profile", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load payroll profile");
      return res.json();
    },
    enabled: !!user && user.role !== "tutor",
  });
  const fmt = (n: number) => `${SYM[currency]}${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
  return (
    <AccountingLayout>
      <SEO title="Accounting" url="/accounting" />
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div><h1 className="text-2xl font-bold text-gray-800 dark:text-white">Accounting</h1><p className="text-gray-500 dark:text-slate-400 text-sm">Invoices · Expenses · Reports</p></div>
          <div className="flex gap-3">
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="text-sm border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-gray-800 dark:text-white">{["INR","USD","AED","EUR","GBP"].map(c=><option key={c}>{c}</option>)}</select>
            <Button onClick={()=>nav("/accounting/invoices/new")} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full">+ New invoice</Button>
          </div>
        </div>
        {loading && <div className="flex justify-center py-20"><Spinner className="text-sky-500 h-8 w-8"/></div>}
        {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700">{error}</div>}
        {data && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Total income" value={fmt(data.totalIncome)} color="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"/>
            <Card label="Total expenses" value={fmt(data.totalExpenses)} color="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"/>
            <Card label="Receivables" value={fmt(data.totalReceivables)} color="bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-300"/>
            <Card label="Payables" value={fmt(data.totalPayables)} color="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300"/>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Cash in hand" value={fmt(data.cashInHand)} color={NEUTRAL_CARD}/>
            <Card label="Bank balance" value={fmt(data.bankBalance)} color={NEUTRAL_CARD}/>
            <Card label="Pending approvals" value={data.pendingApprovals ?? 0} color={NEUTRAL_CARD}/>
            <Card label="Financial year" value={data.activeFinancialYear?.name ?? "—"} color={NEUTRAL_CARD}/>
          </div>
          {data.recentVouchers?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-6">
              <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Recent vouchers</h2>
              <div className="space-y-2">
                {data.recentVouchers.map((v: any) => (
                  <div key={v.id} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div><span className="font-medium text-gray-700 dark:text-slate-300 text-sm">{v.voucherNumber}</span><span className="ml-2 text-xs text-gray-400 dark:text-slate-500 capitalize">{v.type}</span></div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{fmt(parseFloat(v.totalAmount||"0"))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Quick actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["All invoices","/accounting/invoices"],["New voucher","/accounting/vouchers/new"],["P&L report","/accounting/reports"],["Ledgers","/accounting/ledgers"]].map(([l,p])=>(
                <button key={p} onClick={()=>nav(p)} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400 text-gray-600 dark:text-slate-300 text-sm font-medium transition-colors">{l}</button>
              ))}
            </div>
          </div>
          {payrollProfile && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mt-6" data-testid="section-my-payslips">
              <h2 className="font-semibold text-gray-800 dark:text-white mb-4">My Payslips</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs text-gray-400 dark:text-slate-500">Employee Code</p><p className="text-sm font-medium text-gray-800 dark:text-white">{payrollProfile.employeeCode}</p></div>
                <div><p className="text-xs text-gray-400 dark:text-slate-500">Designation</p><p className="text-sm font-medium text-gray-800 dark:text-white">{payrollProfile.designation || "-"}</p></div>
                <div><p className="text-xs text-gray-400 dark:text-slate-500">Date of Joining</p><p className="text-sm font-medium text-gray-800 dark:text-white">{payrollProfile.dateOfJoining || "-"}</p></div>
                <div><p className="text-xs text-gray-400 dark:text-slate-500">Status</p><p className="text-sm font-medium text-gray-800 dark:text-white capitalize">{payrollProfile.status}</p></div>
              </div>
              <Button onClick={() => nav("/accounting/payroll/my-payroll-payslips")} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full" data-testid="button-view-my-payroll-payslips">
                View My Payslips
              </Button>
            </div>
          )}
        </>}
      </div>
    </AccountingLayout>
  );
}
