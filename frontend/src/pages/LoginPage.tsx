import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123456");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: "admin" | "operator") => {
    if (role === "admin") {
      setUsername("admin");
      setPassword("Admin@123456");
    } else {
      setUsername("operator");
      setPassword("Operator@123456");
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative selection:bg-primary selection:text-primary-foreground">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Database className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">主数据管理平台</h1>
            <p className="text-xs text-muted-foreground">一数一源 ｜ 多渠道归集 ｜ 统一供数出口</p>
          </div>
        </div>

        {/* shadcn Card Container */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-medium">账号登录</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              请输入系统凭据访问主数据核心服务
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-foreground">
                  账号名称
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  登录密码
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-9 text-xs font-medium shadow-xs"
              >
                {loading ? (
                  <span className="inline-block animate-spin mr-2">⏳</span>
                ) : (
                  <>
                    <span>登录系统</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  预置体验账号（点击快速填入）：
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("admin")}
                  className="h-auto py-2 px-2.5 flex flex-col items-start justify-center border-border hover:bg-muted text-left"
                >
                  <span className="font-medium text-foreground text-xs">管理员 (Admin)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">全权管理与审批</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFill("operator")}
                  className="h-auto py-2 px-2.5 flex flex-col items-start justify-center border-border hover:bg-muted text-left"
                >
                  <span className="font-medium text-foreground text-xs">运营 (Operator)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">货品维护与查询</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted-foreground">
          企业级主数据平台 &bull; 生产环境安全合规运行中
        </p>
      </div>
    </div>
  );
};

