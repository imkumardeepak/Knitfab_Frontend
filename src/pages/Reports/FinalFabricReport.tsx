import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { useQuery } from '@tanstack/react-query';
import { FinalFabricReportService } from '../../services/reports/finalFabricReportService';
import type { FinalFabricReportDto } from '../../types/api-types';
import { PivotGroupTable, type PivotRow } from './PivotGroupTable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DownloadIcon, SearchIcon, EyeIcon, FilterIcon, CalendarIcon, XIcon, PlayCircle, PauseCircle, LayoutGrid, Settings2, Users, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { Pagination } from '../../components/ui/pagination';

/* ---------------- TYPES ---------------- */

type ReportRow = {
  date: string;
  voucherNumber: string;
  buyerName: string;
  itemName: string;
  yarnCount: string;
  diaGg: string;
  qty: number;
  lotId: string;
  yarnPartyName: string;
  yarnLotNo: string;
  machines: {
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
    createdDate: string;
  }[];
  totalNetWeight: number;
  dispatchQty: number;
  isFirstInOrder: boolean;
  isFirstInItem: boolean;
  dia?: number;
  gg?: number;
  machineName?: string;
  orderStatus: string;
  salesOrderId: number;
};

type ActiveTab = 'report' | 'diaGg' | 'machine' | 'customer';

interface FilterState {
  searchTerm: string;
  startDate: Date | null;
  endDate: Date | null;
  machine: string;
  diaGg: string;
  groupBy: 'none' | 'diaGg' | 'machine' | 'date' | 'customer';
  status: 'all' | 'active' | 'pending' | 'running' | 'hold' | 'completed';
}

