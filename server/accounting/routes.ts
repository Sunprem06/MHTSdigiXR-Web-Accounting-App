import { Router, Request, Response } from "express";
const router = Router();
interface InvoiceItem { description: string; quantity: number; unitPrice: number; gstRate: number; }
interface Invoice { id: string; invoiceNumber: string; clientName: string; clientEmail: string; clientAddress: string; clientGSTIN?: string; items: InvoiceItem[]; currency: string; status: string; dueDate: string; createdAt: string; notes?: string; }
interface Expense { id: string; description: string; amount: number; category: string; date: string; currency: string; }
const invoices: Invoice[] = [];
const expenses: Expense[] = [];
const RATES: Record<string,number> = { INR:1, USD:0.012, AED:0.044, EUR:0.011, GBP:0.0095 };
function calcTotals(items: InvoiceItem[]) {
  let subtotal=0, totalGST=0;
  items.forEach(i => { const lt=i.quantity*i.unitPrice; subtotal+=lt; totalGST+=(lt*i.gstRate/100); });
  return { subtotal, totalGST, grandTotal: subtotal+totalGST };
}
router.get("/dashboard", (_req,res) => {
  const paid=invoices.filter(i=>i.status==="paid");
  const totalRevenue=paid.reduce((s,i)=>s+calcTotals(i.items).grandTotal,0);
  const totalGSTCollected=paid.reduce((s,i)=>s+calcTotals(i.items).totalGST,0);
  const totalExpenses=expenses.reduce((s,e)=>s+e.amount,0);
  res.json({ invoices:{ total:invoices.length, paid:paid.length, overdue:invoices.filter(i=>i.status==="overdue").length, pending:invoices.filter(i=>i.status==="sent").length }, financials:{ totalRevenue, totalExpenses, netProfit:totalRevenue-totalExpenses, totalGSTCollected } });
});
router.get("/invoices", (_req,res) => res.json({ invoices: invoices.map(i=>({...i, totals:calcTotals(i.items)})), total:invoices.length }));
router.get("/invoices/:id", (req,res) => { const i=invoices.find(i=>i.id===req.params.id); if(!i) return res.status(404).json({error:"Not found"}); res.json({invoice:i, totals:calcTotals(i.items)}); });
router.post("/invoices", (req: Request, res: Response) => {
  const { clientName,clientEmail,clientAddress,clientGSTIN,items,currency,dueDate,notes } = req.body;
  if(!clientName||!clientEmail||!items?.length) return res.status(400).json({error:"clientName, clientEmail and items are required"});
  const inv: Invoice = { id:`inv_${Date.now()}`, invoiceNumber:`MHT-${new Date().getFullYear()}-${String(invoices.length+1).padStart(4,"0")}`, clientName, clientEmail, clientAddress:clientAddress||"", clientGSTIN, items, currency:currency||"INR", status:"draft", dueDate:dueDate||new Date(Date.now()+30*86400000).toISOString().split("T")[0], createdAt:new Date().toISOString(), notes };
  invoices.push(inv);
  res.status(201).json({invoice:inv, totals:calcTotals(inv.items)});
});
router.patch("/invoices/:id/status", (req,res) => { const i=invoices.find(i=>i.id===req.params.id); if(!i) return res.status(404).json({error:"Not found"}); i.status=req.body.status; res.json({invoice:i}); });
router.delete("/invoices/:id", (req,res) => { const idx=invoices.findIndex(i=>i.id===req.params.id); if(idx===-1) return res.status(404).json({error:"Not found"}); invoices.splice(idx,1); res.json({message:"Deleted"}); });
router.get("/expenses", (_req,res) => res.json({ expenses, total:expenses.reduce((s,e)=>s+e.amount,0) }));
router.post("/expenses", (req: Request, res: Response) => {
  const { description,amount,category,date,currency } = req.body;
  if(!description||!amount||!category) return res.status(400).json({error:"description, amount and category required"});
  const exp: Expense = { id:`exp_${Date.now()}`, description, amount:parseFloat(amount), category, date:date||new Date().toISOString().split("T")[0], currency:currency||"INR" };
  expenses.push(exp); res.status(201).json({expense:exp});
});
router.delete("/expenses/:id", (req,res) => { const idx=expenses.findIndex(e=>e.id===req.params.id); if(idx===-1) return res.status(404).json({error:"Not found"}); expenses.splice(idx,1); res.json({message:"Deleted"}); });
router.get("/reports/profit-loss", (req,res) => {
  const from=req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(),0,1);
  const to=req.query.to ? new Date(req.query.to as string) : new Date();
  const revenue=invoices.filter(i=>i.status==="paid"&&new Date(i.createdAt)>=from&&new Date(i.createdAt)<=to).reduce((s,i)=>s+calcTotals(i.items).grandTotal,0);
  const exp=expenses.filter(e=>new Date(e.date)>=from&&new Date(e.date)<=to).reduce((s,e)=>s+e.amount,0);
  res.json({ period:{from:from.toISOString().split("T")[0],to:to.toISOString().split("T")[0]}, revenue, expenses:exp, netProfit:revenue-exp, profitMargin:revenue>0?((revenue-exp)/revenue*100).toFixed(2)+"%" :"0%" });
});
router.get("/convert", (req,res) => {
  const { amount,from,to } = req.query as Record<string,string>;
  if(!amount||!from||!to) return res.status(400).json({error:"Provide amount, from, to"});
  const r=RATES[to.toUpperCase()]/RATES[from.toUpperCase()];
  res.json({ from:from.toUpperCase(), to:to.toUpperCase(), originalAmount:parseFloat(amount), convertedAmount:parseFloat((parseFloat(amount)*r).toFixed(2)), rate:r });
});
export default router;
