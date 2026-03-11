import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Scissors,
  Sparkles,
  GripVertical
} from "lucide-react";
import { Reorder } from "motion/react";
import { useUsers } from "../hooks/useUsers";
import { useServices } from "../hooks/useServices";
import { useCustomers } from "../hooks/useCustomers";
import { User, UserRole, Customer, ServiceDoctor, Service } from "../types/crm";
import { Button } from "./ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

export function DashboardHome() {
  const { users, loading: usersLoading, refresh: refreshUsers, updateUser } = useUsers();
  const { services, loading: servicesLoading, getDoctorsForService, updateServiceDoctor } = useServices();
  const { customers, loading: customersLoading, fetchCustomers } = useCustomers();

  // Per-service doctor queue data (keyed by service ID)
  const [serviceDoctorMap, setServiceDoctorMap] = useState<Record<number, ServiceDoctor[]>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Default to today in YYYY-MM-DD format (Bangkok time)
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch ServiceDoctor data for each service
  const fetchServiceDoctors = async () => {
    const map: Record<number, ServiceDoctor[]> = {};
    for (const service of services.filter((s: { isActive: boolean }) => s.isActive)) {
      try {
        const docs = await getDoctorsForService(service.id);
        map[service.id] = docs.filter(d => d.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
      } catch (err) {
      }
    }
    setServiceDoctorMap(map);
  };

  useEffect(() => {
    if (services.length > 0) {
      fetchServiceDoctors();
    }
  }, [services]);

  const handleRefresh = () => {
    refreshUsers();
    fetchCustomers();
    fetchServiceDoctors();
  };

  // Get active sales and doctors
  const activeSales = useMemo(() => {
    return users
      .filter(u => u.role === UserRole.SALES && u.status === 'active')
      .sort((a, b) => (a.queueOrder || 99) - (b.queueOrder || 99));
  }, [users]);

  const activeDoctors = useMemo(() => {
    return users
      .filter(u => u.role === UserRole.DOCTOR && u.status === 'active')
      .sort((a, b) => (a.queueOrder || 99) - (b.queueOrder || 99));
  }, [users]);

  // Handle sales reordering states and effects
  const [salesTHSur, setSalesTHSur] = useState<User[]>([]);
  const [salesINSur, setSalesINSur] = useState<User[]>([]);
  const [salesTHNon, setSalesTHNon] = useState<User[]>([]);
  const [salesINNon, setSalesINNon] = useState<User[]>([]);

  useEffect(() => {
    setSalesTHSur(activeSales.filter((s: User) => (s.country === 'TH' || s.country === 'BOTH') && (s.caseType === 'Surgery' || s.caseType === 'BOTH')));
    setSalesINSur(activeSales.filter((s: User) => (s.country === 'IN' || s.country === 'BOTH') && (s.caseType === 'Surgery' || s.caseType === 'BOTH')));
    setSalesTHNon(activeSales.filter((s: User) => (s.country === 'TH' || s.country === 'BOTH') && (s.caseType === 'Non-Surgery' || s.caseType === 'BOTH')));
    setSalesINNon(activeSales.filter((s: User) => (s.country === 'IN' || s.country === 'BOTH') && (s.caseType === 'Non-Surgery' || s.caseType === 'BOTH')));
  }, [activeSales]);

  const handleSalesReorder = async (group: 'THSur' | 'INSur' | 'THNon' | 'INNon', newOrder: User[]) => {
    if (group === 'THSur') setSalesTHSur(newOrder);
    else if (group === 'INSur') setSalesINSur(newOrder);
    else if (group === 'THNon') setSalesTHNon(newOrder);
    else if (group === 'INNon') setSalesINNon(newOrder);

    try {
      for (let i = 0; i < newOrder.length; i++) {
        const u = newOrder[i];
        if (u.queueOrder !== i + 1) {
          await updateUser(u.id, { queueOrder: i + 1 });
        }
      }
    } catch (err) {
    }
  };

  const handleDoctorReorder = async (serviceId: number, newOrder: ServiceDoctor[]) => {
    setServiceDoctorMap(prev => ({ ...prev, [serviceId]: newOrder }));
    try {
      for (let i = 0; i < newOrder.length; i++) {
        const d = newOrder[i];
        if (d.displayOrder !== i + 1) {
          await updateServiceDoctor(serviceId, d.id, { displayOrder: i + 1 });
        }
      }
    } catch (err) {
    }
  };

  const handleRunSalesQueue = async (group: 'THSur' | 'INSur' | 'THNon' | 'INNon') => {
    let currentList: User[] = [];
    if (group === 'THSur') currentList = [...salesTHSur];
    else if (group === 'INSur') currentList = [...salesINSur];
    else if (group === 'THNon') currentList = [...salesTHNon];
    else if (group === 'INNon') currentList = [...salesINNon];

    if (currentList.length > 0) {
      const [first, ...rest] = currentList;
      const newOrder = [...rest, first];

      if (group === 'THSur') setSalesTHSur(newOrder);
      else if (group === 'INSur') setSalesINSur(newOrder);
      else if (group === 'THNon') setSalesTHNon(newOrder);
      else if (group === 'INNon') setSalesINNon(newOrder);

      try {
        for (let i = 0; i < newOrder.length; i++) {
          const u = newOrder[i];
          await updateUser(u.id, { queueOrder: i + 1 });
        }
      } catch (err) {
        refreshUsers();
      }
    }
  };

  const handleRunDoctorQueue = async (serviceId: number) => {
    const currentList = [...(serviceDoctorMap[serviceId] || [])];
    if (currentList.length > 0) {
      const [first, ...rest] = currentList;
      const newOrder = [...rest, first];

      setServiceDoctorMap(prev => ({ ...prev, [serviceId]: newOrder }));

      try {
        for (let i = 0; i < newOrder.length; i++) {
          const d = newOrder[i];
          await updateServiceDoctor(serviceId, d.id, { displayOrder: i + 1 });
        }
      } catch (err) {
      }
    }
  };

  // Count events for selected date with details
  const dailyStats = useMemo(() => {
    const stats = {
      sales: {} as Record<string, { count: number, details: Array<{ service: string, customer: string, doctor: string }> }>,
      doctors: {} as Record<string, { count: number, details: Array<{ service: string, customer: string, sales: string }> }>,
      summary: {
        th: 0,
        in: 0
      }
    };

    customers.forEach(c => {
      // Backend stores createdAt as YYYY-MM-DD (Bangkok time) - safe to compare directly
      // e.g. createdAt = "2026-02-19", selectedDate = "2026-02-19"
      const customerDate = c.createdAt ? c.createdAt.split('T')[0].split(' ')[0] : '';
      const isMatch = customerDate === selectedDate;

      if (isMatch) {

        // Global summary
        if (c.country === 'IN') stats.summary.in += 1;
        else stats.summary.th += 1;

        // Sales Stats with Details
        if (c.assignedSales && c.assignedSales !== "-") {
          if (!stats.sales[c.assignedSales]) {
            stats.sales[c.assignedSales] = { count: 0, details: [] };
          }
          stats.sales[c.assignedSales].count += 1;
          stats.sales[c.assignedSales].details.push({
            service: c.serviceInterest || 'Unknown',
            customer: c.displayName,
            doctor: c.assignedDoctor || '-'
          });
        }

        // Doctor Stats with Details
        if (c.assignedDoctor && c.assignedDoctor !== "-") {
          if (!stats.doctors[c.assignedDoctor]) {
            stats.doctors[c.assignedDoctor] = { count: 0, details: [] };
          }
          stats.doctors[c.assignedDoctor].count += 1;
          stats.doctors[c.assignedDoctor].details.push({
            service: c.serviceInterest || 'Unknown',
            customer: c.displayName,
            sales: c.assignedSales || '-'
          });
        }
      }
    });

    return stats;
  }, [customers, selectedDate]);

  const renderQueueItem = (user: User, index: number, totalEvents: number) => {
    const isNext = index === 0;

    return (
      <div
        key={user.id}
        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${isNext
          ? "bg-gradient-to-r from-[#c5a059]/10 to-transparent border-[#c5a059] shadow-md scale-[1.02] z-10"
          : "bg-white border-slate-100 hover:border-slate-200"
          }`}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className={`h-12 w-12 border-2 ${isNext ? "border-[#c5a059]" : "border-transparent"}`}>
              <AvatarImage src={user.avatar} />
              <AvatarFallback className={isNext ? "bg-[#c5a059] text-white" : "bg-slate-100 text-slate-400"}>
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isNext ? "bg-[#800200] text-white" : "bg-slate-200 text-slate-600"
              }`}>
              {index + 1}
            </div>
            {isNext && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isNext ? "text-[#002b38]" : "text-slate-700"}`}>
                {user.name}
              </span>
              {isNext && (
                <Badge className="bg-[#e8d8a1] text-[#002b38] border-none text-[10px] hover:bg-[#e8d8a1]/80">
                  กำลังรับงานถัดไป
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {user.role === UserRole.SALES ? 'Sales' : 'Doctor'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-bold text-[#c5a059]">{totalEvents}</div>
          <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Events วันนี้</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header with Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#002b38] tracking-tight">
            ระบบจัดสรรงาน (Queue Management)
          </h1>
          <div className="flex items-center gap-2 text-slate-500 mt-2">
            <Clock className="w-4 h-4 text-[#c5a059]" />
            <span>
              {currentTime.toLocaleDateString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="font-mono font-bold text-[#c5a059] ml-2">
              {currentTime.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Clock className="w-4 h-4 text-[#c5a059]" />
            <span className="text-sm font-medium text-slate-600">วันที่:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none focus:ring-0 text-sm font-bold text-[#c5a059] cursor-pointer"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 gap-2 border-slate-200 bg-white"
            disabled={usersLoading || customersLoading}
          >
            <RefreshCw className={`w-4 h-4 ${(usersLoading || customersLoading) ? 'animate-spin' : ''}`} />
            อัปเดตข้อมูล
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Sales ในระบบ</p>
                <h3 className="text-2xl font-bold text-[#002b38] mt-1">{activeSales.length} คน</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#c5a059]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#c5a059]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">แพทย์ในระบบ</p>
                <h3 className="text-2xl font-bold text-[#002b38] mt-1">{activeDoctors.length} คน</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#c5a059]/10 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-[#c5a059]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-[#c5a059]/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 font-medium">Events รวมสำหรับวันที่เลือก</p>
              <div className="w-8 h-8 rounded-lg bg-[#c5a059]/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#c5a059]" />
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="text-center pr-2">
                <h3 className="text-3xl font-bold text-[#c5a059]">
                  {dailyStats.summary.th}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">คนไทย (TH)</p>
              </div>
              <div className="text-center pl-2">
                <h3 className="text-3xl font-bold text-purple-600">
                  {dailyStats.summary.in}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">ต่างชาติ (IN)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-[#c5a059]/10 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#c5a059] font-semibold">คิวปัจจุบัน</p>
                <h3 className="text-lg font-bold text-[#002b38] mt-1">
                  กำลังรันตามลำดับ
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#c5a059]/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#c5a059]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-[#002b38] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#c5a059]" />
              คิวพนักงานฝ่ายขาย (Sales Queue)
            </h2>
          </div>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4">
              {usersLoading ? (
                <div className="text-center py-4 text-muted-foreground">กำลังโหลดข้อมูล...</div>
              ) : activeSales.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">ไม่พบรายชื่อพนักงานฝ่ายขาย</div>
              ) : (
                <Accordion type="multiple" defaultValue={["sales-sur-th", "sales-sur-in", "sales-non-th", "sales-non-in"]} className="w-full space-y-2">
                  {/* Category: Surgery */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2 bg-orange-50 p-2 rounded-md">
                      <Scissors className="w-4 h-4" /> Surgery (ศัลยกรรม)
                    </h3>

                    {/* Sub-group: TH Surgery */}
                    <AccordionItem value="sales-sur-th" className="border rounded-lg px-2 mb-2">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-slate-100">TH</Badge>
                          <span className="font-medium text-slate-700 text-sm">Thai Surgery Queue</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <Reorder.Group axis="y" values={salesTHSur} onReorder={(val: User[]) => handleSalesReorder('THSur', val)} className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100">
                          {salesTHSur.map((sales: User, idx: number) => {
                            const salesStats = dailyStats.sales[sales.name];
                            const jobCount = salesStats?.count || 0;
                            return (
                              <Reorder.Item
                                key={sales.id}
                                value={sales}
                                whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                                className="flex flex-col text-sm bg-slate-50 p-2 rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow z-20"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                                      {idx + 1}
                                    </div>
                                    <span className={idx === 0 ? "font-semibold text-[#002b38]" : "text-slate-600"}>{sales.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {jobCount > 0 && <Badge variant="secondary" className="h-5 text-[10px] bg-blue-50 text-blue-600 font-normal">{jobCount} งาน</Badge>}
                                    {idx === 0 ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-white border border-[#c5a059]/20 gap-1 font-bold"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          handleRunSalesQueue('THSur');
                                        }}
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        รับงาน
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Sub-group: IN Surgery */}
                    <AccordionItem value="sales-sur-in" className="border rounded-lg px-2 mb-2">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-purple-100">IN</Badge>
                          <span className="font-medium text-slate-700 text-sm">Inter Surgery Queue</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <Reorder.Group axis="y" values={salesINSur} onReorder={(val: User[]) => handleSalesReorder('INSur', val)} className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100">
                          {salesINSur.map((sales: User, idx: number) => {
                            const salesStats = dailyStats.sales[sales.name];
                            const jobCount = salesStats?.count || 0;
                            return (
                              <Reorder.Item
                                key={sales.id}
                                value={sales}
                                whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                                className="flex flex-col text-sm bg-slate-50 p-2 rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow z-20"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                                      {idx + 1}
                                    </div>
                                    <span className={idx === 0 ? "font-semibold text-[#002b38]" : "text-slate-600"}>{sales.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {jobCount > 0 && <Badge variant="secondary" className="h-5 text-[10px] bg-blue-50 text-blue-600 font-normal">{jobCount} งาน</Badge>}
                                    {idx === 0 ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-white border border-[#c5a059]/20 gap-1 font-bold"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          handleRunSalesQueue('INSur');
                                        }}
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        รับงาน
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>
                      </AccordionContent>
                    </AccordionItem>
                  </div>

                  {/* Category: Non-Surgery */}
                  <div>
                    <h3 className="text-sm font-semibold text-teal-600 mb-2 flex items-center gap-2 bg-teal-50 p-2 rounded-md">
                      <Sparkles className="w-4 h-4" /> Non-Surgery (หัตถการ)
                    </h3>

                    {/* Sub-group: TH Non-Surgery */}
                    <AccordionItem value="sales-non-th" className="border rounded-lg px-2 mb-2">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-slate-100">TH</Badge>
                          <span className="font-medium text-slate-700 text-sm">Thai Non-Surgery Queue</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <Reorder.Group axis="y" values={salesTHNon} onReorder={(val: User[]) => handleSalesReorder('THNon', val)} className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100">
                          {salesTHNon.map((sales: User, idx: number) => {
                            const salesStats = dailyStats.sales[sales.name];
                            const jobCount = salesStats?.count || 0;
                            return (
                              <Reorder.Item
                                key={sales.id}
                                value={sales}
                                whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                                className="flex flex-col text-sm bg-slate-50 p-2 rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow z-20"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                                      {idx + 1}
                                    </div>
                                    <span className={idx === 0 ? "font-semibold text-[#002b38]" : "text-slate-600"}>{sales.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {jobCount > 0 && <Badge variant="secondary" className="h-5 text-[10px] bg-blue-50 text-blue-600 font-normal">{jobCount} งาน</Badge>}
                                    {idx === 0 ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-white border border-[#c5a059]/20 gap-1 font-bold"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          handleRunSalesQueue('THNon');
                                        }}
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        รับงาน
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Sub-group: IN Non-Surgery */}
                    <AccordionItem value="sales-non-in" className="border rounded-lg px-2 mb-2">
                      <AccordionTrigger className="hover:no-underline py-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-purple-100">IN</Badge>
                          <span className="font-medium text-slate-700 text-sm">Inter Non-Surgery Queue</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <Reorder.Group axis="y" values={salesINNon} onReorder={(val: User[]) => handleSalesReorder('INNon', val)} className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100">
                          {salesINNon.map((sales: User, idx: number) => {
                            const salesStats = dailyStats.sales[sales.name];
                            const jobCount = salesStats?.count || 0;
                            return (
                              <Reorder.Item
                                key={sales.id}
                                value={sales}
                                whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                                className="flex flex-col text-sm bg-slate-50 p-2 rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow z-20"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-3 h-3 text-slate-300" />
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                                      {idx + 1}
                                    </div>
                                    <span className={idx === 0 ? "font-semibold text-[#002b38]" : "text-slate-600"}>{sales.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {jobCount > 0 && <Badge variant="secondary" className="h-5 text-[10px] bg-blue-50 text-blue-600 font-normal">{jobCount} งาน</Badge>}
                                    {idx === 0 ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-white border border-[#c5a059]/20 gap-1 font-bold"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          handleRunSalesQueue('INNon');
                                        }}
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                        รับงาน
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </Reorder.Item>
                            );
                          })}
                        </Reorder.Group>
                      </AccordionContent>
                    </AccordionItem>
                  </div>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Doctor Queue (By Service) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold text-[#002b38] flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#c5a059]" />
              คิวแพทย์ตามหัตถการ (Doctor Queue by Service)
            </h2>
          </div>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4">
              {servicesLoading ? (
                <div className="text-center py-4 text-muted-foreground">กำลังโหลดข้อมูล...</div>
              ) : services.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">ไม่พบข้อมูลบริการ</div>
              ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                  {/* Group by Category: Surgery */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2 bg-orange-50 p-2 rounded-md">
                      <span className="w-2 h-2 rounded-full bg-orange-500" /> Surgery (ศัลยกรรม)
                    </h3>
                    {services.filter((s: Service) => s.category === 'Surgery' && s.isActive).map((service: Service) => {
                      // Get doctors for this service from ServiceDoctor data (sorted by displayOrder)
                      const serviceDocList = serviceDoctorMap[service.id] || [];

                      return (
                        <AccordionItem key={service.id} value={`service-${service.id}`} className="border rounded-lg px-2 mb-2">
                          <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{service.code} {service.name}</span>
                              <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-500">
                                D: {serviceDocList.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-3">
                            {serviceDocList.length > 0 ? (
                              <Reorder.Group axis="y" values={serviceDocList} onReorder={(val: ServiceDoctor[]) => handleDoctorReorder(service.id, val)} className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100">
                                {serviceDocList.map((doc: ServiceDoctor, idx: number) => {
                                  const docStats = dailyStats.doctors[doc.doctorName];
                                  const jobCount = docStats?.count || 0;

                                  return (
                                    <Reorder.Item
                                      key={doc.id}
                                      value={doc}
                                      whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                                      className="flex flex-col text-sm bg-slate-50 p-2 rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow z-20"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="w-3 h-3 text-slate-300" />
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                                            {idx + 1}
                                          </div>
                                          <span className={idx === 0 ? "font-semibold text-[#002b38]" : "text-slate-600"}>
                                            {doc.doctorName}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {jobCount > 0 && (
                                            <Badge variant="secondary" className="h-5 text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                                              {jobCount} งาน
                                            </Badge>
                                          )}
                                          {idx === 0 ? (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 text-[10px] bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-white border border-[#c5a059]/20 gap-1 font-bold"
                                              onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                handleRunDoctorQueue(service.id);
                                              }}
                                            >
                                              <CheckCircle2 className="w-3 h-3" />
                                              รับงาน
                                            </Button>
                                          ) : null}
                                        </div>
                                      </div>

                                    </Reorder.Item>
                                  )
                                })}
                              </Reorder.Group>
                            ) : (
                              <div className="text-sm text-slate-400 italic pl-4">ยังไม่ได้ระบุแพทย์</div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </div>

                  {/* Group by Category: Non-Surgery */}
                  <div>
                    <h3 className="text-sm font-semibold text-teal-600 mb-2 flex items-center gap-2 bg-teal-50 p-2 rounded-md">
                      <span className="w-2 h-2 rounded-full bg-teal-500" /> Non-Surgery (หัตถการ)
                    </h3>
                    {services.filter((s: Service) => s.category === 'Non-Surgery' && s.isActive).map((service: Service) => {
                      // Get doctors for this service from ServiceDoctor data (sorted by displayOrder)
                      const serviceDocList = serviceDoctorMap[service.id] || [];

                      return (
                        <AccordionItem key={service.id} value={`service-${service.id}`} className="border rounded-lg px-2 mb-2">
                          <AccordionTrigger className="hover:no-underline py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{service.code} {service.name}</span>
                              <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 text-slate-500">
                                D: {serviceDocList.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-3">
                            {serviceDocList.length > 0 ? (
                              <Reorder.Group axis="y" values={serviceDocList} onReorder={(val: ServiceDoctor[]) => handleDoctorReorder(service.id, val)} className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-slate-100">
                                {serviceDocList.map((doc: ServiceDoctor, idx: number) => {
                                  const docStats = dailyStats.doctors[doc.doctorName];
                                  const jobCount = docStats?.count || 0;

                                  return (
                                    <Reorder.Item
                                      key={doc.id}
                                      value={doc}
                                      whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}
                                      className="flex flex-col text-sm bg-slate-50 p-2 rounded-md cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow z-20"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <GripVertical className="w-3 h-3 text-slate-300" />
                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                                            {idx + 1}
                                          </div>
                                          <span className={idx === 0 ? "font-semibold text-[#002b38]" : "text-slate-600"}>
                                            {doc.doctorName}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {jobCount > 0 && (
                                            <Badge variant="secondary" className="h-5 text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                                              {jobCount} งาน
                                            </Badge>
                                          )}
                                          {idx === 0 ? (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 text-[10px] bg-[#c5a059]/10 text-[#c5a059] hover:bg-[#c5a059] hover:text-white border border-[#c5a059]/20 gap-1 font-bold"
                                              onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                handleRunDoctorQueue(service.id);
                                              }}
                                            >
                                              <CheckCircle2 className="w-3 h-3" />
                                              รับงาน
                                            </Button>
                                          ) : null}
                                        </div>
                                      </div>

                                    </Reorder.Item>
                                  )
                                })}
                              </Reorder.Group>
                            ) : (
                              <div className="text-sm text-slate-400 italic pl-4">ยังไม่ได้ระบุแพทย์</div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </div>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Logic Notice */}
      <Card className="border-none shadow-sm bg-[#e8d8a1]/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#002b38] shrink-0 mt-0.5" />
          <div className="text-sm text-[#002b38]">
            <span className="font-bold">หมายเหตุ:</span> ลำดับคิวจะถูกจัดเรียงตาม <span className="underline italic">Queue Order</span> ที่ตั้งค่าไว้ในหน้าระบบจัดการผู้ใช้งาน
            ผู้ที่มีลำดับน้อยที่สุดจะเป็นผู้ได้รับงานคนแรกถัดไป เมื่อมีการรับงานแล้ว ให้พนักงานเลื่อนลำดับคิวของตนเองไปต่อท้าย เพื่อรักษาความยุติธรรม
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
