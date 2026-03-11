import { motion, AnimatePresence } from "motion/react";
import {
  CalendarCheck,
  Shield,
  BarChart3,
  LogOut,
  User,
  Stethoscope,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  ChevronFirst
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import logo from "../assets/logo.png";

import { UserRole } from "../types/crm";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  currentUser?: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function DashboardSidebar({
  activeTab,
  onTabChange,
  onLogout,
  currentUser,
  isCollapsed,
  onToggleCollapse
}: DashboardSidebarProps) {
  const menuItems = [
    { id: "home", label: "ภาพรวมระบบ", icon: Home },
    { id: "crm", label: "จัดการลูกค้า (CRM)", icon: CalendarCheck },
    { id: "treatments", label: "จัดการผู้ใช้งาน", icon: Shield, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: "services", label: "จัดการบริการ", icon: Stethoscope, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: "reports", label: "รายงาน", icon: BarChart3, roles: [UserRole.ADMIN, UserRole.MANAGER] },
  ].filter(item => !item.roles || (currentUser?.role && item.roles.map(r => r.toUpperCase()).includes((currentUser.role as string).toUpperCase())));

  return (
    <motion.div
      initial={{ width: 288 }}
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[#002b38] text-white flex flex-col h-screen sticky top-0 z-20 overflow-hidden shadow-2xl"
    >
      {/* Header & Toggle */}
      <div className={`p-8 flex ${isCollapsed ? 'flex-col items-center gap-6' : 'flex-row items-center justify-between'} relative transition-all duration-300`}>
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`relative flex-shrink-0 ${isCollapsed ? 'w-14 h-14' : 'w-20 h-20'} transition-all duration-500`}
          >
            {/* Subtle Glow Effect */}
            <div className="absolute inset-0 bg-[#c5a059] opacity-20 blur-2xl rounded-full" />

            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-white/10 to-transparent p-1.5 flex items-center justify-center border border-white/20">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </motion.div>

          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <h1 className="text-2xl font-bold tracking-tight text-white flex flex-col">
                <span className="text-[#c5a059]">APICHAI</span>
                <span className="text-xs font-medium tracking-[0.3em] opacity-50 -mt-1">CLINIC</span>
              </h1>
              <div className="h-0.5 w-12 bg-gradient-to-r from-[#c5a059] to-transparent mt-1" />
            </motion.div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white ${isCollapsed ? 'mt-2' : ''}`}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* User Profile */}
      <div className={`p-4 border-b border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-3">
          <Avatar className={`ring-2 ring-[#c5a059] transition-all duration-300 ${isCollapsed ? 'h-10 w-10' : 'h-11 w-11'}`}>
            <AvatarImage src={currentUser?.avatar || ""} />
            <AvatarFallback className="bg-[#c5a059] text-white">
              {currentUser?.name ? currentUser.name.charAt(0) : (
                <User className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium truncate">{currentUser?.name || "ผู้ใช้งาน"}</p>
              <p className="text-[10px] text-white/50 truncate uppercase tracking-wider">{currentUser?.role || "User"}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 transition-all relative group h-12 ${isCollapsed ? "justify-center px-0" : "px-6"
                } ${isActive
                  ? "bg-[#c5a059] text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              title={isCollapsed ? item.label : ""}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#e8d8a1]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={`h-5 w-5 flex-shrink-0 transition-transform ${!isActive && 'group-hover:scale-110'}`} />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 h-10 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all ${isCollapsed ? "justify-center px-0" : "px-3"
            }`}
          title={isCollapsed ? "ออกจากระบบ" : ""}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm whitespace-nowrap">ออกจากระบบ</span>}
        </button>
      </div>
    </motion.div>
  );
}
