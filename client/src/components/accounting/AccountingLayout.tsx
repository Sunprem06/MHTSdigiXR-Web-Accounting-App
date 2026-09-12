import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, FileText, BarChart3, Users, Settings, LogOut,
  ChevronDown, ChevronRight, ShoppingCart, Package, CreditCard, Receipt,
  BookMarked, ArrowLeftRight, ClipboardList, TrendingUp, PieChart, Scale,
  Shield, Menu, X, UserCheck, Boxes, FileSpreadsheet, Wallet, IndianRupee, KeyRound,
  Briefcase, Globe, Mail, PenLine, HelpCircle, MessageSquare, Activity, FolderOpen,
  Layers, DollarSign, Lock, Eye, EyeOff, Loader2, AlertTriangle, Fingerprint,
  Banknote, GraduationCap
} from "lucide-react";
import { ROLE_LABELS } from "@shared/schema";
import type { Permission } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AccountingLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path?: string;
  icon: any;
  requiredPermission?: Permission;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/accounting", icon: LayoutDashboard, requiredPermission: "dashboard.view" },
  { label: "Ledger Accounts", path: "/accounting/ledgers", icon: BookOpen, requiredPermission: "ledgers.view" },
  { label: "Parties", path: "/accounting/parties", icon: UserCheck, requiredPermission: "parties.view" },
  { label: "Products", path: "/accounting/products", icon: Boxes, requiredPermission: "products.view" },
  { label: "Quotations", path: "/accounting/quotations", icon: FileSpreadsheet, requiredPermission: "quotations.view" },
  { label: "Invoices", path: "/accounting/invoices", icon: Receipt, requiredPermission: "invoices.view" },
  {
    label: "Vouchers", icon: FileText, requiredPermission: "vouchers.view",
    children: [
      { label: "All Vouchers", path: "/accounting/vouchers", icon: FileText },
      { label: "Sales", path: "/accounting/vouchers/new?type=sales", icon: ShoppingCart },
      { label: "Purchase", path: "/accounting/vouchers/new?type=purchase", icon: Package },
      { label: "Payment", path: "/accounting/vouchers/new?type=payment", icon: CreditCard },
      { label: "Receipt", path: "/accounting/vouchers/new?type=receipt", icon: Receipt },
      { label: "Journal", path: "/accounting/vouchers/new?type=journal", icon: BookMarked },
      { label: "Contra", path: "/accounting/vouchers/new?type=contra", icon: ArrowLeftRight },
      { label: "Credit Note", path: "/accounting/vouchers/new?type=credit_note", icon: FileText },
      { label: "Debit Note", path: "/accounting/vouchers/new?type=debit_note", icon: FileText },
    ],
  },
  { label: "Expenses", path: "/accounting/expenses", icon: Wallet, requiredPermission: "expenses.view" },
  {
    label: "Reports", icon: BarChart3, requiredPermission: "reports.view",
    children: [
      { label: "Day Book", path: "/accounting/reports/day-book", icon: ClipboardList },
      { label: "Trial Balance", path: "/accounting/reports/trial-balance", icon: Scale },
      { label: "Profit & Loss", path: "/accounting/reports/profit-loss", icon: TrendingUp },
      { label: "Balance Sheet", path: "/accounting/reports/balance-sheet", icon: PieChart },
      { label: "GST Summary", path: "/accounting/reports/gst-summary", icon: IndianRupee },
    ],
  },
  {
    // Combines every HR-related area — recruitment, staff accounts/roles, and
    // payroll — into one group instead of scattering them as separate top-level
    // tabs. No top-level requiredPermission here on purpose: visibility is
    // per-child below, so the group only shows if at least one HR area is
    // actually visible to this user (see filteredItems below).
    label: "HR", icon: Users,
    children: [
      { label: "Job Postings", path: "/accounting/job-postings", icon: Briefcase, requiredPermission: "jobs.view" },
      { label: "Applications", path: "/accounting/job-applications", icon: UserCheck, requiredPermission: "jobs.view" },
      { label: "Employees", path: "/accounting/employees", icon: Users, requiredPermission: "employees.manage" },
      { label: "Roles", path: "/accounting/roles", icon: KeyRound, requiredPermission: "roles.view" },
      { label: "Tutors", path: "/accounting/payroll/tutors", icon: GraduationCap, requiredPermission: "payroll_tutors.view" },
      { label: "Tutor Agreements", path: "/accounting/payroll/tutor-agreements", icon: FileText, requiredPermission: "payroll_tutors.view" },
      { label: "Tutor Payslips", path: "/accounting/payroll/tutor-payslips", icon: Receipt, requiredPermission: "payroll_tutors.view" },
      { label: "Employees (Payroll)", path: "/accounting/payroll/employees", icon: Banknote, requiredPermission: "payroll_employees.view" },
      { label: "Compensation", path: "/accounting/payroll/compensation", icon: IndianRupee, requiredPermission: "payroll_employees.view" },
      { label: "Payroll Payslips", path: "/accounting/payroll/payslips", icon: Receipt, requiredPermission: "payroll_employees.view" },
    ],
  },
  { label: "My Payslips", path: "/accounting/payroll/my-payslips", icon: Receipt, requiredPermission: "payroll_tutors.view_own" },
  { label: "My Salary Slips", path: "/accounting/payroll/my-payroll-payslips", icon: Receipt, requiredPermission: "payroll_employees.view_own" },
  { label: "Contact Inbox", path: "/accounting/contact-inbox", icon: Mail, requiredPermission: "contacts.view" },
  { label: "Audit Log", path: "/accounting/audit-log", icon: Shield, requiredPermission: "audit.view" },
  { label: "ERP Licenses", path: "/accounting/erp-licenses", icon: Fingerprint, requiredPermission: "erp_licenses.view" },
  {
    // Website CMS (public-site content editing) lives inside Settings rather
    // than as its own top-level tab — it's a settings/configuration concern,
    // not something that should be visible as a standalone nav item.
    label: "Settings", icon: Settings,
    children: [
      { label: "General Settings", path: "/accounting/settings", icon: Settings, requiredPermission: "settings.view" },
      {
        label: "Website CMS", icon: Globe, requiredPermission: "content.view",
        children: [
          { label: "Services", path: "/accounting/services-management", icon: Layers },
          { label: "Pricing Plans", path: "/accounting/pricing-plans", icon: DollarSign },
          { label: "Blog Posts", path: "/accounting/blog-posts", icon: PenLine },
          { label: "Case Studies", path: "/accounting/case-studies", icon: FolderOpen },
          { label: "FAQs", path: "/accounting/faqs", icon: HelpCircle },
          { label: "Testimonials", path: "/accounting/testimonials", icon: MessageSquare },
          { label: "Site Stats", path: "/accounting/site-stats", icon: Activity },
        ],
      },
    ],
  },
];

