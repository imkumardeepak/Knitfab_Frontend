import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { useQuery } from '@tanstack/react-query';
import { reportApi, storageCaptureApi, dispatchPlanningApi, rollConfirmationApi, apiUtils } from '@/lib/api-client';
import type { DispatchReportDto, StorageCaptureResponseDto, DispatchedRollDto, RollConfirmationResponseDto } from '@/types/api-types';
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
import { DownloadIcon, SearchIcon, CalendarIcon, XIcon, ListIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { Pagination } from '../../components/ui/pagination';

interface FilterState {
  searchTerm: string;
  startDate: Date | null;
  endDate: Date | null;
}

// ---------------------------------------------------------------------------
// Dispatched Rolls Modal
// ---------------------------------------------------------------------------
interface DispatchedRollsModalProps {
  open: boolean;
  onClose: () => void;
  dispatchOrderId: string;
  loadingSheetNo: string;
}

const DispatchedRollsModal: React.FC<DispatchedRollsModalProps> = ({
  open,
  onClose,
  dispatchOrderId,
  loadingSheetNo,
}) => {
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [rollSearch, setRollSearch] = useState('');
  const [groupByMachine, setGroupByMachine] = useState(false);

  // Sorting state
  type SortField = 'fgRollNo' | 'lotNo' | 'machine';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('fgRollNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Fetch dispatched rolls specific to the selected dispatch order
  const { data: orderRolls, isLoading: rollsLoading } = useQuery({
    queryKey: ['dispatched-rolls-by-order', dispatchOrderId],
    queryFn: async () => {
      if (!dispatchOrderId) return [];
      const response = await dispatchPlanningApi.getOrderedDispatchedRollsByDispatchOrderId(dispatchOrderId);
      return apiUtils.extractData(response) as DispatchedRollDto[];
    },
    enabled: open && !!dispatchOrderId,
  });

  // Fetch additional details (like Location, Customer, Tape) from storage captures based on the lot numbers
  const { data: storageCaptures, isLoading: storageLoading } = useQuery({
    queryKey: ['storage-captures-for-order', dispatchOrderId, orderRolls?.map(r => r.lotNo).join(',')],
    queryFn: async () => {
      if (!orderRolls || orderRolls.length === 0) return [];
      const uniqueLots = Array.from(new Set(orderRolls.map(r => r.lotNo))).filter(Boolean);
      if (uniqueLots.length === 0) return [];
      const response = await storageCaptureApi.getStorageCapturesByLots(uniqueLots);
      return apiUtils.extractData(response) as StorageCaptureResponseDto[];
    },
    enabled: open && !!orderRolls && orderRolls.length > 0,
  });

  // Fetch roll confirmations to get accurate machine names
  const { data: rollConfirmationsMap, isLoading: rcLoading } = useQuery({
    queryKey: ['roll-confirmations-for-order', dispatchOrderId, orderRolls?.map(r => r.lotNo).join(',')],
    queryFn: async () => {
      if (!orderRolls || orderRolls.length === 0) return {};
      const uniqueLots = Array.from(new Set(orderRolls.map(r => r.lotNo))).filter(Boolean);
      if (uniqueLots.length === 0) return {};
      const response = await rollConfirmationApi.getRollConfirmationsByAllotIds(uniqueLots);
      return apiUtils.extractData(response) as Record<string, RollConfirmationResponseDto[]>;
    },
    enabled: open && !!orderRolls && orderRolls.length > 0,
  });

  const allRolls = useMemo(() => {
    if (!orderRolls) return [];
    
    return orderRolls.map(roll => {
      const details = storageCaptures?.find(s => s.fgRollNo === roll.fgRollNo && s.lotNo === roll.lotNo);
      
      let machineName = 'Unknown';
      if (rollConfirmationsMap && rollConfirmationsMap[roll.lotNo]) {
        const rcMatch = rollConfirmationsMap[roll.lotNo].find(r => r.fgRollNo?.toString() === roll.fgRollNo);
        if (rcMatch && rcMatch.machineName) {
          machineName = rcMatch.machineName;
        }
      }

      return {
        id: roll.id,
        fgRollNo: roll.fgRollNo,
        lotNo: roll.lotNo,
        customerName: details?.customerName || 'N/A',
        tape: details?.tape || 'N/A',
        locationCode: details?.locationCode || 'N/A',
        machineName
      };
    });
  }, [orderRolls, storageCaptures, rollConfirmationsMap]);

  // Unique machine options
  const machineOptions = useMemo(() => {
    if (!allRolls) return [];
    const set = new Set(allRolls.map(r => r.machineName));
    return Array.from(set).sort();
  }, [allRolls]);

  const filteredRolls = useMemo(() => {
    if (!allRolls) return [];
    return allRolls.filter((roll) => {
      const matchMachine = machineFilter === 'all' || roll.machineName === machineFilter;
      const matchSearch =
        !rollSearch ||
        roll.fgRollNo?.toLowerCase().includes(rollSearch.toLowerCase()) ||
        roll.lotNo?.toLowerCase().includes(rollSearch.toLowerCase()) ||
        roll.customerName?.toLowerCase().includes(rollSearch.toLowerCase());
      return matchMachine && matchSearch;
    });
  }, [allRolls, machineFilter, rollSearch]);

  const sortedRolls = useMemo(() => {
    return [...filteredRolls].sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';

      if (sortField === 'machine') {
        aValue = a.machineName;
        bValue = b.machineName;
      } else if (sortField === 'fgRollNo') {
        aValue = a.fgRollNo || '';
        bValue = b.fgRollNo || '';
      } else if (sortField === 'lotNo') {
        aValue = a.lotNo || '';
        bValue = b.lotNo || '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRolls, sortField, sortOrder]);

  const groupedRolls = useMemo(() => {
    const groups: Record<string, typeof sortedRolls> = {};
    sortedRolls.forEach(r => {
      if (!groups[r.machineName]) groups[r.machineName] = [];
      groups[r.machineName].push(r);
    });
    return groups;
  }, [sortedRolls]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc'); // Default to ascending when changing field
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 inline text-slate-300" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline text-blue-600" /> : <ArrowDown className="ml-1 h-3 w-3 inline text-blue-600" />;
  };

  const isDataLoading = rollsLoading || storageLoading || rcLoading;

  // Table header extraction for re-use
  const TableHeaderRow = () => (
    <TableHeader className="bg-slate-50 sticky top-0 z-10">
      <TableRow className="hover:bg-transparent border-b h-10">
        <TableHead className="font-bold uppercase text-[10px] text-slate-500">#</TableHead>
        <TableHead 
          className="font-bold uppercase text-[10px] text-slate-500 cursor-pointer select-none hover:text-slate-800"
          onClick={() => handleSort('machine')}
        >
          Machine {renderSortIcon('machine')}
        </TableHead>
        <TableHead 
          className="font-bold uppercase text-[10px] text-slate-500 cursor-pointer select-none hover:text-slate-800"
          onClick={() => handleSort('fgRollNo')}
        >
          FG Roll No {renderSortIcon('fgRollNo')}
        </TableHead>
        <TableHead 
          className="font-bold uppercase text-[10px] text-slate-500 cursor-pointer select-none hover:text-slate-800"
          onClick={() => handleSort('lotNo')}
        >
          Lot No {renderSortIcon('lotNo')}
        </TableHead>
        <TableHead className="font-bold uppercase text-[10px] text-slate-500">Customer</TableHead>
        <TableHead className="font-bold uppercase text-[10px] text-slate-500">Tape</TableHead>
        <TableHead className="font-bold uppercase text-[10px] text-slate-500">Location</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Dispatched Rolls
            {loadingSheetNo && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                — {loadingSheetNo}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pb-3 border-b border-slate-100">
          {/* Machine filter */}
          <div className="w-full sm:w-52">
            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
              Filter by Machine
            </Label>
            <Select value={machineFilter} onValueChange={setMachineFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Machines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {machineOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Roll search */}
          <div className="flex-1">
            <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
              Search Roll
            </Label>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={rollSearch}
                onChange={(e) => setRollSearch(e.target.value)}
                placeholder="Search FG Roll No, Lot No, Customer..."
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          {/* Clear */}
          {(machineFilter !== 'all' || rollSearch) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-slate-400 hover:text-red-500"
                onClick={() => { setMachineFilter('all'); setRollSearch(''); }}
              >
                <XIcon className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          )}

          {/* Group Toggle */}
          <div className="flex items-center ml-auto border-l pl-4 border-slate-100">
            <div className="flex items-center space-x-2">
              <Switch id="group-by-machine" checked={groupByMachine} onCheckedChange={setGroupByMachine} />
              <Label htmlFor="group-by-machine" className="text-xs font-semibold text-slate-600 cursor-pointer">Group by Machine</Label>
            </div>
          </div>
        </div>

        {/* Summary chip */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
            {filteredRolls.length} roll{filteredRolls.length !== 1 ? 's' : ''}
          </span>
          {machineFilter !== 'all' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              Machine: {machineFilter}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isDataLoading ? (
            <div className="space-y-2 p-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          ) : sortedRolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <SearchIcon className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No dispatched rolls found</p>
            </div>
          ) : groupByMachine ? (
            <div className="space-y-6 pb-4">
              {Object.entries(groupedRolls).sort(([a], [b]) => a.localeCompare(b)).map(([machine, rolls]) => (
                <div key={machine} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 py-2 px-3 border-l-4 border-blue-500 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">Machine: {machine}</span>
                    <span className="text-slate-500 text-xs font-medium bg-white px-2 py-0.5 rounded-full border border-slate-200">{rolls.length} rolls</span>
                  </div>
                  <Table>
                    <TableHeaderRow />
                    <TableBody>
                      {rolls.map((roll, idx) => (
                        <TableRow key={roll.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="text-xs text-slate-400">{idx + 1}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                              {roll.machineName}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-xs text-slate-800">{roll.fgRollNo}</TableCell>
                          <TableCell className="text-xs text-orange-700 font-semibold">{roll.lotNo}</TableCell>
                          <TableCell className="text-xs text-slate-700">{roll.customerName}</TableCell>
                          <TableCell className="text-xs text-slate-500">{roll.tape}</TableCell>
                          <TableCell className="text-xs text-slate-400">{roll.locationCode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeaderRow />
              <TableBody>
                {sortedRolls.map((roll, idx) => (
                  <TableRow
                    key={roll.id}
                    className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="text-xs text-slate-400">{idx + 1}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                        {roll.machineName}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-slate-800">{roll.fgRollNo}</TableCell>
                    <TableCell className="text-xs text-orange-700 font-semibold">{roll.lotNo}</TableCell>
                    <TableCell className="text-xs text-slate-700">{roll.customerName}</TableCell>
                    <TableCell className="text-xs text-slate-500">{roll.tape}</TableCell>
                    <TableCell className="text-xs text-slate-400">{roll.locationCode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main Dispatch Report Component
// ---------------------------------------------------------------------------
const DispatchReport: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
  });

  // Modal state
  const [modalState, setModalState] = useState<{
    open: boolean;
    dispatchOrderId: string;
    loadingSheetNo: string;
  }>({ open: false, dispatchOrderId: '', loadingSheetNo: '' });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dispatch-report', filters.startDate, filters.endDate],
    queryFn: async () => {
      const startDateStr = filters.startDate ? filters.startDate.toISOString() : undefined;
      const endDateStr = filters.endDate ? filters.endDate.toISOString() : undefined;
      const response = await reportApi.getDispatchReport(startDateStr, endDateStr);
      return response.data;
    },
    select: (data) => (Array.isArray(data) ? data : []),
  });

  /* ---------------- FILTER ---------------- */

  const filteredData = useMemo(() => {
    if (!data) return [];

    const { searchTerm, startDate, endDate } = filters;

    // Filter to only dispatched records (all records from the dispatch report
    // endpoint should be dispatched, but we apply isFullyDispatched-equivalent
    // filtering via the date/search filters below)
    let result = data;

    const search = searchTerm.toLowerCase();

    result = result.filter((r) => {
      const matchSearch = !searchTerm || (
        (r.loadingSheetNo?.toLowerCase() || '').includes(search) ||
        (r.dispatchOrderId?.toLowerCase() || '').includes(search) ||
        (r.voucher?.toLowerCase() || '').includes(search) ||
        (r.customer?.toLowerCase() || '').includes(search) ||
        (r.lots?.toLowerCase() || '').includes(search)
      );

      return matchSearch;
    });

    return result;
  }, [data, filters]);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
    });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Handle pagination reset when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  /* ---------------- EXPORT EXCEL ---------------- */

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dispatch Report', {
      views: [{ showGridLines: false }]
    });

    // 1. COMPANY BRANDING SECTION
    const titleCell = worksheet.getCell('A1');
    titleCell.value = "AVYAN KNITFABS";
    titleCell.font = { size: 24, bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    worksheet.mergeCells('A1:H2');

    const reportHeaderCell = worksheet.getCell('A3');
    reportHeaderCell.value = "DISPATCH REPORT";
    reportHeaderCell.font = { size: 16, bold: true, color: { argb: 'FF0F172A' }, name: 'Segoe UI' };
    reportHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A3:H3');

    const genInfoCell = worksheet.getCell('A4');
    genInfoCell.value = `Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`;
    genInfoCell.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    genInfoCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A4:H4');

    let currentRow = 6;
    worksheet.getCell(`A${currentRow}`).value = "REPORT FILTER PARAMETERS";
    worksheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FF2563EB' } };
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    currentRow++;

    const addFilter = (label: string, value: string) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
      worksheet.getCell(`B${currentRow}`).value = value;
      worksheet.getCell(`B${currentRow}`).font = { size: 10 };
      currentRow++;
    };

    if (filters.startDate || filters.endDate) {
      addFilter("Date Range:", `${filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Start'} to ${filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'End'}`);
    }
    if (filters.searchTerm) addFilter("Search Keywords:", filters.searchTerm);

    currentRow += 2;

    const headers = [
      "Loading Sheet No", "Dispatch Order ID", "Voucher", "Customer",
      "Lots", "Dispatch Date", "Gross Weight (kg)", "Net Weight (kg)"
    ];

    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = headers;
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    currentRow++;

    let totalGross = 0;
    let totalNet = 0;

    filteredData.forEach(r => {
      totalGross += r.grossWeight || 0;
      totalNet += r.netWeight || 0;

      const row = worksheet.getRow(currentRow);
      row.values = [
        r.loadingSheetNo, r.dispatchOrderId, r.voucher, r.customer, r.lots,
        r.dispatchDate ? format(parseISO(r.dispatchDate), 'dd MMM yyyy') : '',
        r.grossWeight || 0, r.netWeight || 0
      ];

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.font = { size: 10 };
        if ([7, 8].includes(colNumber)) {
          cell.alignment = { horizontal: 'right' };
          cell.numFmt = '#,##0.00';
        }
      });
      currentRow++;
    });

    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = "TOTAL:";
    totalRow.getCell(6).font = { bold: true, size: 11 };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(7).value = totalGross;
    totalRow.getCell(7).font = { bold: true, size: 11 };
    totalRow.getCell(7).numFmt = '#,##0.00';
    totalRow.getCell(8).value = totalNet;
    totalRow.getCell(8).font = { bold: true, size: 11 };
    totalRow.getCell(8).numFmt = '#,##0.00';

    for (let i = 1; i <= 8; i++) {
      totalRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      totalRow.getCell(i).border = {
        top: { style: 'double' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    }

    worksheet.columns = [
      { width: 20 }, { width: 20 }, { width: 25 }, { width: 30 },
      { width: 25 }, { width: 15 }, { width: 18 }, { width: 18 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Dispatch_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
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
    <div className="p-6 max-w-full mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dispatch Report</h1>
        <Button onClick={exportToExcel} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <SearchIcon className="h-3.5 w-3.5 text-blue-600" />
              <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Search</Label>
            </div>
            <Input
              value={filters.searchTerm}
              onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
              placeholder="Search by Sheet No, Order ID, Voucher, Customer, Lots..."
              className="h-10 text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl px-4"
            />
          </div>

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
              {(filters.startDate || filters.endDate || filters.searchTerm) && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-400 hover:text-red-500 ml-1">
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-slate-300 overflow-hidden relative">
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent text-slate-600 border-b h-14">
                    <TableHead className="font-bold uppercase text-[10px]">Loading Sheet No</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Dispatch Order ID</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Voucher</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] text-blue-700">Customer</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] text-orange-600">Lots</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Dispatch Date</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Gross Weight (kg)</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px] text-green-700">Net Weight (kg)</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredData.length > 0 ? (
                    paginatedRows.map((r, i) => (
                      <TableRow
                        key={i}
                        className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="font-medium text-slate-800">
                          {r.loadingSheetNo}
                        </TableCell>
                        <TableCell className="font-medium text-slate-600">
                          {r.dispatchOrderId}
                        </TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {r.voucher}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          {r.customer}
                        </TableCell>
                        <TableCell className="font-bold text-orange-700">
                          {r.lots}
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium whitespace-nowrap">
                          {r.dispatchDate ? format(parseISO(r.dispatchDate), 'dd MMM yy') : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-800">
                          {r.grossWeight?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-800">
                          {r.netWeight?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            title="View dispatched rolls"
                            onClick={() =>
                              setModalState({
                                open: true,
                                dispatchOrderId: r.dispatchOrderId || '',
                                loadingSheetNo: r.loadingSheetNo || '',
                              })
                            }
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
                          >
                            <ListIcon className="h-3.5 w-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <SearchIcon className="h-10 w-10 text-slate-200" />
                          <p className="text-slate-400 font-medium">No records found matching your filters.</p>
                          <Button variant="link" onClick={resetFilters} className="text-blue-600">Clear all filters</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
        </>
      )}

      {/* Dispatched Rolls Modal */}
      <DispatchedRollsModal
        open={modalState.open}
        onClose={() => setModalState(s => ({ ...s, open: false }))}
        dispatchOrderId={modalState.dispatchOrderId}
        loadingSheetNo={modalState.loadingSheetNo}
      />
    </div>
  );
};

export default DispatchReport;
