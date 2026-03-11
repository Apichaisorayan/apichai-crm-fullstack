import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import { Switch } from "./ui/switch";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotificationDialog } from "./NotificationDialog";

interface CustomColumn {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: string[];
    width?: number;
}

interface DefaultColumn {
    id: string;
    name: string;
    canHide: boolean;
}

interface ColumnManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customColumns: CustomColumn[];
    onDeleteColumn: (columnId: string) => void;
    onDeleteMultipleColumns: (columnIds: string[]) => void;
    onAddColumn: () => void;
    onEditColumn: (columnId: string) => void;
    hiddenColumns: Set<string>;
    onToggleColumnVisibility: (columnId: string) => void;
}

// Define default columns that can be hidden
const DEFAULT_COLUMNS: DefaultColumn[] = [
    { id: "select", name: "เลือก", canHide: false },
    { id: "id", name: "#", canHide: true },
    { id: "actions", name: "Action", canHide: false },
    { id: "createdAt", name: "Date", canHide: true },
    { id: "month", name: "Month", canHide: true },
    { id: "year", name: "Year", canHide: true },
    { id: "customerId", name: "Customer ID", canHide: true },
    { id: "notes", name: "Note General", canHide: true },
    { id: "country", name: "TH/IN", canHide: true },
    { id: "lineUid", name: "Line UID", canHide: true },
    { id: "lineId", name: "Line ID", canHide: true },
    { id: "displayName", name: "Display Name", canHide: true },
    { id: "phone", name: "Phone/WhatsApp", canHide: true },
    { id: "email", name: "Email", canHide: true },
    { id: "platform", name: "Platform", canHide: true },
    { id: "source", name: "Source", canHide: true },
    { id: "serviceInterest", name: "Service Interest", canHide: true },
    { id: "lifecycleStage", name: "Lifecycle Stage", canHide: true },
    { id: "isUQL", name: "UQL", canHide: true },
    { id: "isMQL", name: "MQL", canHide: true },
    { id: "isSQL", name: "SQL", canHide: true },
    { id: "mqlToSqlDays", name: "MQL to SQL", canHide: true },
    { id: "closeWonMonth", name: "Close Won Month", canHide: true },
    { id: "revenueWeight", name: "HN", canHide: true },
    { id: "assignedSales", name: "Sale CS", canHide: true },
    { id: "status", name: "Status", canHide: true },
    { id: "remark", name: "Remark", canHide: true },
    { id: "assignedDoctor", name: "Doctor", canHide: true },
];

