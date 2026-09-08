import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLocation("/accounting/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, setLocation]);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setTokenError("Invalid reset link — no token provided");
      return;
    }

    fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenError(data.message || "Invalid or expired reset link");
        }
      })
      .catch(() => {
        setTokenError("Failed to validate reset link");
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [token]);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      setLocation("/accounting/login");
    }
  }, [success, countdown, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-sky-100 dark:border-slate-800" data-testid="reset-password-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-sky-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Reset Password</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isValidating ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-validation">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : tokenError ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400" data-testid="token-error">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{tokenError}</span>
              </div>
              <Link href="/accounting/forgot-password">
                <Button variant="outline" className="w-full" data-testid="link-request-new">
                  Request a New Reset Link
                </Button>
              </Link>
              <Link href="/accounting/login">
                <Button variant="ghost" className="w-full text-sky-500" data-testid="link-back-to-login">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400" data-testid="success-message">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Your password has been reset successfully. Redirecting to login in {countdown}s...</span>
              </div>
              <p className="text-sm text-center text-slate-500 dark:text-slate-400">
                Redirecting you to login in {countdown} seconds...
              </p>
              <Link href="/accounting/login">
                <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full" data-testid="link-go-to-login">
                  Go to Login Now
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm" data-testid="error-message">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <PasswordInput
                    id="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 focus:ring-sky-500 focus:border-sky-500"
                    required
                    minLength={6}
                    data-testid="input-password"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <PasswordInput
                    id="confirm-password"
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
                disabled={isSubmitting}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
                data-testid="button-reset-password"
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

