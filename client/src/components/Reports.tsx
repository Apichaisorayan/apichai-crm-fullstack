import { useState, useEffect, useMemo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Users, TrendingUp, BarChart3, PieChart, Filter, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { parseISO, getMonth } from "date-fns";
import { cn } from "./ui/utils";
import { apiService } from "../services/api";
import { Customer, UserRole } from "../types/crm";
import { PLATFORM_ORDER_MAPPING } from "../constants/platformMapping";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  LabelList,
} from "recharts";

type ReportType =
  | "leads-by-sales"
  | "leads-by-type"
  | "status-by-sales"
  | "sql-by-channel"
  | "close-won-by-channel"
  | "leads-channel-by-sales"
  | "mql-by-channel";

type ViewMode = "summary" | "monthly";

// Custom tooltip component for better readability
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: <span className="font-bold">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom label for pie chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for very small slices

  return (
    <text x={x} y={y} fill="#333" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-sm font-medium">
      {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};
interface ReportOption {
  id: ReportType;
  title: string;
  description: string;
  icon: ReactNode;
}

const reportOptions: ReportOption[] = [
  { id: "leads-by-sales", title: "1. ลีดแยกตาม Sales", description: "ดูจำนวน SQL ของแต่ละ Sales", icon: <Users className="h-5 w-5" /> },
  { id: "leads-by-type", title: "2. ลีดแยกตามประเภท", description: "SQL, MQL, UQL รายเดือน", icon: <PieChart className="h-5 w-5" /> },
  { id: "status-by-sales", title: "3. Status แยกตาม Sales", description: "สถานะลีดของแต่ละ Sales", icon: <BarChart3 className="h-5 w-5" /> },
  { id: "sql-by-channel", title: "4. SQL แยก Channel", description: "SQL ในแต่ละช่องทาง", icon: <TrendingUp className="h-5 w-5" /> },
  { id: "close-won-by-channel", title: "5. Close Won แยกช่องทาง", description: "ลูกค้าปิดการขายแยกช่องทาง", icon: <TrendingUp className="h-5 w-5" /> },
  { id: "leads-channel-by-sales", title: "6. ลีดช่องทางแยก Sales", description: "ลีดแต่ละช่องทางของแต่ละ Sales", icon: <Users className="h-5 w-5" /> },
  { id: "mql-by-channel", title: "7. MQL แยก Channel", description: "MQL แยกตาม Platform + Source ย่อย", icon: <PieChart className="h-5 w-5" /> },
];

const COLORS = ['#c5a059', '#002b38', '#e8d8a1', '#4ade80', '#f87171', '#60a5fa', '#a78bfa', '#fb923c', '#14b8a6', '#ec4899'];

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const monthOptions = [
  { value: "1", label: "มกราคม" },
  { value: "2", label: "กุมภาพันธ์" },
  { value: "3", label: "มีนาคม" },
  { value: "4", label: "เมษายน" },
  { value: "5", label: "พฤษภาคม" },
  { value: "6", label: "มิถุนายน" },
  { value: "7", label: "กรกฎาคม" },
  { value: "8", label: "สิงหาคม" },
  { value: "9", label: "กันยายน" },
  { value: "10", label: "ตุลาคม" },
  { value: "11", label: "พฤศจิกายน" },
  { value: "12", label: "ธันวาคม" },
];
export function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedSales, setSelectedSales] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("summary");

  // API-based report data
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Get current user role
  const currentUser = useMemo(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch { return null; }
    }
    return null;
  }, []);

  const userRole = currentUser?.role as UserRole || UserRole.SALES;
  const canViewAll = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;

  // Get unique sales from customers (for filter dropdown)
  const salesOptions = useMemo(() => {
    const sales = new Set(customers.map(c => c.assignedSales).filter(Boolean));
    return Array.from(sales).sort();
  }, [customers]);

  // Load customers (only for sales dropdown)
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCustomers();
      setCustomers(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Load report data from API when filters change
  useEffect(() => {
    if (selectedReport) {
      setCurrentPage(1); // Reset to page 1 when filters change
      loadReportData();
    }
  }, [selectedReport, selectedYear, selectedMonth, selectedSales, selectedCountry, viewMode]);

  // Load report data when page changes
  useEffect(() => {
    if (selectedReport && currentPage > 1) {
      loadReportData();
    }
  }, [currentPage, pageSize]);

  const loadReportData = async () => {
    if (!selectedReport) return;

    try {
      setReportLoading(true);

      const params = {
        year: selectedYear,
        month: viewMode === "summary" ? selectedMonth : undefined,
        sales: canViewAll ? selectedSales : currentUser?.name,
        country: selectedCountry
      };

      let data;

      if (viewMode === "monthly") {
        // Monthly reports - use dedicated monthly endpoints
        switch (selectedReport) {
          case "leads-by-sales":
            data = await apiService.getSqlBySalesMonthly(params);
            break;
          case "leads-by-type":
            data = await apiService.getLeadsByTypeMonthly(params);
            break;
          case "status-by-sales":
            data = await apiService.getStatusBySalesMonthly(params);
            break;
          case "sql-by-channel":
            data = await apiService.getSqlByChannelMonthly(params);
            break;
          case "close-won-by-channel":
            data = await apiService.getCloseWonByChannelMonthly(params);
            break;
          case "mql-by-channel":
            data = await apiService.getMqlByChannelMonthly(params);
            break;
          case "leads-channel-by-sales":
            data = await apiService.getLeadsChannelBySalesMonthly(params);
            break;
          default:
            data = await loadSummaryReport(selectedReport, params);
        }
      } else {
        // Summary reports
        data = await loadSummaryReport(selectedReport, params);
      }

      setReportData(data);
    } catch (error) {
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const loadSummaryReport = async (reportType: ReportType, params: any) => {
    // Add pagination for reports that support it
    const paginationParams = {
      ...params,
      page: currentPage,
      limit: pageSize
    };

    let result;

    switch (reportType) {
      case "leads-by-sales":
        result = await apiService.getSqlBySales(params);
        break;
      case "leads-by-type":
        result = await apiService.getLeadsByType(params);
        break;
      case "status-by-sales":
        result = await apiService.getStatusBySales(params);
        break;
      case "sql-by-channel":
        result = await apiService.getSqlByChannel(params);
        break;
      case "close-won-by-channel":
        result = await apiService.getCloseWonByChannel(params);
        break;
      case "leads-channel-by-sales":
        // This report supports pagination
        result = await apiService.getLeadsChannelBySales(paginationParams);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalRecords(result.pagination.total);
          return result.data;
        }
        break;
      case "mql-by-channel":
        // This report supports pagination
        result = await apiService.getMqlByChannel(paginationParams);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalRecords(result.pagination.total);
          return result.data;
        }
        break;
      default:
        return null;
    }

    // Reset pagination for reports that don't support it
    if (!result?.pagination) {
      setTotalPages(1);
      setTotalRecords(Array.isArray(result) ? result.length : 0);
    }

    return result;
  };

  // Filter customers based on year, month, and sales (DEPRECATED - now using API)
  // Keeping only for backward compatibility
  const filteredCustomers = useMemo(() => {
    return customers; // No longer filtering here, API handles it
  }, [customers]);

  // Get customers filtered by year only (DEPRECATED - now using API)
  const yearFilteredCustomers = useMemo(() => {
    return customers; // No longer filtering here, API handles it
  }, [customers]);

  // Report 1: Leads by Sales (SQL count per sales)
  // Now using API data instead of client-side calculation
  const leadsBySalesData = useMemo(() => {
    if (!reportData) return [];

    if (viewMode === "monthly") {
      return reportData; // Already in correct format from API
    }

    // Summary mode - transform API data if needed
    return Array.isArray(reportData) ? reportData : [];
  }, [reportData, viewMode]);

  // Report 2: Leads by Type (SQL, MQL, UQL)
  // NOTE: SQL ต้องนับรวมเป็น MQL ตาม requirement (handled by API)
  const leadsByTypeData = useMemo(() => {
    if (!reportData) return [];

    if (viewMode === "monthly") {
      return reportData; // Monthly format from API
    }

    // Summary mode - add colors to API data
    return Array.isArray(reportData) ? reportData.map((item: any, idx: number) => ({
      ...item,
      fill: COLORS[idx]
    })) : [];
  }, [reportData, viewMode]);

  // Report 3: Status by Sales
  // Now using API data
  const statusBySalesData = useMemo(() => {
    if (!reportData) return [];
    return Array.isArray(reportData) ? reportData : [];
  }, [reportData]);

  // Report 4: SQL by Channel (Platform)
  // Now using API data
  const sqlByChannelData = useMemo(() => {
    if (!reportData) return [];
    return Array.isArray(reportData) ? reportData : [];
  }, [reportData]);

  // Report 5: Close Won by Channel
  // Now using API data
  const closeWonByChannelData = useMemo(() => {
    if (!reportData) return [];
    return Array.isArray(reportData) ? reportData : [];
  }, [reportData]);

  // Report 6: Leads Channel by Sales (Pivot table)
  // Now using API data
  const leadsChannelBySalesData = useMemo(() => {
    if (!reportData) return { platforms: [], data: [] };

    // API returns { platforms: [], data: [] } or { data: { platforms: [], data: [] }, pagination: {} }
    if (reportData.platforms && reportData.data) {
      return reportData;
    }

    return { platforms: [], data: [] };
  }, [reportData]);

  // Report 7: MQL by Channel + Source (Platform + Source breakdown)
  // NOTE: SQL ต้องนับรวมเป็น MQL ตาม requirement (handled by API)
  const mqlByChannelData = useMemo(() => {
    if (!reportData || !Array.isArray(reportData)) return [];

    // Map API data for quick lookup: platform -> { source -> MQL }
    const apiDataMap = new Map<string, Map<string, number>>();

    reportData.forEach((row: any) => {
      // We only care about sub-rows for detailed mapping, or if it's the only way to get data
      if (row.isSubRow && row.platform && row.source) {
        if (!apiDataMap.has(row.platform)) apiDataMap.set(row.platform, new Map());
        apiDataMap.get(row.platform)!.set(row.source, (apiDataMap.get(row.platform)!.get(row.source) || 0) + row.MQL);
      } else if (!row.isSubRow && row.platform && !row.source) {
        // This is a summary row from API, we'll recalculate it from sources if possible, 
        // but let's keep track of total just in case
        if (!apiDataMap.has(row.platform)) apiDataMap.set(row.platform, new Map());
        // Use a special key for "total from API" to compare if needed
        apiDataMap.get(row.platform)!.set('__API_TOTAL__', row.MQL);
      }
    });

    const result: any[] = [];

    PLATFORM_ORDER_MAPPING.forEach(config => {
      const platformName = config.platform;
      const platformSources = apiDataMap.get(platformName);

      const subRows: any[] = [];
      let platformTotal = 0;

      config.sources.forEach(sourceName => {
        const mql = platformSources?.get(sourceName) || 0;
        subRows.push({
          platform: platformName,
          source: sourceName,
          MQL: mql,
          isSubRow: true
        });
        platformTotal += mql;
      });

      // Special case: if API has sources for this platform that aren't in our mapping
      // or if API total is higher than sum of mapped sources
      if (platformSources) {
        platformSources.forEach((mql, source) => {
          if (source !== '__API_TOTAL__' && !config.sources.includes(source)) {
            subRows.push({
              platform: platformName,
              source: source,
              MQL: mql,
              isSubRow: true
            });
            platformTotal += mql;
          }
        });

        // If API total is actually higher than our sum (maybe some sources missing from API response), 
        // we might want to adjust, but for now let's trust the sources.
      }

      // Add main platform row
      result.push({
        platform: platformName,
        source: '',
        MQL: platformTotal,
        isSubRow: false
      });

      // Add sub-rows
      result.push(...subRows);
    });

    // Handle any platforms from API that are NOT in the mapping
    apiDataMap.forEach((sources, platform) => {
      if (!PLATFORM_ORDER_MAPPING.some(m => m.platform === platform)) {
        let platformTotal = 0;
        const subRows: any[] = [];

        sources.forEach((mql, source) => {
          if (source !== '__API_TOTAL__') {
            subRows.push({
              platform,
              source,
              MQL: mql,
              isSubRow: true
            });
            platformTotal += mql;
          }
        });

        result.push({
          platform,
          source: '',
          MQL: platformTotal || sources.get('__API_TOTAL__') || 0,
          isSubRow: false
        });
        result.push(...subRows);
      }
    });

    return result;
  }, [reportData]);

  // Keep the old calculation for mqlByPlatformData (for simple chart)
  const mqlByPlatformData = useMemo(() => {
    return mqlByChannelData
      .filter(row => !row.isSubRow)
      .map(row => ({ name: row.platform, MQL: row.MQL }));
  }, [mqlByChannelData]);

  // Remove old client-side calculations - now using API
  // Monthly data now comes from reportData when viewMode === "monthly"
  const leadsBySalesMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      return Array.isArray(reportData) ? reportData : [];
    }
    return [];
  }, [reportData, viewMode]);

  const leadsByTypeMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      return Array.isArray(reportData) ? reportData : [];
    }
    return [];
  }, [reportData, viewMode]);

  const statusBySalesMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      return Array.isArray(reportData) ? reportData : [];
    }
    return [];
  }, [reportData, viewMode]);

  const sqlByChannelMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      // API returns { data: [], grandTotal: {} }
      return reportData.data ? reportData : { data: [], grandTotal: {} };
    }
    return { data: [], grandTotal: {} };
  }, [reportData, viewMode]);

  const closeWonByChannelMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      // API returns { data: [], grandTotal: {} }
      return reportData.data ? reportData : { data: [], grandTotal: {} };
    }
    return { data: [], grandTotal: {} };
  }, [reportData, viewMode]);

  const mqlByChannelMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      return Array.isArray(reportData) ? reportData : [];
    }
    return [];
  }, [reportData, viewMode]);

  const leadsChannelBySalesMonthlyData = useMemo(() => {
    if (viewMode === "monthly" && reportData) {
      // API returns { platforms: [], salesList: [], monthlyData: [] }
      return reportData.monthlyData ? reportData : { platforms: [], salesList: [], monthlyData: [] };
    }
    return { platforms: [], salesList: [], monthlyData: [] };
  }, [reportData, viewMode]);

  const handleExportExcel = () => {
    alert('ฟีเจอร์ส่งออก Excel กำลังพัฒนา');
  };

  // Helper function to render monthly table
  const renderMonthlyTable = (
    data: Record<string, string | number>[],
    firstColHeader: string,
    valueLabel: string,
    grandTotal?: Record<string, string | number>
  ) => {
    return (
      <div className="space-y-6">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#002b38]">
                <TableHead className="text-white font-semibold sticky left-0 bg-[#002b38] min-w-[120px]">{firstColHeader}</TableHead>
                {MONTH_NAMES.map(month => (
                  <TableHead key={month} className="text-white font-semibold text-center min-w-[60px]">{month}</TableHead>
                ))}
                <TableHead className="text-white font-semibold text-right min-w-[80px]">รวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <TableCell className="font-medium sticky left-0 bg-inherit">{row.name}</TableCell>
                  {MONTH_NAMES.map(month => (
                    <TableCell key={month} className="text-center">{row[month] || 0}</TableCell>
                  ))}
                  <TableCell className="text-right font-semibold text-[#c5a059]">{row.total}</TableCell>
                </TableRow>
              ))}
              {grandTotal && (
                <TableRow className="bg-[#c5a059]/10 font-bold">
                  <TableCell className="sticky left-0 bg-[#c5a059]/10">{grandTotal.name}</TableCell>
                  {MONTH_NAMES.map(month => (
                    <TableCell key={month} className="text-center">{grandTotal[month] || 0}</TableCell>
                  ))}
                  <TableCell className="text-right">{grandTotal.total}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Monthly Trend Line Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={MONTH_NAMES.map((month, idx) => {
                const monthData: Record<string, string | number> = { month };
                data.forEach(row => {
                  monthData[row.name as string] = row[month] || 0;
                });
                return monthData;
              })}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fill: '#374151', fontWeight: 500 }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => <span className="text-gray-700 font-medium">{value}</span>}
              />
              {data.map((row, idx) => (
                <Line
                  key={row.name as string}
                  type="monotone"
                  dataKey={row.name as string}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Render report content based on selected type
  // Power BI style summary cards
  const renderSummaryCards = (items: { label: string; value: number; color: string }[]) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500 mb-1">{item.label}</p>
          <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case "leads-by-sales":
        if (viewMode === "monthly") {
          return renderMonthlyTable(leadsBySalesMonthlyData, "Sales (CS)", "SQL");
        }
        const totalSQL = leadsBySalesData.reduce((sum, r) => sum + r.SQL, 0);
        return (
          <div className="space-y-6">
            {/* Power BI Style Summary Cards */}
            {renderSummaryCards([
              { label: 'SQL ทั้งหมด', value: totalSQL, color: '#c5a059' },
              { label: 'จำนวน Sales', value: leadsBySalesData.length, color: '#002b38' },
              { label: 'เฉลี่ย/Sales', value: Math.round(totalSQL / (leadsBySalesData.length || 1)), color: '#6366f1' },
              { label: 'สูงสุด', value: Math.max(...leadsBySalesData.map(r => r.SQL), 0), color: '#22c55e' },
            ])}

            {/* Power BI Style Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">SQL แยกตาม Sales</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadsBySalesData} layout="vertical" margin={{ top: 10, right: 80, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="sqlGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#c5a059" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#c5a059" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,171,177,0.1)' }} />
                    <Bar dataKey="SQL" fill="url(#sqlGradient)" radius={[0, 6, 6, 0]} barSize={28} name="SQL">
                      <LabelList dataKey="SQL" position="right" fill="#374151" fontWeight={600} fontSize={13} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#002b38] to-[#004d5a]">
                    <TableHead className="text-white font-semibold">Sales (CS)</TableHead>
                    <TableHead className="text-white font-semibold text-right">SQL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsBySalesData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-semibold text-[#c5a059]">{row.SQL}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#c5a059]/10 font-bold">
                    <TableCell>รวมทั้งหมด</TableCell>
                    <TableCell className="text-right">{totalSQL}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "leads-by-type":
        if (viewMode === "monthly") {
          // Calculate grand total for monthly view
          const leadsByTypeGrandTotal: Record<string, string | number> = { name: 'Grand Total' };
          let grandTotalSum = 0;
          MONTH_NAMES.forEach(month => {
            const sum = leadsByTypeMonthlyData.reduce((acc, row) => acc + (row[month] as number || 0), 0);
            leadsByTypeGrandTotal[month] = sum;
            grandTotalSum += sum;
          });
          leadsByTypeGrandTotal.total = grandTotalSum;
          return renderMonthlyTable(leadsByTypeMonthlyData, "ประเภท", "จำนวน", leadsByTypeGrandTotal);
        }
        const totalLeads = leadsByTypeData.reduce((sum, r) => sum + r.value, 0);
        return (
          <div className="space-y-6">
            {/* Power BI Style Summary Cards */}
            {renderSummaryCards([
              { label: 'SQL', value: leadsByTypeData.find(r => r.name === 'SQL')?.value || 0, color: '#c5a059' },
              { label: 'MQL', value: leadsByTypeData.find(r => r.name === 'MQL')?.value || 0, color: '#002b38' },
              { label: 'UQL', value: leadsByTypeData.find(r => r.name === 'UQL')?.value || 0, color: '#e8d8a1' },
              { label: 'รวมทั้งหมด', value: totalLeads, color: '#6366f1' },
            ])}

            {/* Power BI Style Donut Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">สัดส่วนลีดตามประเภท</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <defs>
                      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <Pie
                      data={leadsByTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                      style={{ filter: 'url(#shadow)' }}
                    >
                      {leadsByTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value.toLocaleString()} (${((value / totalLeads) * 100).toFixed(1)}%)`, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      formatter={(value, entry: any) => (
                        <span className="text-gray-700">
                          {value}: <strong>{entry.payload.value}</strong>
                        </span>
                      )}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#002b38] to-[#004d5a]">
                    <TableHead className="text-white font-semibold">ประเภท</TableHead>
                    <TableHead className="text-white font-semibold text-right">จำนวน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsByTypeData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: row.fill }}>{row.value}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#c5a059]/10 font-bold">
                    <TableCell>รวมทั้งหมด</TableCell>
                    <TableCell className="text-right">{totalLeads}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "status-by-sales":
        if (viewMode === "monthly") {
          return (
            <div className="space-y-6">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#002b38]">
                      <TableHead className="text-white font-semibold sticky left-0 bg-[#002b38] min-w-[120px]">Sales (CS)</TableHead>
                      <TableHead className="text-white font-semibold text-center">สถานะ</TableHead>
                      {MONTH_NAMES.map(month => (
                        <TableHead key={month} className="text-white font-semibold text-center min-w-[50px]">{month}</TableHead>
                      ))}
                      <TableHead className="text-white font-semibold text-right min-w-[60px]">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusBySalesMonthlyData.map((salesData, idx) => (
                      <>
                        {['SQL', 'Contact', 'Consulted', 'CloseWon', 'CloseLost'].map((status, statusIdx) => (
                          <TableRow key={`${idx}-${status}`} className={statusIdx === 0 ? 'bg-gray-100' : 'bg-white'}>
                            {statusIdx === 0 && (
                              <TableCell rowSpan={5} className="font-medium sticky left-0 bg-gray-100 border-r">{salesData.name}</TableCell>
                            )}
                            <TableCell className={status === 'CloseWon' ? 'text-green-600' : status === 'CloseLost' ? 'text-red-500' : ''}>
                              {status === 'CloseWon' ? 'Close Won' : status === 'CloseLost' ? 'Close Lost' : status}
                            </TableCell>
                            {MONTH_NAMES.map((month, monthIdx) => (
                              <TableCell key={month} className="text-center">
                                {(salesData as any)[status][monthIdx] || 0}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-semibold">
                              {((salesData as any)[status] as number[]).reduce((a, b) => a + b, 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        }
        const totalSQLStatus = statusBySalesData.reduce((sum, r) => sum + r.SQL, 0);
        const totalCloseWon = statusBySalesData.reduce((sum, r) => sum + r.CloseWon, 0);
        const totalCloseLost = statusBySalesData.reduce((sum, r) => sum + r.CloseLost, 0);
        return (
          <div className="space-y-6">
            {/* Power BI Style Summary Cards */}
            {renderSummaryCards([
              { label: 'SQL ทั้งหมด', value: totalSQLStatus, color: '#c5a059' },
              { label: 'Close Won', value: totalCloseWon, color: '#22c55e' },
              { label: 'Close Lost', value: totalCloseLost, color: '#ef4444' },
              { label: 'Win Rate', value: Math.round((totalCloseWon / (totalCloseWon + totalCloseLost || 1)) * 100), color: '#6366f1' },
            ])}

            {/* Power BI Style Stacked Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">สถานะลีดแยกตาม Sales</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBySalesData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                    <defs>
                      <linearGradient id="contactGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="consultedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="wonGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="lostGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} angle={-30} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Legend
                      verticalAlign="top"
                      height={40}
                      iconType="circle"
                      formatter={(value) => <span className="text-gray-600 text-sm">{value}</span>}
                    />
                    <Bar dataKey="Contact" stackId="a" fill="url(#contactGradient)" name="Contact" />
                    <Bar dataKey="Consulted" stackId="a" fill="url(#consultedGradient)" name="Consulted" />
                    <Bar dataKey="CloseWon" stackId="a" fill="url(#wonGradient)" name="Close Won" />
                    <Bar dataKey="CloseLost" stackId="a" fill="url(#lostGradient)" name="Close Lost" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#002b38] to-[#004d5a]">
                    <TableHead className="text-white font-semibold">Sales (CS)</TableHead>
                    <TableHead className="text-white font-semibold text-right">SQL</TableHead>
                    <TableHead className="text-white font-semibold text-right">Contact</TableHead>
                    <TableHead className="text-white font-semibold text-right">Consulted</TableHead>
                    <TableHead className="text-white font-semibold text-right">Close Won</TableHead>
                    <TableHead className="text-white font-semibold text-right">Close Lost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusBySalesData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-semibold text-[#c5a059]">{row.SQL}</TableCell>
                      <TableCell className="text-right">{row.Contact}</TableCell>
                      <TableCell className="text-right">{row.Consulted}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{row.CloseWon}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">{row.CloseLost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "sql-by-channel":
        if (viewMode === "monthly") {
          return renderMonthlyTable(sqlByChannelMonthlyData.data, "Platform", "SQL", sqlByChannelMonthlyData.grandTotal);
        }
        const totalSQLChannel = sqlByChannelData.reduce((sum, r) => sum + r.SQL, 0);
        const topChannel = sqlByChannelData[0]?.name || '-';
        return (
          <div className="space-y-6">
            {/* Power BI Style Summary Cards */}
            {renderSummaryCards([
              { label: 'SQL ทั้งหมด', value: totalSQLChannel, color: '#c5a059' },
              { label: 'จำนวนช่องทาง', value: sqlByChannelData.length, color: '#002b38' },
              { label: 'เฉลี่ย/ช่องทาง', value: Math.round(totalSQLChannel / (sqlByChannelData.length || 1)), color: '#6366f1' },
              { label: 'สูงสุด', value: sqlByChannelData[0]?.SQL || 0, color: '#22c55e' },
            ])}

            {/* Power BI Style Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">SQL แยกตามช่องทาง</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sqlByChannelData} margin={{ top: 20, right: 60, left: 10, bottom: 80 }}>
                    <defs>
                      <linearGradient id="channelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c5a059" stopOpacity={1} />
                        <stop offset="100%" stopColor="#008b91" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,171,177,0.1)' }} />
                    <Bar dataKey="SQL" fill="url(#channelGradient)" radius={[6, 6, 0, 0]} barSize={40} name="SQL">
                      <LabelList dataKey="SQL" position="top" fill="#374151" fontWeight={600} fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#002b38] to-[#004d5a]">
                    <TableHead className="text-white font-semibold">Platform</TableHead>
                    <TableHead className="text-white font-semibold text-right">SQL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sqlByChannelData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-semibold text-[#c5a059]">{row.SQL}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#c5a059]/10 font-bold">
                    <TableCell>รวมทั้งหมด</TableCell>
                    <TableCell className="text-right">{totalSQLChannel}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "close-won-by-channel":
        if (viewMode === "monthly") {
          return renderMonthlyTable(closeWonByChannelMonthlyData.data, "Platform", "Close Won", closeWonByChannelMonthlyData.grandTotal);
        }
        const totalCloseWonChannel = closeWonByChannelData.reduce((sum, r) => sum + r.CloseWon, 0);
        return (
          <div className="space-y-6">
            {/* Power BI Style Summary Cards */}
            {renderSummaryCards([
              { label: 'Close Won ทั้งหมด', value: totalCloseWonChannel, color: '#22c55e' },
              { label: 'จำนวนช่องทาง', value: closeWonByChannelData.length, color: '#002b38' },
              { label: 'เฉลี่ย/ช่องทาง', value: Math.round(totalCloseWonChannel / (closeWonByChannelData.length || 1)), color: '#6366f1' },
              { label: 'สูงสุด', value: closeWonByChannelData[0]?.CloseWon || 0, color: '#c5a059' },
            ])}

            {/* Power BI Style Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Close Won แยกตามช่องทาง</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={closeWonByChannelData} margin={{ top: 20, right: 60, left: 10, bottom: 80 }}>
                    <defs>
                      <linearGradient id="wonChannelGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34,197,94,0.1)' }} />
                    <Bar dataKey="CloseWon" fill="url(#wonChannelGradient)" radius={[6, 6, 0, 0]} barSize={40} name="Close Won">
                      <LabelList dataKey="CloseWon" position="top" fill="#374151" fontWeight={600} fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#002b38] to-[#004d5a]">
                    <TableHead className="text-white font-semibold">Platform</TableHead>
                    <TableHead className="text-white font-semibold text-right">Close Won</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closeWonByChannelData.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{row.CloseWon}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#c5a059]/10 font-bold">
                    <TableCell>รวมทั้งหมด</TableCell>
                    <TableCell className="text-right">{totalCloseWonChannel}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "leads-channel-by-sales":
        if (viewMode === "monthly") {
          return (
            <div className="space-y-6">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#002b38]">
                      <TableHead className="text-white font-semibold sticky left-0 bg-[#002b38]">เดือน</TableHead>
                      {leadsChannelBySalesMonthlyData.salesList.map(sales => (
                        <TableHead key={sales} className="text-white font-semibold text-right whitespace-nowrap">{sales}</TableHead>
                      ))}
                      <TableHead className="text-white font-semibold text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsChannelBySalesMonthlyData.monthlyData.map((row, idx) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="font-medium sticky left-0 bg-inherit">{row.month}</TableCell>
                        {leadsChannelBySalesMonthlyData.salesList.map(sales => (
                          <TableCell key={sales} className="text-right">{row[sales] || 0}</TableCell>
                        ))}
                        <TableCell className="text-right font-semibold text-[#c5a059]">{row.total}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-[#c5a059]/10 font-bold">
                      <TableCell className="sticky left-0 bg-[#c5a059]/10">รวมทั้งหมด</TableCell>
                      {leadsChannelBySalesMonthlyData.salesList.map(sales => (
                        <TableCell key={sales} className="text-right">
                          {leadsChannelBySalesMonthlyData.monthlyData.reduce((sum, row) => sum + (row[sales] as number || 0), 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {leadsChannelBySalesMonthlyData.monthlyData.reduce((sum, row) => sum + (row.total as number || 0), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {/* Monthly Line Chart */}
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadsChannelBySalesMonthlyData.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fill: '#374151', fontWeight: 500 }} />
                    <YAxis tick={{ fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => <span className="text-gray-700 font-medium">{value}</span>}
                    />
                    {leadsChannelBySalesMonthlyData.salesList.map((sales, idx) => (
                      <Line
                        key={sales}
                        type="monotone"
                        dataKey={sales}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[idx % COLORS.length], strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            {/* Pivot Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#002b38]">
                    <TableHead className="text-white font-semibold sticky left-0 bg-[#002b38]">Sales</TableHead>
                    {leadsChannelBySalesData.platforms.map(p => (
                      <TableHead key={p} className="text-white font-semibold text-right whitespace-nowrap">{p}</TableHead>
                    ))}
                    <TableHead className="text-white font-semibold text-right">รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsChannelBySalesData.data.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium sticky left-0 bg-white">{row.sales}</TableCell>
                      {leadsChannelBySalesData.platforms.map(p => (
                        <TableCell key={p} className="text-right">{row[p] || 0}</TableCell>
                      ))}
                      <TableCell className="text-right font-semibold text-[#c5a059]">{row.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "mql-by-channel":
        if (viewMode === "monthly") {
          // Calculate grand total for MQL monthly
          const mqlGrandTotal: Record<string, string | number> = { name: 'Grand Total' };
          let mqlGrandTotalSum = 0;
          MONTH_NAMES.forEach(month => {
            const sum = mqlByChannelMonthlyData.reduce((acc, row) => acc + (row[month] as number || 0), 0);
            mqlGrandTotal[month] = sum;
            mqlGrandTotalSum += sum;
          });
          mqlGrandTotal.total = mqlGrandTotalSum;
          return renderMonthlyTable(mqlByChannelMonthlyData, "Platform", "MQL", mqlGrandTotal);
        }
        const totalMQL = mqlByChannelData.filter(r => !r.isSubRow).reduce((sum, r) => sum + r.MQL, 0);
        return (
          <div className="space-y-6">
            {/* Power BI Style Summary Cards */}
            {renderSummaryCards([
              { label: 'MQL ทั้งหมด', value: totalMQL, color: '#002b38' },
              { label: 'จำนวน Platform', value: mqlByPlatformData.length, color: '#c5a059' },
              { label: 'เฉลี่ย/Platform', value: Math.round(totalMQL / (mqlByPlatformData.length || 1)), color: '#6366f1' },
              { label: 'สูงสุด', value: mqlByPlatformData[0]?.MQL || 0, color: '#22c55e' },
            ])}

            {/* Power BI Style Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">MQL แยกตาม Platform</h3>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mqlByPlatformData} margin={{ top: 20, right: 60, left: 10, bottom: 80 }}>
                    <defs>
                      <linearGradient id="mqlGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#002b38" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#004d5a" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,43,56,0.1)' }} />
                    <Bar dataKey="MQL" fill="url(#mqlGradient)" radius={[6, 6, 0, 0]} barSize={40} name="MQL">
                      <LabelList dataKey="MQL" position="top" fill="#374151" fontWeight={600} fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table with Platform + Source breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#002b38] to-[#004d5a]">
                    <TableHead className="text-white font-semibold">Platform</TableHead>
                    <TableHead className="text-white font-semibold">Source</TableHead>
                    <TableHead className="text-white font-semibold text-right">MQL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mqlByChannelData.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={row.isSubRow
                        ? 'bg-gray-50 text-sm hover:bg-gray-100'
                        : 'bg-[#002b38]/5 font-semibold'
                      }
                    >
                      <TableCell className={row.isSubRow ? 'pl-8 text-gray-600' : 'font-medium text-[#002b38]'}>
                        {row.platform}
                      </TableCell>
                      <TableCell className={row.isSubRow ? 'text-gray-600' : ''}>
                        {row.source || (row.isSubRow ? '' : '(รวมทุก Source)')}
                      </TableCell>
                      <TableCell className={`text-right ${row.isSubRow ? 'text-gray-600' : 'font-semibold text-[#002b38]'}`}>
                        {row.MQL}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[#c5a059]/10 font-bold">
                    <TableCell colSpan={2}>รวมทั้งหมด</TableCell>
                    <TableCell className="text-right">
                      {totalMQL}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#c5a059]" />
            เลือกประเภทรายงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reportOptions.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all hover:shadow-md",
                  selectedReport === report.id
                    ? "border-[#c5a059] bg-[#c5a059]/5"
                    : "border-gray-200 hover:border-[#c5a059]/50"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedReport === report.id ? "bg-[#c5a059] text-white" : "bg-gray-100 text-gray-600"
                  )}>
                    {report.icon}
                  </div>
                  <span className="font-medium text-sm">{report.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{report.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-[#c5a059]" />
              ตัวกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {/* Year */}
              <div className="space-y-2">
                <Label>ปี</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue placeholder="เลือกปี" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Month - only show when in summary mode */}
              {viewMode === "summary" && (
                <div className="space-y-2">
                  <Label>เดือน</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger><SelectValue placeholder="เลือกเดือน" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งปี</SelectItem>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Country Filter */}
              <div className="space-y-2">
                <Label>ประเทศ (TH/IN)</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger><SelectValue placeholder="เลือกประเทศ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="TH">🇹🇭 Thailand (TH)</SelectItem>
                    <SelectItem value="IN">🌏 International (IN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sales Filter (only for Admin/Manager) */}
              {canViewAll && (
                <div className="space-y-2">
                  <Label>Sales (CS)</Label>
                  <Select value={selectedSales} onValueChange={setSelectedSales}>
                    <SelectTrigger><SelectValue placeholder="เลือก Sales" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {salesOptions.map((cs) => (
                        <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="space-y-2">
                <Label>รูปแบบการแสดงผล</Label>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "summary" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("summary")}
                    className={viewMode === "summary" ? "bg-[#c5a059] hover:bg-[#009199]" : ""}
                  >
                    แบบรวม
                  </Button>
                  <Button
                    variant={viewMode === "monthly" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setViewMode("monthly");
                      setSelectedMonth("all"); // Reset month filter when viewing monthly breakdown
                    }}
                    className={viewMode === "monthly" ? "bg-[#c5a059] hover:bg-[#009199]" : ""}
                  >
                    แบบรายเดือน
                  </Button>
                </div>
              </div>

              {/* Export Button */}
              <div className="space-y-2">
                <Label className="invisible">Export</Label>
                <Button variant="outline" onClick={handleExportExcel} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  ส่งออก Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{reportOptions.find(r => r.id === selectedReport)?.title}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {reportLoading ? 'กำลังโหลด...' : totalRecords > 0 ? `ทั้งหมด ${totalRecords} รายการ` : `ข้อมูลจากปี ${selectedYear}`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c5a059] mx-auto mb-4"></div>
                  <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
                </div>
              </div>
            ) : (
              <>
                {renderReportContent()}

                {/* Pagination - Show only for reports that support it */}
                {totalPages > 1 && (selectedReport === "leads-channel-by-sales" || selectedReport === "mql-by-channel") && (
                  <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Label>แสดง</Label>
                      <Select value={pageSize.toString()} onValueChange={(value) => {
                        setPageSize(parseInt(value));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">รายการต่อหน้า</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        หน้าแรก
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        ก่อนหน้า
                      </Button>

                      <span className="text-sm text-muted-foreground px-4">
                        หน้า {currentPage} จาก {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        ถัดไป
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        หน้าสุดท้าย
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Report Selected */}
      {!selectedReport && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">เลือกประเภทรายงานที่ต้องการ</p>
              <p className="text-sm">คลิกที่รายงานด้านบนเพื่อเริ่มต้น</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
