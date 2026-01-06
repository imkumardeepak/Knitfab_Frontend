import React, { useState, useEffect } from 'react';
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
import { Calendar, Download, Eye, Filter, ChevronUp, ChevronDown, FileDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/lib/toast';
import { storageCaptureApi, productionAllotmentApi, rollConfirmationApi } from '@/lib/api-client';
import type { StorageCaptureResponseDto, ProductionAllotmentResponseDto, RollConfirmationResponseDto } from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define types
interface FilterOptions {
  fromDate: Date | null;
  toDate: Date | null;
  lotNo: string | null;
  customerName: string | null;
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

interface FabricStockData {
  lotNo: string;
  customerName: string;
  orderQuantity: number;
  requiredRolls: number;
  dispatchedRolls: number;
  stockRolls: number;
  updatedNoOfRolls: number;
  updateQuantity: number;
  balanceNoOfRolls: number;
  balanceQuantity: number;
  allocatedRolls: number; // New field for total allocated rolls
}

const FabricStockReport: React.FC = () => {
  // State for filters - Initialize with last 7 days
  const [filters, setFilters] = useState<FilterOptions>(() => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days
    
    return {
      fromDate,
      toDate,
      lotNo: null,
      customerName: null
    };
  });

  // State for data
  const [stockData, setStockData] = useState<FabricStockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // State for details modal
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

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchStockData();
  }, [filters]);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      
      // Fetch all storage captures
      const storageResponse = await storageCaptureApi.getAllStorageCaptures();
      let storageData = storageResponse.data;
      
      // Apply date range filter
      if (filters.fromDate || filters.toDate) {
        storageData = storageData.filter(item => {
          const itemDate = parseISO(item.createdAt);
          
          // Check if item date is within the range
          if (filters.fromDate && itemDate < filters.fromDate) {
            return false;
          }
          
          if (filters.toDate) {
            // Set toDate to end of day (23:59:59)
            const endOfDay = new Date(filters.toDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (itemDate > endOfDay) {
              return false;
            }
          }
          
          return true;
        });
      }
      
      // Apply lot number filter
      if (filters.lotNo) {
        storageData = storageData.filter(item => 
          item.lotNo.toLowerCase().includes(filters.lotNo!.toLowerCase())
        );
      }
      
      // Get unique lot numbers after filtering
      const lotNumbers = [...new Set(storageData.map(item => item.lotNo))];
      
      // Process data for each lot
      const processedData: FabricStockData[] = [];
      
      for (const lotNo of lotNumbers) {
        // Filter storage captures for this lot
        const lotStorageData = storageData.filter(item => item.lotNo === lotNo);
        
        // Fetch production allotment data for this lot
        let allotmentData: ProductionAllotmentResponseDto | null = null;
        try {
          const allotmentResponse = await productionAllotmentApi.getProductionAllotmentByAllotId(lotNo);
          allotmentData = allotmentResponse.data;
          
          // Apply customer name filter if set
          if (filters.customerName) {
            const customerName = allotmentData.partyName || '';
            if (!customerName.toLowerCase().includes(filters.customerName.toLowerCase())) {
              continue;
            }
          }
        } catch (error) {
          console.warn(`No production allotment found for lot ${lotNo}`);
          // If no allotment data and customer filter is set, skip this lot
          if (filters.customerName) {
            continue;
          }
        }
        
        // Fetch roll confirmation data for this lot to calculate update quantity
        let rollConfirmationData: RollConfirmationResponseDto[] = [];
        try {
          const rollResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(lotNo);
          rollConfirmationData = rollResponse.data;
          
          // Apply date range filter to roll confirmations
          if (filters.fromDate || filters.toDate) {
            rollConfirmationData = rollConfirmationData.filter(roll => {
              const rollDate = parseISO(roll.createdDate);
              
              if (filters.fromDate && rollDate < filters.fromDate) {
                return false;
              }
              
              if (filters.toDate) {
                const endOfDay = new Date(filters.toDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (rollDate > endOfDay) {
                  return false;
                }
              }
              
              return true;
            });
          }
        } catch (error) {
          console.warn(`No roll confirmation data found for lot ${lotNo}`);
        }
        
        // Calculate roll counts based on isDispatched flag
        // As per memory: if isDispatched is true, count as dispatched roll
        // If isDispatched is false, count as stock roll
        const dispatchedRolls = lotStorageData.filter(item => item.isDispatched === true).length;
        const stockRolls = lotStorageData.filter(item => item.isDispatched === false).length;
        
        // Updated no. of rolls = total rolls for that lot ID (both dispatched and non-dispatched)
        // User wants to check how many rolls were made against that lot ID
        const updatedNoOfRolls = lotStorageData.length;
        
        // Calculate update quantity (sum of net weights from roll confirmations)
        const updateQuantity = rollConfirmationData.reduce((sum, roll) => sum + (roll.netWeight || 0), 0);
        
        // Get order quantity from production allotment
        const orderQuantity = allotmentData?.actualQuantity || 0;
        
        // Calculate allocated rolls from machine allocations
        const allocatedRolls = allotmentData?.machineAllocations?.reduce((sum, allocation) => sum + (allocation.totalRolls || 0), 0) || 0;
        
        // Calculate required rolls based on allocated rolls
        // If allocated rolls exist, use that; otherwise fallback to previous calculation
        const requiredRolls = allocatedRolls > 0 ? allocatedRolls : Math.ceil(orderQuantity / 100); // Example calculation
        
        // Calculate balance no. of rolls = required rolls - updated no. of rolls
        const balanceNoOfRolls = requiredRolls - updatedNoOfRolls;
        
        // Calculate balance quantity = order quantity - update quantity
        const balanceQuantity = orderQuantity - updateQuantity;
        
        processedData.push({
          lotNo,
          customerName: allotmentData?.partyName || 'Unknown',
          orderQuantity,
          requiredRolls,
          dispatchedRolls,
          stockRolls,
          updatedNoOfRolls,
          updateQuantity,
          balanceNoOfRolls,
          balanceQuantity,
          allocatedRolls
        });
      }
      
      setStockData(processedData);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Error', 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  const openDetailsModal = async (lotNo: string) => {
    try {
      setLoading(true);
      
      // Fetch roll confirmation data for this lot
      let rollConfirmationData: RollConfirmationResponseDto[] = [];
      try {
        const rollResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(lotNo);
        rollConfirmationData = rollResponse.data;
      } catch (error) {
        console.warn(`No roll confirmation data found for lot ${lotNo}`);
        rollConfirmationData = [];
      }
      
      // Group rolls by machine
      const machineRollMap = new Map<string, RollConfirmationResponseDto[]>();
      rollConfirmationData.forEach(roll => {
        const machineName = roll.machineName || 'Unknown Machine';
        if (!machineRollMap.has(machineName)) {
          machineRollMap.set(machineName, []);
        }
        machineRollMap.get(machineName)?.push(roll);
      });
      
      // Convert to array format
      const machineRollDetails: MachineRollDetails[] = Array.from(machineRollMap.entries()).map(([machineName, rolls]) => ({
        machineName,
        rolls
      }));
      
      // Get unique machine names for filter
      const availableMachines = Array.from(machineRollMap.keys());
      
      setDetailsModal({
        isOpen: true,
        lotNo,
        machineRollDetails,
        filteredMachineRollDetails: machineRollDetails, // Initially show all
        selectedMachine: null,
        rollSortOrder: null,
        fgRollSortOrder: null,
        availableMachines
      });
    } catch (error) {
      console.error('Error opening details modal:', error);
      toast.error('Error', 'Failed to load roll details');
    } finally {
      setLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsModal({
      isOpen: false,
      lotNo: null,
      machineRollDetails: [],
      filteredMachineRollDetails: [],
      selectedMachine: null,
      rollSortOrder: null,
      fgRollSortOrder: null,
      availableMachines: []
    });
  };

  const applyFilters = () => {
    let filtered = detailsModal.machineRollDetails;
    
    // Apply machine filter
    if (detailsModal.selectedMachine) {
      filtered = filtered.filter(machine => machine.machineName === detailsModal.selectedMachine);
    }
    
    // Apply sorting to rolls within each machine
    filtered = filtered.map(machine => {
      let sortedRolls = [...machine.rolls];
      
      // First, sort by FG roll number if that's the selected sort method
      if (detailsModal.fgRollSortOrder) {
        sortedRolls.sort((a, b) => {
          const aFgRollNo = a.fgRollNo || 0;
          const bFgRollNo = b.fgRollNo || 0;
          
          if (detailsModal.fgRollSortOrder === 'asc') {
            return aFgRollNo - bFgRollNo;
          } else {
            return bFgRollNo - aFgRollNo;
          }
        });
      }
      
      // Then sort by roll number if that's the selected sort method
      if (detailsModal.rollSortOrder) {
        sortedRolls.sort((a, b) => {
          const aRollNo = parseInt(a.rollNo) || 0;
          const bRollNo = parseInt(b.rollNo) || 0;
          
          if (detailsModal.rollSortOrder === 'asc') {
            return aRollNo - bRollNo;
          } else {
            return bRollNo - aRollNo;
          }
        });
      }
      
      return {
        ...machine,
        rolls: sortedRolls
      };
    });
    
    setDetailsModal(prev => ({
      ...prev,
      filteredMachineRollDetails: filtered
    }));
  };

  // Apply filters when modal state changes
  useEffect(() => {
    if (detailsModal.isOpen) {
      applyFilters();
    }
  }, [detailsModal.selectedMachine, detailsModal.rollSortOrder, detailsModal.fgRollSortOrder, detailsModal.machineRollDetails]);

  const handleMachineFilterChange = (machineName: string) => {
    setDetailsModal(prev => ({
      ...prev,
      selectedMachine: machineName === 'all' ? null : machineName
    }));
  };

  const toggleRollSortOrder = () => {
    setDetailsModal(prev => ({
      ...prev,
      rollSortOrder: prev.rollSortOrder === null ? 'asc' : 
                    prev.rollSortOrder === 'asc' ? 'desc' : null
    }));
  };

  const toggleFgRollSortOrder = () => {
    setDetailsModal(prev => ({
      ...prev,
      fgRollSortOrder: prev.fgRollSortOrder === null ? 'asc' : 
                       prev.fgRollSortOrder === 'asc' ? 'desc' : null
    }));
  };
  
  const exportMachineWiseExcel = (lotNo: string, machineRollDetails: MachineRollDetails[]) => {
    try {
      // Create CSV content with proper heading
      const headers = [
        `MACHINE WISE ROLL DETAILS FOR LOT: ${lotNo}`,
        `Downloaded on: ${format(new Date(), 'dd-MM-yyyy HH:mm:ss')}`
      ];
      
      const emptyRow = ['', ''];
      
      // Process each machine's data
      const allRows: string[][] = [];
      
      machineRollDetails.forEach(machine => {
        // Add machine header
        allRows.push([`MACHINE: ${machine.machineName}`]);
        allRows.push(['']); // Empty row for spacing
        
        // Add column headers
        allRows.push([
          'Roll No',
          'FG Roll No',
          'Net Weight (KG)',
          'Gross Weight (KG)'
        ]);
        
        // Add data rows
        machine.rolls.forEach(roll => {
          allRows.push([
            roll.rollNo,
            roll.fgRollNo?.toString() || 'N/A',
            roll.netWeight?.toFixed(2) || '0.00',
            roll.grossWeight?.toFixed(2) || '0.00'
          ]);
        });
        
        // Add total row for this machine
        const totalNetWeight = machine.rolls.reduce((sum, roll) => sum + (roll.netWeight || 0), 0);
        const totalGrossWeight = machine.rolls.reduce((sum, roll) => sum + (roll.grossWeight || 0), 0);
        
        allRows.push(['', '', '', '']); // Empty row before total
        allRows.push([
          'TOTAL',
          machine.rolls.length.toString(),
          totalNetWeight.toFixed(2),
          totalGrossWeight.toFixed(2)
        ]);
        
        allRows.push(['', '', '', '']); // Empty row after total
      });
      
      // Combine all rows with proper formatting
      const csvContent = [
        headers.join(','),  // Report heading
        emptyRow.join(','), // Empty row for spacing
        ...allRows.map(row => row.join(',')) // Data rows
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `machine_wise_roll_details_lot_${lotNo}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', 'Machine-wise roll details exported to Excel successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error', 'Failed to export machine-wise roll details to Excel');
    }
  };

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    // Reset to last 7 days
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    
    setFilters({
      fromDate,
      toDate,
      lotNo: null,
      customerName: null
    });
  };

  const exportToExcel = () => {
    try {
      // Create CSV content with proper heading and selected date range
      const fromDateStr = filters.fromDate ? format(filters.fromDate, 'dd-MM-yyyy') : 'N/A';
      const toDateStr = filters.toDate ? format(filters.toDate, 'dd-MM-yyyy') : 'N/A';
      const reportDate = `${fromDateStr} to ${toDateStr}`;
      const headers = [
        `LOT WISE FABRIC STOCK REPORT - DATE: ${reportDate}`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ];
      const emptyRow = ['', '', '', '', '', '', '', '', '', '', ''];
      const columnHeaders = [
        'LOT NO',
        'CUSTOMER NAME',
        'ORDER QTY',
        'REQ ROLLS',
        'DISPATCHED ROLLS',
        'STOCK ROLLS',
        'UPDATED NO. OF ROLLS',
        'UPDATE QTY (KG)',
        'BALANCE NO. OF ROLLS',
        'BALANCE QTY',
        'ALLOCATED ROLLS'
      ];
      
      const rows = stockData.map(item => [
        item.lotNo,
        item.customerName,
        item.orderQuantity.toString(),
        item.requiredRolls.toString(),
        item.dispatchedRolls.toString(),
        item.stockRolls.toString(),
        item.updatedNoOfRolls.toString(),
        item.updateQuantity.toFixed(2),
        item.balanceNoOfRolls.toString(),
        item.balanceQuantity.toFixed(2),
        item.allocatedRolls.toString()
      ]);
      
      // Add totals row
      const totalOrderQty = stockData.reduce((sum, item) => sum + item.orderQuantity, 0);
      const totalRequiredRolls = stockData.reduce((sum, item) => sum + item.requiredRolls, 0);
      const totalDispatched = stockData.reduce((sum, item) => sum + item.dispatchedRolls, 0);
      const totalStock = stockData.reduce((sum, item) => sum + item.stockRolls, 0);
      const totalUpdatedRolls = stockData.reduce((sum, item) => sum + item.updatedNoOfRolls, 0);
      const totalUpdateQty = stockData.reduce((sum, item) => sum + item.updateQuantity, 0);
      const totalBalanceRolls = stockData.reduce((sum, item) => sum + item.balanceNoOfRolls, 0);
      const totalBalanceQty = stockData.reduce((sum, item) => sum + item.balanceQuantity, 0);
      const totalAllocatedRolls = stockData.reduce((sum, item) => sum + item.allocatedRolls, 0); // Total allocated rolls
      
      rows.push([
        'TOTAL',
        '',
        totalOrderQty.toString(),
        totalRequiredRolls.toString(),
        totalDispatched.toString(),
        totalStock.toString(),
        totalUpdatedRolls.toString(),
        totalUpdateQty.toFixed(2),
        totalBalanceRolls.toString(),
        totalBalanceQty.toFixed(2),
        totalAllocatedRolls.toString()
      ]);
      
      // Combine all rows with proper formatting
      const csvContent = [
        headers.join(','),  // Report heading
        emptyRow.join(','), // Empty row for spacing
        columnHeaders.join(','), // Column headers
        ...rows.map(row => row.join(',')) // Data rows
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `lot_wise_fabric_stock_report_${reportDate}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
      
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
            <span>Lot wise  Fabric Stock Report</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <div className="relative">
                  <DatePicker
                    date={filters.fromDate || undefined}
                    onDateChange={(date: Date | undefined) => handleFilterChange('fromDate', date || null)}
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <div className="relative">
                  <DatePicker
                    date={filters.toDate || undefined}
                    onDateChange={(date: Date | undefined) => handleFilterChange('toDate', date || null)}
                  />
                  <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
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

              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={filters.customerName || ''}
                  onChange={(e) => handleFilterChange('customerName', e.target.value || null)}
                  placeholder="Enter customer name"
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
              Showing fabric stock data
              {filters.fromDate && (
                <span> | From: {format(filters.fromDate, 'dd-MM-yyyy')}</span>
              )}
              {filters.toDate && (
                <span> | To: {format(filters.toDate, 'dd-MM-yyyy')}</span>
              )}
              {filters.lotNo && (
                <span> | Lot: {filters.lotNo}</span>
              )}
              {filters.customerName && (
                <span> | Customer: {filters.customerName}</span>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {detailsModal.isOpen && `Viewing details for Lot: ${detailsModal.lotNo}`}
            </div>
            <div className="space-x-2">
              <Button onClick={exportToExcel} disabled={loading || stockData.length === 0}>
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
                    <TableHead rowSpan={2}>LOT NO</TableHead>
                    <TableHead rowSpan={2}>CUSTOMER NAME</TableHead>
                    <TableHead rowSpan={2}>ORDER QTY</TableHead>
                    <TableHead rowSpan={2}>REQ ROLLS</TableHead>
                    <TableHead colSpan={2} className="text-center">UPDATE</TableHead>
                    <TableHead colSpan={2} className="text-center">BALANCE</TableHead>
                    <TableHead rowSpan={2}>DISPATCHED ROLLS</TableHead>
                    <TableHead rowSpan={2}>STOCK ROLLS</TableHead>
                  <TableHead rowSpan={2}>ACTIONS</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead>TOTAL NO. OF ROLLS</TableHead>
                    <TableHead>UPDATE QTY (KG)</TableHead>
                    <TableHead>BALANCE NO. OF ROLLS</TableHead>
                    <TableHead>BALANCE QTY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData.length > 0 ? (
                    stockData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.lotNo}</TableCell>
                        <TableCell>{item.customerName}</TableCell>
                        <TableCell>{item.orderQuantity.toFixed(2)}</TableCell>
                        <TableCell>{item.requiredRolls}</TableCell>
                        <TableCell>{item.updatedNoOfRolls}</TableCell>
                        <TableCell>{item.updateQuantity.toFixed(2)}</TableCell>
                        <TableCell>{item.balanceNoOfRolls}</TableCell>
                        <TableCell>{item.balanceQuantity.toFixed(2)}</TableCell>
                        <TableCell>{item.dispatchedRolls}</TableCell>
                        <TableCell>{item.stockRolls}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openDetailsModal(item.lotNo)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
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
      
      {/* Details Modal */}
      <Dialog open={detailsModal.isOpen} onOpenChange={(open) => !open && closeDetailsModal()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Roll Details for Lot: {detailsModal.lotNo}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label>Machine:</Label>
                <Select 
                  value={detailsModal.selectedMachine || 'all'} 
                  onValueChange={handleMachineFilterChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                    {detailsModal.availableMachines.map(machine => (
                      <SelectItem key={machine} value={machine}>{machine}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>Roll No Sort:</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleRollSortOrder}
                  className="flex items-center gap-1"
                >
                  {detailsModal.rollSortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : 
                   detailsModal.rollSortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  {detailsModal.rollSortOrder === 'asc' ? 'Ascending' : 
                   detailsModal.rollSortOrder === 'desc' ? 'Descending' : 'None'}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>FG Roll No Sort:</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleFgRollSortOrder}
                  className="flex items-center gap-1"
                >
                  {detailsModal.fgRollSortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : 
                   detailsModal.fgRollSortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                  {detailsModal.fgRollSortOrder === 'asc' ? 'Ascending' : 
                   detailsModal.fgRollSortOrder === 'desc' ? 'Descending' : 'None'}
                </Button>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportMachineWiseExcel(detailsModal.lotNo!, detailsModal.filteredMachineRollDetails)}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
            
            {/* Machine-wise Roll Details */}
            {detailsModal.filteredMachineRollDetails.map((machine, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="bg-blue-50 p-3 font-semibold border-b">
                  Machine: {machine.machineName} | Total Rolls: {machine.rolls.length}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>FG Roll No</TableHead>
                        <TableHead>Net Weight (KG)</TableHead>
                        <TableHead>Gross Weight (KG)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {machine.rolls.map((roll, rollIndex) => (
                        <TableRow key={rollIndex}>
                          <TableCell>{roll.rollNo}</TableCell>
                          <TableCell>{roll.fgRollNo || 'N/A'}</TableCell>
                          <TableCell>{roll.netWeight?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{roll.grossWeight?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
            
            {detailsModal.filteredMachineRollDetails.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No roll details found for the selected filters
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FabricStockReport;