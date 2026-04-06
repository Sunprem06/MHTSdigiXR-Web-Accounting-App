import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Spinner } from "@/components/ui/loading";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
const SYM: Record<string,string> = { INR:"₹", USD:"$", AED:"د.إ", EUR:"€", GBP:"£" };
function Card({ label, value, color }: { label:string; value:string|number; color:string }) {
  return <div className={`rounded-2xl p-6 ${color}`}><p className="text-sm opacity-70 mb-1">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}
export default function AccountingDashboard() {
  const [, nav] = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [currency, setCurrency] = useState("INR");
  useEffect(() => { fetch("/api/accounting/dashboard").then(r=>r.json()).then(setData).catch(()=>setError("Failed to load. Please refresh.")).finally(()=>setLoading(false)); }, []);
  const fmt = (n: number) => `${SYM[currency]}${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
  return (
    <AccountingLayout>
      <SEO title="Accounting" url="/accounting" />
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div><h1 className="text-2xl font-bold text-gray-800">Accounting</h1><p className="text-gray-500 text-sm">Invoices · Expenses · Reports</p></div>
          <div className="flex gap-3">
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">{["INR","USD","AED","EUR","GBP"].map(c=><option key={c}>{c}</option>)}</select>
            <Button onClick={()=>nav("/accounting/invoices/new")} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full">+ New invoice</Button>
          </div>
        </div>
        {loading && <div className="flex justify-center py-20"><Spinner className="text-sky-500 h-8 w-8"/></div>}
        {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-700">{error}</div>}
        {data && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Total income" value={fmt(data.totalIncome)} color="bg-green-50 text-green-800"/>
            <Card label="Total expenses" value={fmt(data.totalExpenses)} color="bg-red-50 text-red-800"/>
            <Card label="Receivables" value={fmt(data.totalReceivables)} color="bg-sky-50 text-sky-800"/>
            <Card label="Payables" value={fmt(data.totalPayables)} color="bg-purple-50 text-purple-800"/>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Cash in hand" value={fmt(data.cashInHand)} color="bg-white border border-gray-100"/>
            <Card label="Bank balance" value={fmt(data.bankBalance)} color="bg-white border border-gray-100"/>
            <Card label="Pending approvals" value={data.pendingApprovals ?? 0} color="bg-white border border-gray-100"/>
            <Card label="Financial year" value={data.activeFinancialYear?.name ?? "—"} color="bg-white border border-gray-100"/>
          </div>
          {data.recentVouchers?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
              <h2 className="font-semibold text-gray-800 mb-4">Recent vouchers</h2>
              <div className="space-y-2">
                {data.recentVouchers.map((v: any) => (
                  <div key={v.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <div><span className="font-medium text-gray-700 text-sm">{v.voucherNumber}</span><span className="ml-2 text-xs text-gray-400 capitalize">{v.type}</span></div>
                    <span className="text-sm font-semibold text-gray-800">{fmt(parseFloat(v.totalAmount||"0"))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Quick actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["All invoices","/accounting/invoices"],["New voucher","/accounting/vouchers/new"],["P&L report","/accounting/reports"],["Ledgers","/accounting/ledgers"]].map(([l,p])=>(
                <button key={p} onClick={()=>nav(p)} className="p-4 rounded-xl bg-gray-50 hover:bg-sky-50 hover:text-sky-600 text-gray-600 text-sm font-medium transition-colors">{l}</button>
              ))}
            </div>
          </div>
        </>}
      </div>
    </AccountingLayout>
  );
}
