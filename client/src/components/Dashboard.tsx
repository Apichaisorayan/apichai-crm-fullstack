import { useState, useEffect } from "react";
import { DashboardSidebar } from "./DashboardSidebarAnimated";
import { DashboardHome } from "./DashboardHome";
import CRMManagement from "./CRMManagement";
import { UserManagement } from "./UserManagement";
import { ServiceManagement } from "./ServiceManagement";
import { Reports } from "./Reports";
import { PageTransition } from "./PageTransition";
import { LoadingScreen } from "./LoadingScreen";
import { DashboardSkeleton, TableSkeleton } from "./SkeletonLoader";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { UserRole } from "../types/crm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('activeDashboardTab') || "home";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };

  // Get current user from sessionStorage
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.SALES);

  // Load user data on mount
  useEffect(() => {
    const userDataStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setCurrentUser(userData);
        setUserRole(userData.role as UserRole);
        // Migration to session storage if it was in local
        if (!sessionStorage.getItem('currentUser')) {
          sessionStorage.setItem('currentUser', userDataStr);
        }
      } catch (error) {
      }
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Clear user data from storage
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('activeDashboardTab');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('activeDashboardTab');

    if (!localStorage.getItem('rememberMe')) {
      localStorage.removeItem('userEmail');
    }
    onLogout();
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Handle tab change with loading
  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;

    setIsLoading(true);
    sessionStorage.setItem('activeDashboardTab', tab);

    // Simulate loading time for smoother transition
    setTimeout(() => {
      setActiveTab(tab);
      setIsLoading(false);
    }, 500);
  };

  // Show initial loading screen
  if (isInitialLoad) {
    return <LoadingScreen message="กำลังเตรียมระบบ..." />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        currentUser={currentUser}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-border px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-4">
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-2 bg-transparent border-0 cursor-pointer outline-none">
                    <Avatar className="h-8 w-8 ring-2 ring-[#c5a059]">
                      <AvatarImage src={currentUser?.avatar || ""} />
                      <AvatarFallback className="bg-[#c5a059] text-white">
                        {currentUser?.name ? currentUser.name.charAt(0) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden lg:block">
                      <p className="text-sm">{currentUser?.name || "ผู้ใช้งาน"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {currentUser?.role || userRole}
                        </Badge>
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{currentUser?.name || "ผู้ใช้งาน"}</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        {currentUser?.email || ""}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-8">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-3xl text-[#002b38] mb-2">
                {activeTab === "home" && "ภาพรวมระบบ"}
                {activeTab === "crm" && "จัดการลูกค้า (CRM)"}
                {activeTab === "permissions" && "สิทธิ์การใช้งาน (Demo)"}
                {activeTab === "treatments" && "จัดการผู้ใช้งาน"}
                {activeTab === "services" && "จัดการบริการ"}
                {activeTab === "reports" && "รายงาน"}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === "home" && "ภาพรวมยอดขาย สถานะพนักงาน และข้อมูลสำคัญ"}
                {activeTab === "crm" && "บริหารจัดการข้อมูลลูกค้า, ข้อมูลการตลาด และ CRM"}
                {activeTab === "permissions" && "ทดสอบระบบสิทธิ์การใช้งานตามบทบาท"}
                {activeTab === "treatments" && "จัดการข้อมูลผู้ใช้และสิทธิ์การเข้าถึง"}
                {activeTab === "services" && "จัดการบริการและหัตถการทั้งหมดในระบบ"}
                {activeTab === "reports" && "ดูรายงานและวิเคราะห์ข้อมูลลูกค้า"}
              </p>
            </div>

            {/* Content based on active tab */}
            <PageTransition pageKey={activeTab}>
              {isLoading ? (
                <>
                  {(activeTab === "crm" || activeTab === "treatments" || activeTab === "permissions" || activeTab === "services") && <TableSkeleton />}
                  {(activeTab === "home" || activeTab === "reports") && <DashboardSkeleton />}
                </>
              ) : (
                <>
                  {activeTab === "home" && <DashboardHome />}
                  {activeTab === "crm" && <CRMManagement />}
                  {activeTab === "permissions" && <UserManagement />}
                  {activeTab === "treatments" && <UserManagement />}
                  {activeTab === "services" && <ServiceManagement />}
                  {activeTab === "reports" && <Reports />}
                </>
              )}
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}