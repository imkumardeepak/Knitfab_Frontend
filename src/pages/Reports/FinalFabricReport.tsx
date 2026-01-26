import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FinalFabricReportService } from '../../services/reports/finalFabricReportService';
import type { FinalFabricReportDto } from '../../types/api-types';
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
import { DownloadIcon, SearchIcon, EyeIcon, FilterIcon, CalendarIcon, XIcon } from 'lucide-react';
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
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

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
  }[];
  totalNetWeight: number;
  dispatchQty: number;
  isFirstInOrder: boolean;
  isFirstInItem: boolean;
};

interface FilterState {
  itemName: string;
  yarnCount: string;
  diaGg: string;
  lotNo: string;
  voucherNo: string;
  buyerName: string;
  startDate: Date | null;
  endDate: Date | null;
}

/* ---------------- COMPONENT ---------------- */

const FinalFabricReport: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    itemName: '',
    yarnCount: '',
    diaGg: '',
    lotNo: '',
    voucherNo: '',
    buyerName: '',
    startDate: null,
    endDate: null
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['final-fabric-report'],
    queryFn: FinalFabricReportService.getAllFinalFabricReports,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  /* ---------------- GROUP DATA (IMPORTANT) ---------------- */

  const groupedData: ReportRow[] = useMemo(() => {
    if (!data) return [];

    const rows: ReportRow[] = [];

    data.forEach((report: FinalFabricReportDto) => {
      let isFirstInOrder = true;

      report.salesOrderItems.forEach(item => {
        let isFirstInItem = true;

        item.productionAllotments.forEach(pa => {
          const machines = pa.rollConfirmations.map(rc => ({
            machineName: rc.machineName,
            rollNo: rc.rollNo,
            fgRollNo: rc.fgRollNo,
            netWeight: rc.netWeight,
          }));

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
            machines,
            totalNetWeight: machines.reduce((s, m) => s + m.netWeight, 0),
            dispatchQty: pa.totalDispatchedNetWeight,
            isFirstInOrder,
            isFirstInItem: isFirstInItem,
          });

          isFirstInOrder = false;
          isFirstInItem = false;
        });
      });
    });

    return rows;
  }, [data]);

  /* ---------------- FILTER ---------------- */

  const filteredData = useMemo(() => {
    const { itemName, yarnCount, diaGg, lotNo, voucherNo, buyerName, startDate, endDate } = filters;
    const hasActiveFilters = itemName || yarnCount || diaGg || lotNo || voucherNo || buyerName || startDate || endDate;

    if (!hasActiveFilters) return groupedData;

    const filtered = groupedData.filter(r => {
      const matchItem = !itemName || r.itemName.toLowerCase().includes(itemName.toLowerCase());
      const matchYarn = !yarnCount || r.yarnCount.toLowerCase().includes(yarnCount.toLowerCase());
      const matchDiaGg = !diaGg || r.diaGg.toLowerCase().includes(diaGg.toLowerCase());
      const matchLot = !lotNo || r.lotId.toLowerCase().includes(lotNo.toLowerCase());
      const matchVoucher = !voucherNo || r.voucherNumber.toLowerCase().includes(voucherNo.toLowerCase());
      const matchBuyer = !buyerName || r.buyerName.toLowerCase().includes(buyerName.toLowerCase());

      let matchDate = true;
      if (startDate || endDate) {
        const rowDate = parseISO(r.date);
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

      return matchItem && matchYarn && matchDiaGg && matchLot && matchVoucher && matchBuyer && matchDate;
    });

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
  }, [groupedData, filters]);

  /* ---------------- TOTAL ---------------- */

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => ({
        readyWeight: acc.readyWeight + r.totalNetWeight,
        dispatchWeight: acc.dispatchWeight + r.dispatchQty,
      }),
      { readyWeight: 0, dispatchWeight: 0 }
    );
  }, [filteredData]);

  const resetFilters = () => {
    setFilters({
      itemName: '',
      yarnCount: '',
      diaGg: '',
      lotNo: '',
      voucherNo: '',
      buyerName: '',
      startDate: null,
      endDate: null
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

  /* ---------------- EXPORT CSV ---------------- */

  const exportCSV = () => {
    if (!filteredData.length) return;

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Date',
      'Voucher No',
      'Buyer Name',
      'Item Name',
      'Yarn Count',
      'Dia × GG',
      'Qty',
      'Lot ID',
      'Yarn Party',
      'Yarn Lot',
      'Machines',
      'Total Net Wt',
      'Dispatch Qty',
    ];

    let csv = headers.join(',') + '\n';

    filteredData.forEach(r => {
      const rowData = [
        r.isFirstInOrder ? escapeCSV(new Date(r.date).toLocaleDateString()) : '""',
        r.isFirstInOrder ? escapeCSV(r.voucherNumber) : '""',
        r.isFirstInOrder ? escapeCSV(r.buyerName) : '""',
        r.isFirstInItem ? escapeCSV(r.itemName) : '""',
        r.isFirstInItem ? escapeCSV(r.yarnCount) : '""',
        r.isFirstInItem ? escapeCSV(r.diaGg) : '""',
        r.isFirstInItem ? escapeCSV(r.qty) : '""',
        escapeCSV(r.lotId),
        escapeCSV(r.yarnPartyName),
        escapeCSV(r.yarnLotNo),
        escapeCSV([...new Set(r.machines.map(m => m.machineName))].join(', ')),
        r.totalNetWeight.toFixed(2),
        r.dispatchQty.toFixed(2),
      ];
      csv += rowData.join(',') + '\n';
    });

    csv += `\n,,,,,,,,,,,${totals.readyWeight.toFixed(2)},${totals.dispatchWeight.toFixed(2)}\n`;
    csv += `,,,,,,,,,,,Total Ready Wt,Total Dispatch Wt\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinalFabricReport_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Final Fabric Report</h1>
        <Button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all active:scale-95">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Modern Filter Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Fast Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Voucher No</Label>
            <Input
              value={filters.voucherNo}
              onChange={e => setFilters(f => ({ ...f, voucherNo: e.target.value }))}
              placeholder="Search voucher..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Buyer Name</Label>
            <Input
              value={filters.buyerName}
              onChange={e => setFilters(f => ({ ...f, buyerName: e.target.value }))}
              placeholder="Search buyer..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Item Name</Label>
            <Input
              value={filters.itemName}
              onChange={e => setFilters(f => ({ ...f, itemName: e.target.value }))}
              placeholder="Search item..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Yarn Count</Label>
            <Input
              value={filters.yarnCount}
              onChange={e => setFilters(f => ({ ...f, yarnCount: e.target.value }))}
              placeholder="Search yarn..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Dia × GG</Label>
            <Input
              value={filters.diaGg}
              onChange={e => setFilters(f => ({ ...f, diaGg: e.target.value }))}
              placeholder="Search Dia/GG..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Lot No</Label>
            <Input
              value={filters.lotNo}
              onChange={e => setFilters(f => ({ ...f, lotNo: e.target.value }))}
              placeholder="Search Lot..."
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Date Range</Label>
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
              {(filters.startDate || filters.endDate || filters.itemName || filters.lotNo || filters.voucherNo || filters.buyerName) && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-400 hover:text-red-500">
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent text-slate-600">
                  <TableHead className="w-32 font-bold uppercase text-[11px]">Date</TableHead>
                  <TableHead className="w-40 font-bold uppercase text-[11px]">Voucher No</TableHead>
                  <TableHead className="font-bold uppercase text-[11px]">Buyer</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] text-blue-700">Item Name</TableHead>
                  <TableHead className="font-bold uppercase text-[11px]">Yarn Count</TableHead>
                  <TableHead className="font-bold uppercase text-[11px]">Dia × GG</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[11px]">Order Qty</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] text-orange-600">Lot No</TableHead>
                  <TableHead className="font-bold uppercase text-[11px]">Yarn Party</TableHead>
                  <TableHead className="font-bold uppercase text-[11px]">Yarn Lot</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[11px] text-blue-700">Ready Net Wt</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[11px] text-green-700">Dispatch Qty</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[11px]">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((r, i) => (
                    <TableRow
                      key={i}
                      className={cn(
                        "transition-colors",
                        r.isFirstInOrder && i !== 0 ? "border-t-2 border-slate-200" : "border-slate-100",
                        "hover:bg-slate-50/50"
                      )}
                    >
                      <TableCell className="text-slate-500 font-medium whitespace-nowrap">
                        {r.isFirstInOrder ? format(parseISO(r.date), 'dd MMM yyyy') : ''}
                      </TableCell>
                      <TableCell className={cn("font-bold", r.isFirstInOrder ? "text-blue-600" : "text-transparent")}>
                        {r.isFirstInOrder ? r.voucherNumber : r.voucherNumber}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {r.isFirstInOrder ? r.buyerName : ''}
                      </TableCell>

                      <TableCell className={cn("font-semibold", r.isFirstInItem ? "text-slate-900" : "text-slate-400 opacity-30")}>
                        {r.isFirstInItem ? r.itemName : r.itemName}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {r.isFirstInItem ? r.yarnCount : ''}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {r.isFirstInItem ? r.diaGg : ''}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-slate-800">
                        {r.isFirstInItem ? r.qty : ''}
                      </TableCell>

                      <TableCell className="font-bold text-orange-700">
                        {r.lotId}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs italic">
                        {r.yarnPartyName}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {r.yarnLotNo}
                      </TableCell>

                      <TableCell className="font-bold text-right text-blue-800 font-mono">
                        {r.totalNetWeight.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-bold text-right text-green-800 font-mono">
                        {r.dispatchQty.toFixed(2)}
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-64 text-center">
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

          <div className="flex justify-end pt-4 gap-4">
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 flex items-center gap-6">
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Ready Weight</div>
              <div className="text-2xl font-black text-white font-mono">
                {totals.readyWeight.toFixed(2)} <span className="text-sm font-normal text-slate-400">kg</span>
              </div>
            </div>
            <div className="bg-green-900 text-white p-4 rounded-2xl shadow-lg border border-green-800 flex items-center gap-6">
              <div className="text-xs font-bold uppercase text-green-400 tracking-wider">Total Dispatch Weight</div>
              <div className="text-2xl font-black text-white font-mono">
                {totals.dispatchWeight.toFixed(2)} <span className="text-sm font-normal text-green-400">kg</span>
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