export function AccountingLayout({ children }: AccountingLayoutProps) {
  const { user, logout, hasPermission, passwordExpiryDays } = useAuth();
  const [location] = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { toast } = useToast();

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    },
    onError: (error: Error) => {
      const msg = error.message.includes(": ") ? error.message.split(": ").slice(1).join(": ") : error.message;
      try {
        const parsed = JSON.parse(msg);
        setPasswordError(parsed.message || "Failed to change password");
      } catch {
        setPasswordError(msg || "Failed to change password");
      }
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/accounting/contact-messages/unread-count"],
    enabled: hasPermission("contacts.view"),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/accounting/login";
  };

  // Recursive: a group (has children) is visible only if its own permission (if any)
  // passes AND at least one of its children survives the same filtering — applied at
  // every nesting level, so an empty sub-group (e.g. Website CMS with none of its
  // pages visible) drops out without leaving a dangling empty header.
  const filterNavItem = (item: NavItem): NavItem | null => {
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return null;
    if (!item.children) return item;
    const visibleChildren = item.children
      .map(filterNavItem)
      .filter((child): child is NavItem => child !== null);
    if (visibleChildren.length === 0) return null;
    return { ...item, children: visibleChildren };
  };

  const filteredItems = navItems
    .map(filterNavItem)
    .filter((item): item is NavItem => item !== null);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/accounting") return location === "/accounting";
    const [pathBase, pathQuery] = path.split("?");
    if (pathQuery) {
      if (location !== pathBase) return false;
      const currentParams = new URLSearchParams(window.location.search);
      const targetParams = new URLSearchParams(pathQuery);
      for (const [key, value] of targetParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    }
    if (location === pathBase) return true;
    if (location.startsWith(pathBase + "/") && !window.location.search) return true;
    return false;
  };

  // Recursive so a group can itself contain a sub-group (e.g. Settings > Website
  // CMS > Services) at arbitrary depth, each level with its own expand/collapse
  // state (keyed by label — toggleMenu/expandedMenus are shared across all levels).
  const renderNavItem = (item: NavItem, depth: number): React.ReactNode => (
    <div key={item.label}>
      {item.children ? (
        <>
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="flex items-center gap-3">
              <item.icon className="w-4 h-4" />
              {item.label}
            </span>
            {expandedMenus.includes(item.label) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expandedMenus.includes(item.label) && (
            <div className="ml-4 space-y-1 mt-1">
              {item.children.map(child => renderNavItem(child, depth + 1))}
            </div>
          )}
        </>
      ) : (
        <Link href={item.path!}>
          <div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              isActive(item.path)
                ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            onClick={() => setSidebarOpen(false)}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
            {item.label === "Contact Inbox" && unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center" data-testid="badge-unread-count">{unreadCount}</span>
            )}
          </div>
        </Link>
      )}
    </div>
  );

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="font-bold text-lg text-slate-900 dark:text-white">MHTSdigiXR</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Accounting System</p>
      </div>

      <div className="p-3 mx-3 mt-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800" data-testid="user-profile-badge">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-sky-600 dark:text-sky-400">{ROLE_LABELS[user?.role || ""] || user?.role}</p>
          </div>
          <button
            onClick={() => setChangePasswordOpen(true)}
            className="p-1.5 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-100 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-sky-900/30 transition-colors"
            title="Change Password"
            data-testid="button-change-password"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredItems.map(item => renderNavItem(item, 0))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
        <a
          href="/"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          data-testid="link-visit-website"
        >
          <Globe className="w-4 h-4" />
          Visit Website
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
          {sidebar}
        </aside>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-xl">
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="lg:hidden flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-600 dark:text-slate-300" data-testid="button-mobile-menu">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-slate-900 dark:text-white">MHTSdigiXR Accounting</h1>
          </header>
          {!bannerDismissed && passwordExpiryDays !== null && passwordExpiryDays <= 7 && passwordExpiryDays > 0 && (
            <div className="mx-4 md:mx-6 mt-4 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm" data-testid="password-expiry-banner">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">
                Your password expires in {passwordExpiryDays} {passwordExpiryDays === 1 ? "day" : "days"}. Please{" "}
                <Link href="/accounting/settings" className="underline font-medium" data-testid="link-change-password">change your password</Link>{" "}
                soon.
              </span>
              <button onClick={() => setBannerDismissed(true)} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200" data-testid="button-dismiss-banner">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        setChangePasswordOpen(open);
        if (!open) {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError("");
          setShowCurrentPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }
      }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-change-password">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  data-testid="button-toggle-current-password"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {passwordError && (
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="text-password-error">{passwordError}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={changePasswordMutation.isPending}
              data-testid="button-submit-change-password"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
