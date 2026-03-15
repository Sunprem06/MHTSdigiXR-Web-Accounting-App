import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/smtp-configured")
      .then((res) => res.json())
      .then((data) => setSmtpConfigured(data.configured))
      .catch(() => setSmtpConfigured(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to process request");
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
      <Card className="w-full max-w-md shadow-xl border-sky-100 dark:border-slate-800" data-testid="forgot-password-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-2">
            <Mail className="w-8 h-8 text-sky-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Forgot Password</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400" data-testid="success-message">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>If an account with that email exists, a password reset link has been sent. Please check your inbox.</span>
              </div>
              <Link href="/accounting/login">
                <Button variant="outline" className="w-full" data-testid="link-back-to-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {smtpConfigured === false && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-sm" data-testid="smtp-not-configured">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Password reset is not configured — contact your administrator.</span>
                </div>
              )}
              {smtpConfigured !== false && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm" data-testid="error-message">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 focus:ring-sky-500 focus:border-sky-500"
                        required
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting || smtpConfigured === null}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
                    data-testid="button-send-reset"
                  >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              )}
              <Link href="/accounting/login">
                <Button variant="ghost" className="w-full text-sky-500 hover:text-sky-600" data-testid="link-back-to-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
