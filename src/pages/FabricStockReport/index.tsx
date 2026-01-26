import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Download, Eye, Filter, ChevronUp, ChevronDown, Search, X } from 'lucide-react';
import { format, parseISO, isSameDay, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { toast } from '@/lib/toast';
import { reportApi, rollConfirmationApi } from '@/lib/api-client';
import type { FabricStockReportDto, RollConfirmationResponseDto } from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Filter State Type
interface ColumnFilters {
  lotNo: string;
  customerName: string;
  dateRange: { start: Date | null; end: Date | null };
}

interface MachineRollDetails {
  machineName: string;
  rolls: RollConfirmationResponseDto[];
}

interface DetailsModalState {
  isOpen: boolean;
  lotNo: string | null;
  machineRollDetails: MachineRollDetails[];
  filteredMachineRollDetails: MachineRollDetails[];
  selectedMachine: string | null;
  rollSortOrder: 'asc' | 'desc' | null;
  fgRollSortOrder: 'asc' | 'desc' | null;
  availableMachines: string[];
}

const FabricStockReport: React.FC = () => {
  // Filters
  const [colFilters, setColFilters] = useState<ColumnFilters>({
    lotNo: '',
    customerName: '',
    dateRange: { start: null, end: null }
  });

  // Modal State
  const [detailsModal, setDetailsModal] = useState<DetailsModalState>({
    isOpen: false,
    lotNo: null,
    machineRollDetails: [],
    filteredMachineRollDetails: [],
    selectedMachine: null,
    rollSortOrder: null,
    fgRollSortOrder: null,
    availableMachines: []
  });

  // Fetch Data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fabric-stock-report'],
    queryFn: async () => {
      const response = await reportApi.getFabricStockReport();
      return response.data;
    }
  });

  // Modal Filter/Sort Logic
  const filteredMachineRolls = useMemo(() => {
    let filtered = detailsModal.machineRollDetails;

    // Machine Filter
    if (detailsModal.selectedMachine) {
      filtered = filtered.filter(m => m.machineName === detailsModal.selectedMachine);
    }

    // Deep copy and Sort rolls within each machine
    return filtered.map(machine => {
      let sortedRolls = [...machine.rolls];

      if (detailsModal.fgRollSortOrder) {
        sortedRolls.sort((a, b) => {
          const valA = a.fgRollNo || 0;
          const valB = b.fgRollNo || 0;
          return detailsModal.fgRollSortOrder === 'asc' ? valA - valB : valB - valA;
        });
      } else if (detailsModal.rollSortOrder) {
        sortedRolls.sort((a, b) => {
          const valA = parseInt(a.rollNo) || 0;
          const valB = parseInt(b.rollNo) || 0;
          return detailsModal.rollSortOrder === 'asc' ? valA - valB : valB - valA;
        });
      }

      return { ...machine, rolls: sortedRolls };
    });
  }, [detailsModal.machineRollDetails, detailsModal.selectedMachine, detailsModal.rollSortOrder, detailsModal.fgRollSortOrder]);

  const toggleRollSort = () => {
    setDetailsModal(prev => ({
      ...prev,
      rollSortOrder: prev.rollSortOrder === 'asc' ? 'desc' : 'asc',
      fgRollSortOrder: null
    }));
  };

  const toggleFgRollSort = () => {
    setDetailsModal(prev => ({
      ...prev,
      fgRollSortOrder: prev.fgRollSortOrder === 'asc' ? 'desc' : 'asc',
      rollSortOrder: null
    }));
  };

  // Process & Filter Data locally for speed
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter(item => {
      const matchLot = item.lotNo.toLowerCase().includes(colFilters.lotNo.toLowerCase());
      const matchCustomer = item.customerName.toLowerCase().includes(colFilters.customerName.toLowerCase());

      let matchDate = true;
      if (colFilters.dateRange.start || colFilters.dateRange.end) {
        const itemDate = parseISO(item.createdDate);
        if (colFilters.dateRange.start && colFilters.dateRange.end) {
          matchDate = isWithinInterval(itemDate, {
            start: startOfDay(colFilters.dateRange.start),
            end: endOfDay(colFilters.dateRange.end)
          });
        } else if (colFilters.dateRange.start) {
          matchDate = isSameDay(itemDate, colFilters.dateRange.start) || itemDate >= startOfDay(colFilters.dateRange.start);
        } else if (colFilters.dateRange.end) {
          matchDate = itemDate <= endOfDay(colFilters.dateRange.end);
        }
      }

      return matchLot && matchCustomer && matchDate;
    });
  }, [data, colFilters]);

  // Totals
  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      orderQty: acc.orderQty + curr.orderQuantity,
      reqRolls: acc.reqRolls + curr.requiredRolls,
      dispatched: acc.dispatched + curr.dispatchedRolls,
      stock: acc.stock + curr.stockRolls,
      updatedRolls: acc.updatedRolls + curr.updatedNoOfRolls,
      updateQty: acc.updateQty + curr.updateQuantity,
      balRolls: acc.balRolls + curr.balanceNoOfRolls,
      balQty: acc.balQty + curr.balanceQuantity,
      allocated: acc.allocated + curr.allocatedRolls
    }), {
      orderQty: 0, reqRolls: 0, dispatched: 0, stock: 0, updatedRolls: 0, updateQty: 0, balRolls: 0, balQty: 0, allocated: 0
    });
  }, [filteredData]);

  // Modal Handlers
  const openDetailsModal = async (lotNo: string) => {
    try {
      const response = await rollConfirmationApi.getRollConfirmationsByAllotId(lotNo);
      const rolls = response.data;

      const machineRollMap = new Map<string, RollConfirmationResponseDto[]>();
      rolls.forEach(roll => {
        const machine = roll.machineName || 'Unknown';
        if (!machineRollMap.has(machine)) machineRollMap.set(machine, []);
        machineRollMap.get(machine)?.push(roll);
      });

      const machineRollDetails = Array.from(machineRollMap.entries()).map(([machineName, rolls]) => ({
        machineName,
        rolls
      }));

      setDetailsModal({
        isOpen: true,
        lotNo,
        machineRollDetails,
        filteredMachineRollDetails: machineRollDetails,
        selectedMachine: null,
        rollSortOrder: null,
        fgRollSortOrder: null,
        availableMachines: Array.from(machineRollMap.keys())
      });
    } catch (err) {
      toast.error('Error', 'Failed to load roll details');
    }
  };

  const closeDetailsModal = () => {
    setDetailsModal(prev => ({ ...prev, isOpen: false }));
  };

  // Export Modal Data
  const exportModalData = () => {
    if (!detailsModal.lotNo) return;

    const headers = ['Machine', 'Roll No', 'FG Roll No', 'Net Weight', 'Gross Weight', 'Date'];
    const rows: string[][] = [];

    filteredMachineRolls.forEach(machine => {
      machine.rolls.forEach(roll => {
        rows.push([
          machine.machineName,
          roll.rollNo,
          roll.fgRollNo?.toString() || '-',
          roll.netWeight?.toFixed(2) || '0.00',
          roll.grossWeight?.toFixed(2) || '0.00',
          format(parseISO(roll.createdDate), 'dd-MM-yyyy')
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LotRollDetails_${detailsModal.lotNo}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    toast.success('Success', 'Modal data exported successfully');
  };

  // Main Report Export
  const exportToExcel = () => {
    const headers = [
      'LOT NO', 'CUSTOMER NAME', 'ORDER QTY', 'REQ ROLLS', 'DISPATCHED ROLLS',
      'STOCK ROLLS', 'TOTAL NO. OF ROLLS', 'UPDATE QTY (KG)',
      'BALANCE NO. OF ROLLS', 'BALANCE QTY', 'ALLOCATED ROLLS'
    ];

    const rows = filteredData.map(item => [
      item.lotNo, item.customerName, item.orderQuantity.toFixed(2), item.requiredRolls,
      item.dispatchedRolls, item.stockRolls, item.updatedNoOfRolls, item.updateQuantity.toFixed(2),
      item.balanceNoOfRolls, item.balanceQuantity.toFixed(2), item.allocatedRolls
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FabricStockReport_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="border-none shadow-md bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold text-slate-800">
            Fabric Stock Report
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="hover:bg-blue-50">
              Refresh
            </Button>
            <Button onClick={exportToExcel} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Header Search / Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Lot Number</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search Lot..."
                  className="pl-9 h-10 rounded-lg border-slate-200 focus:ring-blue-500"
                  value={colFilters.lotNo}
                  onChange={e => setColFilters(f => ({ ...f, lotNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-slate-500">Customer Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search Customer..."
                  className="pl-9 h-10 rounded-lg border-slate-200 focus:ring-blue-500"
                  value={colFilters.customerName}
                  onChange={e => setColFilters(f => ({ ...f, customerName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">Date Range</Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  date={colFilters.dateRange.start || undefined}
                  onDateChange={d => setColFilters(f => ({ ...f, dateRange: { ...f.dateRange, start: d || null } }))}
                />
                <span className="text-slate-400">to</span>
                <DatePicker
                  date={colFilters.dateRange.end || undefined}
                  onDateChange={d => setColFilters(f => ({ ...f, dateRange: { ...f.dateRange, end: d || null } }))}
                />
                {(colFilters.dateRange.start || colFilters.dateRange.end) && (
                  <Button variant="ghost" size="sm" onClick={() => setColFilters(f => ({ ...f, dateRange: { start: null, end: null } }))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 bg-red-50 rounded-lg border border-red-100">
              Failed to load report data. Please try again.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">Lot No</TableHead>
                    <TableHead className="font-bold text-slate-700">Customer</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">Order Qty</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Req Rolls</TableHead>
                    <TableHead className="text-center font-bold text-blue-600 bg-blue-50/50">Total Rolls</TableHead>
                    <TableHead className="text-center font-bold text-blue-600 bg-blue-50/50">Update Qty (KG)</TableHead>
                    <TableHead className="text-center font-bold text-orange-600 bg-orange-50/50">Bal Rolls</TableHead>
                    <TableHead className="text-center font-bold text-orange-600 bg-orange-50/50">Bal Qty</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Dispatched</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Stock</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-medium text-slate-900">{item.lotNo}</TableCell>
                      <TableCell className="text-slate-600">{item.customerName}</TableCell>
                      <TableCell className="text-right font-mono">{item.orderQuantity.toFixed(2)}</TableCell>
                      <TableCell className="text-center">{item.requiredRolls}</TableCell>
                      <TableCell className="text-center font-semibold bg-blue-50/20">{item.updatedNoOfRolls}</TableCell>
                      <TableCell className="text-center font-semibold bg-blue-50/20 text-blue-700">{item.updateQuantity.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-semibold bg-orange-50/20 text-orange-700">{item.balanceNoOfRolls}</TableCell>
                      <TableCell className="text-center font-semibold bg-orange-50/20">{item.balanceQuantity.toFixed(2)}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{item.dispatchedRolls}</TableCell>
                      <TableCell className="text-center text-blue-600 font-medium">{item.stockRolls}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => openDetailsModal(item.lotNo)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                          <Eye className="h-4 w-4 mr-1.5" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-slate-100/50 font-bold border-t-2">
                    <TableCell colSpan={2} className="text-slate-800">GRAND TOTAL</TableCell>
                    <TableCell className="text-right font-mono">{totals.orderQty.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{totals.reqRolls}</TableCell>
                    <TableCell className="text-center text-blue-700">{totals.updatedRolls}</TableCell>
                    <TableCell className="text-center text-blue-700">{totals.updateQty.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-orange-700">{totals.balRolls}</TableCell>
                    <TableCell className="text-center text-orange-700">{totals.balQty.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-green-700">{totals.dispatched}</TableCell>
                    <TableCell className="text-center text-blue-700">{totals.stock}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsModal.isOpen} onOpenChange={open => !open && closeDetailsModal()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-none">
          <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-2xl">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-xl">Lot Roll Details: {detailsModal.lotNo}</DialogTitle>
              <div className="flex items-center gap-3 pr-8">
                {/* Export Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportModalData}
                  className="h-8 bg-slate-800 border-slate-700 text-white text-xs hover:bg-slate-700"
                >
                  <Download className="mr-2 h-3.5 w-3.5" /> Export Excel
                </Button>
                {/* Machine Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Machine:</span>
                  <Select
                    value={detailsModal.selectedMachine || 'all'}
                    onValueChange={v => setDetailsModal(p => ({ ...p, selectedMachine: v === 'all' ? null : v }))}
                  >
                    <SelectTrigger className="w-[180px] h-8 bg-slate-800 border-slate-700 text-white text-xs">
                      <SelectValue placeholder="All Machines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Machines</SelectItem>
                      {detailsModal.availableMachines.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            {filteredMachineRolls.map((machine, mIdx) => (
              <div key={mIdx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-100/80 px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                    Machine: {machine.machineName}
                  </h3>
                  <span className="text-xs bg-white px-2 py-1 rounded-full border border-slate-200 text-slate-600">
                    {machine.rolls.length} Rolls
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white hover:bg-white text-[11px] uppercase tracking-wider text-slate-500">
                      <TableHead className="w-32">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] font-bold p-0 hover:bg-transparent"
                          onClick={toggleRollSort}
                        >
                          Roll No {detailsModal.rollSortOrder ? (detailsModal.rollSortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <Filter className="ml-1 h-3 w-2" />}
                        </Button>
                      </TableHead>
                      <TableHead className="w-32">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] font-bold p-0 hover:bg-transparent"
                          onClick={toggleFgRollSort}
                        >
                          FG Roll {detailsModal.fgRollSortOrder ? (detailsModal.fgRollSortOrder === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />) : <Filter className="ml-1 h-3 w-3" />}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Net Wt</TableHead>
                      <TableHead className="text-right">Gross Wt</TableHead>
                      <TableHead>Conf. Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machine.rolls.map((roll, rIdx) => (
                      <TableRow key={rIdx} className="border-slate-100 text-sm hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">{roll.rollNo}</TableCell>
                        <TableCell className="text-blue-600 font-semibold">{roll.fgRollNo || '-'}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-800">{roll.netWeight?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-400">{roll.grossWeight?.toFixed(2)}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{format(parseISO(roll.createdDate), 'dd MMM yyyy')}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50/80 font-bold border-t-2">
                      <TableCell colSpan={2} className="text-slate-600 text-xs uppercase tracking-wider">Subtotal</TableCell>
                      <TableCell className="text-right font-mono text-blue-700">
                        {machine.rolls.reduce((s, r) => s + (r.netWeight || 0), 0).toFixed(2)}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))}

            {filteredMachineRolls.length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-400">No data found for this machine selection.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FabricStockReport;
