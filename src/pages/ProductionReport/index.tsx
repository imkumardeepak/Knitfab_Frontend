import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import {
  rollConfirmationApi,
  machineApi,
  shiftApi,
  productionAllotmentApi,
} from '@/lib/api-client';
import type {
  RollConfirmationResponseDto,
  MachineResponseDto,
  ShiftResponseDto,
  ProductionAllotmentResponseDto,
} from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';

// Define types
interface FilterOptions {
  date: Date | null;
  machineName: string | null;
}

interface MachineData {
  id: number;
  name: string;
  dia: number;
  gauge: number;
}

interface ShiftData {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
}

interface ProductionReportData {
  machineName: string;
  dia: number;
  gauge: number;
  lotNo: string;
  yarnCount: string;
  shifts: Record<
    string,
    {
      rollCount: number;
      totalWeight: number;
    }
  >;
  totalRolls: number;
  totalWeight: number;
}

// New interface for roll confirmation details
interface RollDetail {
  id: number;
  rollNo: string;
  fgRollNo: number | null;
  netWeight: number | null;
  grossWeight: number | null;
  tareWeight: number | null;
  createdDate: string;
  lotNo: string;
}

const ProductionReports: React.FC = () => {
  // State for filters
  const [filters, setFilters] = useState<FilterOptions>({
    date: new Date(),
    machineName: null,
  });

  // State for data
  const [machines, setMachines] = useState<MachineData[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);
  const [rollConfirmations, setRollConfirmations] = useState<RollConfirmationResponseDto[]>([]);
  const [productionData, setProductionData] = useState<ProductionReportData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // New state for roll details modal
  const [showRollDetails, setShowRollDetails] = useState<boolean>(false);
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [rollDetails, setRollDetails] = useState<RollDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Fetch machine data on component mount
  useEffect(() => {
    fetchMachineData();
    fetchShiftData();
  }, []);

  // Fetch roll confirmations when date filter changes
  useEffect(() => {
    if (filters.date) {
      fetchRollConfirmations();
    }
  }, [filters.date]);

  // Process production data when roll confirmations, machines, or shifts change
  useEffect(() => {
    if (rollConfirmations.length > 0 && machines.length > 0 && shifts.length > 0) {
      processProductionData();
    } else if (rollConfirmations.length === 0) {
      setProductionData([]);
    }
  }, [rollConfirmations, machines, shifts, filters.machineName]);

  const fetchMachineData = async () => {
    try {
      const response = await machineApi.getAllMachines();
      const machineData = response.data.map((machine: MachineResponseDto) => ({
        id: machine.id,
        name: machine.machineName,
        dia: machine.dia || 0,
        gauge: machine.gg || 0,
      }));
      setMachines(machineData);
    } catch (error) {
      console.error('Error fetching machine data:', error);
      toast.error('Error', 'Failed to fetch machine data');
    }
  };

  const fetchShiftData = async () => {
    try {
      const response = await shiftApi.getAllShifts();
      const shiftData = response.data.map((shift: ShiftResponseDto) => ({
        id: shift.id,
        name: shift.shiftName,
        startTime: shift.startTime,
        endTime: shift.endTime,
      }));
      setShifts(shiftData);
    } catch (error) {
      console.error('Error fetching shift data:', error);
      toast.error('Error', 'Failed to fetch shift data');
    }
  };

  const fetchRollConfirmations = async () => {
    try {
      setLoading(true);
      const response = await rollConfirmationApi.getAllRollConfirmations();

      // Filter by selected date and isFGStickerGenerated = true
      if (filters.date) {
        const selectedDate = format(filters.date, 'yyyy-MM-dd');
        const filteredData = response.data.filter((item) => {
          const itemDate = format(new Date(item.createdDate), 'yyyy-MM-dd');
          const machineMatch = !filters.machineName || item.machineName === filters.machineName;
          // Only include rolls where FG Sticker is generated
          return itemDate === selectedDate && machineMatch && item.isFGStickerGenerated === true;
        });
        setRollConfirmations(filteredData);
      } else {
        // Even without date filter, only show rolls with FG Sticker generated
        const filteredData = response.data.filter((item) => {
          const machineMatch = !filters.machineName || item.machineName === filters.machineName;
          return item.isFGStickerGenerated === true && machineMatch;
        });
        setRollConfirmations(filteredData);
      }
    } catch (error) {
      console.error('Error fetching roll confirmations:', error);
      toast.error('Error', 'Failed to fetch roll confirmations');
    } finally {
      setLoading(false);
    }
  };

  const processProductionData = async () => {
    try {
      setLoading(true);

      // Group data by machine and lot
      const groupedData: Record<string, ProductionReportData> = {};

      // Get unique lot IDs from roll confirmations
      const lotIds = [...new Set(rollConfirmations.map((item) => item.allotId))];

      // Fetch production allotment data for all lot IDs
      const allotmentDataMap: Record<string, ProductionAllotmentResponseDto> = {};

      for (const lotId of lotIds) {
        try {
          const response = await productionAllotmentApi.getProductionAllotmentByAllotId(lotId);
          allotmentDataMap[lotId] = response.data;
        } catch (error) {
          console.error(`Error fetching production allotment for lot ${lotId}:`, error);
        }
      }

      // Process roll confirmations
      for (const item of rollConfirmations) {
        const lotId = item.allotId;
        const machineKey = item.machineName;
        const lotKey = lotId;

        const key = `${machineKey}_${lotKey}`;

        if (!groupedData[key]) {
          // Find machine details
          const machine = machines.find((m) => m.name === machineKey);
          const machineDia = machine ? machine.dia : 0;
          const machineGauge = machine ? machine.gauge : 0;

          // Get yarn count from production allotment
          const allotment = allotmentDataMap[lotId];
          const yarnCount = allotment ? allotment.yarnCount : '';

          // Initialize shifts object dynamically
          const shiftsData: Record<string, { rollCount: number; totalWeight: number }> = {};
          shifts.forEach((shift) => {
            shiftsData[shift.name] = { rollCount: 0, totalWeight: 0 };
          });

          groupedData[key] = {
            machineName: machineKey,
            dia: machineDia,
            gauge: machineGauge,
            lotNo: lotKey,
            yarnCount: yarnCount,
            shifts: shiftsData,
            totalRolls: 0,
            totalWeight: 0,
          };
        }

        // Determine shift based on created time
        const createdTime = new Date(item.createdDate);
        const createdTimeString = format(createdTime, 'HH:mm:ss');

        // Find which shift this time falls into
        let shiftName = 'Unknown';
        for (const shift of shifts) {
          // Convert shift times to comparable format
          const shiftStart = shift.startTime.substring(0, 8); // Extract HH:mm:ss
          const shiftEnd = shift.endTime.substring(0, 8);

          // Handle overnight shifts (end time is next day)
          if (shiftStart > shiftEnd) {
            // Overnight shift (e.g., 22:00 to 06:00)
            if (createdTimeString >= shiftStart || createdTimeString <= shiftEnd) {
              shiftName = shift.name;
              break;
            }
          } else {
            // Regular shift (e.g., 06:00 to 14:00)
            if (createdTimeString >= shiftStart && createdTimeString <= shiftEnd) {
              shiftName = shift.name;
              break;
            }
          }
        }

        // Update shift data
        if (groupedData[key].shifts[shiftName]) {
          groupedData[key].shifts[shiftName].rollCount++;
          groupedData[key].shifts[shiftName].totalWeight += item.netWeight || 0;
        }

        // Update totals
        groupedData[key].totalRolls++;
        groupedData[key].totalWeight += item.netWeight || 0;
      }

      // Convert to array and sort by machine name
      const dataArray = Object.values(groupedData);
      dataArray.sort((a, b) => a.machineName.localeCompare(b.machineName));

      setProductionData(dataArray);
    } catch (error) {
      console.error('Error processing production data:', error);
      toast.error('Error', 'Failed to process production data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string | Date | null) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      date: new Date(),
      machineName: null,
    });
  };

  // New function to fetch roll details for a machine
  const fetchRollDetails = async (machineName: string) => {
    try {
      setDetailsLoading(true);
      setSelectedMachine(machineName);
      
      const response = await rollConfirmationApi.getAllRollConfirmations();
      
      // Filter by machine name, date, and FG sticker generated
      let filteredData = response.data.filter((item) => {
        const machineMatch = item.machineName === machineName;
        const fgStickerGenerated = item.isFGStickerGenerated === true;
        return machineMatch && fgStickerGenerated;
      });
      
      // If date is selected, filter by date
      if (filters.date) {
        const selectedDate = format(filters.date, 'yyyy-MM-dd');
        filteredData = filteredData.filter((item) => {
          const itemDate = format(new Date(item.createdDate), 'yyyy-MM-dd');
          return itemDate === selectedDate;
        });
      }
      
      // Sort by created date ascending
      filteredData.sort((a, b) => 
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
      );
      
      // Map to RollDetail interface
      const details: RollDetail[] = filteredData.map((item) => ({
        id: item.id,
        rollNo: item.rollNo,
        fgRollNo: item.fgRollNo !== undefined ? item.fgRollNo : null,
        netWeight: item.netWeight !== undefined ? item.netWeight : null,
        grossWeight: item.grossWeight !== undefined ? item.grossWeight : null,
        tareWeight: item.tareWeight !== undefined ? item.tareWeight : null,
        createdDate: item.createdDate,
        lotNo: item.allotId,
      }));
      
      setRollDetails(details);
      setShowRollDetails(true);
    } catch (error) {
      console.error('Error fetching roll details:', error);
      toast.error('Error', 'Failed to fetch roll details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      // Create CSV content
      const headers: string[] = ['M/C NUMBER', 'D"/GG', 'YARN COUNT', 'FABRIC LOT NO.'];

      // Add shift headers dynamically
      shifts.forEach((shift) => {
        headers.push(`${shift.name} ROLLS`, `${shift.name} KGS`);
      });

      // Add total headers
      headers.push('TOTAL ROLLS', 'TOTAL KGS');

      // Rows
      const rows = productionData.map((item) => {
        const row: string[] = [
          item.machineName,
          `${item.dia}/${item.gauge}`,
          item.yarnCount,
          item.lotNo,
        ];

        // Add shift data dynamically
        shifts.forEach((shift) => {
          const shiftData = item.shifts[shift.name] || { rollCount: 0, totalWeight: 0 };
          row.push(shiftData.rollCount.toString());
          row.push(shiftData.totalWeight.toFixed(2));
        });

        // Add totals
        row.push(item.totalRolls.toString());
        row.push(item.totalWeight.toFixed(2));

        return row;
      });

      // Add totals row
      const totalRolls = productionData.reduce((sum, item) => sum + item.totalRolls, 0);
      const totalWeight = productionData.reduce((sum, item) => sum + item.totalWeight, 0);

      const totalsRow: string[] = ['TOTAL', '', '', ''];
      // Add empty cells for shift columns
      shifts.forEach(() => {
        totalsRow.push('', '');
      });
      // Add total values
      totalsRow.push(totalRolls.toString(), totalWeight.toFixed(2));

      rows.push(totalsRow);

      let csvContent = headers.join(',') + '\n';
      rows.forEach((row) => {
        csvContent += row.map((field) => `"${field}"`).join(',') + '\n';
      });

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `production_report_${filters.date ? format(filters.date, 'dd-MM-yyyy') : 'all'}.csv`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', 'Report exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error', 'Failed to export report to Excel');
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Production Report</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <DatePicker
                    date={filters.date || undefined}
                    onDateChange={(date: Date | undefined) =>
                      handleFilterChange('date', date || null)
                    }
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <Label htmlFor="machineName">Machine</Label>
                <select
                  value={filters.machineName || ''}
                  onChange={(e) => handleFilterChange('machineName', e.target.value || null)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">All Machines</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.name}>
                      {machine.name}
                    </option>
                  ))}
                </select>
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
              Showing production data for{' '}
              {filters.date ? format(filters.date, 'dd-MM-yyyy') : 'all dates'}
              {filters.machineName && <span> | Machine: {filters.machineName}</span>}
            </div>
            <div className="space-x-2">
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

          {/* Results Table */}
          {!loading && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2}>M/C NUMBER</TableHead>
                    <TableHead rowSpan={2}>D"/GG</TableHead>
                    <TableHead rowSpan={2}>YARN COUNT</TableHead>
                    <TableHead rowSpan={2}>FABRIC LOT NO.</TableHead>
                    {shifts.map((shift) => (
                      <TableHead colSpan={2} key={shift.id} className="text-center">
                        {shift.name} ({shift.startTime.substring(0, 5)}-
                        {shift.endTime.substring(0, 5)})
                      </TableHead>
                    ))}
                    <TableHead colSpan={2} className="text-center">
                      TOTAL
                    </TableHead>
                    <TableHead rowSpan={2}>DETAILS</TableHead>
                  </TableRow>
                  <TableRow>
                    {shifts.map((shift) => (
                      <React.Fragment key={shift.id}>
                        <TableHead>ROLLS</TableHead>
                        <TableHead>KGS</TableHead>
                      </React.Fragment>
                    ))}
                    <TableHead>ROLLS</TableHead>
                    <TableHead>KGS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionData.length > 0 ? (
                    productionData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.machineName}</TableCell>
                        <TableCell>{`${item.dia}/${item.gauge}`}</TableCell>
                        <TableCell>{item.yarnCount}</TableCell>
                        <TableCell>{item.lotNo}</TableCell>
                        {shifts.map((shift) => {
                          const shiftData = item.shifts[shift.name] || {
                            rollCount: 0,
                            totalWeight: 0,
                          };
                          return (
                            <React.Fragment key={shift.name}>
                              <TableCell>{shiftData.rollCount}</TableCell>
                              <TableCell>{shiftData.totalWeight.toFixed(2)}</TableCell>
                            </React.Fragment>
                          );
                        })}
                        <TableCell>{item.totalRolls}</TableCell>
                        <TableCell>{item.totalWeight.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchRollDetails(item.machineName)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5 + shifts.length * 2 + 2}
                        className="text-center py-8 text-gray-500"
                      >
                        No data found matching the selected filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Roll Details Modal */}
      {showRollDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-lg font-semibold">
                Roll Details for Machine: {selectedMachine}
                {filters.date && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (Date: {format(filters.date, 'dd-MM-yyyy')})
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowRollDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-auto flex-grow">
              {detailsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading roll details...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No</TableHead>
                      <TableHead>FG Roll No</TableHead>
                      <TableHead>Lot No</TableHead>
                      <TableHead>Gross Weight (Kg)</TableHead>
                      <TableHead>Tare Weight (Kg)</TableHead>
                      <TableHead>Net Weight (Kg)</TableHead>
                      <TableHead>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rollDetails.length > 0 ? (
                      rollDetails.map((roll) => (
                        <TableRow key={roll.id}>
                          <TableCell>{roll.rollNo}</TableCell>
                          <TableCell>{roll.fgRollNo || '-'}</TableCell>
                          <TableCell>{roll.lotNo}</TableCell>
                          <TableCell>{roll.grossWeight !== null ? roll.grossWeight.toFixed(2) : '-'}</TableCell>
                          <TableCell>{roll.tareWeight !== null ? roll.tareWeight.toFixed(2) : '-'}</TableCell>
                          <TableCell>{roll.netWeight !== null ? roll.netWeight.toFixed(2) : '-'}</TableCell>
                          <TableCell>{format(new Date(roll.createdDate), 'dd-MM-yyyy HH:mm:ss')}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No roll details found for this machine
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <Button onClick={() => setShowRollDetails(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionReports;