export function ColumnManager({
    open,
    onOpenChange,
    customColumns,
    onDeleteColumn,
    onDeleteMultipleColumns,
    onAddColumn,
    onEditColumn,
    hiddenColumns,
    onToggleColumnVisibility
}: ColumnManagerProps) {
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [columnToDelete, setColumnToDelete] = useState<{ id: string; name: string } | null>(null);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState("");
    const [notificationDescription, setNotificationDescription] = useState("");
    const [notificationType, setNotificationType] = useState<"success" | "error">("success");

    // Bulk delete states
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    const handleDeleteClick = (columnId: string, columnName: string) => {
        setColumnToDelete({ id: columnId, name: columnName });
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (columnToDelete) {
            onDeleteColumn(columnToDelete.id);
            setDeleteConfirmOpen(false);
            setNotificationTitle("ลบสำเร็จ!");
            setNotificationDescription(`Column "${columnToDelete.name}" ถูกลบออกจากระบบแล้ว`);
            setNotificationType("success");
            setNotificationOpen(true);
            setColumnToDelete(null);
        }
    };

    const toggleColumnSelection = (columnId: string) => {
        const newSelected = new Set(selectedColumns);
        if (newSelected.has(columnId)) {
            newSelected.delete(columnId);
        } else {
            newSelected.add(columnId);
        }
        setSelectedColumns(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedColumns.size === customColumns.length) {
            setSelectedColumns(new Set());
        } else {
            setSelectedColumns(new Set(customColumns.map(c => c.id)));
        }
    };

    const handleBulkDelete = () => {
        if (selectedColumns.size > 0) {
            setBulkDeleteConfirmOpen(true);
        }
    };

    const handleConfirmBulkDelete = () => {
        const columnIdsArray = Array.from(selectedColumns) as string[];
        onDeleteMultipleColumns(columnIdsArray);

        setBulkDeleteConfirmOpen(false);
        setSelectedColumns(new Set());
        setNotificationTitle("ลบสำเร็จ!");
        setNotificationDescription(`ลบ ${columnIdsArray.length} columns เรียบร้อยแล้ว`);
        setNotificationType("success");
        setNotificationOpen(true);
    };

    return (
        <>
            {/* Bulk Delete Confirm Dialog */}
            <ConfirmDialog
                open={bulkDeleteConfirmOpen}
                onOpenChange={setBulkDeleteConfirmOpen}
                title="ยืนยันการลบหลาย Columns"
                description={`คุณต้องการลบ ${selectedColumns.size} columns ที่เลือกใช่หรือไม่? การกระทำนี้จะลบข้อมูลทั้งหมดใน columns เหล่านี้และไม่สามารถย้อนกลับได้`}
                onConfirm={handleConfirmBulkDelete}
                confirmText="ลบทั้งหมด"
                cancelText="ยกเลิก"
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="ยืนยันการลบ Column"
                description={`คุณต้องการลบ column "${columnToDelete?.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`}
                onConfirm={handleConfirmDelete}
                confirmText="ลบ"
                cancelText="ยกเลิก"
            />

            {/* Notification Dialog */}
            <NotificationDialog
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
                title={notificationTitle}
                description={notificationDescription}
                type={notificationType}
            />

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>จัดการ Columns</DialogTitle>
                        <DialogDescription>
                            แสดง/ซ่อน columns หรือเพิ่ม custom columns ใหม่
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Default Columns Section */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">Default Columns</Label>
                            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                                {DEFAULT_COLUMNS.map((col) => {
                                    const isVisible = !hiddenColumns.has(col.id);
                                    return (
                                        <div key={col.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                                            <div className="flex items-center gap-3 flex-1">
                                                {isVisible ? (
                                                    <Eye className="h-4 w-4 text-[#c5a059]" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <div>
                                                    <p className={`font-medium ${!isVisible ? 'text-muted-foreground' : ''}`}>
                                                        {col.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {col.canHide ? 'สามารถซ่อนได้' : 'ไม่สามารถซ่อนได้'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={isVisible}
                                                onCheckedChange={() => col.canHide && onToggleColumnVisibility(col.id)}
                                                disabled={!col.canHide}
                                                className="data-[state=checked]:bg-[#c5a059] data-[state=unchecked]:bg-gray-300"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Columns Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Custom Columns ({customColumns.length})</Label>
                                {customColumns.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={toggleSelectAll}
                                            className="text-xs"
                                        >
                                            {selectedColumns.size === customColumns.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                                        </Button>
                                        {selectedColumns.size > 0 && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleBulkDelete}
                                                className="text-xs bg-red-600 hover:bg-red-700"
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                ลบที่เลือก ({selectedColumns.size})
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {customColumns.length > 0 ? (
                                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                                    {customColumns.map((col) => {
                                        const isVisible = !hiddenColumns.has(col.id);
                                        const isSelected = selectedColumns.has(col.id);
                                        return (
                                            <div key={col.id} className={`flex items-center gap-3 p-3 hover:bg-muted/50 ${isSelected ? 'bg-blue-50' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleColumnSelection(col.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#c5a059] focus:ring-[#c5a059] cursor-pointer"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                {isVisible ? (
                                                    <Eye className="h-4 w-4 text-[#c5a059] flex-shrink-0" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                )}
                                                <div className="flex-1">
                                                    <p className={`font-medium ${!isVisible ? 'text-muted-foreground' : ''}`}>
                                                        {col.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        ประเภท: {col.type === 'text' ? 'ข้อความ' : col.type === 'number' ? 'ตัวเลข' : col.type === 'date' ? 'วันที่' : 'เลือก'}
                                                        {col.options && col.options.length > 0 && ` (${col.options.length} ตัวเลือก)`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={isVisible}
                                                        onCheckedChange={() => onToggleColumnVisibility(col.id)}
                                                        className="data-[state=checked]:bg-[#c5a059] data-[state=unchecked]:bg-gray-300"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onEditColumn(col.id)}
                                                        className="text-[#c5a059] hover:text-[#008a8f] hover:bg-[#c5a059]/10"
                                                        title="แก้ไข"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(col.id, col.name)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                                    <p>ยังไม่มี custom columns</p>
                                    <p className="text-sm">คลิก "เพิ่ม Column ใหม่" เพื่อสร้าง</p>
                                </div>
                            )}
                        </div>

                        {/* Add column button */}
                        <Button
                            onClick={onAddColumn}
                            className="w-full bg-[#c5a059] hover:bg-[#008a8f] gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            เพิ่ม Column ใหม่
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

interface AddColumnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    newColumn: Partial<CustomColumn>;
    onColumnChange: (column: Partial<CustomColumn>) => void;
    onSave: () => void;
    isEditing?: boolean;
}

export function AddColumnDialog({
    open,
    onOpenChange,
    newColumn,
    onColumnChange,
    onSave,
    isEditing = false
}: AddColumnDialogProps) {
    const [optionInput, setOptionInput] = React.useState("");

    const addOption = () => {
        if (optionInput.trim()) {
            onColumnChange({
                ...newColumn,
                options: [...(newColumn.options || []), optionInput.trim()]
            });
            setOptionInput("");
        }
    };

    const removeOption = (index: number) => {
        const newOptions = [...(newColumn.options || [])];
        newOptions.splice(index, 1);
        onColumnChange({ ...newColumn, options: newOptions });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'แก้ไข Column' : 'เพิ่ม Column ใหม่'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'แก้ไขข้อมูล column' : 'สร้าง column ใหม่สำหรับเก็บข้อมูลเพิ่มเติม'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Column name */}
                    <div className="space-y-2">
                        <Label htmlFor="columnName">ชื่อ Column *</Label>
                        <Input
                            id="columnName"
                            value={newColumn.name || ''}
                            onChange={(e) => onColumnChange({ ...newColumn, name: e.target.value })}
                            placeholder="เช่น หมายเหตุพิเศษ, คะแนน, วันนัดหมาย"
                        />
                    </div>

                    {/* Column type */}
                    <div className="space-y-2">
                        <Label htmlFor="columnType">ประเภทข้อมูล</Label>
                        <Select
                            value={newColumn.type || 'text'}
                            onValueChange={(value: any) => onColumnChange({ ...newColumn, type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">ข้อความ</SelectItem>
                                <SelectItem value="number">ตัวเลข</SelectItem>
                                <SelectItem value="date">วันที่</SelectItem>
                                <SelectItem value="select">เลือกจากรายการ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Options for select type */}
                    {newColumn.type === 'select' && (
                        <div className="space-y-2">
                            <Label>ตัวเลือก</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={optionInput}
                                    onChange={(e) => setOptionInput(e.target.value)}
                                    placeholder="เพิ่มตัวเลือก"
                                    onKeyDown={(e) => e.key === 'Enter' && addOption()}
                                />
                                <Button onClick={addOption} size="sm">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {newColumn.options && newColumn.options.length > 0 && (
                                <div className="border rounded-lg p-2 space-y-1">
                                    {newColumn.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                                            <span className="text-sm">{opt}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeOption(idx)}
                                                className="h-6 w-6 p-0"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Column width */}
                    <div className="space-y-2">
                        <Label htmlFor="columnWidth">ความกว้าง (px)</Label>
                        <Input
                            id="columnWidth"
                            type="number"
                            value={newColumn.width || 150}
                            onChange={(e) => onColumnChange({ ...newColumn, width: parseInt(e.target.value) || 150 })}
                            min={50}
                            max={500}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={!newColumn.name?.trim()}
                        className="bg-[#c5a059] hover:bg-[#008a8f]"
                    >
                        {isEditing ? 'บันทึกการแก้ไข' : 'บันทึก'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
