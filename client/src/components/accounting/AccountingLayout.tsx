import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, FileText, BarChart3, Users, Settings, LogOut,
  ChevronDown, ChevronRight, ShoppingCart, Package, CreditCard, Receipt,
  BookMarked, ArrowLeftRight, ClipboardList, TrendingUp, PieChart, Scale,
  Shield, Menu, X, UserCheck, Boxes, FileSpreadsheet, Wallet, IndianRupee
} from "lucide-react";
import { ROLE_LABELS } from "@shared/schema";
import type { Role } from "@shared/schema";

interface AccountingLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  path?: string;
  icon: any;
  roles?: Role[];
  children?: { label: string; path: string; icon: any }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", path: "/accounting", icon: LayoutDashboard },
  {
    label: "Ledger Accounts", path: "/accounting/ledgers", icon: BookOpen,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant"],
  },
  {
    label: "Parties", path: "/accounting/parties", icon: UserCheck,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant"],
  },
  {
    label: "Products", path: "/accounting/products", icon: Boxes,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant"],
  },
  {
    label: "Invoices", path: "/accounting/invoices", icon: Receipt,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant"],
  },
  {
    label: "Vouchers", icon: FileText,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry"],
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
  {
    label: "Quotations", path: "/accounting/quotations", icon: FileSpreadsheet,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant"],
  },
  {
    label: "Expenses", path: "/accounting/expenses", icon: Wallet,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant", "data_entry"],
  },
  {
    label: "Reports", icon: BarChart3,
    roles: ["super_admin", "admin", "auditor", "senior_accountant", "accountant"],
    children: [
      { label: "Day Book", path: "/accounting/reports/day-book", icon: ClipboardList },
      { label: "Trial Balance", path: "/accounting/reports/trial-balance", icon: Scale },
      { label: "Profit & Loss", path: "/accounting/reports/profit-loss", icon: TrendingUp },
      { label: "Balance Sheet", path: "/accounting/reports/balance-sheet", icon: PieChart },
      { label: "GST Summary", path: "/accounting/reports/gst-summary", icon: IndianRupee },
    ],
  },
  {
    label: "Audit Log", path: "/accounting/audit-log", icon: Shield,
    roles: ["super_admin", "admin", "auditor"],
  },
  {
    label: "Employees", path: "/accounting/employees", icon: Users,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Settings", path: "/accounting/settings", icon: Settings,
    roles: ["super_admin"],
  },
];

export function AccountingLayout({ children }: AccountingLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Vouchers", "Reports"]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/accounting/login";
  };

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role as Role);
  });

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
    return location === pathBase || (location.startsWith(pathBase + "/") && !window.location.search);
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="font-bold text-lg text-slate-900 dark:text-white">MHTSdigiXR</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Accounting System</p>
      </div>

      <div className="p-3 mx-3 mt-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-100 dark:border-sky-800" data-testid="user-profile-badge">
        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{user?.fullName}</p>
        <p className="text-xs text-sky-600 dark:text-sky-400">{ROLE_LABELS[user?.role as Role] || user?.role}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredItems.map(item => (
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
                    {item.children.map(child => (
                      <Link key={child.path} href={child.path}>
                        <div
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                            isActive(child.path)
                              ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                          onClick={() => setSidebarOpen(false)}
                          data-testid={`nav-${child.label.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          <child.icon className="w-4 h-4" />
                          {child.label}
                        </div>
                      </Link>
                    ))}
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
                  {item.label}
                </div>
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
