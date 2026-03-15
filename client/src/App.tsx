import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingActions } from "@/components/widgets/FloatingActions";
import { ProtectedRoute } from "@/components/accounting/ProtectedRoute";
import logoImage from "@assets/MHTSdigiXR_logo_1080x1080_1773540695277.jpg";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

import Home from "@/pages/Home";
import Services from "@/pages/Services";
import ServiceDetail from "@/pages/ServiceDetail";
import FAQ from "@/pages/FAQ";
import Careers from "@/pages/Careers";
import Workflow from "@/pages/Workflow";
import CaseStudies from "@/pages/CaseStudies";
import Blog from "@/pages/Blog";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/not-found";

import AccountingLogin from "@/pages/accounting/Login";
import AccountingDashboard from "@/pages/accounting/Dashboard";
import Ledgers from "@/pages/accounting/Ledgers";
import VoucherList from "@/pages/accounting/VoucherList";
import VoucherEntry from "@/pages/accounting/VoucherEntry";
import Products from "@/pages/accounting/Products";
import Parties from "@/pages/accounting/Parties";
import Quotations from "@/pages/accounting/Quotations";
import QuotationEntry from "@/pages/accounting/QuotationEntry";
import QuotationView from "@/pages/accounting/QuotationView";
import Invoices from "@/pages/accounting/Invoices";
import InvoiceEntry from "@/pages/accounting/InvoiceEntry";
import Expenses from "@/pages/accounting/Expenses";
import InvoiceView from "@/pages/accounting/InvoiceView";
import ReceiptView from "@/pages/accounting/ReceiptView";
import DayBook from "@/pages/accounting/reports/DayBook";
import TrialBalance from "@/pages/accounting/reports/TrialBalance";
import ProfitLoss from "@/pages/accounting/reports/ProfitLoss";
import BalanceSheet from "@/pages/accounting/reports/BalanceSheet";
import GstSummary from "@/pages/accounting/reports/GstSummary";
import EmployeeManagement from "@/pages/accounting/EmployeeManagement";
import AuditLogPage from "@/pages/accounting/AuditLog";
import SettingsPage from "@/pages/accounting/Settings";
import RolesPage from "@/pages/accounting/Roles";

function WebsiteRouter() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 relative">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-25 dark:opacity-10"
        style={{
          backgroundImage: `url(${logoImage})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '40%',
        }}
      />
      <div className="relative z-10 flex flex-col min-h-screen">
        <ScrollToTop />
        <Navbar />
        <main className="flex-grow">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/services" component={Services} />
            <Route path="/services/:slug" component={ServiceDetail} />
            <Route path="/faq" component={FAQ} />
            <Route path="/careers" component={Careers} />
            <Route path="/workflow" component={Workflow} />
            <Route path="/case-studies" component={CaseStudies} />
            <Route path="/blog" component={Blog} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
        <FloatingActions />
      </div>
    </div>
  );
}

function AccountingRouter() {
  return (
    <Switch>
      <Route path="/accounting/login" component={AccountingLogin} />
      <Route path="/accounting">
        {() => <ProtectedRoute><AccountingDashboard /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/ledgers">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><Ledgers /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/parties">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><Parties /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/products">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><Products /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/vouchers">
        {() => <ProtectedRoute><VoucherList /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/vouchers/new">
        {() => <ProtectedRoute roles={["super_admin", "admin", "senior_accountant", "accountant", "data_entry"]}><VoucherEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><Quotations /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations/new">
        {() => <ProtectedRoute roles={["super_admin", "admin", "senior_accountant", "accountant"]}><QuotationEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations/:id/edit">
        {() => <ProtectedRoute roles={["super_admin", "admin"]}><QuotationEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations/:id/view">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><QuotationView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/invoices">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><Invoices /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/invoices/new">
        {() => <ProtectedRoute roles={["super_admin", "admin", "senior_accountant", "accountant"]}><InvoiceEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/expenses">
        {() => <ProtectedRoute><Expenses /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/invoice/:id">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><InvoiceView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/receipt/:id">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><ReceiptView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/day-book">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><DayBook /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/trial-balance">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><TrialBalance /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/profit-loss">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><ProfitLoss /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/balance-sheet">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><BalanceSheet /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/gst-summary">
        {() => <ProtectedRoute roles={["super_admin", "admin", "auditor", "senior_accountant", "accountant"]}><GstSummary /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/employees">
        {() => <ProtectedRoute requiredPermission="employees.manage"><EmployeeManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/roles">
        {() => <ProtectedRoute requiredPermission="roles.view"><RolesPage /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/audit-log">
        {() => <ProtectedRoute requiredPermission="audit.view"><AuditLogPage /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/settings">
        {() => <ProtectedRoute requiredPermission="settings.view"><SettingsPage /></ProtectedRoute>}
      </Route>
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();

  if (location.startsWith("/accounting")) {
    return <AccountingRouter />;
  }

  return <WebsiteRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
