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
import { Calendar, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/lib/toast';
import { storageCaptureApi, productionAllotmentApi, rollConfirmationApi } from '@/lib/api-client';
import type { StorageCaptureResponseDto, ProductionAllotmentResponseDto, RollConfirmationResponseDto } from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';

// Define types
interface FilterOptions {
  date: Date | null;
  lotNo: string | null;
  customerName: string | null;
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
  // State for filters
  const [filters, setFilters] = useState<FilterOptions>({
    date: new Date(),
    lotNo: null,
    customerName: null
  });

  // State for data
  const [stockData, setStockData] = useState<FabricStockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      
      // Apply date filter if selected
      if (filters.date) {
        const selectedDate = format(filters.date, 'yyyy-MM-dd');
        storageData = storageData.filter(item => {
          const itemDate = format(parseISO(item.createdAt), 'yyyy-MM-dd');
          return itemDate === selectedDate;
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
          
          // Apply date filter to roll confirmations if selected
          if (filters.date) {
            const selectedDate = format(filters.date, 'yyyy-MM-dd');
            rollConfirmationData = rollConfirmationData.filter(roll => {
              const rollDate = format(parseISO(roll.createdDate), 'yyyy-MM-dd');
              return rollDate === selectedDate;
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

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      date: null,
      lotNo: null,
      customerName: null
    });
  };

  const exportToExcel = () => {
    try {
      // Create CSV content
      const headers = [
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
        'ALLOCATED ROLLS'  // New column header
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
        item.allocatedRolls.toString() // Add allocated rolls to export
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
        totalAllocatedRolls.toString() // Add total allocated rolls to export
      ]);
      
      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
      });

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `fabric_stock_report_${filters.date ? format(filters.date, 'dd-MM-yyyy') : 'all'}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
      
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
            <span>Fabric Stock Report</span>
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
              {filters.date && (
                <span> | Date: {format(filters.date, 'dd-MM-yyyy')}</span>
              )}
              {filters.lotNo && (
                <span> | Lot: {filters.lotNo}</span>
              )}
              {filters.customerName && (
                <span> | Customer: {filters.customerName}</span>
              )}
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
    </div>
  );
};

export default FabricStockReport;