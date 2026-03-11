import React from "react";
import { Button } from "./ui/button";
import { Plus, Trash2, Upload, Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { exportCustomersToCSV, exportCustomersToExcel } from "../utils/exportUtils";
import { Customer } from "../types/crm";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface CRMTableActionsProps {
    onAddCustomer: () => void;
    onImport: () => void;
    selectedRowsCount: number;
    onBulkDelete: () => void;
    filteredData: Customer[];
    setNotificationOpen: (open: boolean) => void;
    setNotificationTitle: (title: string) => void;
    setNotificationDescription: (desc: string) => void;
    setNotificationType: (type: "success" | "error" | "loading") => void;
}

export const CRMTableActions: React.FC<CRMTableActionsProps> = ({
    onAddCustomer,
    onImport,
    selectedRowsCount,
    onBulkDelete,
    filteredData,
    setNotificationOpen,
    setNotificationTitle,
    setNotificationDescription,
    setNotificationType
}) => {
    const handleExport = (format: 'csv' | 'excel') => {
        setNotificationTitle("กำลังส่งออกข้อมูล");
        setNotificationDescription(`กำลังสร้างไฟล์ ${format.toUpperCase()}...`);
        setNotificationType("loading");
        setNotificationOpen(true);

        setTimeout(() => {
            try {
                if (format === 'csv') {
                    exportCustomersToCSV(filteredData);
                } else {
                    exportCustomersToExcel(filteredData);
                }
                setNotificationTitle("ส่งออกสำเร็จ!");
                setNotificationDescription(`ส่งออก ${filteredData.length} รายการเรียบร้อยแล้ว`);
                setNotificationType("success");
            } catch (error) {
                setNotificationTitle("เกิดข้อผิดพลาด");
                setNotificationDescription("ไม่สามารถส่งออกข้อมูลได้");
                setNotificationType("error");
            }
        }, 800);
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            <Button
                onClick={onAddCustomer}
                className="gap-2 bg-[#c5a059] hover:bg-[#008a8f] text-white transition-all duration-300 shadow-sm"
            >
                <Plus className="h-4 w-4" />
                เพิ่มลูกค้าใหม่
            </Button>

            {selectedRowsCount > 0 && (
                <Button
                    variant="destructive"
                    onClick={onBulkDelete}
                    className="gap-2 bg-[#800200] hover:bg-[#600100] transition-all duration-300 shadow-sm"
                >
                    <Trash2 className="h-4 w-4" />
                    ลบที่เลือก ({selectedRowsCount})
                </Button>
            )}

            <Button
                variant="ghost"
                onClick={onImport}
                className="gap-2 text-slate-600 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-all duration-300"
            >
                <Upload className="h-4 w-4" />
                Import
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="gap-2 text-slate-600 hover:text-[#c5a059] hover:bg-[#c5a059]/5 transition-all duration-300"
                    >
                        <Download className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                    <DropdownMenuItem
                        onClick={() => handleExport('excel')}
                        className="gap-2 cursor-pointer focus:bg-[#c5a059]/5 focus:text-[#c5a059]"
                    >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                        Export Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleExport('csv')}
                        className="gap-2 cursor-pointer focus:bg-[#c5a059]/5 focus:text-[#c5a059]"
                    >
                        <FileText className="h-4 w-4 text-blue-500" />
                        Export CSV (.csv)
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
