import React, { useState, useMemo, useEffect } from "react";
import { CellNavProvider, useCellNav } from "./CellNavContext";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    RowData
} from "@tanstack/react-table";
import { Card, CardContent } from "./ui/card";
import {
    Search,
    Filter,
    ChevronRight,
    ChevronLeft,
    Trash2,
    Plus
} from "lucide-react";
import { Badge } from "./ui/badge";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "./ui/pagination";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "./ui/dialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotificationDialog } from "./NotificationDialog";
import { ImportCustomers } from "./ImportCustomers";
import { AssignDoctorDialog } from "./AssignDoctorDialog";
import AddNewCustomer from "./AddNewCustomer";
import { Customer, Platform, Source, LifecycleStage, CustomerStatus, User, UserRole } from "../types/crm";
import { useCustomers } from "../hooks/useCustomers";
import { useUsers } from "../hooks/useUsers";
import { useServices } from "../hooks/useServices";
import { CRMTableActions } from "./CRMTableActions";

import { getCRMColumns } from "./CRMColumns";

// ============================================
// 📦 TypeScript Module Augmentation
// ============================================

declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
        updateData: (rowIndex: number, columnId: string, value: unknown) => void
    }
}

// ============================================
//  Main CRM Management Component
// ============================================

export default function CRMManagement() {
    // ============================================
    // 🔌 API Hooks
    // ============================================
    const { users, loading: usersLoading, updateUser: updateUserInfo } = useUsers();
    const { services, loading: servicesLoading, getDoctorsForService, updateServiceDoctor } = useServices();

    // Filter users by role
    const salesUsers = useMemo(() =>
        users
            .filter(u => u.role === UserRole.SALES && u.status === 'active')
            .sort((a, b) => (a.queueOrder || 999) - (b.queueOrder || 999)),
        [users]
    );

    const doctorUsers = useMemo(() =>
        users.filter(u => u.role === UserRole.DOCTOR && u.status === 'active'),
        [users]
    );

    // Service Interest options (ใช้จาก API) — แสดงรหัส+ชื่อ เช่น "1.1 Liposuction"
    const serviceInterests = useMemo(() =>
        services.filter(s => s.isActive).map(s => `${s.code} ${s.name}`),
        [services]
    );

    // ============================================
    // 🏥 Main CRM Logic
    // ============================================

    // Use API hook
    const {
        customers: apiCustomers,
        loading: apiLoading,
        error: apiError,
        fetchCustomers,
        createCustomer: apiCreateCustomer,
        updateCustomer: apiUpdateCustomer,
        deleteCustomer: apiDeleteCustomer,
    } = useCustomers();

    const [globalFilter, setGlobalFilter] = useState("");
    const [data, setData] = useState<Customer[]>([]);
    const [importOpen, setImportOpen] = useState(false);
    const [showAddCustomer, setShowAddCustomer] = useState(false);

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const userDataStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        if (userDataStr) {
            try {
                setCurrentUser(JSON.parse(userDataStr));
            } catch (error) {
            }
        }
    }, []);

    // Bulk selection states
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    // Sync API data with local state
    useEffect(() => {
        setData(apiCustomers);
    }, [apiCustomers]);

    // Filter states
    const [filterOpen, setFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all' as CustomerStatus | 'all',
        lifecycleStage: 'all' as LifecycleStage | 'all',
        platform: 'all' as Platform | 'all',
        country: 'all' as 'TH' | 'IN' | 'all',
        assignedDoctor: 'all',
        year: 'all' as string
    });

    // Dialog states
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState("");
    const [notificationDescription, setNotificationDescription] = useState("");
    const [notificationType, setNotificationType] = useState<"success" | "error" | "loading">("success");

    // Assignment Dialog State
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<Customer | null>(null);

    const updateData = async (rowIndex: number, columnId: string, value: unknown) => {
        const customerToUpdate = filteredData[rowIndex];
        if (!customerToUpdate) return;

        // Preparation: Check for SQL status change validation
        if (columnId === 'lifecycleStage' && value === 'SQL') {
            const currentService = customerToUpdate.serviceInterest;
            if (!currentService || currentService === "" || currentService === "-") {
                setNotificationTitle("ข้อมูลไม่ครบถ้วน");
                setNotificationDescription("กรุณาระบุ 'Service Interest' ก่อนเปลี่ยนสถานะเป็น SQL เพื่อให้ระบบจัดสรรแพทย์ได้ถูกต้อง");
                setNotificationType("error");
                setNotificationOpen(true);
                return;
            }
        }

        // Prepare update data
        const updatePayload: Partial<Customer> = { [columnId]: value };

        // Update via API (Rotation Logic is now handled by Backend)
        apiUpdateCustomer(customerToUpdate.id, updatePayload)
            .then((updatedCustomer) => {
                setData(old =>
                    old.map((row) => {
                        if (row.id === customerToUpdate.id) {
                            return updatedCustomer; // Backend returns full object including auto-assigned Sales/Doctor
                        }
                        return row;
                    })
                );
            })
            .catch((error) => {
                setData(apiCustomers); // Rollback on error
            });
    };


    const handleDeleteClick = (customer: Customer) => {
        setSelectedCustomer(customer);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedCustomer) {
            setNotificationTitle("กำลังลบ");
            setNotificationDescription("กรุณารอสักครู่...");
            setNotificationType("loading");
            setNotificationOpen(true);
            setConfirmOpen(false);

            try {
                await apiDeleteCustomer(selectedCustomer.id);
                setNotificationTitle("ลบสำเร็จ!");
                setNotificationDescription(`${selectedCustomer.displayName} ถูกลบออกจากระบบแล้ว`);
                setNotificationType("success");
            } catch (error) {
                setNotificationTitle("เกิดข้อผิดพลาด");
                setNotificationDescription("ไม่สามารถลบลูกค้าได้");
                setNotificationType("error");
            }
        }
    };

    // Bulk selection handlers
    const toggleRowSelection = (customerId: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(customerId)) {
            newSelected.delete(customerId);
        } else {
            newSelected.add(customerId);
        }
        setSelectedRows(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredData.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredData.map(c => c.id)));
        }
    };

    const handleBulkDelete = () => {
        if (selectedRows.size > 0) {
            setBulkDeleteOpen(true);
        }
    };

    const confirmBulkDelete = async () => {
        setNotificationTitle("กำลังลบ");
        setNotificationDescription(`กำลังลบ ${selectedRows.size} รายการ...`);
        setNotificationType("loading");
        setNotificationOpen(true);
        setBulkDeleteOpen(false);

        try {
            let successCount = 0;
            let failCount = 0;

            for (const id of selectedRows) {
                try {
                    await apiDeleteCustomer(id);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }

            setSelectedRows(new Set());

            // Check if all customers are deleted (data is empty)
            if (successCount > 0 && data.length === selectedRows.size) {
                // Reset all queues to default
                try {
                    await resetAllQueues();
                } catch (err) {
                }
            }

            if (failCount === 0) {
                setNotificationTitle("ลบสำเร็จ!");
                setNotificationDescription(`ลบ ${successCount} รายการเรียบร้อยแล้ว`);
                setNotificationType("success");
            } else {
                setNotificationTitle("ลบเสร็จสิ้น");
                setNotificationDescription(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`);
                setNotificationType("error");
            }
        } catch (error) {
            setNotificationTitle("เกิดข้อผิดพลาด");
            setNotificationDescription("ไม่สามารถลบข้อมูลได้");
            setNotificationType("error");
        }
    };

    // Handle notification dialog close
    const handleNotificationClose = (open: boolean) => {
        setNotificationOpen(open);

        if (!open && notificationType === 'success') {
            fetchCustomers();
        }
    };

    // Reset all queues to default
    const resetAllQueues = async () => {
        try {
            // Reset Sales queue
            for (const sales of salesUsers) {
                if (sales.queueOrder !== 0) {
                    await updateUserInfo(sales.id, { queueOrder: 0 });
                }
            }

            // Reset Doctor queue in all services
            for (const service of services) {
                if (service.isActive) {
                    try {
                        const serviceDoctors = await getDoctorsForService(service.id);
                        for (const doc of serviceDoctors) {
                            if (doc.displayOrder !== 0) {
                                await updateServiceDoctor(service.id, doc.id, { displayOrder: 0 });
                            }
                        }
                    } catch (err) {
                    }
                }
            }
        } catch (err) {
        }
    };

    // Apply filters to data
    const filteredData = useMemo(() => {
        return data.filter(customer => {
            // Apply Role-based Filter (SALES sees only their customers)
            if (currentUser?.role === UserRole.SALES) {
                if (customer.assignedSales !== currentUser.name) {
                    return false;
                }
            }

            if (filters.status !== 'all' && customer.status !== filters.status) {
                return false;
            }
            if (filters.lifecycleStage !== 'all' && customer.lifecycleStage !== filters.lifecycleStage) {
                return false;
            }
            if (filters.platform !== 'all' && customer.platform !== filters.platform) {
                return false;
            }
            if (filters.country !== 'all' && customer.country !== filters.country) {
                return false;
            }
            if (filters.assignedDoctor !== 'all' && customer.assignedDoctor !== filters.assignedDoctor) {
                return false;
            }

            // Year Filter: Backend stores createdAt as YYYY-MM-DD (Bangkok time)
            // e.g. "2026-02-19".split('-')[0] → "2026"
            if (filters.year !== 'all') {
                const customerYear = customer.createdAt ? customer.createdAt.split('T')[0].split('-')[0] : '';
                if (customerYear !== filters.year) return false;
            }

            return true;
        }).sort((a, b) => (b.id || 0) - (a.id || 0));
    }, [data, filters, currentUser]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.lifecycleStage !== 'all') count++;
        if (filters.platform !== 'all') count++;
        if (filters.country !== 'all') count++;
        if (filters.assignedDoctor !== 'all') count++;
        if (filters.year !== 'all') count++;
        return count;
    }, [filters]);

    // Reset filters
    const resetFilters = () => {
        setFilters({
            status: 'all',
            lifecycleStage: 'all',
            platform: 'all',
            country: 'all',
            assignedDoctor: 'all',
            year: 'all'
        });
    };

    // Use external column definitions
    const columns = useMemo(() => getCRMColumns({
        selectedRows,
        filteredData,
        toggleSelectAll,
        toggleRowSelection,
        handleDeleteClick,
        serviceInterests,
        doctorUsers,
        salesUsers
    }), [selectedRows, filteredData, serviceInterests, doctorUsers, salesUsers]);

    const table = useReactTable({
        data: filteredData,
        columns,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        meta: { updateData },
        initialState: { pagination: { pageSize: 15 } },
        state: { globalFilter },
    });

    // ── Ordered list of editable column IDs (for keyboard navigation) ──
    const NAVIGABLE_COL_IDS = [
        'createdAt', 'month', 'customerId', 'notes', 'country',
        'lineUid', 'lineId', 'displayName', 'phone', 'email',
        'platform', 'source', 'serviceInterest', 'lifecycleStage',
        'isUQL', 'isMQL', 'isSQL', 'mqlToSqlDays', 'closeWonMonth',
        'revenueWeight', 'reasonLost', 'assignedSales', 'status',
        'remark', 'assignedDoctor'
    ];

    // Add new empty row (inline, no dialog)
    const handleAddNewRow = async () => {
        try {
            // Use Bangkok timezone for createdAt (consistent with backend)
            const bangkokDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date());

            const emptyCustomer: any = {
                // Do NOT send customerId — backend will auto-generate in format TH20260200001
                displayName: '',
                phone: '',
                email: '',
                platform: '-',
                country: 'TH',
                source: '-',
                serviceInterest: '',
                lifecycleStage: 'MQL',
                status: '-',
                isUQL: '',
                isMQL: '',
                isSQL: '',
                mqlToSqlDays: '-',
                closeWonMonth: '',
                revenueWeight: '-',
                assignedSales: '-',
                assignedDoctor: '-',
                isInactive: false,
                notes: '',
                remark: '',
                month: new Date().getMonth() + 1,
                createdAt: bangkokDate,
            };

            const newCustomer = await apiCreateCustomer(emptyCustomer);
            setData(prev => [...prev, newCustomer]);
            // Go to first page so the new row is visible at the top
            setTimeout(() => {
                table.setPageIndex(0);

            }, 50);
        } catch (error) {
            setNotificationTitle("เกิดข้อผิดพลาด");
            setNotificationDescription("ไม่สามารถเพิ่มแถวใหม่ได้ กรุณาลองใหม่");
            setNotificationType("error");
            setNotificationOpen(true);
        }
    };

    const handleImport = () => {
        setImportOpen(true);
    };

    // If showing add customer form, render it instead
    if (showAddCustomer) {
        return (
            <AddNewCustomer
                onBack={() => setShowAddCustomer(false)}
                onSuccess={() => {
                    setShowAddCustomer(false);
                    fetchCustomers();
                    table.setPageIndex(0);
                }}
            />
        );
    }

    return (
        <CellNavProvider navigableColIds={NAVIGABLE_COL_IDS} totalRows={filteredData.length}>
            <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                {/* Dialogs */}
                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="ยืนยันการลบ"
                    description={`คุณต้องการลบ "${selectedCustomer?.displayName}" ออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
                    onConfirm={handleConfirmDelete}
                    confirmText="ลบ"
                    cancelText="ยกเลิก"
                />

                <ConfirmDialog
                    open={bulkDeleteOpen}
                    onOpenChange={setBulkDeleteOpen}
                    title="ยืนยันการลบหลายรายการ"
                    description={`คุณต้องการลบ ${selectedRows.size} รายการที่เลือกออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
                    onConfirm={confirmBulkDelete}
                    confirmText="ลบทั้งหมด"
                    cancelText="ยกเลิก"
                />

                <NotificationDialog
                    open={notificationOpen}
                    onOpenChange={handleNotificationClose}
                    title={notificationTitle}
                    description={notificationDescription}
                    type={notificationType}
                />

                <ImportCustomers
                    open={importOpen}
                    onOpenChange={setImportOpen}
                    onImportComplete={() => {
                        fetchCustomers();
                    }}
                    defaultYear={filters.year === 'all' ? undefined : filters.year}
                />

                {assignTarget && (
                    <AssignDoctorDialog
                        open={assignDialogOpen}
                        onOpenChange={setAssignDialogOpen}
                        customer={assignTarget}
                        services={services}
                        onSuccess={() => {
                            fetchCustomers();
                            setAssignDialogOpen(false);
                        }}
                        getDoctorsForService={getDoctorsForService}
                        updateServiceDoctor={updateServiceDoctor}
                    />
                )}

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-white via-[#c5a059]/[0.01] to-transparent border border-slate-100/50 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ค้นหาลูกค้า..."
                                className="pl-9 h-11 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md hover:border-[#c5a059]/30 focus:border-[#c5a059] transition-all duration-300"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setFilterOpen(true)}
                            className="gap-2 text-slate-600 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-all duration-300"
                        >
                            <Filter className="h-4 w-4" />
                            ตัวกรอง
                            {activeFilterCount > 0 && (
                                <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-[#c5a059] text-white text-xs">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>

                        {/* Improved Year & Country Selection UI */}
                        <div className="flex items-center gap-1 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm transition-all duration-500 hover:shadow-md hover:bg-white/60">
                            {['2024', '2025', '2026'].map((y) => (
                                <div key={y} className="flex items-center gap-1 px-1 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <button
                                        onClick={() => setFilters(prev => ({ ...prev, year: y, country: 'all' }))}
                                        className={`h-8 px-2.5 text-xs font-bold rounded-lg transition-all duration-300 ${filters.year === y && filters.country === 'all'
                                            ? "bg-white text-[#c5a059] shadow-sm ring-1 ring-[#c5a059]/10"
                                            : "text-slate-500 hover:text-[#c5a059] hover:bg-white/80"
                                            }`}
                                    >
                                        {y}
                                    </button>
                                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200/60 py-1.5">
                                        {[
                                            { code: 'TH', label: 'TH' },
                                            { code: 'IN', label: 'IN' }
                                        ].map((c) => (
                                            <button
                                                key={c.code}
                                                onClick={() => setFilters(prev => ({ ...prev, year: y, country: c.code as 'TH' | 'IN' }))}
                                                className={`w-7 h-7 flex items-center justify-center text-[10px] font-extrabold rounded-lg transition-all duration-300 ${filters.year === y && filters.country === c.code
                                                    ? "bg-gradient-to-br from-[#c5a059] to-[#01c4cb] text-white shadow-md shadow-[#c5a059]/20 scale-105"
                                                    : "bg-white/30 text-slate-400 hover:bg-white hover:text-[#c5a059] hover:shadow-sm"
                                                    }`}
                                                title={`${y} - ${c.code === 'TH' ? 'Thailand' : 'International'}`}
                                            >
                                                {c.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="w-[1px] h-6 bg-slate-200 mx-2" />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilters(prev => ({ ...prev, year: 'all', country: 'all' }))}
                                className={`h-8 px-4 text-xs font-bold rounded-xl transition-all duration-300 ${filters.year === 'all'
                                    ? "bg-gradient-to-br from-[#c5a059] to-[#01c4cb] text-white shadow-md shadow-[#c5a059]/20"
                                    : "text-slate-500 hover:text-[#c5a059] hover:bg-white hover:shadow-sm"
                                    }`}
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                    ทั้งหมด
                                </span>
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <CRMTableActions
                            onAddCustomer={() => setShowAddCustomer(true)}
                            onImport={handleImport}
                            selectedRowsCount={selectedRows.size}
                            onBulkDelete={handleBulkDelete}
                            filteredData={filteredData}
                            setNotificationOpen={setNotificationOpen}
                            setNotificationTitle={setNotificationTitle}
                            setNotificationDescription={setNotificationDescription}
                            setNotificationType={setNotificationType}
                        />
                    </div>
                </div>

                {/* Filter Dialog */}
                <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-[#4a4a4a] text-xl">ตัวกรองข้อมูล</DialogTitle>
                            <DialogDescription>
                                กรองข้อมูลลูกค้าตามเงื่อนไขที่ต้องการ
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">สถานะลูกค้า</Label>
                                <Select
                                    value={filters.status}
                                    onValueChange={(value: CustomerStatus | 'all') => setFilters({ ...filters, status: value })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        <SelectItem value="Close Lost_Consulted">Close Lost_Consulted</SelectItem>
                                        <SelectItem value="Close Lost_Not_Consulted">Close Lost_Not_Consulted</SelectItem>
                                        <SelectItem value="Close Won_Consulted">Close Won_Consulted</SelectItem>
                                        <SelectItem value="Close won_Not_Consulted">Close won_Not_Consulted</SelectItem>
                                        <SelectItem value="Consulted">Consulted</SelectItem>
                                        <SelectItem value="Contact">Contact</SelectItem>
                                        <SelectItem value="Sales Direct">Sales Direct</SelectItem>
                                        <SelectItem value="Wait for joining">Wait for joining</SelectItem>
                                        <SelectItem value="Wait for response">Wait for response</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Lifecycle Stage Filter */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">ขั้นตอนลูกค้า</Label>
                                <Select
                                    value={filters.lifecycleStage}
                                    onValueChange={(value: LifecycleStage | 'all') => setFilters({ ...filters, lifecycleStage: value })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        <SelectItem value="MQL">MQL</SelectItem>
                                        <SelectItem value="SQL">SQL</SelectItem>
                                        <SelectItem value="UQL">UQL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Platform Filter */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">แพลตฟอร์ม</Label>
                                <Select
                                    value={filters.platform}
                                    onValueChange={(value: Platform | 'all') => setFilters({ ...filters, platform: value })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
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

                            {/* Country Filter */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">ประเทศ</Label>
                                <Select
                                    value={filters.country}
                                    onValueChange={(value: 'TH' | 'IN' | 'all') => setFilters({ ...filters, country: value })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                                        <SelectItem value="IN">🌏 International</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Assigned Doctor Filter */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">หมอประจำ</Label>
                                <Select
                                    value={filters.assignedDoctor}
                                    onValueChange={(value: string) => setFilters({ ...filters, assignedDoctor: value })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ทั้งหมด</SelectItem>
                                        {doctorUsers.map((doctor) => (
                                            <SelectItem key={doctor.id} value={doctor.name}>
                                                {doctor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="flex gap-2 sm:gap-2">
                            <Button
                                variant="outline"
                                onClick={resetFilters}
                                className="flex-1"
                            >
                                ล้างตัวกรอง
                            </Button>
                            <Button
                                onClick={() => setFilterOpen(false)}
                                className="flex-1 bg-[#c5a059] hover:bg-[#008a8f] text-white"
                            >
                                ใช้ตัวกรอง ({activeFilterCount})
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Table Card */}
                <Card className="
                relative overflow-hidden
                bg-gradient-to-br from-white via-[#c5a059]/[0.02] to-[#c9b896]/[0.03]
                border-none
                shadow-[0_4px_24px_-2px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,171,177,0.12)]
                hover:shadow-[0_8px_40px_-4px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(0,171,177,0.18)]
                transition-all duration-500 ease-out
                rounded-2xl
                group
            ">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent opacity-60" />

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#c5a059]/0 via-[#c5a059]/0 to-[#c5a059]/0 group-hover:from-[#c5a059]/[0.03] group-hover:via-[#c5a059]/[0.01] group-hover:to-transparent transition-all duration-700 pointer-events-none" />

                    <style>{`
          .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 5px; border: 2px solid #f8fafc; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>

                    <div className="overflow-x-auto custom-scrollbar relative z-10">
                        <table className="w-full" style={{ width: table.getTotalSize() }}>
                            <thead className="bg-[#f5f3ef] border-b border-[#e5e5e5]">
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                className="relative group text-left py-4 px-4 text-xs font-semibold text-[#4a4a4a] uppercase tracking-wider"
                                                style={{ width: header.getSize() }}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <div
                                                    onMouseDown={header.getResizeHandler()}
                                                    onTouchStart={header.getResizeHandler()}
                                                    className="absolute top-0 right-0 h-full w-4 cursor-col-resize flex items-center justify-center touch-none select-none z-10 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <div className="h-full w-[2px] bg-[#c5a059]" />
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="bg-white">
                                {table.getRowModel().rows.map(row => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-slate-50 hover:bg-[#c5a059]/5 transition-colors group"
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td
                                                key={cell.id}
                                                className="py-4 px-4 text-sm text-slate-600 truncate"
                                                style={{ width: cell.column.getSize() }}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* "+" button row to add new customer */}
                        <div
                            onClick={handleAddNewRow}
                            className="flex items-center gap-2 px-4 py-3 border-t border-dashed border-slate-200 cursor-pointer hover:bg-[#c5a059]/5 transition-colors group/add"
                        >
                            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed border-slate-300 group-hover/add:border-[#c5a059] transition-colors">
                                <Plus className="h-3.5 w-3.5 text-slate-400 group-hover/add:text-[#c5a059] transition-colors" />
                            </div>
                            <span className="text-sm text-slate-400 group-hover/add:text-[#c5a059] transition-colors">

                            </span>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-200/50 flex items-center justify-between bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50 text-sm text-slate-500 relative z-10">
                        <div>
                            แสดง {table.getRowModel().rows.length} จาก {filteredData.length} รายการ
                            {activeFilterCount > 0 && (
                                <span className="ml-2 text-[#c5a059]">
                                    (กรองแล้ว {activeFilterCount} เงื่อนไข)
                                </span>
                            )}
                        </div>
                        <Pagination className="w-auto mx-0">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious onClick={() => table.previousPage()} className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                </PaginationItem>
                                <PaginationItem><PaginationLink isActive>{table.getState().pagination.pageIndex + 1}</PaginationLink></PaginationItem>
                                <PaginationItem>
                                    <PaginationNext onClick={() => table.nextPage()} className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </Card>

                {assignTarget && (
                    <AssignDoctorDialog
                        open={assignDialogOpen}
                        onOpenChange={setAssignDialogOpen}
                        customer={assignTarget}
                        services={services}
                        onSuccess={() => {
                            fetchCustomers();
                            setAssignDialogOpen(false);
                        }}
                        getDoctorsForService={getDoctorsForService}
                        updateServiceDoctor={updateServiceDoctor}
                    />
                )}

                <NotificationDialog
                    open={notificationOpen}
                    onOpenChange={setNotificationOpen}
                    title={notificationTitle}
                    description={notificationDescription}
                    type={notificationType}
                />

                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="ยืนยันการลบลูกค้า"
                    description={`คุณต้องการลบลูกค้า "${selectedCustomer?.displayName}" ใช่หรือไม่?`}
                    onConfirm={handleConfirmDelete}
                    confirmText="ลบข้อมูล"
                    cancelText="ยกเลิก"
                />

                <ConfirmDialog
                    open={bulkDeleteOpen}
                    onOpenChange={setBulkDeleteOpen}
                    title={`ยืนยันการลบ ${selectedRows.size} รายการ`}
                    description="การกระทำนี้ไม่สามารถเรียกคืนข้อมูลได้ คุณแน่ใจหรือไม่?"
                    onConfirm={confirmBulkDelete}
                    confirmText="ลบข้อมูล"
                    cancelText="ยกเลิก"
                />
            </div>
        </CellNavProvider>
    );
}
