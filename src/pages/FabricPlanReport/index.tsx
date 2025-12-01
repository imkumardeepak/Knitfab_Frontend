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
import { Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { reportApi } from '@/lib/api-client';
import type { 
  FabricPlanReportResponseDto, 
  FabricPlanReportDto, 
  FabricPlanReportSummaryDto,
  FabricPlanFilterOptionsDto
} from '@/types/api-types';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define types
interface FilterOptions {
  diaGg: string | null;
  customerName: string | null;
  yarnCount: string | null;
  fromDate: Date | null;
  toDate: Date | null;
}

const FabricPlanReport: React.FC = () => {
  // State for filters
  const [filters, setFilters] = useState<FilterOptions>({
    diaGg: null,
    customerName: null,
    yarnCount: null,
    fromDate: null,
    toDate: null
  });

  // State for data
  const [filterOptions, setFilterOptions] = useState<FabricPlanFilterOptionsDto>({
    diaGgOptions: [],
    customerOptions: [],
    yarnCountOptions: []
  });
  
  const [reportData, setReportData] = useState<FabricPlanReportResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch filter options on component mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await reportApi.getFabricPlanFilterOptions();
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast.error('Error', 'Failed to fetch filter options');
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (filters.diaGg) params.diaGg = filters.diaGg;
      if (filters.customerName) params.customerName = filters.customerName;
      if (filters.yarnCount) params.yarnCount = filters.yarnCount;
      if (filters.fromDate) params.fromDate = format(filters.fromDate, 'yyyy-MM-dd');
      if (filters.toDate) params.toDate = format(filters.toDate, 'yyyy-MM-dd');
      
      const response = await reportApi.getFabricPlanReport(params);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching fabric plan report:', error);
      toast.error('Error', 'Failed to fetch fabric plan report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === "ALL" ? null : value
    }));
  };

  const resetFilters = () => {
    setFilters({
      diaGg: null,
      customerName: null,
      yarnCount: null,
      fromDate: null,
      toDate: null
    });
  };

  const exportToExcel = () => {
    try {
      if (!reportData) return;
      
      // Create CSV content
      let csvContent = 'DIA/GG,Program Completion Date,Customer Name,Count,Fabric Lot No,Number of Running Machines,Sum of Per Day Production,Sum of Order Quantity,Sum of Updated Quantity,Sum of Balance Quantity,Balance Days\n';
      
      // Add report data rows
      reportData.reports.forEach(item => {
        csvContent += `"${item.diaGg}",${format(new Date(item.programCompletionDate), 'dd-MM-yyyy')},"${item.customerName}",${item.count},"${item.fabricLotNo}",${item.numberOfRunningMachines},${item.sumOfPerDayProduction},${item.sumOfOrderQuantity},${item.sumOfUpdatedQuantity},${item.sumOfBalanceQuantity},${item.balanceDays}\n`;
      });
      
      // Add summary rows
      csvContent += '\nSUMMARY BY DIA/GG\n';
      csvContent += 'DIA/GG,Total Per Day Production,Total Order Quantity,Total Updated Quantity,Total Balance Quantity,Total Running Machines\n';
      
      reportData.summaries.forEach(summary => {
        csvContent += `"${summary.diaGg}",${summary.totalPerDayProduction},${summary.totalOrderQuantity},${summary.totalUpdatedQuantity},${summary.totalBalanceQuantity},${summary.totalRunningMachines}\n`;
      });
      
      // Add grand total row
      if (reportData.grandTotal) {
        csvContent += '\nGRAND TOTAL\n';
        csvContent += `,,${reportData.grandTotal.totalPerDayProduction},${reportData.grandTotal.totalOrderQuantity},${reportData.grandTotal.totalUpdatedQuantity},${reportData.grandTotal.totalBalanceQuantity},${reportData.grandTotal.totalRunningMachines}\n`;
      }

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `fabric_plan_report_${new Date().toISOString().slice(0, 10)}.csv`;
      
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
            <span>Fabric Plan Report</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="diaGg">DIA/GG</Label>
                <Select
                  value={filters.diaGg || "ALL"}
                  onValueChange={(value) => handleFilterChange('diaGg', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select DIA/GG" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All DIA/GG</SelectItem>
                    {filterOptions.diaGgOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Select
                  value={filters.customerName || "ALL"}
                  onValueChange={(value) => handleFilterChange('customerName', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Customers</SelectItem>
                    {filterOptions.customerOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="yarnCount">Yarn Count</Label>
                <Select
                  value={filters.yarnCount || "ALL"}
                  onValueChange={(value) => handleFilterChange('yarnCount', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Yarn Count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Yarn Counts</SelectItem>
                    {filterOptions.yarnCountOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>
            
            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
              <Button onClick={fetchReportData} disabled={loading}>
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="text-sm text-gray-600">
              Showing fabric plan report data
            </div>
            <div className="space-x-2">
              <Button onClick={exportToExcel} disabled={loading || !reportData}>
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
          {!loading && reportData && (
            <div className="space-y-6">
              {/* Main Report Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DIA/GG</TableHead>
                      <TableHead>Program Completion Date</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Fabric Lot No</TableHead>
                      <TableHead>No. of Running Machines</TableHead>
                      <TableHead>Sum of Per Day Production</TableHead>
                      <TableHead>Sum of Order Quantity</TableHead>
                      <TableHead>Sum of Updated Quantity</TableHead>
                      <TableHead>Sum of Balance Quantity</TableHead>
                      <TableHead>Balance Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.reports.length > 0 ? (
                      reportData.reports.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.diaGg}</TableCell>
                          <TableCell>{format(new Date(item.programCompletionDate), 'dd-MM-yyyy')}</TableCell>
                          <TableCell>{item.customerName}</TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>{item.fabricLotNo}</TableCell>
                          <TableCell>{item.numberOfRunningMachines}</TableCell>
                          <TableCell>{item.sumOfPerDayProduction.toFixed(2)}</TableCell>
                          <TableCell>{item.sumOfOrderQuantity.toFixed(2)}</TableCell>
                          <TableCell>{item.sumOfUpdatedQuantity.toFixed(2)}</TableCell>
                          <TableCell>{item.sumOfBalanceQuantity.toFixed(2)}</TableCell>
                          <TableCell>{item.balanceDays}</TableCell>
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

              {/* Summary by DIA/GG */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold">Summary by DIA/GG</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DIA/GG</TableHead>
                      <TableHead>Total Per Day Production</TableHead>
                      <TableHead>Total Order Quantity</TableHead>
                      <TableHead>Total Updated Quantity</TableHead>
                      <TableHead>Total Balance Quantity</TableHead>
                      <TableHead>Total Running Machines</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.summaries.length > 0 ? (
                      reportData.summaries.map((summary, index) => (
                        <TableRow key={index}>
                          <TableCell>{summary.diaGg}</TableCell>
                          <TableCell>{summary.totalPerDayProduction.toFixed(2)}</TableCell>
                          <TableCell>{summary.totalOrderQuantity.toFixed(2)}</TableCell>
                          <TableCell>{summary.totalUpdatedQuantity.toFixed(2)}</TableCell>
                          <TableCell>{summary.totalBalanceQuantity.toFixed(2)}</TableCell>
                          <TableCell>{summary.totalRunningMachines}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No summary data available
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Grand Total Row */}
                    {reportData.grandTotal && (
                      <TableRow className="font-bold bg-gray-50">
                        <TableCell>{reportData.grandTotal.diaGg}</TableCell>
                        <TableCell>{reportData.grandTotal.totalPerDayProduction.toFixed(2)}</TableCell>
                        <TableCell>{reportData.grandTotal.totalOrderQuantity.toFixed(2)}</TableCell>
                        <TableCell>{reportData.grandTotal.totalUpdatedQuantity.toFixed(2)}</TableCell>
                        <TableCell>{reportData.grandTotal.totalBalanceQuantity.toFixed(2)}</TableCell>
                        <TableCell>{reportData.grandTotal.totalRunningMachines}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FabricPlanReport;