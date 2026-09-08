import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, AlertCircle, KeyRound, CheckCircle } from "lucide-react";

export default function ForceChangePassword() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const challengeToken = params.get("token") || "";

  if (isAuthenticated) {
    return <Redirect to="/accounting" />;
  }

  if (!challengeToken) {
    return <Redirect to="/accounting/login" />;
  }

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");

    if (newPassword.length < 6) {
      setChangeError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("Passwords do not match");
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch("/api/auth/force-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken,
          newPassword,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setChangeError(data.message || "Failed to change password");
        return;
      }
      setChangeSuccess(true);
    } catch (err: unknown) {
      setChangeError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsChanging(false);
    }
  };

  if (changeSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md shadow-xl border-sky-100 dark:border-slate-800" data-testid="password-changed-card">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Password Changed</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Your password has been updated successfully. Please sign in with your new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation("/accounting/login")}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
              data-testid="button-back-to-login"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-sky-100 dark:border-slate-800" data-testid="force-change-password-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Password Expired</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Your password has expired. Please set a new password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForceChangePassword} className="space-y-4">
            {changeError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm" data-testid="change-password-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{changeError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <PasswordInput
                  id="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 focus:ring-sky-500 focus:border-sky-500"
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 focus:ring-sky-500 focus:border-sky-500"
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isChanging}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
              data-testid="button-change-password"
            >
              {isChanging ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
