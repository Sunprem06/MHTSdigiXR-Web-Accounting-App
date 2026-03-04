import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, User, AlertCircle } from "lucide-react";

export default function AccountingLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/accounting");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      setLocation("/accounting");
    } catch (err) {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-sky-100 dark:border-slate-800" data-testid="login-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-sky-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">MHTSdigiX Accounting</CardTitle>
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
            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-full"
              data-testid="button-login"
            >
              {isLoggingIn ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
