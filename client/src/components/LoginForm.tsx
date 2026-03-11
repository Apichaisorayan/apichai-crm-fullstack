import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import { NotificationDialog } from "./NotificationDialog";
import { apiService } from "../services/api";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Notification Dialog State
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationDescription, setNotificationDescription] = useState("");
  const [notificationType, setNotificationType] = useState<"success" | "error" | "loading">("success");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Show loading notification
    setNotificationTitle("กำลังเข้าสู่ระบบ");
    setNotificationDescription("กรุณารอสักครู่...");
    setNotificationType("loading");
    setNotificationOpen(true);

    try {
      const user = await apiService.login(email, password);

      // Store user data in sessionStorage
      sessionStorage.setItem('currentUser', JSON.stringify(user));

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('userEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('userEmail');
      }

      // Show success notification
      setNotificationTitle("เข้าสู่ระบบสำเร็จ");
      setNotificationDescription(`ยินดีต้อนรับ ${user.name}`);
      setNotificationType("success");

      // Wait a bit before redirecting
      setTimeout(() => {
        setNotificationOpen(false);
        onLoginSuccess();
      }, 1500);
    } catch (err) {
      setNotificationTitle("เข้าสู่ระบบไม่สำเร็จ");
      setNotificationDescription(err instanceof Error ? err.message : "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setNotificationType("error");
      setIsLoading(false);
      return;
    }
  };

  return (
    <>
      {/* Notification Dialog */}
      <NotificationDialog
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        title={notificationTitle}
        description={notificationDescription}
        type={notificationType}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">อีเมล</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              disabled={isLoading}
            />
            <label
              htmlFor="remember"
              className="text-sm cursor-pointer select-none"
            >
              จดจำฉันไว้
            </label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#c5a059] hover:bg-[#008a8f]"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            "เข้าสู่ระบบ"
          )}
        </Button>

        {/* Helper text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>ใช้บัญชีที่ได้รับจากผู้ดูแลระบบ</p>
        </div>
      </form>
    </>
  );
}