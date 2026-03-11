import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import {
    ArrowLeft,
    Save,
    User as UserIcon,
    Phone,
    Globe,
    MessageCircle, // Replaced MessageSquare with MessageCircle for Line/Chat
    Target,
    Activity,
    FileText,
    CheckCircle2,
    Calendar as CalendarIcon,
    Smartphone,
    Mail,
    Stethoscope,
    Briefcase,
    Hash,
    MapPin,
    AlertCircle
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Calendar as UICalendar } from "./ui/calendar";
import { cn } from "./ui/utils";
import { Customer, Platform, Source, LifecycleStage, CustomerStatus, User } from "../types/crm";
import { useCustomers } from "../hooks/useCustomers";
import { useUsers } from "../hooks/useUsers";
import { useServices } from "../hooks/useServices";
import { getCaseTypeInThai } from "../constants/serviceInterests";
import { Badge } from "./ui/badge";
import { NotificationDialog } from "./NotificationDialog";
import { apiService } from "../services/api";
import { PLATFORM_ORDER_MAPPING, ALL_SOURCES } from "../constants/platformMapping";
interface AddNewCustomerProps {
    onBack: () => void;
    onSuccess: () => void;
}

export default function AddNewCustomer({ onBack, onSuccess }: AddNewCustomerProps) {
    const { customers, createCustomer } = useCustomers();
    const { users } = useUsers();
    const { services, loading: servicesLoading } = useServices();

    // Notification states
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState("");
    const [notificationDescription, setNotificationDescription] = useState("");
    const [notificationType, setNotificationType] = useState<"success" | "error" | "loading">("success");

    // Form state
    const [formData, setFormData] = useState<Partial<Customer>>({
        createdAt: new Date().toISOString().split('T')[0],
        customerId: "",
        notes: "",
        country: "TH" as "TH" | "IN",
        lineUid: "",
        lineId: "",
        displayName: "",
        phone: "",
        email: "",
        platform: "-" as Platform,
        source: "-" as Source,
        serviceInterest: "",
        lifecycleStage: "MQL" as LifecycleStage,
        isUQL: "",
        isMQL: "",
        isSQL: "",
        mqlToSqlDays: "-",
        closeWonMonth: "",
        revenueWeight: "-",
        assignedSales: "-",
        status: "-" as CustomerStatus,
        remark: "",
        reasonLost: "",
        assignedDoctor: "-",
        isInactive: false,
        month: new Date().getMonth() + 1,
        updatedAt: new Date().toISOString()
    });

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };

            // Auto-clear assignedDoctor when serviceInterest changes to trigger re-run in SQL mode
            if (field === 'serviceInterest') {
                newData.assignedDoctor = '-';
            }
            // Auto-clear assignedSales when country changes to trigger re-run in SQL mode
            if (field === 'country') {
                newData.assignedSales = '-';
            }

            return newData;
        });
    };

    // Auto-assignment Logic for Lifecycle Stage SQL
    useEffect(() => {
        const fetchNextAssignment = async () => {
            if (formData.lifecycleStage === 'SQL') {
                try {
                    const result = await apiService.getNextAssignment({
                        serviceInterest: formData.serviceInterest,
                        country: formData.country,
                        lifecycleStage: formData.lifecycleStage
                    });

                    setFormData(prev => ({
                        ...prev,
                        assignedSales: prev.assignedSales === '-' ? result.assignedSales : prev.assignedSales,
                        assignedDoctor: prev.assignedDoctor === '-' ? result.assignedDoctor : prev.assignedDoctor
                    }));
                } catch (error) {
                }
            } else {
                // If moved back from SQL, we might want to reset? 
                // User said "like in the table", in table it resets to '-'
                setFormData(prev => ({
                    ...prev,
                    assignedSales: prev.assignedSales !== '-' ? '-' : prev.assignedSales,
                    assignedDoctor: prev.assignedDoctor !== '-' ? '-' : prev.assignedDoctor
                }));
            }
        };

        fetchNextAssignment();
    }, [formData.lifecycleStage, formData.serviceInterest, formData.country]);

    // Filter doctors by specific service assignment
    const filteredDoctors = useMemo(() => {
        if (!formData.serviceInterest) return [];
        const selectedService = services.find((s: any) => formData.serviceInterest === `${s.code} ${s.name}` || s.name === formData.serviceInterest);
        const serviceId = selectedService?.id;
        return users.filter((user: User) => {
            if (user.role !== 'DOCTOR' || user.status !== 'active') return false;
            return serviceId && user.serviceIds && (user.serviceIds as any).includes(serviceId);
        }).sort((a: User, b: User) => (a.queueOrder || 999) - (b.queueOrder || 999));
    }, [formData.serviceInterest, users, services]);

    // Filter sales by Country
    const filteredSales = useMemo(() => {
        if (!formData.country) return [];
        return users.filter((user: User) => {
            if (user.role !== 'SALES' || user.status !== 'active') return false;
            return user.country === formData.country || user.country === 'BOTH';
        }).sort((a: User, b: User) => (a.queueOrder || 999) - (b.queueOrder || 999));
    }, [formData.country, users]);

    // Get available services enriched with doctor metadata
    const availableServices = useMemo(() => {
        const serviceMetadataMap = new Map<number, { countries: Set<string>, caseTypes: Set<string> }>();
        users.forEach((user: User) => {
            if (user.role === 'DOCTOR' && user.status === 'active' && user.serviceIds) {
                user.serviceIds.forEach((id: number) => {
                    if (!serviceMetadataMap.has(id)) {
                        serviceMetadataMap.set(id, { countries: new Set(), caseTypes: new Set() });
                    }
                    const meta = serviceMetadataMap.get(id)!;
                    if (user.country) meta.countries.add(user.country);
                    if (user.caseType) meta.caseTypes.add(user.caseType === 'Surgery' ? 'Sur' : 'Non-sur');
                });
            }
        });
        return services
            .filter((s: any) => s.isActive)
            .map((s: any) => ({
                ...s,
                doctorCountries: serviceMetadataMap.has(s.id) ? Array.from(serviceMetadataMap.get(s.id)!.countries) : ['BOTH'],
                doctorCaseTypes: serviceMetadataMap.has(s.id) ? Array.from(serviceMetadataMap.get(s.id)!.caseTypes) : [s.category === 'Surgery' ? 'Sur' : 'Non-sur']
            }));
    }, [services, users]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        // Check for duplicates
        const duplicatedFields: string[] = [];
        const foundDuplicate = customers.find(c => {
            let isMatch = false;

            // Check Name (ignore empty)
            if (formData.displayName && formData.displayName !== "-" && c.displayName?.toLowerCase() === formData.displayName.toLowerCase()) {
                duplicatedFields.push("ชื่อลูกค้า");
                isMatch = true;
            }

            // Check Phone (ignore empty and "-")
            if (formData.phone && formData.phone !== "-" && c.phone === formData.phone) {
                duplicatedFields.push("เบอร์โทรศัพท์");
                isMatch = true;
            }

            // Check Line ID (ignore empty and "-")
            if (formData.lineId && formData.lineId !== "-" && c.lineId === formData.lineId) {
                duplicatedFields.push("Line ID");
                isMatch = true;
            }

            // Check Email (ignore empty and "-")
            if (formData.email && formData.email !== "-" && c.email?.toLowerCase() === formData.email.toLowerCase()) {
                duplicatedFields.push("อีเมล");
                isMatch = true;
            }

            return isMatch;
        });

        if (foundDuplicate) {
            // Remove potential duplicates in the fields array (in case multiple fields match the same customer)
            const uniqueFields = Array.from(new Set(duplicatedFields));

            setNotificationTitle("พบข้อมูลซ้ำในระบบ!");
            setNotificationDescription(`พบข้อมูลที่ซ้ำกับลูกค้าในระบบ: ${uniqueFields.join(", ")} (ลูกค้าเดิม: ${foundDuplicate.displayName}) กรุณาตรวจสอบอีกครั้ง`);
            setNotificationType("error");
            setNotificationOpen(true);
            return;
        }

        setNotificationTitle("กำลังบันทึก");
        setNotificationDescription("กำลังสร้างข้อมูลลูกค้าใหม่...");
        setNotificationType("loading");
        setNotificationOpen(true);

        try {
            await createCustomer(formData as Omit<Customer, 'id'>);
            setNotificationTitle("บันทึกสำเร็จ");
            setNotificationDescription("เพิ่มลูกค้าใหม่เรียบร้อยแล้ว");
            setNotificationType("success");

            // Call onSuccess after a short delay
            setTimeout(() => {
                onSuccess();
            }, 1000);
        } catch (error) {
            setNotificationTitle("เกิดข้อผิดพลาด");
            setNotificationDescription("ไม่สามารถเพิ่มลูกค้าได้ กรุณาลองใหม่อีกครั้ง");
            setNotificationType("error");
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                duration: 0.5
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="flex flex-col gap-6 w-full mx-auto px-4 py-2 pb-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <NotificationDialog
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
                title={notificationTitle}
                description={notificationDescription}
                type={notificationType}
            />

            {/* Header Section */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="rounded-full hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-6 w-6 text-slate-500" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#c5a059] to-[#007f85] bg-clip-text text-transparent">
                            จัดการลูกค้า (CRM) - เพิ่มลูกค้าใหม่
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            กรอกข้อมูลลูกค้าเพื่อนำเข้าสู่ระบบ CRM
                        </p>
                    </div>
                </div>

            </motion.div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Identity & Contact (4 cols) */}
                    <div className="space-y-6 lg:col-span-4">
                        {/* 1. Basic Identity */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-t-4 border-t-[#c5a059] shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-teal-50 rounded-lg">
                                            <UserIcon className="h-5 w-5 text-[#c5a059]" />
                                        </div>
                                        <CardTitle className="text-lg text-slate-700">ข้อมูลทั่วไป</CardTitle>
                                    </div>
                                    <CardDescription>ข้อมูลระบุตัวตนเบื้องต้น</CardDescription>
                                </CardHeader>
                                <Separator className="mb-4 opacity-50" />
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date (วันที่กรอกข้อมูล)</Label>
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                                <Input
                                                    type="date"
                                                    value={formData.createdAt}
                                                    onChange={(e) => handleInputChange('createdAt', e.target.value)}
                                                    className="pl-9 bg-white border-slate-200 focus:bg-white transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</Label>
                                            <Input
                                                value={formData.month}
                                                onChange={(e) => handleInputChange('month', e.target.value)}
                                                className="bg-white border-slate-200"
                                                placeholder="เช่น 1 หรือ มกราคม"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer ID</Label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                            <Input
                                                value={formData.customerId}
                                                placeholder="ระบบสร้างอัตโนมัติ (ถ้ามี)"
                                                className="bg-white border-slate-200"
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Display Name (ชื่อลูกค้า)</Label>
                                        <Input
                                            value={formData.displayName}
                                            onChange={(e) => handleInputChange('displayName', e.target.value)}
                                            placeholder="เช่น คุณสมชาย"
                                            className="bg-white border-slate-200 focus:bg-white transition-colors text-base font-medium"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">TH/IN Status</Label>
                                        <Select
                                            value={formData.country}
                                            onValueChange={(value: string) => handleInputChange('country', value)}
                                        >
                                            <SelectTrigger className="bg-slate-50 focus:bg-white transition-colors">
                                                <SelectValue placeholder="เลือกประเทศ..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="TH">TH (Thailand)</SelectItem>
                                                <SelectItem value="IN">IN (International)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* 2. Contact Details */}
                        <motion.div variants={itemVariants}>
                            <Card className="shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Smartphone className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <CardTitle className="text-lg text-slate-700">ช่องทางติดต่อ</CardTitle>
                                    </div>
                                </CardHeader>
                                <Separator className="mb-4 opacity-50" />
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Phone/WhatsApp (เบอร์โทรศัพท์)</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                                placeholder="08x-xxx-xxxx"
                                                className="pl-9 bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Email (อีเมล)</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                            <Input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                placeholder="user@example.com"
                                                className="pl-9 bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Line ID</Label>
                                            <div className="relative">
                                                <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-green-500 pointer-events-none" />
                                                <Input
                                                    value={formData.lineId}
                                                    onChange={(e) => handleInputChange('lineId', e.target.value)}
                                                    placeholder="@lineid"
                                                    className="pl-9 bg-white border-slate-200"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Line UID</Label>
                                            <Input
                                                value={formData.lineUid}
                                                onChange={(e) => handleInputChange('lineUid', e.target.value)}
                                                placeholder="U1234..."
                                                className="font-mono text-xs bg-white border-slate-200"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Middle Column: Marketing & Interest (4 cols) */}
                    <div className="space-y-6 lg:col-span-4">
                        <motion.div variants={itemVariants}>
                            <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-slate-50">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-orange-50 rounded-lg">
                                            <Target className="h-5 w-5 text-orange-500" />
                                        </div>
                                        <CardTitle className="text-lg text-slate-700">ความสนใจ & ที่มา</CardTitle>
                                    </div>
                                    <CardDescription>ข้อมูลด้านการตลาด</CardDescription>
                                </CardHeader>
                                <Separator className="mb-4 opacity-50" />
                                <CardContent className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-[#c5a059]">Service Interest (บริการที่สนใจ)</Label>
                                        {servicesLoading ? (
                                            <div className="h-12 flex items-center justify-center border rounded-md bg-slate-50">
                                                <span className="text-sm text-muted-foreground">กำลังโหลด...</span>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.serviceInterest}
                                                onValueChange={(value: string) => handleInputChange('serviceInterest', value)}
                                            >
                                                <SelectTrigger className="border-[#c5a059]/30 focus:ring-[#c5a059] h-12 bg-white">
                                                    <SelectValue placeholder="เลือกบริการ..." />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px]">
                                                    {/* Surgery Services */}
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50/50 border-b border-orange-100">
                                                        🔪 Surgery
                                                    </div>
                                                    {availableServices
                                                        .filter((s: any) => s.category === 'Surgery')
                                                        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                                                        .map((service: any) => (
                                                            <SelectItem key={service.id} value={`${service.code} ${service.name}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-slate-800">{service.code} {service.name}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        {service.doctorCountries.map((c: string) => (
                                                                            <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                                {c}
                                                                            </span>
                                                                        ))}
                                                                        {service.doctorCaseTypes.map((t: string) => (
                                                                            <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${t === 'Sur'
                                                                                ? 'bg-orange-50 text-orange-600 border-orange-200'
                                                                                : 'bg-teal-50 text-teal-600 border-teal-200'
                                                                                }`}>
                                                                                {t}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    {/* Non-Surgery Services */}
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-teal-600 bg-teal-50/50 border-y border-teal-100 mt-1">
                                                        💆 Non-Surgery
                                                    </div>
                                                    {availableServices
                                                        .filter((s: any) => s.category === 'Non-Surgery')
                                                        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                                                        .map((service: any) => (
                                                            <SelectItem key={service.id} value={`${service.code} ${service.name}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-slate-800">{service.code} {service.name}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        {service.doctorCountries.map((c: string) => (
                                                                            <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                                {c}
                                                                            </span>
                                                                        ))}
                                                                        {service.doctorCaseTypes.map((t: string) => (
                                                                            <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${t === 'Sur'
                                                                                ? 'bg-orange-50 text-orange-600 border-orange-200'
                                                                                : 'bg-teal-50 text-teal-600 border-teal-200'
                                                                                }`}>
                                                                                {t}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Platform</Label>
                                            <Select
                                                value={formData.platform}
                                                onValueChange={(value: string) => handleInputChange('platform', value)}
                                            >
                                                <SelectTrigger className="h-12 bg-white border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="-">-</SelectItem>
                                                    <SelectItem value="Facebook">Facebook</SelectItem>
                                                    <SelectItem value="IG">IG</SelectItem>
                                                    <SelectItem value="Tiktok">Tiktok</SelectItem>
                                                    <SelectItem value="Line">Line</SelectItem>
                                                    <SelectItem value="Call">Call</SelectItem>
                                                    <SelectItem value="Walk In">Walk In</SelectItem>
                                                    <SelectItem value="Email">Email</SelectItem>
                                                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                                    <SelectItem value="WP Form">WP Form</SelectItem>
                                                    <SelectItem value="Agency">Agency</SelectItem>
                                                    <SelectItem value="Referral">Referral</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Source</Label>
                                            <Select
                                                value={formData.source}
                                                onValueChange={(value: string) => handleInputChange('source', value)}
                                            >
                                                <SelectTrigger className="bg-white border-slate-200">
                                                    <SelectValue placeholder="เลือก source..." />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px]">
                                                    <SelectItem value="-">-</SelectItem>
                                                    {(() => {
                                                        const platformConfig = PLATFORM_ORDER_MAPPING.find((p) => p.platform === formData.platform);
                                                        const sourceOptions = platformConfig ? platformConfig.sources : ALL_SOURCES;
                                                        return sourceOptions.map((s) => (
                                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                                        ));
                                                    })()}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="bg-slate-100 p-4 rounded-lg space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="h-4 w-4 text-slate-500" />
                                            <span className="font-semibold text-sm text-slate-700">Lifecycle Info (UQL/MQL/SQL)</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Lifecycle Stage</Label>
                                                <Select
                                                    value={formData.lifecycleStage}
                                                    onValueChange={(value: string) => handleInputChange('lifecycleStage', value)}
                                                >
                                                    <SelectTrigger className="bg-white border-slate-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="UQL">UQL</SelectItem>
                                                        <SelectItem value="MQL">MQL</SelectItem>
                                                        <SelectItem value="SQL">SQL</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">MQL TO SQL</Label>
                                                <Input
                                                    type="text"
                                                    value={formData.mqlToSqlDays}
                                                    onChange={(e) => handleInputChange('mqlToSqlDays', e.target.value)}
                                                    className="bg-white border-slate-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase text-slate-400">UQL</Label>
                                                <Input
                                                    value={formData.isUQL}
                                                    onChange={(e) => handleInputChange('isUQL', e.target.value)}
                                                    placeholder="-"
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase text-slate-400">MQL</Label>
                                                <Input
                                                    value={formData.isMQL}
                                                    onChange={(e) => handleInputChange('isMQL', e.target.value)}
                                                    placeholder="-"
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase text-slate-400">SQL</Label>
                                                <Input
                                                    value={formData.isSQL}
                                                    onChange={(e) => handleInputChange('isSQL', e.target.value)}
                                                    placeholder="-"
                                                    className="h-8 text-xs bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Status */}
                        <motion.div variants={itemVariants}>
                            <Card className="shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-50 rounded-lg">
                                            <CheckCircle2 className="h-5 w-5 text-purple-500" />
                                        </div>
                                        <CardTitle className="text-lg text-slate-700">สถานะการติดตาม</CardTitle>
                                    </div>
                                </CardHeader>
                                <Separator className="mb-4 opacity-50" />
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(value: string) => handleInputChange('status', value)}
                                            >
                                                <SelectTrigger className="h-12 bg-white border-slate-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="-">-</SelectItem>
                                                    <SelectItem value="Contact">Contact (ติดต่อแล้ว)</SelectItem>
                                                    <SelectItem value="Consulted">Consulted (ปรึกษาแล้ว)</SelectItem>
                                                    <SelectItem value="Wait for joining">Wait for joining (รอนัดหมาย)</SelectItem>
                                                    <SelectItem value="Wait for response">Wait for response (รอตอบกลับ)</SelectItem>
                                                    <SelectItem value="Sales Direct">Sales Direct (คุยกับเซลล์โดยตรง)</SelectItem>
                                                    <SelectItem value="Close Won_Consulted">Close Won (Consulted)</SelectItem>
                                                    <SelectItem value="Close Won_Not_Consulted">Close Won (Not Consulted)</SelectItem>
                                                    <SelectItem value="Close Lost_Consulted">Close Lost (Consulted)</SelectItem>
                                                    <SelectItem value="Close Lost_Not_Consulted">Close Lost (Not Consulted)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {formData.status?.includes('Close Lost') && (
                                            <div className="space-y-2">
                                                <Label>Reason Lost</Label>
                                                <Select
                                                    value={formData.reasonLost}
                                                    onValueChange={(value: string) => handleInputChange('reasonLost', value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="ระบุเหตุผลที่ปิดการขายไม่ได้" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Do somewhere else">Do somewhere else</SelectItem>
                                                        <SelectItem value="Left the group chat">Left the group chat</SelectItem>
                                                        <SelectItem value="No Feedback">No Feedback</SelectItem>
                                                        <SelectItem value="No Service">No Service</SelectItem>
                                                        <SelectItem value="Price">Price</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Right Column: Assignment & Notes (4 cols) */}
                    <div className="space-y-6 lg:col-span-4">
                        <motion.div variants={itemVariants}>
                            <Card className="shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-pink-50 rounded-lg">
                                            <Briefcase className="h-5 w-5 text-pink-500" />
                                        </div>
                                        <CardTitle className="text-lg text-slate-700">การมอบหมายงาน</CardTitle>
                                    </div>
                                    <CardDescription>Sales & Doctor</CardDescription>
                                </CardHeader>
                                <Separator className="mb-4 opacity-50" />
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Sales (AC)</Label>
                                        {filteredSales.length > 0 ? (
                                            <Select
                                                value={formData.assignedSales}
                                                onValueChange={(value: string) => handleInputChange('assignedSales', value)}
                                            >
                                                <SelectTrigger className="relative pl-9">
                                                    <div className="absolute left-3 top-2.5 pointer-events-none">
                                                        <UserIcon className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <SelectValue placeholder="ระบุชื่อ Sales" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="-">
                                                        <span className="text-slate-400">- (Unassigned)</span>
                                                    </SelectItem>
                                                    {filteredSales.map((sales: User) => (
                                                        <SelectItem key={sales.id} value={sales.name}>
                                                            <div className="flex items-center gap-2 py-1">
                                                                <span className="font-bold text-slate-800">{sales.name}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[10px] px-2 py-0 h-4 font-bold ${sales.country === "IN"
                                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                            : sales.country === "TH"
                                                                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                                : "bg-green-50 text-green-700 border-green-200"
                                                                            }`}
                                                                    >
                                                                        {sales.country === "BOTH" ? "BOTH" : sales.country}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="relative">
                                                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                                <Input
                                                    id="assignedSales"
                                                    value={formData.assignedSales}
                                                    onChange={(e) => handleInputChange('assignedSales', e.target.value)}
                                                    placeholder="ระบุชื่อ Sales"
                                                    className="pl-9"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Doctor</Label>
                                        {filteredDoctors.length > 0 ? (
                                            <Select
                                                value={formData.assignedDoctor}
                                                onValueChange={(value: string) => handleInputChange('assignedDoctor', value)}
                                            >
                                                <SelectTrigger className="relative pl-9">
                                                    <div className="absolute left-3 top-2.5 pointer-events-none">
                                                        <Stethoscope className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <SelectValue placeholder="เลือกหมอ..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="-">
                                                        <span className="text-slate-400">- (Unassigned)</span>
                                                    </SelectItem>
                                                    {filteredDoctors.map((doctor: User) => {
                                                        // Map serviceIds to service names
                                                        const doctorServices = doctor.serviceIds
                                                            ? doctor.serviceIds
                                                                .map((id: number) => services.find((s: any) => s.id === id)?.name)
                                                                .filter(Boolean)
                                                                .join(", ")
                                                            : "";

                                                        return (
                                                            <SelectItem key={doctor.id} value={doctor.name}>
                                                                <div className="flex flex-col py-1.5 gap-2">
                                                                    {/* Name Row */}
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-slate-800">{doctor.name}</span>
                                                                    </div>

                                                                    {/* Badges Row */}
                                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                                        {/* Country Badge */}
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`text-[10px] px-2 py-0 h-5 font-bold ${doctor.country === "IN"
                                                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                                : doctor.country === "TH"
                                                                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                                    : "bg-green-50 text-green-700 border-green-200"
                                                                                }`}
                                                                        >
                                                                            {doctor.country === "BOTH" ? "BOTH" : doctor.country}
                                                                        </Badge>

                                                                        {/* Case Type Badge */}
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`text-[10px] px-2 py-0 h-5 font-bold ${doctor.caseType === "Surgery"
                                                                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                                                                : doctor.caseType === "Non-Surgery"
                                                                                    ? "bg-teal-50 text-teal-700 border-teal-200"
                                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                                                }`}
                                                                        >
                                                                            {doctor.caseType === "Surgery" ? "Sur" : doctor.caseType === "Non-Surgery" ? "Non-sur" : "Both"}
                                                                        </Badge>

                                                                        {/* Service Badges (Show first 2) */}
                                                                        {doctor.serviceIds && doctor.serviceIds.slice(0, 2).map((id: number) => {
                                                                            const service = services.find((s: any) => s.id === id);
                                                                            if (!service) return null;
                                                                            return (
                                                                                <Badge
                                                                                    key={id}
                                                                                    variant="outline"
                                                                                    className="text-[10px] px-2 py-0 h-5 bg-blue-50 text-blue-700 border-blue-200 font-medium"
                                                                                >
                                                                                    {service.name}
                                                                                </Badge>
                                                                            );
                                                                        })}

                                                                        {doctor.serviceIds && doctor.serviceIds.length > 2 && (
                                                                            <span className="text-[10px] text-slate-400">
                                                                                +{doctor.serviceIds.length - 2}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="relative">
                                                <Stethoscope className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                                                <Input
                                                    id="assignedDoctor"
                                                    value={formData.assignedDoctor}
                                                    onChange={(e) => handleInputChange('assignedDoctor', e.target.value)}
                                                    placeholder="พิมพ์ชื่อหมอ"
                                                    className="pl-9"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>HN</Label>
                                            <Input
                                                value={formData.revenueWeight}
                                                onChange={(e) => handleInputChange('revenueWeight', e.target.value)}
                                                placeholder="เช่น 69030125"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>CLOSE WON MONTH</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal h-10",
                                                            !formData.closeWonMonth && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formData.closeWonMonth ? formData.closeWonMonth : "เลือกเดือน..."}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <UICalendar
                                                        mode="single"
                                                        selected={formData.closeWonMonth ? new Date(formData.closeWonMonth) : undefined}
                                                        onSelect={(date: Date | undefined) => {
                                                            if (date) {
                                                                const formatted = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                                                handleInputChange('closeWonMonth', formatted);
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Card className="shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-yellow-50 rounded-lg">
                                            <FileText className="h-5 w-5 text-yellow-500" />
                                        </div>
                                        <CardTitle className="text-lg text-slate-700">บันทึกเพิ่มเติม</CardTitle>
                                    </div>
                                </CardHeader>
                                <Separator className="mb-4 opacity-50" />
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Note General</Label>
                                        <Textarea
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            placeholder="บันทึกทั่วไป..."
                                            className="min-h-[80px] bg-white border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Remark</Label>
                                        <Textarea
                                            value={formData.remark}
                                            onChange={(e) => handleInputChange('remark', e.target.value)}
                                            placeholder="หมายเหตุเพิ่มเติม..."
                                            className="min-h-[60px] bg-white border-slate-200"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>

                <motion.div
                    variants={itemVariants}
                    className="mt-8 flex justify-end gap-3 sticky bottom-4 z-10 p-4 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-100"
                >
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onBack}
                        className="w-32"
                    >
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        className="bg-[#c5a059] hover:bg-[#008a8f] text-white w-40 gap-2 shadow-lg shadow-teal-500/20"
                    >
                        <Save className="h-4 w-4" />
                        บันทึกข้อมูล
                    </Button>
                </motion.div>
            </form>
        </motion.div>
    );
}
