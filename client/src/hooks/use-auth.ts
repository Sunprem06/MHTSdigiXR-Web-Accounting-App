import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import type { Permission } from "@shared/schema";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  permissions: Permission[];
  isActive: boolean;
  passwordChangedAt: string | null;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const perms = user?.permissions || [];

  const hasPermission = (...ps: Permission[]): boolean => {
    return ps.every(p => perms.includes(p));
  };

  const hasAnyPermission = (...ps: Permission[]): boolean => {
    return ps.some(p => perms.includes(p));
  };

  const passwordExpiryDays = (() => {
    if (!user?.passwordChangedAt) return null;
    const changedAt = new Date(user.passwordChangedAt).getTime();
    const expiresAt = changedAt + 45 * 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  })();

  const canWrite = hasAnyPermission("vouchers.create", "quotations.create", "invoices.create", "expenses.create");
  const canManageLedgers = hasPermission("ledgers.create");
  const canApprove = hasAnyPermission("vouchers.approve", "quotations.approve", "expenses.approve");
  const canDelete = hasAnyPermission("parties.delete", "products.delete", "quotations.delete");
  const canManageEmployees = hasPermission("employees.manage");
  const canViewReports = hasPermission("reports.view");
  const canPrint = hasPermission("reports.view");
  const canViewAudit = hasPermission("audit.view");
  const canManageSettings = hasPermission("settings.manage");
  const canManageRoles = hasPermission("roles.manage");

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    hasPermission,
    hasAnyPermission,
    passwordExpiryDays,
    canWrite,
    canManageLedgers,
    canApprove,
    canDelete,
    canManageEmployees,
    canViewReports,
    canPrint,
    canViewAudit,
    canManageSettings,
    canManageRoles,
  };
}
