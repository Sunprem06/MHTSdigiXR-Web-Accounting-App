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
import AutomationSuite from "@/pages/AutomationSuite";
import FAQ from "@/pages/FAQ";
import Careers from "@/pages/Careers";
import Workflow from "@/pages/Workflow";
import CaseStudies from "@/pages/CaseStudies";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import LegalPage from "@/pages/LegalPage";
import NotFound from "@/pages/not-found";

import AccountingLogin from "@/pages/accounting/Login";
import ForgotPassword from "@/pages/accounting/ForgotPassword";
import ResetPassword from "@/pages/accounting/ResetPassword";
import ForceChangePassword from "@/pages/accounting/ForceChangePassword";
import AccountingDashboard from "@/pages/accounting/Dashboard";
import Ledgers from "@/pages/accounting/Ledgers";
import VoucherList from "@/pages/accounting/VoucherList";
import VoucherEntry from "@/pages/accounting/VoucherEntry";
import VoucherView from "@/pages/accounting/VoucherView";
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
import ErpLicenses from "@/pages/accounting/ErpLicenses";
import JobPostings from "@/pages/accounting/JobPostings";
import JobApplicationsPage from "@/pages/accounting/JobApplications";
import ContactInbox from "@/pages/accounting/ContactInbox";
import BlogPosts from "@/pages/accounting/BlogPosts";
import CaseStudiesManagement from "@/pages/accounting/CaseStudiesManagement";
import FAQManagement from "@/pages/accounting/FAQManagement";
import TestimonialsManagement from "@/pages/accounting/TestimonialsManagement";
import SiteStatsManagement from "@/pages/accounting/SiteStatsManagement";
import ServicesManagement from "@/pages/accounting/ServicesManagement";
import PricingPlansManagement from "@/pages/accounting/PricingPlansManagement";
import Tutors from "@/pages/accounting/payroll/Tutors";
import TutorAgreements from "@/pages/accounting/payroll/TutorAgreements";
import TutorAgreementView from "@/pages/accounting/payroll/TutorAgreementView";
import TutorPayslips from "@/pages/accounting/payroll/TutorPayslips";
import TutorPayslipEntry from "@/pages/accounting/payroll/TutorPayslipEntry";
import TutorPayslipView from "@/pages/accounting/payroll/TutorPayslipView";
import PayrollEmployees from "@/pages/accounting/payroll/PayrollEmployees";
import MyPayslips from "@/pages/accounting/payroll/MyPayslips";
import MyLeave from "@/pages/accounting/leave/MyLeave";
import LeaveApprovals from "@/pages/accounting/leave/LeaveApprovals";
import LeaveTypes from "@/pages/accounting/leave/LeaveTypes";

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
            <Route path="/services/automation-suite" component={AutomationSuite} />
            <Route path="/services/:slug" component={ServiceDetail} />
            <Route path="/faq" component={FAQ} />
            <Route path="/careers" component={Careers} />
            <Route path="/workflow" component={Workflow} />
            <Route path="/case-studies" component={CaseStudies} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:slug" component={BlogPost} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/privacy-policy" component={LegalPage} />
            <Route path="/terms-of-service" component={LegalPage} />
            <Route path="/refund-policy" component={LegalPage} />
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
      <Route path="/accounting/force-change-password" component={ForceChangePassword} />
      <Route path="/accounting/forgot-password" component={ForgotPassword} />
      <Route path="/accounting/reset-password" component={ResetPassword} />
      <Route path="/accounting">
        {() => <ProtectedRoute requiredPermission="dashboard.view"><AccountingDashboard /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/ledgers">
        {() => <ProtectedRoute requiredPermission="ledgers.view"><Ledgers /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/parties">
        {() => <ProtectedRoute requiredPermission="parties.view"><Parties /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/products">
        {() => <ProtectedRoute requiredPermission="products.view"><Products /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/vouchers">
        {() => <ProtectedRoute requiredPermission="vouchers.view"><VoucherList /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/vouchers/new">
        {() => <ProtectedRoute requiredPermission="vouchers.create"><VoucherEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/vouchers/:id">
        {() => <ProtectedRoute requiredPermission="vouchers.view"><VoucherView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations">
        {() => <ProtectedRoute requiredPermission="quotations.view"><Quotations /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations/new">
        {() => <ProtectedRoute requiredPermission="quotations.create"><QuotationEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations/:id/edit">
        {() => <ProtectedRoute requiredPermission="quotations.edit"><QuotationEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/quotations/:id/view">
        {() => <ProtectedRoute requiredPermission="quotations.view"><QuotationView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/invoices">
        {() => <ProtectedRoute requiredPermission="invoices.view"><Invoices /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/invoices/new">
        {() => <ProtectedRoute requiredPermission="invoices.create"><InvoiceEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/expenses">
        {() => <ProtectedRoute requiredPermission="expenses.view"><Expenses /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/invoice/:id">
        {() => <ProtectedRoute requiredPermission="invoices.view"><InvoiceView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/receipt/:id">
        {() => <ProtectedRoute requiredPermission="vouchers.view"><ReceiptView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/day-book">
        {() => <ProtectedRoute requiredPermission="reports.view"><DayBook /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/trial-balance">
        {() => <ProtectedRoute requiredPermission="reports.view"><TrialBalance /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/profit-loss">
        {() => <ProtectedRoute requiredPermission="reports.view"><ProfitLoss /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/balance-sheet">
        {() => <ProtectedRoute requiredPermission="reports.view"><BalanceSheet /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/reports/gst-summary">
        {() => <ProtectedRoute requiredPermission="reports.view"><GstSummary /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/employees">
        {() => <ProtectedRoute requiredPermission="employees.manage"><EmployeeManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/roles">
        {() => <ProtectedRoute requiredPermission="roles.view"><RolesPage /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/erp-licenses">
        {() => <ProtectedRoute requiredPermission="erp_licenses.view"><ErpLicenses /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/job-postings">
        {() => <ProtectedRoute requiredPermission="jobs.view"><JobPostings /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/job-applications">
        {() => <ProtectedRoute requiredPermission="jobs.view"><JobApplicationsPage /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutors">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view"><Tutors /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutor-agreements/:id/view">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view"><TutorAgreementView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutor-agreements">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view"><TutorAgreements /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutor-payslips/new">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.process"><TutorPayslipEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutor-payslips/:id/edit">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.process"><TutorPayslipEntry /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutor-payslips/:id/view">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view"><TutorPayslipView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/tutor-payslips">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view"><TutorPayslips /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/employees">
        {() => <ProtectedRoute requiredPermission="payroll_employees.view"><PayrollEmployees /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/my-payslips/:id">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view_own"><TutorPayslipView /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/payroll/my-payslips">
        {() => <ProtectedRoute requiredPermission="payroll_tutors.view_own"><MyPayslips /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/leave/my-leave">
        {() => <ProtectedRoute requiredPermission="leave.view_own"><MyLeave /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/leave/approvals">
        {() => <ProtectedRoute requiredPermission="leave.view_own"><LeaveApprovals /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/leave/leave-types">
        {() => <ProtectedRoute requiredPermission="leave.manage"><LeaveTypes /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/contact-inbox">
        {() => <ProtectedRoute requiredPermission="contacts.view"><ContactInbox /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/blog-posts">
        {() => <ProtectedRoute requiredPermission="content.view"><BlogPosts /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/case-studies">
        {() => <ProtectedRoute requiredPermission="content.view"><CaseStudiesManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/faqs">
        {() => <ProtectedRoute requiredPermission="content.view"><FAQManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/testimonials">
        {() => <ProtectedRoute requiredPermission="content.view"><TestimonialsManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/site-stats">
        {() => <ProtectedRoute requiredPermission="content.view"><SiteStatsManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/services-management">
        {() => <ProtectedRoute requiredPermission="content.view"><ServicesManagement /></ProtectedRoute>}
      </Route>
      <Route path="/accounting/pricing-plans">
        {() => <ProtectedRoute requiredPermission="content.view"><PricingPlansManagement /></ProtectedRoute>}
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
