import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LoginForm } from "./components/LoginForm";
import { Dashboard } from "./components/Dashboard";
import { LoadingScreen } from "./components/LoadingScreen";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import { Toaster } from "./components/ui/sonner";
import { Shield, Award } from "lucide-react";
import logo from "./assets/logo.png";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(true);

  useEffect(() => {
    // Check both session and local storage
    const sessionData = sessionStorage.getItem('currentUser');
    const localData = localStorage.getItem('currentUser');

    if (sessionData || localData) {
      setIsLoggedIn(true);

      // If found in local but not session, migrate it to session
      if (localData && !sessionData) {
        sessionStorage.setItem('currentUser', localData);
      }
    }
    setIsLoggingIn(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggingIn(true);
    // Simulate login process
    setTimeout(() => {
      setIsLoggedIn(true);
      setIsLoggingIn(false);
    }, 2000);
  };

  // Show loading during login
  if (isLoggingIn) {
    return <LoadingScreen message="กำลังเข้าสู่ระบบ..." />;
  }

  // If user is logged in, show dashboard
  if (isLoggedIn) {
    return (
      <>
        <Dashboard onLogout={() => setIsLoggedIn(false)} />
        <Toaster />
      </>
    );
  }

  // Otherwise show login/register page
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#002b38]">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1700142360825-d21edc53c8db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBjbGluaWMlMjBsdXh1cnklMjBzcGF8ZW58MXx8fHwxNzY0NzMxNTI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Apichai"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#002b38]/95 via-[#002b38]/90 to-[#c5a059]/30" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-5 mb-4 group cursor-default">
              <div className="relative">
                {/* Logo Glow */}
                <div className="absolute inset-0 bg-[#c5a059] opacity-25 blur-xl rounded-full group-hover:opacity-40 transition-opacity" />

                <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(197,160,89,0.3)] bg-gradient-to-br from-white/10 to-transparent p-2 border border-white/20 flex items-center justify-center">
                  <img src={logo} alt="Apichai Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              <div>
                <h1 className="text-4xl tracking-tighter font-bold text-white flex flex-col">
                  <span className="text-[#c5a059]">APICHAI</span>
                  <span className="text-sm font-light tracking-[0.4em] opacity-60 -mt-1 uppercase">Clinic</span>
                </h1>
                <div className="h-1 w-16 bg-gradient-to-r from-[#c5a059] to-transparent mt-2 rounded-full" />
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-4xl mb-4 leading-tight">
                ยินดีต้อนรับสู่
                <br />
                <span className="text-[#c5a059]">
                  ระบบจัดการ
                </span>
              </h2>
              <p className="text-white/80 text-lg">
                ปลอดภัย ทันสมัย และพร้อมดูแลคุณในทุกขั้นตอน
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#c5a059]" />
                </div>
                <div>
                  <h3 className="mb-1">ระบบรักษาความปลอดภัย</h3>
                  <p className="text-white/70 text-sm">
                    ข้อมูลของคุณได้รับการปกป้องด้วยมาตรฐานสูงสุด
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-[#c5a059]" />
                </div>
                <div>
                  <h3 className="mb-1">บริการมืออาชีพ</h3>
                  <p className="text-white/70 text-sm">
                    ทีมงานผู้เชี่ยวชาญพร้อมให้คำปรึกษาและดูแลคุณ
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 p-2">
                  <img src={logo} alt="Apichai Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="mb-1">เทคโนโลยีล้ำสมัย</h3>
                  <p className="text-white/70 text-sm">
                    อุปกรณ์และเทคนิคการรักษาที่ทันสมัยที่สุด
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-white/50 text-sm">
            © 2025 Apichai. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#002b38] border-2 border-white flex items-center justify-center p-1">
              <img src={logo} alt="Apichai Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl text-[#002b38] font-semibold">
                Apichai
              </h1>
              <p className="text-[#c5a059] text-sm">
                ความงามที่เหนือระดับ
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl text-[#002b38] mb-2">
              เข้าสู่ระบบ
            </h2>
            <p className="text-muted-foreground">
              ยินดีต้อนรับกลับมา! กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
            </p>
          </div>

          {/* Login Form */}
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    </div>
  );
}