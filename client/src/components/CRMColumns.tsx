import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Customer, User } from "../types/crm";
import { Trash2 } from "lucide-react";
import { EditableCell } from "./EditableCell";
import { PLATFORM_ORDER_MAPPING, ALL_SOURCES } from "../constants/platformMapping";
// ============================================
// 📊 Column Definitions Generator
// ============================================

interface CRMColumnsProps {
    selectedRows: Set<number>;
    filteredData: Customer[];
    toggleSelectAll: () => void;
    toggleRowSelection: (id: number) => void;
    handleDeleteClick: (customer: Customer) => void;
    serviceInterests: string[];
    doctorUsers: User[];
    salesUsers: User[];
}

const formatDisplayDate = (val: any) => {
    if (!val || typeof val !== 'string') return val || '-';
    // If it's YYYY-MM-DD, format to D/M/YYYY
    if (val.includes('-')) {
        const parts = val.split('-');
        if (parts.length === 3) {
            return `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
        }
    }
    return val;
};

export const getCRMColumns = ({
    selectedRows,
    filteredData,
    toggleSelectAll,
    toggleRowSelection,
    handleDeleteClick,
    serviceInterests,
    doctorUsers,
    salesUsers
}: CRMColumnsProps): ColumnDef<Customer>[] => [
        // Checkbox
        {
            id: "select",
            header: () => (
                <div className="flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-[#c5a059] focus:ring-[#c5a059] cursor-pointer"
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selectedRows.has(row.original.id)}
                        onChange={() => toggleRowSelection(row.original.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#c5a059] focus:ring-[#c5a059] cursor-pointer"
                    />
                </div>
            ),
            size: 50,
        },
        // ID
        {
            id: "id",
            accessorKey: "id",
            header: "#",
            size: 50,
            cell: info => <div className="text-center text-muted-foreground">{info.row.index + 1}</div>
        },
        // Action
        {
            id: "actions",
            header: "Action",
            size: 80,
            cell: ({ row }) => (
                <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleDeleteClick(row.original)}
                        className="text-[#800200] hover:text-[#600100] transition-colors text-xs flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded"
                        title="ลบลูกค้า"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )
        },
        // Date
        { id: "createdAt", accessorKey: "createdAt", header: "Date", size: 110, cell: info => <EditableCell {...info as any} isDate={true} renderDisplay={formatDisplayDate} /> },
        // Month
        { id: "month", accessorKey: "month", header: "Month", size: 70, cell: info => <EditableCell {...info as any} /> },
        // Year (computed from createdAt)
        {
            id: "year",
            accessorKey: "createdAt",
            header: "Year",
            size: 70,
            cell: info => {
                const val = info.getValue() as string;
                const year = val && typeof val === 'string' && val.includes('-') ? val.split('-')[0] : '-';
                return <div className="text-center text-slate-600">{year}</div>;
            }
        },
        // Customer ID
        { id: "customerId", accessorKey: "customerId", header: "Customer ID", size: 120, cell: info => <EditableCell {...info as any} /> },
        // TH/IN
        {
            id: "country", accessorKey: "country", header: "TH/IN Status", size: 100, cell: info => <EditableCell {...info as any} options={[
                { label: "TH", value: "TH" },
                { label: "IN", value: "IN" }
            ]} />
        },
        // Line UID
        { id: "lineUid", accessorKey: "lineUid", header: "Line UID", size: 140, cell: info => <EditableCell {...info as any} renderDisplay={(val) => val || '-'} /> },
        // Line ID
        { id: "lineId", accessorKey: "lineId", header: "Line ID", size: 110, cell: info => <EditableCell {...info as any} renderDisplay={(val) => val || '-'} /> },
        // Display Name
        { id: "displayName", accessorKey: "displayName", header: "Display Name", size: 160, cell: info => <EditableCell {...info as any} /> },
        // Phone/WhatsApp
        { id: "phone", accessorKey: "phone", header: "Phone/WhatsApp", size: 140, cell: info => <EditableCell {...info as any} /> },
        // Email
        { id: "email", accessorKey: "email", header: "Email", size: 200, cell: info => <EditableCell {...info as any} /> },
        // Platform
        {
            id: "platform",
            accessorKey: "platform",
            header: "Platform",
            size: 110,
            cell: info => <EditableCell {...info as any} options={[
                { label: "Facebook", value: "Facebook" },
                { label: "IG", value: "IG" },
                { label: "Tiktok", value: "Tiktok" },
                { label: "Line", value: "Line" },
                { label: "Call", value: "Call" },
                { label: "Walk In", value: "Walk In" },
                { label: "Email", value: "Email" },
                { label: "WhatsApp", value: "WhatsApp" },
                { label: "WP Form", value: "WP Form" },
                { label: "Agency", value: "Agency" },
                { label: "Referral", value: "Referral" }
            ]} />
        },
        // Source
        {
            id: "source",
            accessorKey: "source",
            header: "Source",
            size: 140,
            cell: info => {
                const rowPlatform = info.row.original.platform;
                let sourceOptions = ALL_SOURCES;

                if (rowPlatform) {
                    const platformConfig = PLATFORM_ORDER_MAPPING.find(p => p.platform === rowPlatform);
                    if (platformConfig) {
                        sourceOptions = platformConfig.sources;
                    }
                }

                return (
                    <EditableCell
                        {...info as any}
                        options={sourceOptions.map(s => ({ label: s, value: s }))}
                    />
                );
            }
        },
        // Service Interest
        {
            id: "serviceInterest",
            accessorKey: "serviceInterest",
            header: "Service Interest",
            size: 200,
            cell: info => (
                <EditableCell
                    {...info as any}
                    options={serviceInterests.map(s => ({ label: s, value: s }))}
                />
            )
        },
        // Lifecycle Stage
        {
            id: "lifecycleStage",
            accessorKey: "lifecycleStage",
            header: "Lifecycle Stage",
            size: 130,
            cell: info => <EditableCell {...info as any} options={[
                { label: "MQL", value: "MQL" },
                { label: "SQL", value: "SQL" },
                { label: "UQL", value: "UQL" }
            ]} />
        },
        // UQL
        { id: "isUQL", accessorKey: "isUQL", header: "UQL", size: 60, cell: info => <EditableCell {...info as any} /> },
        // MQL
        { id: "isMQL", accessorKey: "isMQL", header: "MQL", size: 60, cell: info => <EditableCell {...info as any} /> },
        // SQL
        { id: "isSQL", accessorKey: "isSQL", header: "SQL", size: 60, cell: info => <EditableCell {...info as any} /> },
        // MQL to SQL
        { id: "mqlToSqlDays", accessorKey: "mqlToSqlDays", header: "MQL TO SQL", size: 100, cell: info => <EditableCell {...info as any} renderDisplay={(val) => val || '-'} /> },
        // Close Won Month
        { id: "closeWonMonth", accessorKey: "closeWonMonth", header: "CLOSE WON MONTH", size: 140, cell: info => <EditableCell {...info as any} isDate={true} renderDisplay={formatDisplayDate} /> },
        // HN
        { id: "revenueWeight", accessorKey: "revenueWeight", header: "HN", size: 100, cell: info => <EditableCell {...info as any} renderDisplay={(val) => val || '-'} /> },
        // Status
        {
            id: "status",
            accessorKey: "status",
            header: "Status",
            size: 180,
            cell: info => (
                <EditableCell {...info as any} options={[
                    { label: "Contact (ติดต่อแล้ว)", value: "Contact" },
                    { label: "Consulted (ปรึกษาแล้ว)", value: "Consulted" },
                    { label: "Wait for joining (รอนัดหมาย)", value: "Wait for joining" },
                    { label: "Wait for response (รอตอบกลับ)", value: "Wait for response" },
                    { label: "Sales Direct (คุยกับเซลล์โดยตรง)", value: "Sales Direct" },
                    { label: "Close Won (Consulted)", value: "Close Won_Consulted" },
                    { label: "Close Won (Not Consulted)", value: "Close Won_Not_Consulted" },
                    { label: "Close Lost (Consulted)", value: "Close Lost_Consulted" },
                    { label: "Close Lost (Not Consulted)", value: "Close Lost_Not_Consulted" }
                ]} />
            )
        },
        // Reason Lost
        {
            id: "reasonLost",
            accessorKey: "reasonLost",
            header: "Reason Lost",
            size: 160,
            cell: info => (
                <EditableCell {...info as any} options={[
                    { label: "Do somewhere else", value: "Do somewhere else" },
                    { label: "Left the group chat", value: "Left the group chat" },
                    { label: "No Feedback", value: "No Feedback" },
                    { label: "No Service", value: "No Service" },
                    { label: "Other", value: "Other" },
                    { label: "Price", value: "Price" }
                ]} />
            )
        },
        // Sales (AC)
        {
            id: "assignedSales",
            accessorKey: "assignedSales",
            header: "Sales (AC)",
            size: 140,
            cell: info => {
                const rowCountry = info.row.original.country;
                // Filter sales based on row country, but show all if country is not set
                const filteredSalesOptions = salesUsers
                    .filter(s => {
                        if (!rowCountry) return true; // Show all if no country set
                        return s.country === rowCountry || s.country === 'BOTH';
                    })
                    .map(s => ({ label: s.name, value: s.name }));
                return <EditableCell {...info as any} options={filteredSalesOptions} />;
            }
        },
        // Remark
        { id: "remark", accessorKey: "remark", header: "Remark", size: 200, cell: info => <EditableCell {...info as any} renderDisplay={(val) => val || '-'} /> },
        // Doctor
        {
            id: "assignedDoctor",
            accessorKey: "assignedDoctor",
            header: "Doctor",
            size: 160,
            cell: info => <EditableCell {...info as any} options={doctorUsers.map(d => ({ label: d.name, value: d.name }))} renderDisplay={(val) => <span className="text-muted-foreground">{val}</span>} />
        },
        // วันทำงานของแอดมินไทย
        { id: "notes", accessorKey: "notes", header: "วันทำงานของแอดมินไทย", size: 200, cell: info => <EditableCell {...info as any} renderDisplay={(val) => val || '-'} /> }
    ];
