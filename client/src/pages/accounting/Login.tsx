import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, AlertCircle, ShieldCheck } from "lucide-react";

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = [
    { symbol: "+", answer: a + b },
    { symbol: "-", answer: a > b ? a - b : b - a },
    { symbol: "×", answer: (Math.floor(Math.random() * 9) + 2) * (Math.floor(Math.random() * 9) + 2) },
  ];
  const op = ops[Math.floor(Math.random() * ops.length)];
  if (op.symbol === "×") {
    const x = Math.floor(Math.random() * 9) + 2;
    const y = Math.floor(Math.random() * 9) + 2;
    return { question: `${x} × ${y}`, answer: x * y };
  }
  if (op.symbol === "-" && a < b) {
    return { question: `${b} - ${a}`, answer: b - a };
  }
  return { question: `${a} ${op.symbol} ${b}`, answer: op.answer };
}

export default function AccountingLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
    setCaptchaError(false);
  }, []);

  if (isAuthenticated) {
    setLocation("/accounting");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaptchaError(false);

    const userAnswer = parseInt(captchaAnswer);
    if (isNaN(userAnswer) || userAnswer !== captcha.answer) {
      setCaptchaError(true);
      refreshCaptcha();
      return;
    }

    try {
      const data = await login({ username, password });
      if (data?.passwordExpired && data?.challengeToken) {
        setLocation(`/accounting/force-change-password?token=${encodeURIComponent(data.challengeToken)}`);
        return;
      }
      setLocation("/accounting");
    } catch {
      refreshCaptcha();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-sky-100 dark:border-slate-800" data-testid="login-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-sky-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">MHTSdigiXR Accounting</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Sign in with your employee credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm" data-testid="login-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError.message.includes(":") ? loginError.message.split(":").pop()?.trim() : "Invalid username or password"}</span>
              </div>
            )}
            {captchaError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm" data-testid="captcha-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Incorrect captcha answer. Please try again.</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 focus:ring-sky-500 focus:border-sky-500"
                  required
                  data-testid="input-username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 focus:ring-sky-500 focus:border-sky-500"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="captcha" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-500" />
                Security Check
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 select-none" data-testid="captcha-question">
                  <span className="font-mono font-bold text-lg text-slate-800 dark:text-slate-200 tracking-wider">
                    {captcha.question} = ?
                  </span>
                </div>
                <Input
                  id="captcha"
                  type="text"
                  inputMode="numeric"
                  placeholder="Answer"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-24 text-center focus:ring-sky-500 focus:border-sky-500"
                  required
                  data-testid="input-captcha"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="text-sky-500 hover:text-sky-600 text-sm font-medium whitespace-nowrap"
                  data-testid="button-refresh-captcha"
                >
                  New question
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
              data-testid="button-login"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center space-y-2">
              <div>
                <a
                  href="/accounting/forgot-password"
                  className="text-sm text-sky-500 hover:text-sky-600 hover:underline"
                  data-testid="link-forgot-password"
                >
                  Forgot Password?
                </a>
              </div>
              <div>
                <a
                  href="/"
                  className="text-sm text-sky-500 hover:text-sky-600 hover:underline"
                  data-testid="link-back-to-website"
                >
                  ← Back to Website
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
