import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import type { Role } from "@shared/schema";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

const WRITE_ROLES: Role[] = ["super_admin", "admin", "senior_accountant", "accountant", "data_entry"];
const MANAGE_LEDGER_ROLES: Role[] = ["super_admin", "admin", "senior_accountant"];
const APPROVE_ROLES: Role[] = ["super_admin", "admin", "senior_accountant"];
const DELETE_ROLES: Role[] = ["super_admin", "admin"];
const MANAGE_EMPLOYEES_ROLES: Role[] = ["super_admin", "admin"];
const VIEW_REPORTS_ROLES: Role[] = ["super_admin", "admin", "auditor", "senior_accountant", "accountant"];
const PRINT_ROLES: Role[] = ["super_admin", "admin", "auditor", "senior_accountant", "accountant"];
const VIEW_AUDIT_ROLES: Role[] = ["super_admin", "admin", "auditor"];
const SETTINGS_ROLES: Role[] = ["super_admin"];

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

  const canWrite = user ? WRITE_ROLES.includes(user.role) : false;
  const canManageLedgers = user ? MANAGE_LEDGER_ROLES.includes(user.role) : false;
  const canApprove = user ? APPROVE_ROLES.includes(user.role) : false;
  const canDelete = user ? DELETE_ROLES.includes(user.role) : false;
  const canManageEmployees = user ? MANAGE_EMPLOYEES_ROLES.includes(user.role) : false;
  const canViewReports = user ? VIEW_REPORTS_ROLES.includes(user.role) : false;
  const canPrint = user ? PRINT_ROLES.includes(user.role) : false;
  const canViewAudit = user ? VIEW_AUDIT_ROLES.includes(user.role) : false;
  const canManageSettings = user ? SETTINGS_ROLES.includes(user.role) : false;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    canWrite,
    canManageLedgers,
    canApprove,
    canDelete,
    canManageEmployees,
    canViewReports,
    canPrint,
    canViewAudit,
    canManageSettings,
  };
}
