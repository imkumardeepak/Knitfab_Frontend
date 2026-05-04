import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/lib/api-client';
import type { DispatchReportDto } from '@/types/api-types';
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
import { DownloadIcon, SearchIcon, CalendarIcon, XIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, startOfMonth } from 'date-fns';

interface FilterState {
  searchTerm: string;
  startDate: Date | null;
  endDate: Date | null;
}

const DispatchReport: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dispatch-report'],
    queryFn: async () => {
      const response = await reportApi.getDispatchReport();
      return response.data;
    },
    select: (data) => (Array.isArray(data) ? data : []),
  });

  /* ---------------- FILTER ---------------- */

  const filteredData = useMemo(() => {
    if (!data) return [];
    
    const { searchTerm, startDate, endDate } = filters;
    const hasActiveFilters = searchTerm || startDate || endDate;

    if (!hasActiveFilters) return data;

    return data.filter((r) => {
      const search = searchTerm.toLowerCase();

      const matchSearch = !searchTerm || (
        (r.loadingSheetNo?.toLowerCase() || '').includes(search) ||
        (r.dispatchOrderId?.toLowerCase() || '').includes(search) ||
        (r.voucher?.toLowerCase() || '').includes(search) ||
        (r.customer?.toLowerCase() || '').includes(search) ||
        (r.lots?.toLowerCase() || '').includes(search)
      );

      let matchDate = true;
      if ((startDate || endDate) && r.dispatchDate) {
        const rowDate = parseISO(r.dispatchDate);
        if (startDate && endDate) {
          matchDate = isWithinInterval(rowDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate)
          });
        } else if (startDate) {
          matchDate = rowDate >= startOfDay(startDate);
        } else if (endDate) {
          matchDate = rowDate <= endOfDay(endDate);
        }
      }

      return matchSearch && matchDate;
    });
  }, [data, filters]);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: startOfMonth(new Date()),
      endDate: new Date(),
    });
  };

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
      fgColor: { argb: 'FF1E293B' } // Slate-900
    };
    worksheet.mergeCells('A1:H2');

    // Add Report Header
    const reportHeaderCell = worksheet.getCell('A3');
    reportHeaderCell.value = "DISPATCH REPORT";
    reportHeaderCell.font = { size: 16, bold: true, color: { argb: 'FF0F172A' }, name: 'Segoe UI' };
    reportHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells('A3:H3');

    // Add Generation Info
    const genInfoCell = worksheet.getCell('A4');
    genInfoCell.value = `Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`;
    genInfoCell.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    genInfoCell.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A4:H4');

    // 2. FILTER SUMMARY SECTION
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

    currentRow += 2; // Spacer

    // 3. TABLE HEADERS
    const headers = [
      "Loading Sheet No", "Dispatch Order ID", "Voucher", "Customer", 
      "Lots", "Dispatch Date", "Gross Weight (kg)", "Net Weight (kg)"
    ];

    const headerRow = worksheet.getRow(currentRow);
    headerRow.values = headers;
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' } // Blue-600
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
    let totalGross = 0;
    let totalNet = 0;

    filteredData.forEach(r => {
      totalGross += r.grossWeight || 0;
      totalNet += r.netWeight || 0;

      const row = worksheet.getRow(currentRow);
      row.values = [
        r.loadingSheetNo,
        r.dispatchOrderId,
        r.voucher,
        r.customer,
        r.lots,
        r.dispatchDate ? format(parseISO(r.dispatchDate), 'dd MMM yyyy') : '',
        r.grossWeight || 0,
        r.netWeight || 0
      ];

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.font = { size: 10 };
        if ([7, 8].includes(colNumber)) {
          cell.alignment = { horizontal: 'right' };
          cell.numFmt = '#,##0.00';
        }
      });

      currentRow++;
    });

    // 5. TOTALS
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
      totalRow.getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
      totalRow.getCell(i).border = {
        top: { style: 'double' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Column Widths
    worksheet.columns = [
      { width: 20 }, { width: 20 }, { width: 25 }, { width: 30 }, 
      { width: 25 }, { width: 15 }, { width: 18 }, { width: 18 }
    ];

    // Generate and Download
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
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((r, i) => (
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
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
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
      )}
    </div>
  );
};

export default DispatchReport;
