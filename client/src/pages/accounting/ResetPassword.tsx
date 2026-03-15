import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function getToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = getToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => setLocation("/accounting/login"), 3000);
      }
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="font-semibold text-slate-900 dark:text-white">Invalid Reset Link</p>
            <p className="text-sm text-slate-500">This reset link is missing or malformed.</p>
            <Link href="/accounting/login">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white rounded-full" data-testid="button-back-login-invalid">
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-sky-500" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Set New Password
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Password updated successfully</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Redirecting you to login...
              </p>
              <Link href="/accounting/login">
                <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full" data-testid="button-go-login">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="focus:ring-sky-500 focus:border-sky-500"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm" className="text-slate-700 dark:text-slate-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat the password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="focus:ring-sky-500 focus:border-sky-500"
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
                data-testid="button-reset-submit"
              >
                {loading ? "Saving..." : "Set New Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