/* ---------------- STATUS BADGE ---------------- */

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    pending: {
      label: 'Pending',
      icon: <CircleDot className="h-3 w-3" />,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    running: {
      label: 'Running',
      icon: <PlayCircle className="h-3 w-3" />,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    hold: {
      label: 'Hold',
      icon: <PauseCircle className="h-3 w-3" />,
      className: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    completed: {
      label: 'Completed',
      icon: <CircleDot className="h-3 w-3" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  };
  const c = config[status] || config.pending;
  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border w-max ${c.className}`}>
      {c.icon}
      {c.label}
    </div>
  );
};

/* ---------------- TAB CONFIG ---------------- */

const TAB_CONFIG: { key: ActiveTab; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'report', label: 'Report', icon: <FilterIcon className="h-4 w-4" />, description: 'Full report with date filters' },
  { key: 'diaGg', label: 'Dia-GG Wise', icon: <LayoutGrid className="h-4 w-4" />, description: 'Grouped by Diameter × Gauge' },
  { key: 'machine', label: 'Machine Wise', icon: <Settings2 className="h-4 w-4" />, description: 'Grouped by Machine' },
  { key: 'customer', label: 'Customer Wise', icon: <Users className="h-4 w-4" />, description: 'Grouped by Customer' },
];

/* ---------------- COMPONENT ---------------- */

const FinalFabricReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('report');
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
    machine: '',
    diaGg: '',
    groupBy: 'date',
    status: 'all',
  });

  const [selectedMachines, setSelectedMachines] = useState<{
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
  }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMachineFilter, setModalMachineFilter] = useState<string>('');
  const [filteredModalMachines, setFilteredModalMachines] = useState<{
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
  }[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['final-fabric-report'],
    queryFn: FinalFabricReportService.getAllFinalFabricReports,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  /* ---------------- COMPUTE ORDER STATUS ---------------- */

  const computeOrderStatus = (report: FinalFabricReportDto) => {
    const orderLots = report.salesOrderItems.flatMap(item => item.productionAllotments || []);
    const hasLots = orderLots.length > 0;

    if (!hasLots) {
      return 'pending';
    }

    // In SalesOrderManagement: allItemsProcessed = order.items.every(i => i.isProcess)
    const allItemsProcessed = report.salesOrderItems.length > 0 && report.salesOrderItems.every(i => i.isProcess);
    
    // In SalesOrderManagement: orderLots.every(l => l.isSuspended || l.productionStatus === 2)
    // We mapped productionStatus == 2 to isSuspended in our DTO
    const allLotsCompleted = orderLots.every(l => l.isSuspended);

    if (allItemsProcessed && allLotsCompleted) {
      return 'completed';
    }

    // In SalesOrderManagement: orderLots.every(l => l.isOnHold && !l.isSuspended)
    const allLotsOnHold = orderLots.every(l => l.isOnHold && !l.isSuspended);
    if (allLotsOnHold) {
      return 'hold';
    }

    return 'running';
  };

  /* ---------------- GROUP DATA (IMPORTANT) ---------------- */

  const groupedData: ReportRow[] = useMemo(() => {
    if (!data) return [];

    const rows: ReportRow[] = [];

    data.forEach((report: FinalFabricReportDto) => {
      const orderStatus = computeOrderStatus(report);
      report.salesOrderItems.forEach(item => {
        item.productionAllotments.forEach(pa => {
          // Group rolls by created date and machine
          const rollGroups: Record<string, {
            machineName: string;
            rollNo: string;
            fgRollNo?: number;
            netWeight: number;
            createdDate: string;
          }[]> = {};

          pa.rollConfirmations.forEach(rc => {
            const dateKey = format(parseISO(rc.createdDate), 'yyyy-MM-dd');
            const groupKey = `${dateKey}_${rc.machineName}`;

            if (!rollGroups[groupKey]) {
              rollGroups[groupKey] = [];
            }
            rollGroups[groupKey].push({
              machineName: rc.machineName,
              rollNo: rc.rollNo,
              fgRollNo: rc.fgRollNo,
              netWeight: rc.netWeight,
              createdDate: rc.createdDate
            });
          });

          // Create a row for each group
          Object.values(rollGroups).forEach(rolls => {
            const date = format(parseISO(rolls[0].createdDate), 'yyyy-MM-dd');
            rows.push({
              date: date,
              voucherNumber: report.voucherNumber,
              buyerName: report.buyerName,
              itemName: item.itemName,
              yarnCount: item.yarnCount,
              diaGg: `${item.dia} × ${item.gg}`,
              qty: item.qty,
              lotId: pa.allotmentId,
              yarnPartyName: pa.yarnPartyName,
              yarnLotNo: pa.yarnLotNo,
              machines: rolls,
              totalNetWeight: rolls.reduce((s, m) => s + m.netWeight, 0),
              dispatchQty: pa.totalDispatchedNetWeight,
              isFirstInOrder: false,
              isFirstInItem: false,
              dia: item.dia,
              gg: item.gg,
              machineName: rolls[0].machineName,
              orderStatus,
              salesOrderId: report.salesOrderId
            });
          });

          if (pa.rollConfirmations.length === 0) {
            rows.push({
              date: report.orderDate,
              voucherNumber: report.voucherNumber,
              buyerName: report.buyerName,
              itemName: item.itemName,
              yarnCount: item.yarnCount,
              diaGg: `${item.dia} × ${item.gg}`,
              qty: item.qty,
              lotId: pa.allotmentId,
              yarnPartyName: pa.yarnPartyName,
              yarnLotNo: pa.yarnLotNo,
              machines: [],
              totalNetWeight: 0,
              dispatchQty: pa.totalDispatchedNetWeight,
              isFirstInOrder: false,
              isFirstInItem: false,
              dia: item.dia,
              gg: item.gg,
              machineName: 'N/A',
              orderStatus,
              salesOrderId: report.salesOrderId
            });
          }
        });
      });
    });

    // Initial flags calculation
    let lastVoucher = '';
    let lastItemKey = '';

    return rows.sort((a, b) => b.date.localeCompare(a.date)).map(r => {
      const itemKey = `${r.voucherNumber}-${r.itemName}`;
      const isFirstInOrder = r.voucherNumber !== lastVoucher;
      const isFirstInItem = itemKey !== lastItemKey;

      lastVoucher = r.voucherNumber;
      lastItemKey = itemKey;

      return { ...r, isFirstInOrder, isFirstInItem };
    });
  }, [data]);

  /* ---------------- DETERMINE EFFECTIVE GROUPBY & STATUS BASED ON TAB ---------------- */

  const effectiveGroupBy = useMemo(() => {
    if (activeTab === 'diaGg') return 'diaGg';
    if (activeTab === 'machine') return 'machine';
    if (activeTab === 'customer') return 'customer';
    return filters.groupBy;
  }, [activeTab, filters.groupBy]);

  const isGroupTab = activeTab !== 'report';

  /* ---------------- PIVOT DATA (For Group Tabs) ---------------- */

  const pivotData: PivotRow[] = useMemo(() => {
    if (!data) return [];
    const rows: PivotRow[] = [];
    const search = filters.searchTerm.toLowerCase();

    data.forEach((report) => {
      const orderStatus = computeOrderStatus(report);
      if (orderStatus !== 'running' && orderStatus !== 'hold') return;

      report.salesOrderItems.forEach(item => {
        item.productionAllotments.forEach(pa => {
          let perDayProdn = 0;
          pa.machineAllocations?.forEach(ma => {
            if (ma.estimatedProductionTime > 0) {
              perDayProdn += ma.totalLoadWeight / ma.estimatedProductionTime;
            }
          });

          const updateQty = pa.totalConfirmedNetWeight || 0;
          const balanceQty = item.qty - updateQty;
          const balanceDay = perDayProdn > 0 ? (balanceQty / perDayProdn) : 0;

          let groupKey = 'N/A';
          if (effectiveGroupBy === 'diaGg') groupKey = `${item.dia}"/${item.gg}GG`;
          else if (effectiveGroupBy === 'machine') {
            groupKey = pa.machineAllocations?.length > 0 ? pa.machineAllocations[0].machineName : 'N/A';
          }
          else if (effectiveGroupBy === 'customer') groupKey = report.buyerName;

          const rowData = {
            groupKey,
            status: orderStatus === 'running' ? 'r' : 'n',
            customerName: report.buyerName,
            count: item.yarnCount,
            lotNo: pa.allotmentId,
            runningMachines: pa.totalRunningMachines || 0,
            perDayProdn,
            orderQty: item.qty,
            updateQty,
            balanceQty,
            balanceDay,
            itemId: item.salesOrderItemId
          };

          if (search) {
             const match = rowData.groupKey.toLowerCase().includes(search) ||
                           rowData.customerName.toLowerCase().includes(search) ||
                           rowData.count.toLowerCase().includes(search) ||
                           rowData.lotNo.toLowerCase().includes(search);
             if (!match) return; // skip if doesn't match
          }

          rows.push(rowData);
        });
      });
    });

    return rows;
  }, [data, effectiveGroupBy, filters.searchTerm]);

  /* ---------------- FILTER ---------------- */

  const filteredData = useMemo(() => {
    const { searchTerm, startDate, endDate } = filters;

    let filtered = groupedData;

    // For group-wise tabs: only show Running + Hold status
    if (isGroupTab) {
      filtered = filtered.filter(r => r.orderStatus === 'running' || r.orderStatus === 'hold');
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.itemName.toLowerCase().includes(search) ||
        r.yarnCount.toLowerCase().includes(search) ||
        r.diaGg.toLowerCase().includes(search) ||
        r.lotId.toLowerCase().includes(search) ||
        r.voucherNumber.toLowerCase().includes(search) ||
        r.buyerName.toLowerCase().includes(search)
      );
    }

    // Apply machine / diaGg dropdown filters (Report tab only)
    if (!isGroupTab) {
      if (filters.machine) {
        filtered = filtered.filter(r => r.machineName === filters.machine);
      }
      if (filters.diaGg) {
        filtered = filtered.filter(r => r.diaGg === filters.diaGg);
      }
    }

    // Apply date filter only for Report tab
    if (!isGroupTab && (startDate || endDate)) {
      filtered = filtered.filter(r => {
        const rowDate = parseISO(r.date);
        if (startDate && endDate) {
          return isWithinInterval(rowDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate)
          });
        } else if (startDate) {
          return rowDate >= startOfDay(startDate);
        } else if (endDate) {
          return rowDate <= endOfDay(endDate);
        }
        return true;
      });
    }

    // Recalculate flags for filtered set
    let lastVoucher = '';
    let lastItemKey = '';

    return filtered.map(r => {
      const itemKey = `${r.voucherNumber}-${r.itemName}`;
      const isFirstInOrder = r.voucherNumber !== lastVoucher;
      const isFirstInItem = itemKey !== lastItemKey;

      lastVoucher = r.voucherNumber;
      lastItemKey = itemKey;

      return { ...r, isFirstInOrder, isFirstInItem };
    });
  }, [groupedData, filters, isGroupTab]);

  // Handle pagination reset when filters or tab change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  /* ---------------- TOTAL ---------------- */

  const totals = useMemo(() => {
    const seenLots = new Set<string>();
    let readyWeight = 0;
    let dispatchWeight = 0;

    filteredData.forEach(r => {
      readyWeight += r.totalNetWeight;
      if (!seenLots.has(r.lotId)) {
        dispatchWeight += r.dispatchQty;
        seenLots.add(r.lotId);
      }
    });

    return { readyWeight, dispatchWeight };
  }, [filteredData]);

  /* ---------------- STATUS COUNTS (for group tabs) ---------------- */

  const statusCounts = useMemo(() => {
    const voucherStatusMap = new Map<number, string>();
    groupedData.forEach(r => {
      if (!voucherStatusMap.has(r.salesOrderId)) {
        voucherStatusMap.set(r.salesOrderId, r.orderStatus);
      }
    });
    let running = 0;
    let hold = 0;
    voucherStatusMap.forEach(status => {
      if (status === 'running') running++;
      if (status === 'hold') hold++;
    });
    return { running, hold, total: running + hold };
  }, [groupedData]);

  /* ---------------- GROUPED DISPLAY ---------------- */

  const groupConfigs = useMemo(() => {
    if (effectiveGroupBy === 'none') {
      return [{ key: 'Results', rows: paginatedRows, allRows: filteredData, totalNetWeight: filteredData.reduce((s, r) => s + r.totalNetWeight, 0) }];
    }

    const groups: Record<string, { rows: ReportRow[], totalNetWeight: number, rawDate?: string }> = {};

    // Build groups from ALL filtered data
    filteredData.forEach(r => {
      let key = '';
      let rawDate: string | undefined;
      if (effectiveGroupBy === 'diaGg') key = `Dia-GG: ${r.diaGg}`;
      else if (effectiveGroupBy === 'machine') key = `Machine: ${r.machineName || 'Unknown'}`;
      else if (effectiveGroupBy === 'customer') key = `Customer: ${r.buyerName || 'Unknown'}`;
      else if (effectiveGroupBy === 'date') {
        key = `Date: ${format(parseISO(r.date), 'dd MMM yyyy')}`;
        rawDate = r.date;
      }

      if (!groups[key]) {
        groups[key] = { rows: [], totalNetWeight: 0, rawDate };
      }

      if (effectiveGroupBy === 'diaGg' || effectiveGroupBy === 'machine' || effectiveGroupBy === 'customer') {
        const existingRowIndex = groups[key].rows.findIndex(row => row.lotId === r.lotId);
        if (existingRowIndex >= 0) {
          groups[key].rows[existingRowIndex].totalNetWeight += r.totalNetWeight;
        } else {
          groups[key].rows.push({ ...r });
        }
      } else {
        groups[key].rows.push(r);
      }
      
      groups[key].totalNetWeight += r.totalNetWeight;
    });

    return Object.entries(groups).map(([key, data]) => ({
      key,
      allRows: data.rows,
      rows: data.rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      totalNetWeight: data.totalNetWeight,
      rawDate: data.rawDate
    })).sort((a, b) => {
      if (effectiveGroupBy === 'date' && a.rawDate && b.rawDate) {
        return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
      }
      return a.key.localeCompare(b.key);
    });
  }, [filteredData, effectiveGroupBy, paginatedRows, currentPage, pageSize]);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
      machine: '',
      diaGg: '',
      groupBy: 'none',
      status: 'all',
    });
  };

  const openMachinesModal = (machines: {
    machineName: string;
    rollNo: string;
    fgRollNo?: number;
    netWeight: number;
  }[]) => {
    const sortedMachines = [...machines].sort((a, b) => {
      const fgRollNoA = a.fgRollNo ?? 0;
      const fgRollNoB = b.fgRollNo ?? 0;
      return fgRollNoA - fgRollNoB;
    });

    setSelectedMachines(sortedMachines);
    setFilteredModalMachines(sortedMachines);
    setModalMachineFilter('');
    setIsModalOpen(true);
  };

  /* ---------------- EXPORT EXCEL ---------------- */

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Production Report', {
      views: [{ showGridLines: false }]
    });

    // 1. COMPANY BRANDING SECTION
    const titleCell = worksheet.getCell('A1');
    titleCell.value = "AVYAN KNITFABS ";
    titleCell.font = { size: 24, bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    worksheet.mergeCells('A1:N2');

    const reportHeaderCell = worksheet.getCell('A3');
    reportHeaderCell.value = "FINAL FABRIC PRODUCTION REPORT";
    reportHeaderCell.font = { size: 16, bold: true, color: { argb: 'FF0F172A' }, name: 'Segoe UI' };
    reportHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A3:N3');

    const genInfoCell = worksheet.getCell('A4');
    genInfoCell.value = `Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`;
    genInfoCell.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    genInfoCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A4:N4');

    // 2. FILTER SUMMARY SECTION
    let currentRow = 6;
    worksheet.getCell(`A${currentRow}`).value = "REPORT FILTER PARAMETERS";
    worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF2563EB' } };
    worksheet.mergeCells(`A${currentRow}:N${currentRow}`);
    currentRow++;

    const addFilter = (label: string, value: string) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`B${currentRow}`).font = { size: 10 };
      currentRow++;
    };

    addFilter("Active Tab:", activeTab === 'report' ? 'Full Report' : activeTab === 'diaGg' ? 'Dia-GG Wise' : activeTab === 'machine' ? 'Machine Wise' : 'Customer Wise');
    if (!isGroupTab && (filters.startDate || filters.endDate)) {
      addFilter("Date Range:", `${filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Start'} to ${filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'End'}`);
    }
    if (filters.machine) addFilter("Machine:", filters.machine);
    if (filters.diaGg) addFilter("Dia-GG:", filters.diaGg);
    if (filters.searchTerm) addFilter("Search Keywords:", filters.searchTerm);
    if (isGroupTab) addFilter("Status Filter:", "Running + Hold Only");

    currentRow += 2;

    // 3. TABLE HEADERS
    const headers = [
      "Date", "Voucher No", "Buyer", "Item Name", "Yarn Count",
      "Dia × GG", "Order Qty", "Lot No", "Yarn Party",
      "Yarn Lot", "Ready Net Wt (KG)", "Machine", "Roll Count"
    ];

    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = headers;
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    currentRow++;

    // 4. DATA SECTION
    groupConfigs.forEach(group => {
      const rowsToExport = group.allRows ?? group.rows;
      if (effectiveGroupBy !== 'none') {
        const groupRow = worksheet.getRow(currentRow);
        groupRow.getCell(1).value = group.key.toUpperCase();
        groupRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
        groupRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        worksheet.mergeCells(`A${currentRow}:M${currentRow}`);

        for (let i = 1; i <= 13; i++) {
          groupRow.getCell(i).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        currentRow++;
      }

      rowsToExport.forEach(r => {
        const row = worksheet.getRow(currentRow);
        row.values = [
          format(parseISO(r.date), 'dd/MM/yyyy'),
          r.voucherNumber,
          r.buyerName,
          r.itemName,
          r.yarnCount,
          r.diaGg,
          r.qty,
          r.lotId,
          r.yarnPartyName,
          r.yarnLotNo,
          r.totalNetWeight,
          r.machineName || 'N/A',
          r.machines.length
        ];

        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.font = { size: 10 };
          if ([7, 11, 13].includes(colNumber)) {
            cell.alignment = { horizontal: 'right' };
            cell.numFmt = '#,##0.00';
          }
        });

        currentRow++;
      });

      if (effectiveGroupBy !== 'none') {
        const subtotalRow = worksheet.getRow(currentRow);
        subtotalRow.getCell(10).value = "SUBTOTAL:";
        subtotalRow.getCell(10).font = { bold: true };
        subtotalRow.getCell(11).value = group.totalNetWeight;
        subtotalRow.getCell(11).font = { bold: true, color: { argb: 'FF2563EB' } };
        subtotalRow.getCell(11).numFmt = '#,##0.00';

        for (let i = 1; i <= 13; i++) {
          subtotalRow.getCell(i).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
          subtotalRow.getCell(i).border = {
            top: { style: 'double' },
            bottom: { style: 'thin' }
          };
        }
        currentRow++;
      }
    });

    // 5. GRAND TOTALS
    currentRow++;
    const grandTotalRow = worksheet.getRow(currentRow);
    grandTotalRow.getCell(10).value = "GRAND TOTAL:";
    grandTotalRow.getCell(10).font = { bold: true, size: 12 };

    grandTotalRow.getCell(11).value = totals.readyWeight;
    grandTotalRow.getCell(11).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
    grandTotalRow.getCell(11).numFmt = '"KG" #,##0.00';
    grandTotalRow.getCell(11).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' }
    };

    // Column Widths
    worksheet.columns = [
      { width: 15 }, { width: 18 }, { width: 25 }, { width: 30 }, { width: 15 },
      { width: 15 }, { width: 12 }, { width: 18 }, { width: 20 }, { width: 15 },
      { width: 20 }, { width: 15 }, { width: 12 }
    ];

    // Generate and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Final_Fabric_Report_${activeTab}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load report
          <Button variant="outline" className="ml-4" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto space-y-5 print:p-0 print:space-y-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Final Fabric Report</h1>
        <Button onClick={exportToExcel} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* ═══════ PREMIUM TAB BAR ═══════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 print:hidden">
        <div className="flex gap-1">
          {TAB_CONFIG.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex-1 justify-center",
                  isActive
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {/* Show Running + Hold count badge on group tabs */}
                {tab.key !== 'report' && isActive && (
                  <span className="ml-1 bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {statusCounts.total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════ STATUS CHIPS (group tabs only) ═══════ */}
      {isGroupTab && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">
            <PlayCircle className="h-3.5 w-3.5" />
            Running: {statusCounts.running}
          </div>
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold">
            <PauseCircle className="h-3.5 w-3.5" />
            Hold: {statusCounts.hold}
          </div>
          <div className="ml-auto text-xs text-slate-400 font-medium">
            Showing only Running & Hold status vouchers
          </div>
        </div>
      )}

      {/* ═══════ FILTER SECTION ═══════ */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 print:hidden">
        <div className={cn(
          "grid gap-6",
          isGroupTab ? "grid-cols-1 md:grid-cols-1 max-w-md" : "grid-cols-1 md:grid-cols-3"
        )}>
          {/* Global Search — always visible */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <SearchIcon className="h-3.5 w-3.5 text-blue-600" />
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Global Search</Label>
            </div>
            <Input
              value={filters.searchTerm}
              onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
              placeholder="Search by lot, voucher, buyer, item, etc..."
              className="h-10 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl px-4"
            />
          </div>

          {/* Date Range — only for Report tab */}
          {!isGroupTab && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date Range</Label>
              </div>
              <div className="flex items-center gap-2">
                <DatePicker
                  date={filters.startDate || undefined}
                  onDateChange={d => setFilters(f => ({ ...f, startDate: d || null }))}
                />
                <span className="text-slate-300">to</span>
                <DatePicker
                  date={filters.endDate || undefined}
                  onDateChange={d => setFilters(f => ({ ...f, endDate: d || null }))}
                />
                {(filters.startDate || filters.endDate || filters.searchTerm || filters.groupBy !== 'date') && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-400 hover:text-red-500 ml-1">
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
      ) : isGroupTab ? (
        <PivotGroupTable 
          data={pivotData} 
          reportName={
            activeTab === 'diaGg' ? 'Dia-GG_Wise_Report' :
            activeTab === 'machine' ? 'Machine_Wise_Report' :
            activeTab === 'customer' ? 'Customer_Wise_Report' : 'Fabric_Plan_Report'
          } 
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-slate-300 overflow-hidden relative">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent text-slate-600 border-b h-14">
                  <TableHead className="font-bold uppercase text-[10px]">Date</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Voucher No</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Buyer</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] text-blue-700">Item Name</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Yarn Count</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Dia × GG</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Order Qty</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] text-orange-600">Lot No</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Yarn Party</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Yarn Lot</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px] text-blue-700">Ready Net Wt</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px]">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {groupConfigs.length > 0 && groupConfigs[0].rows.length > 0 ? (
                  groupConfigs.map((group) => (
                    <React.Fragment key={group.key}>
                      {effectiveGroupBy !== 'none' && (
                        <TableRow className="bg-slate-100/80 hover:bg-slate-100/80">
                          <TableCell colSpan={12} className="py-2 px-4">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">
                                {group.key}
                              </span>
                              <div className="flex gap-4 items-center">
                                <span className="text-[10px] font-bold text-slate-400">SUBTOTAL READY WT:</span>
                                <span className="font-mono font-bold text-blue-700 italic underline text-[10px]">
                                  {group.totalNetWeight.toFixed(2)} KG
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {group.rows.map((r, i) => (
                        <TableRow
                          key={`${r.lotId}-${r.date}-${r.machineName}-${i}`}
                          className={cn(
                            "transition-colors",
                            r.isFirstInOrder ? "border-t-2 border-slate-300" : "border-t border-slate-100",
                            "hover:bg-slate-50 group"
                          )}
                        >
                          <TableCell className="font-mono text-[11px] text-slate-500">
                            {format(parseISO(r.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className={cn("font-bold text-blue-600")}>
                            {r.voucherNumber}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">
                            {r.buyerName}
                          </TableCell>

                          <TableCell className={cn("font-semibold text-slate-900")}>
                            {r.itemName}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {r.yarnCount}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {r.diaGg}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-800">
                            {r.qty}
                          </TableCell>

                          <TableCell className="font-bold text-orange-700">
                            {r.lotId}
                          </TableCell>
                          <TableCell className="text-slate-500 text-[10px] italic">
                            {r.yarnPartyName}
                          </TableCell>
                          <TableCell className="text-slate-500 text-[10px]">
                            {r.yarnLotNo}
                          </TableCell>

                          <TableCell className="font-bold text-right text-blue-800 font-mono">
                            {r.totalNetWeight.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMachinesModal(r.machines)}
                              className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                            >
                              <EyeIcon className="h-4 w-4 mr-1.5" />
                              ({r.machines.length})
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <SearchIcon className="h-10 w-10 text-slate-200" />
                        <p className="text-slate-400 font-medium">
                          No records found matching your filters.
                        </p>
                        <Button variant="link" onClick={resetFilters} className="text-blue-600">Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredData.length / pageSize)}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            totalItems={filteredData.length}
          />

          <div className="flex justify-end pt-4 gap-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex items-center gap-6">
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Ready Weight</div>
              <div className="text-2xl font-black text-white font-mono">
                {totals.readyWeight.toFixed(2)} <span className="text-sm font-normal text-slate-400">kg</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Machines Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-8 bg-slate-900 text-white flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Roll Tracking Breakdown</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Filter by Machine</Label>
                <select
                  value={modalMachineFilter}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    setModalMachineFilter(selectedValue);
                    if (selectedValue === '') {
                      setFilteredModalMachines([...selectedMachines].sort((a, b) => (a.fgRollNo ?? 0) - (b.fgRollNo ?? 0)));
                    } else {
                      const filtered = selectedMachines.filter(m => m.machineName === selectedValue);
                      setFilteredModalMachines(filtered.sort((a, b) => (a.fgRollNo ?? 0) - (b.fgRollNo ?? 0)));
                    }
                  }}
                  className="w-full bg-slate-50 border-none rounded-xl h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Machines</option>
                  {[...new Set(selectedMachines.map(m => m.machineName))].sort().map(nm => (
                    <option key={nm} value={nm}>{nm}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-xs font-bold uppercase text-slate-500">Machine</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500">Roll No</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500 text-blue-600">FG Roll</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500 text-right">Net Wt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModalMachines.map((m, idx) => (
                    <TableRow key={idx} className="border-slate-50">
                      <TableCell className="font-bold text-slate-700">{m.machineName}</TableCell>
                      <TableCell className="text-slate-500 font-mono">{m.rollNo}</TableCell>
                      <TableCell className="font-bold text-blue-700 italic">{m.fgRollNo ?? '-'}</TableCell>
                      <TableCell className="text-right font-black text-slate-900 font-mono">{m.netWeight.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="p-6 bg-slate-100 border-t flex justify-end">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Weight</span>
              <span className="text-xl font-black text-slate-900 font-mono">
                {filteredModalMachines.reduce((s, x) => s + x.netWeight, 0).toFixed(2)} kg
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinalFabricReport;
