import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Upload, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { apiService } from "../services/api";
import { Customer } from "../types/crm";

interface ImportCustomersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  defaultYear?: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ColumnMapping {
  found: string[];
  missing: string[];
  extra: string[];
}

export function ImportCustomers({
  open,
  onOpenChange,
  onImportComplete,
  defaultYear
}: ImportCustomersProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Column mappings for different years/formats
  const COLUMN_MAPPINGS = {
    '2024': {
      customerId: ["Customer ID", "customerId", "customer_id"],
      displayName: ["Display Name", "displayName", "name", "Name"],
      phone: ["Contact Number", "Phone(WhatsApp Number)", "phone", "Phone", "Phone/WhatsApp"],
      email: ["E-mail", "Email", "e-mail", "E-mail"],
      platform: ["Platform", "Channel"],
      lineUid: ["Line_UID", "Line UID", "line_uid", "lineUID"],
      lineId: ["Line ID", "line_id"],
      country: ["TH_IN_Status", "TH/IN Status", "TH/IN", "Country", "country"],
      source: ["Source"],
      serviceInterest: ["service_interest", "Service Interest", "service"],
      lifecycleStage: ["Lifecycle Stage", "Stage"],
      status: ["Status", "Customer Status"],
      isUQL: ["UQL", "isUQL"],
      isMQL: ["MQL", "isMQL"],
      isSQL: ["SQL", "isSQL"],
      mqlToSqlDays: ["MQL TO SQL", "MQL to SQL", "mql_to_sql_days"],
      assignedSales: ["SALES (AC)", "Sale (AC)", "Sales (AC)", "Sale(AC)", "Sales(AC)", "Sale(CS)", "Sales", "Sale", "CS", "AC", "Assigned Sales", "Sales Name"],
      assignedDoctor: ["Doctor", "assigned_doctor", "Assigned Doctor", "Doctor Name"],
      revenueWeight: ["HN", "hn", "revenue_weight", "HN (for close won case)"],
      closeWonMonth: ["close won month", "Close Won Month"],
      reasonLost: ["Reason lost", "Reason Lost"],
      notes: ["notes", "Note", "วันทำงานของแอดมินไทย"],
      remark: ["remark", "Remark"],
      isInactive: ["Inactive", "isInactive", "Status_Inactive"],
      date: ["Date", "Date_Clean", "createdAt", "date"],
      month: ["Month", "Monrh"], // Handle typo in 2024
      year: ["Year"]
    },
    '2025': {
      customerId: ["Customer_ID", "Customer ID", "customerId", "customer_id"],
      displayName: ["Name", "Display Name", "displayName", "name"],
      phone: ["Phone(WhatsApp Number)", "phone", "Phone", "Phone/WhatsApp"],
      email: ["Email", "e-mail", "E-mail"],
      platform: ["Platform", "Channel"],
      lineUid: ["Line_UID", "Line UID", "line_uid", "lineUID"],
      lineId: ["Line ID", "line_id"],
      country: ["TH_IN_Status", "TH/IN Status", "TH/IN", "Country", "country"],
      source: ["Chanel_Interection(Source)", "Source"],
      serviceInterest: ["Main_Procedure", "service_interest", "Service Interest", "service"],
      lifecycleStage: ["Lifecycle Stage", "Stage"],
      status: ["Status", "Customer Status"],
      isUQL: ["UQL", "isUQL"],
      isMQL: ["MQL", "isMQL"],
      isSQL: ["SQL", "isSQL"],
      mqlToSqlDays: ["MQL to SQL", "MQL TO SQL", "MQL to SQL", "mql_to_sql_days"],
      assignedSales: ["Sale(CS)", "SALES (AC)", "Sale (AC)", "Sales (AC)", "Sale(AC)", "Sales(AC)", "Sale(CS)", "Sales", "Sale", "CS", "AC", "Assigned Sales", "Sales Name"],
      assignedDoctor: ["Doctor", "assigned_doctor", "Assigned Doctor", "Doctor Name"],
      revenueWeight: ["HN (for close won case)", "HN", "hn", "revenue_weight"],
      closeWonMonth: ["close won month", "Close Won Month"],
      reasonLost: ["Reason Lost", "Reason lost", "reason_lost", "ReasonLost"],
      notes: ["วันทำงานของแอดมินไทย", "notes", "Note"],
      remark: ["REMARK", "remark", "Remark"],
      isInactive: ["Inactive", "isInactive"],
      date: ["Date", "createdAt", "date"],
      month: ["Month"],
      year: ["Year"]
    },
    '2026': {
      customerId: ["Customer_ID", "Customer ID", "customerId", "customer_id"],
      displayName: ["Display Name\n(ใช้ตามใน CAAC ได้เลย)", "Display Name (ใช้ตามใน CAAC ได้เลย)", "Display Name", "displayName", "name", "Name", "Display Name (ใช้ใน CAAC ได้เลย)"],
      phone: ["Phone(WhatsApp Number)", "Phone (WhatsApp Number)", "phone", "Phone", "Phone/WhatsApp", "Contact Number"],
      email: ["Gmail", "Email", "e-mail", "E-mail"],
      platform: ["Platform", "Channel"],
      lineUid: ["Line_UID *สำคัญมาก*", "Line_UID สำคัญมาก", "Line_UID", "Line UID", "line_uid", "lineUID", "Line_UID*สำคัญมาก*"],
      lineId: ["Line ID", "line_id"],
      country: ["TH_IN_Status", "TH/IN Status", "TH/IN", "Country", "country"],
      source: ["Source"],
      serviceInterest: ["service_interest", "Service Interest", "service"],
      lifecycleStage: ["lead_cycle", "Lifecycle Stage", "Stage"],
      status: ["Status", "Customer Status"],
      isUQL: ["UQL", "isUQL"],
      isMQL: ["MQL", "isMQL"],
      isSQL: ["SQL", "isSQL"],
      mqlToSqlDays: ["MQL to SQL", "MQL TO SQL", "mql_to_sql_days"],
      assignedSales: ["Sale (CS)", "SALES (AC)", "Sale (AC)", "Sales (AC)", "Sale(AC)", "Sales(AC)", "Sale(CS)", "Sales", "Sale", "CS", "AC", "Assigned Sales", "Sales Name"],
      assignedDoctor: ["Doctor", "assigned_doctor", "Assigned Doctor", "Doctor Name"],
      revenueWeight: ["HN", "hn", "revenue_weight", "HN (for close won case)"],
      closeWonMonth: ["close won month", "Close Won Month"],
      reasonLost: ["Reason Lost", "Reason lost", "reason_lost", "ReasonLost"],
      notes: ["notes", "Note", "วันทำงานของแอดมินไทย"],
      remark: ["remark", "Remark"],
      isInactive: ["Inactive", "isInactive"],
      date: ["Date", "createdAt", "date"],
      month: ["Month"],
      year: ["Year"]
    }
  };

  // Default mapping for unknown years
  const DEFAULT_MAPPING = {
    customerId: ["Customer ID", "customerId", "customer_id"],
    displayName: ["Display Name", "displayName", "name", "Name"],
    phone: ["Phone(WhatsApp Number)", "Contact Number", "phone", "Phone"],
    email: ["Email", "E-mail", "e-mail"],
    platform: ["Platform"],
    lineUid: ["Line_UID", "Line UID"],
    lineId: ["Line ID"],
    country: ["TH_IN_Status", "TH/IN", "Country"],
    source: ["Source"],
    serviceInterest: ["service_interest"],
    lifecycleStage: ["Lifecycle Stage"],
    status: ["Status"],
    isUQL: ["UQL"],
    isMQL: ["MQL"],
    isSQL: ["SQL"],
    mqlToSqlDays: ["MQL TO SQL", "MQL to SQL"],
    assignedSales: ["SALES (AC)", "Sale (AC)", "Sales (AC)", "Sale(AC)", "Sales(AC)", "Sale(CS)", "Sales", "Sale", "CS", "AC"],
    assignedDoctor: ["Doctor"],
    revenueWeight: ["HN"],
    closeWonMonth: ["close won month"],
    reasonLost: ["Reason Lost", "Reason lost", "reason_lost", "ReasonLost"],
    notes: ["notes", "วันทำงานของแอดมินไทย"],
    remark: ["remark"],
    isInactive: ["isInactive", "Inactive"],
    date: ["Date"],
    month: ["Month"],
    year: ["Year"]
  };
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [importLimit, setImportLimit] = useState<number>(0);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [selectedMappingYear, setSelectedMappingYear] = useState<string | 'auto'>('auto');

  // Sync selected year when opening
  React.useEffect(() => {
    if (open) {
      setSelectedMappingYear(defaultYear || 'auto');
    }
  }, [open, defaultYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setColumnMapping(null);

      // Analyze file columns
      analyzeFileColumns(selectedFile);
    }
  };

  const analyzeFileColumns = async (file: File) => {
    try {
      let data: any[];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        data = await parseCSV(file);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        data = await parseExcel(file);
      } else {
        return;
      }

      if (data.length > 0) {
        const fileColumns = Object.keys(data[0]);

        setColumnMapping({
          found: fileColumns,
          missing: [],
          extra: []
        });
        setTotalRows(data.length);
      }
    } catch (error) {
    }
  };

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // ลบช่องว่างหน้า-หลัง header
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsBinaryString(file);
    });
  };

  // Auto-detect year from data and return appropriate mapping
  const detectYearAndMapping = (data: any[]): { year: string; mapping: any } => {
    // Try to detect year from date values in first few rows
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];

      // Check for date columns
      const dateColumns = ['Date', 'Date_Clean', 'createdAt', 'date'];
      for (const col of dateColumns) {
        if (row[col] && typeof row[col] === 'string') {
          const dateStr = row[col];

          // Extract year from different date formats
          const yyyyMatch = dateStr.match(/(\d{4})/);
          if (yyyyMatch) {
            const year = yyyyMatch[1];
            if (COLUMN_MAPPINGS[year as keyof typeof COLUMN_MAPPINGS]) {
              return { year, mapping: COLUMN_MAPPINGS[year as keyof typeof COLUMN_MAPPINGS] };
            }
          }
        }
      }
    }

    // Fallback: try to detect from column names
    const firstRow = data[0];
    if (firstRow) {
      const columns = Object.keys(firstRow);

      // Check for 2024-specific columns
      if (columns.includes('Contact Number') || columns.includes('Monrh')) {
        return { year: '2024', mapping: COLUMN_MAPPINGS['2024'] };
      }

      // Check for 2025-specific columns  
      if (columns.includes('HN (for close won case)')) {
        return { year: '2025', mapping: COLUMN_MAPPINGS['2025'] };
      }

      // Check for 2026-specific columns
      if (columns.includes('Phone(WhatsApp Number)') || columns.includes('Line_UID *สำคัญมาก*') || columns.includes('lead_cycle') || columns.includes('Sale(CS)')) {
        return { year: '2026', mapping: COLUMN_MAPPINGS['2026'] };
      }
    }

    return { year: 'default', mapping: DEFAULT_MAPPING };
  };

  const mapImportDataToCustomer = (row: any, index: number, mapping: any): Partial<Customer> => {
    // Helper to parse boolean values
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === '1' || lower === 'yes';
      }
      if (typeof value === 'number') return value === 1;
      return false;
    };

    // Helper to parse number values
    const parseNumber = (value: any, defaultValue: number = 0): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleanValue = value.replace(/,/g, '').trim();
        const parsed = parseInt(cleanValue);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return defaultValue;
    };

    // Helper to get value from multiple possible column names using mapping
    const getValue = (fieldKey: string): any => {
      const possibleNames = mapping[fieldKey] || [];

      for (const name of possibleNames) {
        // ลองหาแบบตรงตัวก่อน
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return row[name];
        }

        // ลองหาแบบ Case Insensitive และ Trim โดยลบ Newline และอักขระพิเศษออก
        const cleanName = name.toLowerCase().replace(/[^a-z0-9ก-ฮ]/g, '');
        const foundKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9ก-ฮ]/g, '') === cleanName);
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== '') {
          return row[foundKey];
        }
      }
      return undefined;
    };

    // Get customerId from file if exists, otherwise let backend generate it
    const fileCustomerId = getValue('customerId');

    return {
      // Basic Info
      // Only include customerId if it exists in the import file
      // If not provided, backend will auto-generate in format: TH20260200001 or IN20260200001
      ...(fileCustomerId ? { customerId: fileCustomerId } : {}),
      displayName: getValue('displayName') || "",
      phone: getValue('phone') || "",
      email: getValue('email') || "",

      // Contact Channels
      platform: getValue('platform') || "-",
      lineUid: getValue('lineUid'),
      lineId: getValue('lineId'),

      // Location
      country: (() => {
        const val = getValue('country');

        if (!val) return "TH";

        const upperVal = String(val).toUpperCase().trim();

        // Exact matches for International (IN = International, not India)
        if (["IN", "INTER", "INTERNATIONAL", "FOREIGN", "ABROAD", "INTL", "INTERNATIONAL PATIENT"].includes(upperVal)) {
          return "IN";
        }

        // Check for International keywords in text
        if (upperVal.includes("INTERNATIONAL") || upperVal.includes("FOREIGN") || upperVal.includes("ABROAD")) {
          return "IN";
        }

        return "TH";
      })(),

      // Marketing & Sales
      source: getValue('source') || "-",
      serviceInterest: getValue('serviceInterest'),
      lifecycleStage: getValue('lifecycleStage') || "MQL",
      status: (() => {
        const rawStatus = String(getValue('status') || "").trim();
        if (!rawStatus) return "-";

        const lowerStatus = rawStatus.toLowerCase();

        // Map common variations to system statuses
        if (lowerStatus === 'no response' || lowerStatus === 'wait for response') return 'Wait for response';
        if (lowerStatus === 'wait for consult' || lowerStatus === 'wait for joining') return 'Wait for joining';
        if (lowerStatus === 'close won') return 'Close Won_Not_Consulted';
        if (lowerStatus === 'close lost') return 'Close Lost_Not_Consulted';

        const validStatuses = [
          'Contact', 'Consulted', 'Close Won_Consulted', 'Close Won_Not_Consulted',
          'Close Lost_Consulted', 'Close Lost_Not_Consulted', 'Sales Direct',
          'Wait for joining', 'Wait for response'
        ];

        const matched = validStatuses.find(s => s.toLowerCase() === lowerStatus);
        return matched || "-";
      })(),
      reasonLost: getValue('reasonLost'),

      // Sales Funnel
      isUQL: getValue('isUQL') || "",
      isMQL: getValue('isMQL') || "",
      isSQL: getValue('isSQL') || "",
      mqlToSqlDays: getValue('mqlToSqlDays') || "-",
      closeWonMonth: getValue('closeWonMonth'),

      // Assignment
      assignedSales: getValue('assignedSales') || "-",
      assignedDoctor: getValue('assignedDoctor') || "-",

      // Metrics
      revenueWeight: getValue('revenueWeight') || "-",

      // Status
      isInactive: parseBoolean(getValue('isInactive')),

      // Notes
      notes: getValue('notes') || "",
      remark: getValue('remark'),

      // Import Order (to preserve file order)
      importOrder: index + 1,

      // Month
      month: (() => {
        const monthValue = getValue('month');
        if (monthValue) {
          // If it's a date string, extract month
          const dateMatch = String(monthValue).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (dateMatch) {
            return parseInt(dateMatch[2]);
          }
          // If it's already a month number
          const monthNum = parseInt(String(monthValue));
          return isNaN(monthNum) ? new Date().getMonth() + 1 : monthNum;
        }
        return new Date().getMonth() + 1;
      })(),

      // Dates
      createdAt: (() => {
        const dateValue = getValue('date');
        let formattedDate = dateValue;

        // Convert date to YYYY-MM-DD format (add leading zeros)
        if (dateValue && typeof dateValue === 'string') {
          // Handle formats like "2026-1-1" -> "2026-01-01"
          const dateMatch = dateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (dateMatch) {
            const [, year, month, day] = dateMatch;
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // Handle DD/MM/YYYY format like "01/12/2025" -> "2025-12-01"
          else {
            const dmyMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dmyMatch) {
              const [, day, month, year] = dmyMatch;
              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
        }

        // If no date provided, use '-' instead of today's date
        if (!formattedDate) {
          formattedDate = '-';
        }

        return formattedDate;
      })(),
    };
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Parse file based on type
      let data: any[];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        data = await parseCSV(file);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        data = await parseExcel(file);
      } else {
        throw new Error("Unsupported file format");
      }

      // Auto-detect or use manual year selection for mapping
      const mappingResult = selectedMappingYear === 'auto'
        ? detectYearAndMapping(data)
        : {
          year: selectedMappingYear,
          mapping: COLUMN_MAPPINGS[selectedMappingYear as keyof typeof COLUMN_MAPPINGS] || DEFAULT_MAPPING
        };

      const { year, mapping } = mappingResult;

      // Apply import limit if set
      const dataToImport = importLimit > 0 ? data.slice(0, importLimit) : data;

      // Initialize result
      const importResult: ImportResult = {
        total: dataToImport.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Import each customer
      for (let i = 0; i < dataToImport.length; i++) {
        try {
          setProgress(Math.round((i / dataToImport.length) * 100));

          const customerData = mapImportDataToCustomer(data[i], i, mapping);

          // Create customer
          await apiService.createCustomer(customerData as Omit<Customer, "id">);

          importResult.success++;
        } catch (error) {
          importResult.failed++;
          importResult.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      setResult(importResult);

      // If any success, refresh the list
      if (importResult.success > 0) {
        onImportComplete();
      }
    } catch (error) {
      setResult({
        total: 0,
        success: 0,
        failed: 1,
        errors: [{ row: 0, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอ่านไฟล์" }],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setColumnMapping(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            นำเข้าข้อมูลลูกค้า
          </DialogTitle>
          <DialogDescription>
            อัพโหลดไฟล์ CSV หรือ Excel เพื่อนำเข้าข้อมูลลูกค้าจำนวนมาก
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">เลือกไฟล์</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                ไฟล์ที่เลือก: {file.name}
              </p>
            )}
          </div>

          {/* Year Selection for Mapping */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#c5a059]" />
              เลือกรูปแบบหัวตาราง (Header Mapping)
            </Label>
            <div className="flex flex-wrap gap-2">
              {['auto', '2024', '2025', '2026'].map((y) => (
                <Button
                  key={y}
                  type="button"
                  variant={selectedMappingYear === y ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMappingYear(y)}
                  className={`transition-all duration-300 ${selectedMappingYear === y
                    ? "bg-[#c5a059] text-white hover:bg-[#008a8f]"
                    : "hover:border-[#c5a059] hover:text-[#c5a059]"
                    }`}
                >
                  {y === 'auto' ? 'ตรวจหาอัตโนมัติ' : `รูปแบบปี ${y}`}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              หากระบบตรวจหาหัวตารางไม่ถูกต้อง คุณสามารถเลือกปีที่ต้องการเพื่อใช้รูปแบบหัวตารางของปีนั้นได้ด้วยตนเอง
            </p>
          </div>

          {/* Import Limit */}
          {file && totalRows > 0 && (
            <div className="space-y-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
              <div>
                <Label htmlFor="limit" className="text-blue-900 font-semibold">จำนวนข้อมูลที่จะนำเข้า</Label>
                <p className="text-xs text-blue-700">พบทั้งหมด {totalRows} รายการ (ใส่ 0 หรือเว้นว่างเพื่อนำเข้าทั้งหมด)</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="limit"
                  type="number"
                  min="0"
                  max={totalRows}
                  placeholder="เช่น 100"
                  value={importLimit || ""}
                  onChange={(e) => setImportLimit(parseInt(e.target.value) || 0)}
                  className="w-32 bg-white border-blue-200 focus:ring-blue-500"
                  disabled={isImporting}
                />
                <span className="text-sm font-medium text-blue-900">รายการ</span>
              </div>
            </div>
          )}

          {/* Column Mapping Info */}
          {columnMapping && columnMapping.found.length > 0 && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#c5a059]" />
                ข้อมูล Columns ในไฟล์
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">
                      พบ {columnMapping.found.length} columns
                    </p>
                    <div className="text-xs text-green-700 mt-2 flex flex-wrap gap-1">
                      {columnMapping.found.map((col, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>กำลังนำเข้าข้อมูล...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                  <p className="text-2xl font-bold text-blue-600">{result.total}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">สำเร็จ</p>
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">ล้มเหลว</p>
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <h4 className="font-medium text-red-900">รายการที่ล้มเหลว</h4>
                  </div>
                  <ul className="space-y-1 text-sm text-red-800">
                    {result.errors.map((error, index) => (
                      <li key={index}>
                        แถว {error.row}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.success > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-900">
                      นำเข้าข้อมูลสำเร็จ {result.success} รายการ
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
              {result ? "ปิด" : "ยกเลิก"}
            </Button>
            {!result && (
              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="bg-[#c5a059] hover:bg-[#008a8f]"
              >
                {isImporting ? "กำลังนำเข้า..." : "เริ่มนำเข้า"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
