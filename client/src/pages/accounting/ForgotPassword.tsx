import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-sky-500" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Enter your registered email address and we'll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Reset link sent</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly. Check your inbox (and spam folder).
              </p>
              <Link href="/accounting/login">
                <Button variant="outline" className="w-full mt-2" data-testid="button-back-to-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
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
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="focus:ring-sky-500 focus:border-sky-500"
                  data-testid="input-forgot-email"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
                data-testid="button-send-reset"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Link href="/accounting/login">
                <Button variant="ghost" className="w-full text-slate-500" data-testid="button-cancel-forgot">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
