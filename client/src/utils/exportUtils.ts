import { Customer } from "../types/crm";
import * as XLSX from 'xlsx';

export const exportCustomersToCSV = (data: Customer[]) => {
    const headers = [
        '#', 'Date', 'Month', 'Year', 'Customer ID', 'TH/IN', 'Line UID', 'Line ID',
        'Display Name', 'Phone/WhatsApp', 'Email', 'Platform', 'Source', 'Service Interest',
        'Lifecycle Stage', 'UQL', 'MQL', 'SQL', 'MQL to SQL', 'Close Won Month',
        'HN', 'Status', 'Reason Lost', 'SALES (AC)', 'Doctor', 'Remark', 'วันทำงานของแอดมินไทย'
    ];

    const sortedData = [...data].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        const dateCompare = dateB.getTime() - dateA.getTime(); // Reverse for newest first
        if (dateCompare !== 0) return dateCompare;
        return (b.id || 0) - (a.id || 0); // Reverse for newest first
    });

    const csvRows = [
        headers.join(','),
        ...sortedData.map((customer, index) => {
            const year = customer.createdAt && typeof customer.createdAt === 'string' && customer.createdAt.includes('-') 
                ? customer.createdAt.split('-')[0] 
                : '-';
            const values = [
                index + 1, // ใช้ลำดับแถว 1, 2, 3... แทน Real ID เพื่อให้ตรงกับหน้าจอ
                `"${customer.createdAt || '-'}"`,
                `"${customer.month || '-'}"`,
                `"${year}"`,
                `"${customer.customerId || '-'}"`,
                `"${customer.country || '-'}"`,
                `"${customer.lineUid || '-'}"`,
                `"${customer.lineId || '-'}"`,
                `"${customer.displayName || '-'}"`,
                `"${customer.phone || '-'}"`,
                `"${customer.email || '-'}"`,
                `"${customer.platform || '-'}"`,
                `"${customer.source || '-'}"`,
                `"${customer.serviceInterest || '-'}"`,
                `"${customer.lifecycleStage || '-'}"`,
                `"${customer.isUQL || '-'}"`,
                `"${customer.isMQL || '-'}"`,
                `"${customer.isSQL || '-'}"`,
                `"${customer.mqlToSqlDays || '0'}"`,
                `"${customer.closeWonMonth || '-'}"`,
                customer.revenueWeight || 0,
                `"${customer.status || '-'}"`,
                `"${customer.reasonLost || '-'}"`,
                `"${customer.assignedSales || '-'}"`,
                `"${customer.assignedDoctor || '-'}"`,
                `"${customer.remark || '-'}"`,
                `"${customer.notes || '-'}"`
            ];
            return values.join(',');
        })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportCustomersToExcel = (data: Customer[]) => {
    const headers = [
        '#', 'Date', 'Month', 'Year', 'Customer ID', 'TH/IN', 'Line UID', 'Line ID',
        'Display Name', 'Phone/WhatsApp', 'Email', 'Platform', 'Source', 'Service Interest',
        'Lifecycle Stage', 'UQL', 'MQL', 'SQL', 'MQL to SQL', 'Close Won Month',
        'HN', 'Status', 'Reason Lost', 'SALES (AC)', 'Doctor', 'Remark', 'วันทำงานของแอดมินไทย'
    ];

    const sortedData = [...data].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        const dateCompare = dateB.getTime() - dateA.getTime(); // Reverse for newest first
        if (dateCompare !== 0) return dateCompare;
        return (b.id || 0) - (a.id || 0); // Reverse for newest first
    });
    const rows = sortedData.map((customer, index) => {
        const year = customer.createdAt && typeof customer.createdAt === 'string' && customer.createdAt.includes('-') 
            ? customer.createdAt.split('-')[0] 
            : '-';
        return [
            index + 1, // ใช้ลำดับแถวเพื่อให้ตรงกับหน้้าจอ
            customer.createdAt || '-',
            customer.month || '-',
            year,
            customer.customerId || '-',
            customer.country || '-',
            customer.lineUid || '-',
            customer.lineId || '-',
            customer.displayName || '-',
            customer.phone || '-',
            customer.email || '-',
            customer.platform || '-',
            customer.source || '-',
            customer.serviceInterest || '-',
            customer.lifecycleStage || '-',
            customer.isUQL || '-',
            customer.isMQL || '-',
            customer.isSQL || '-',
            customer.mqlToSqlDays || '0',
            customer.closeWonMonth || '-',
            customer.revenueWeight || 0,
            customer.status || '-',
            customer.reasonLost || '-',
            customer.assignedSales || '-',
            customer.assignedDoctor || '-',
            customer.remark || '-',
            customer.notes || '-'
        ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    // Download file
    XLSX.writeFile(workbook, `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
};
