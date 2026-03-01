import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
import { Calendar, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/lib/toast';
import { productionAllotmentApi, rollConfirmationApi } from '@/lib/api-client';
import type { ProductionAllotmentResponseDto, RollConfirmationResponseDto, ShiftResponseDto } from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';
import { useShifts } from '@/hooks/queries/useShiftQueries';
import { Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Define types
interface FilterOptions {
  date: Date | null;
  machineName: string | null;
  lotNo: string | null;
}

interface ProductionData {
  machineName: string;
  lotNo: string;
  shiftCounts: Record<string, number>; // Dynamic counts per shift
  totalRolls: number;
  totalWeight: number;
  date: string;
  rolls: RollConfirmationResponseDto[]; // For the modal
}

const ProductionReport: React.FC = () => {
  // State for filters
  const [filters, setFilters] = useState<FilterOptions>({
    date: new Date(),
    machineName: null,
    lotNo: null
  });

  const [selectedGroupRolls, setSelectedGroupRolls] = useState<RollConfirmationResponseDto[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: shifts = [] } = useShifts(); // Fetch shifts

  // State for data
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table'); // Added view mode state

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchProductionData();
  }, [filters]);

  const fetchProductionData = async () => {
    try {
      setLoading(true);

      // Fetch all production allotments
      const allotmentResponse = await productionAllotmentApi.getAllProductionAllotments();
      let allotments = allotmentResponse.data;

      // Fetch all roll confirmations
      const rollResponse = await rollConfirmationApi.getAllRollConfirmations();
      let rollConfirmations = rollResponse.data;

      // Apply date filter if selected
      if (filters.date) {
        const selectedDate = format(filters.date, 'yyyy-MM-dd');
        rollConfirmations = rollConfirmations.filter(roll => {
          const rollDate = format(parseISO(roll.createdDate), 'yyyy-MM-dd');
          return rollDate === selectedDate;
        });
      }

      // Apply machine name filter
      if (filters.machineName) {
        rollConfirmations = rollConfirmations.filter(roll =>
          roll.machineName.toLowerCase().includes(filters.machineName!.toLowerCase())
        );
      }

      // Apply lot number filter
      if (filters.lotNo) {
        rollConfirmations = rollConfirmations.filter(roll =>
          roll.allotId.toLowerCase().includes(filters.lotNo!.toLowerCase())
        );
      }

      // Helper function to get shift for a roll time
      const getShiftForRoll = (rollDateStr: string): string => {
        if (!shifts || shifts.length === 0) return 'N/A';

        const rollDate = parseISO(rollDateStr);
        const timeStr = format(rollDate, 'HH:mm:ss');

        const shift = shifts.find(s => {
          const start = s.startTime;
          const end = s.endTime;

          if (end > start) {
            return timeStr >= start && timeStr <= end;
          } else {
            // Shift crosses midnight
            return timeStr >= start || timeStr <= end;
          }
        });

        return shift ? shift.shiftName : 'N/A';
      };

      // Process data to group by machine, lot
      const processedData: ProductionData[] = [];
      const groupings: Record<string, {
        machineName: string,
        lotNo: string,
        rolls: RollConfirmationResponseDto[]
      }> = {};

      rollConfirmations.forEach(roll => {
        const key = `${roll.machineName}-${roll.allotId}`;

        if (!groupings[key]) {
          groupings[key] = {
            machineName: roll.machineName,
            lotNo: roll.allotId,
            rolls: []
          };
        }
        groupings[key].rolls.push(roll);
      });

      Object.values(groupings).forEach(group => {
        const totalRolls = group.rolls.length;
        const totalWeight = group.rolls.reduce((sum, roll) => sum + (roll.netWeight || 0), 0);

        // Calculate counts for each shift
        const shiftCounts: Record<string, number> = {};
        shifts.forEach(s => {
          shiftCounts[s.shiftName] = 0;
        });

        group.rolls.forEach(roll => {
          const sName = getShiftForRoll(roll.createdDate);
          if (shiftCounts[sName] !== undefined) {
            shiftCounts[sName]++;
          } else {
            shiftCounts[sName] = (shiftCounts[sName] || 0) + 1;
          }
        });

        processedData.push({
          machineName: group.machineName,
          lotNo: group.lotNo,
          shiftCounts,
          totalRolls,
          totalWeight,
          date: filters.date ? format(filters.date, 'dd-MM-yyyy') : 'All Dates',
          rolls: group.rolls
        });
      });

      setProductionData(processedData);
    } catch (error) {
      console.error('Error fetching production data:', error);
      toast.error('Error', 'Failed to fetch production data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      date: new Date(),
      machineName: null,
      lotNo: null
    });
  };

  const exportToExcel = () => {
    try {
      const reportDate = filters.date ? format(filters.date, 'dd-MM-yyyy') : 'All Dates';
      const fileName = `machine_wise_daily_production_report_${reportDate}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;

      const headerRows = [
        ['Avyan Knitfab'],
        [`Download Date: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`],
        [`MACHINE WISE DAILY PRODUCTION REPORT - DATE: ${reportDate}`],
        ['']
      ];

      const columnHeaders = [
        'MACHINE NAME',
        'LOT NO',
        ...shifts.map(s => s.shiftName.toUpperCase()),
        'TOTAL ROLLS',
        'TOTAL WEIGHT (KG)'
      ];

      const dataRows = productionData.map(item => [
        item.machineName,
        item.lotNo,
        ...shifts.map(s => (item.shiftCounts[s.shiftName] || 0)),
        item.totalRolls,
        item.totalWeight.toFixed(2)
      ]);

      // Add totals row
      const shiftTotals: Record<string, number> = {};
      shifts.forEach(s => { shiftTotals[s.shiftName] = 0; });
      productionData.forEach(item => {
        shifts.forEach(s => {
          shiftTotals[s.shiftName] += (item.shiftCounts[s.shiftName] || 0);
        });
      });
      const totalRolls = productionData.reduce((sum, item) => sum + item.totalRolls, 0);
      const totalWeight = productionData.reduce((sum, item) => sum + item.totalWeight, 0);

      dataRows.push([
        'TOTAL',
        '',
        ...shifts.map(s => shiftTotals[s.shiftName]),
        totalRolls,
        totalWeight.toFixed(2)
      ]);

      const allRows = [...headerRows, columnHeaders, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);

      // Merging headers
      const mergeCount = columnHeaders.length;
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: mergeCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: mergeCount - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: mergeCount - 1 } }
      ];

      // Setting column widths
      ws['!cols'] = [
        { wch: 20 }, // Machine
        { wch: 15 }, // Lot
        ...shifts.map(() => ({ wch: 10 })), // Shifts
        { wch: 12 }, // Total Rolls
        { wch: 18 }  // Total Weight
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Production Report');
      XLSX.writeFile(wb, fileName);

      toast.success('Success', 'Report exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error', 'Failed to export report to Excel');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full max-w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Machine wise daily Production Report</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <DatePicker
                    date={filters.date || undefined}
                    onDateChange={(date: Date | undefined) => handleFilterChange('date', date || null)}
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <Label htmlFor="machineName">Machine Name</Label>
                <Input
                  id="machineName"
                  value={filters.machineName || ''}
                  onChange={(e) => handleFilterChange('machineName', e.target.value || null)}
                  placeholder="Enter machine name"
                />
              </div>

              <div>
                <Label htmlFor="lotNo">Lot No</Label>
                <Input
                  id="lotNo"
                  value={filters.lotNo || ''}
                  onChange={(e) => handleFilterChange('lotNo', e.target.value || null)}
                  placeholder="Enter lot number"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="text-sm text-gray-600">
              Showing machine wise daily production data
              {filters.date && (
                <span> | Date: {format(filters.date, 'dd-MM-yyyy')}</span>
              )}
              {filters.machineName && (
                <span> | Machine: {filters.machineName}</span>
              )}
              {filters.lotNo && (
                <span> | Lot: {filters.lotNo}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="text-xs"
                >
                  Table View
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="text-xs"
                >
                  List View
                </Button>
              </div>
              <Button onClick={exportToExcel} disabled={loading || productionData.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading reports...</span>
            </div>
          )}

          {/* Results Table/List View */}
          {!loading && (
            <div className="overflow-x-auto">
              {viewMode === 'table' ? (
                <div className="border rounded-lg min-w-full">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">MACHINE NAME</TableHead>
                        <TableHead className="whitespace-nowrap">LOT NO</TableHead>
                        {shifts.map(shift => (
                          <TableHead key={shift.id} className="whitespace-nowrap text-center">{shift.shiftName.toUpperCase()}</TableHead>
                        ))}
                        <TableHead className="whitespace-nowrap text-center">TOTAL ROLLS</TableHead>
                        <TableHead className="whitespace-nowrap text-right">TOTAL WEIGHT (KG)</TableHead>
                        <TableHead className="whitespace-nowrap text-center">ACTION</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionData.length > 0 ? (
                        productionData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="whitespace-nowrap font-medium">{item.machineName}</TableCell>
                            <TableCell className="whitespace-nowrap text-blue-600 font-bold">{item.lotNo}</TableCell>
                            {shifts.map(shift => (
                              <TableCell key={shift.id} className="whitespace-nowrap text-center font-semibold text-orange-600">
                                {item.shiftCounts[shift.shiftName] || 0}
                              </TableCell>
                            ))}
                            <TableCell className="whitespace-nowrap text-center font-bold bg-slate-50">{item.totalRolls}</TableCell>
                            <TableCell className="whitespace-nowrap font-black text-right">{item.totalWeight.toFixed(2)}</TableCell>
                            <TableCell className="whitespace-nowrap text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedGroupRolls(item.rolls);
                                  setIsModalOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No data found matching the selected filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // List View
                <div className="space-y-3">
                  {productionData.length > 0 ? (
                    productionData.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          <div>
                            <span className="text-xs text-gray-500 block">MACHINE NAME</span>
                            <span className="font-medium">{item.machineName}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">LOT NO</span>
                            <span className="font-bold text-blue-600">{item.lotNo}</span>
                          </div>
                          {shifts.map(s => (
                            <div key={s.id}>
                              <span className="text-xs text-gray-500 block">{s.shiftName.toUpperCase()}</span>
                              <span className="font-medium text-orange-600">{item.shiftCounts[s.shiftName] || 0}</span>
                            </div>
                          ))}
                          <div>
                            <span className="text-xs text-gray-500 block">TOTAL ROLLS</span>
                            <span className="font-bold bg-slate-50 px-1 rounded">{item.totalRolls}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">TOTAL WEIGHT (KG)</span>
                            <span className="font-black">{item.totalWeight.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedGroupRolls(item.rolls);
                                setIsModalOpen(true);
                              }}
                              className="w-full text-blue-600 gap-2"
                            >
                              <Eye className="h-4 w-4" /> View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No data found matching the selected filters
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roll Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Roll Details</span>
              <Badge variant="secondary" className="mr-6">
                Total: {selectedGroupRolls?.length || 0}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead className="text-right">Net Wt (Kg)</TableHead>
                  <TableHead className="text-center">FG Status</TableHead>
                  <TableHead className="text-right">Created Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGroupRolls?.map((roll, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono font-medium">{roll.rollNo}</TableCell>
                    <TableCell className="text-right font-bold">{(roll.netWeight || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={roll.isFGStickerGenerated ? "default" : "outline"}
                        className={roll.isFGStickerGenerated ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : "text-gray-400"}
                      >
                        {roll.isFGStickerGenerated ? 'Confirmed' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-gray-500">
                      {format(parseISO(roll.createdDate), 'dd MMM, HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionReport;
