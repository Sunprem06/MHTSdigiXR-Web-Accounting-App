import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Spinner } from "@/components/ui/loading";
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
  const fmt = (n: number) => `${SYM[currency]}${n.toLocaleString("en-IN",{maximumFractionDigits:2})}`;
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-8">
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
            <Card label="Total revenue" value={fmt(data.financials.totalRevenue)} color="bg-green-50 text-green-800"/>
            <Card label="Total expenses" value={fmt(data.financials.totalExpenses)} color="bg-red-50 text-red-800"/>
            <Card label="Net profit" value={fmt(data.financials.netProfit)} color="bg-sky-50 text-sky-800"/>
            <Card label="GST collected" value={fmt(data.financials.totalGSTCollected)} color="bg-purple-50 text-purple-800"/>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card label="Total invoices" value={data.invoices.total} color="bg-white border border-gray-100"/>
            <Card label="Paid" value={data.invoices.paid} color="bg-white border border-gray-100"/>
            <Card label="Pending" value={data.invoices.pending} color="bg-white border border-gray-100"/>
            <Card label="Overdue" value={data.invoices.overdue} color="bg-white border border-gray-100"/>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Quick actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["All invoices","/accounting/invoices"],["New expense","/accounting/expenses/new"],["P&L report","/accounting/reports"],["Convert currency","/accounting/convert"]].map(([l,p])=>(
                <button key={p} onClick={()=>nav(p)} className="p-4 rounded-xl bg-gray-50 hover:bg-sky-50 hover:text-sky-600 text-gray-600 text-sm font-medium transition-colors">{l}</button>
              ))}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
