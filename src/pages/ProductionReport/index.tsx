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
import { productionAllotmentApi, rollConfirmationApi } from '@/lib/api-client';
import type { ProductionAllotmentResponseDto, RollConfirmationResponseDto } from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';

// Define types
interface FilterOptions {
  date: Date | null;
  machineName: string | null;
  lotNo: string | null;
}

interface ProductionData {
  machineName: string;
  lotNo: string;
  totalRolls: number;
  totalWeight: number;
  efficiency: number;
  productionTime: number;
  date: string;
}

const ProductionReport: React.FC = () => {
  // State for filters
  const [filters, setFilters] = useState<FilterOptions>({
    date: new Date(),
    machineName: null,
    lotNo: null
  });

  // State for data
  const [productionData, setProductionData] = useState<ProductionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

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
      
      // Process data to group by machine and lot
      const processedData: ProductionData[] = [];
      const uniqueMachines = [...new Set(rollConfirmations.map(roll => roll.machineName))];
      
      for (const machineName of uniqueMachines) {
        const machineRolls = rollConfirmations.filter(roll => roll.machineName === machineName);
        const uniqueLots = [...new Set(machineRolls.map(roll => roll.allotId))];
        
        for (const lotNo of uniqueLots) {
          const lotRolls = machineRolls.filter(roll => roll.allotId === lotNo);
          const totalRolls = lotRolls.length;
          const totalWeight = lotRolls.reduce((sum, roll) => sum + (roll.netWeight || 0), 0);
          
          // Find the production allotment to get efficiency and production time
          const allotment = allotments.find(a => a.allotmentId === lotNo);
          const efficiency = allotment ? allotment.efficiency : 0;
          const productionTime = allotment ? allotment.totalProductionTime : 0;
          
          processedData.push({
            machineName,
            lotNo,
            totalRolls,
            totalWeight,
            efficiency,
            productionTime,
            date: filters.date ? format(filters.date, 'dd-MM-yyyy') : 'All Dates'
          });
        }
      }
      
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
      date: null,
      machineName: null,
      lotNo: null
    });
  };

  const exportToExcel = () => {
    try {
      // Create CSV content with proper heading and selected date
      const reportDate = filters.date ? format(filters.date, 'dd-MM-yyyy') : 'All Dates';
      const headers = [
        `MACHINE WISE DAILY PRODUCTION REPORT - DATE: ${reportDate}`,
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
      const emptyRow = ['', '', '', '', '', '', '', '', '', ''];
      const columnHeaders = [
        'MACHINE NAME',
        'LOT NO',
        'TOTAL ROLLS',
        'TOTAL WEIGHT (KG)',
        'EFFICIENCY (%)',
        'PRODUCTION TIME (DAYS)',
        '',
        '',
        '',
        ''
      ];
      
      const rows = productionData.map(item => [
        item.machineName,
        item.lotNo,
        item.totalRolls.toString(),
        item.totalWeight.toFixed(2),
        item.efficiency.toFixed(2),
        item.productionTime.toFixed(2),
        '',
        '',
        '',
        ''
      ]);
      
      // Add totals row
      const totalRolls = productionData.reduce((sum, item) => sum + item.totalRolls, 0);
      const totalWeight = productionData.reduce((sum, item) => sum + item.totalWeight, 0);
      const totalEfficiency = productionData.reduce((sum, item) => sum + item.efficiency, 0) / (productionData.length || 1);
      const totalProductionTime = productionData.reduce((sum, item) => sum + item.productionTime, 0);
      
      rows.push([
        'TOTAL',
        '',
        totalRolls.toString(),
        totalWeight.toFixed(2),
        totalEfficiency.toFixed(2),
        totalProductionTime.toFixed(2),
        '',
        '',
        '',
        ''
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
      const fileName = `machine_wise_daily_production_report_${reportDate}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
      
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
                    <TableHead>MACHINE NAME</TableHead>
                    <TableHead>LOT NO</TableHead>
                    <TableHead>TOTAL ROLLS</TableHead>
                    <TableHead>TOTAL WEIGHT (KG)</TableHead>
                    <TableHead>EFFICIENCY (%)</TableHead>
                    <TableHead>PRODUCTION TIME (DAYS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionData.length > 0 ? (
                    productionData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.machineName}</TableCell>
                        <TableCell>{item.lotNo}</TableCell>
                        <TableCell>{item.totalRolls}</TableCell>
                        <TableCell>{item.totalWeight.toFixed(2)}</TableCell>
                        <TableCell>{item.efficiency.toFixed(2)}</TableCell>
                        <TableCell>{item.productionTime.toFixed(2)}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionReport;
