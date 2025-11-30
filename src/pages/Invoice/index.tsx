import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, Package } from 'lucide-react';
import { toast } from '@/lib/toast';
import { dispatchPlanningApi, transportApi, salesOrderApi, rollConfirmationApi, apiUtils } from '@/lib/api-client';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/InvoicePDF';
import PackingMemoPDF from '@/components/PackingMemoPDF';
import GatePassPDF from '@/components/GatePassPDF';
import type { DispatchPlanningDto, SalesOrderDto, DispatchedRollDto } from '@/types/api-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DispatchOrderGroup {
  dispatchOrderId: string;
  customerName: string;
  lots: DispatchPlanningDto[];
  totalGrossWeight: number;
  totalNetWeight: number;
  dispatchDate: string;
}

const InvoicePage = () => {
  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrderGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<DispatchOrderGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load all fully dispatched orders on component mount
  useEffect(() => {
    loadFullyDispatchedOrders();
  }, []);

  const loadFullyDispatchedOrders = async () => {
    setIsLoading(true);
    try {
      // Get all dispatch planning records
      const response = await dispatchPlanningApi.getAllDispatchPlannings();
      const allDispatchPlannings = apiUtils.extractData(response);
      
      // Filter for fully dispatched orders only
      const fullyDispatched = allDispatchPlannings.filter(
        (order: DispatchPlanningDto) => order.isFullyDispatched
      );
      
      // Group by dispatch order ID
      const groupedOrders: Record<string, DispatchPlanningDto[]> = {};
      fullyDispatched.forEach((order: DispatchPlanningDto) => {
        if (!groupedOrders[order.dispatchOrderId]) {
          groupedOrders[order.dispatchOrderId] = [];
        }
        groupedOrders[order.dispatchOrderId].push(order);
      });
      
      // Convert to array with calculated totals
      const orderGroups: DispatchOrderGroup[] = Object.entries(groupedOrders).map(([dispatchOrderId, lots]) => {
        // Calculate totals
        const totalGrossWeight = lots.reduce((sum, lot) => sum + (lot.totalGrossWeight || 0), 0);
        const totalNetWeight = lots.reduce((sum, lot) => sum + (lot.totalNetWeight || 0), 0);
        
        // Get dispatch date (use the latest date among lots)
        const dispatchDate = lots.reduce((latest, lot) => {
          const lotDate = lot.dispatchEndDate || lot.dispatchStartDate;
          if (!latest || (lotDate && new Date(lotDate) > new Date(latest))) {
            return lotDate || latest;
          }
          return latest;
        }, '');
        
        return {
          dispatchOrderId,
          customerName: lots[0].customerName || 'N/A',
          lots,
          totalGrossWeight,
          totalNetWeight,
          dispatchDate: dispatchDate || new Date().toISOString()
        };
      });
      
      setDispatchOrders(orderGroups);
    } catch (error) {
      console.error('Error loading fully dispatched orders:', error);
      toast.error('Error', 'Failed to load fully dispatched orders');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Function to open modal with order details
  const handleViewOrderDetails = (orderGroup: DispatchOrderGroup) => {
    setSelectedOrderGroup(orderGroup);
    setIsModalOpen(true);
  };

  // Function to close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderGroup(null);
  };

  // Function to generate and download invoice PDF
  const handleGenerateInvoicePDF = async (orderGroup: DispatchOrderGroup) => {
    setIsGeneratingPDF(true);
    try {
      // Get unique sales order IDs from the lots
      const salesOrderIds = [...new Set(orderGroup.lots.map(lot => lot.salesOrderId))];
      
      // Fetch sales order details for all sales orders in this dispatch order
      const salesOrders: Record<number, SalesOrderDto> = {};
      for (const salesOrderId of salesOrderIds) {
        try {
          const response = await salesOrderApi.getSalesOrderById(salesOrderId);
          const salesOrder = apiUtils.extractData(response);
          salesOrders[salesOrderId] = salesOrder;
        } catch (error) {
          console.error(`Error fetching sales order ${salesOrderId}:`, error);
          toast.error('Error', `Failed to fetch sales order ${salesOrderId}`);
        }
      }
      
   
      // Prepare data for PDF
      const invoiceData = {
        dispatchOrderId: orderGroup.dispatchOrderId,
        customerName: orderGroup.customerName,
        dispatchDate: orderGroup.dispatchDate,
        lots: orderGroup.lots,
        salesOrders,
        totalGrossWeight: orderGroup.totalGrossWeight,
        totalNetWeight: orderGroup.totalNetWeight
      };
      
      // Create PDF document
      const doc = <InvoicePDF invoiceData={invoiceData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${orderGroup.dispatchOrderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Success', `Invoice PDF generated for ${orderGroup.dispatchOrderId}`);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Error', 'Failed to generate invoice PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Function to generate and download packing memo PDF
  const handleGeneratePackingMemoPDF = async (orderGroup: DispatchOrderGroup) => {
    setIsGeneratingPDF(true);
    try {
      // Get unique sales order IDs from the lots
      const salesOrderIds = [...new Set(orderGroup.lots.map(lot => lot.salesOrderId))];
      
      // Fetch sales order details for all sales orders in this dispatch order
      const salesOrders: Record<number, SalesOrderDto> = {};
      for (const salesOrderId of salesOrderIds) {
        try {
          const response = await salesOrderApi.getSalesOrderById(salesOrderId);
          const salesOrder = apiUtils.extractData(response);
          salesOrders[salesOrderId] = salesOrder;
        } catch (error) {
          console.error(`Error fetching sales order ${salesOrderId}:`, error);
          toast.error('Error', `Failed to fetch sales order ${salesOrderId}`);
        }
      }
      
      // Get unique transport IDs from the lots
      const transportIds = [...new Set(orderGroup.lots.map(lot => lot.transportId).filter(id => id !== undefined))] as number[];
      
      // Fetch transport details if available
      let vehicleNumber = 'N/A';
      if (transportIds.length > 0) {
        try {
          const response = await transportApi.getTransport(transportIds[0]);
          const transport = apiUtils.extractData(response);
          vehicleNumber = transport.vehicleNumber || 'N/A';
        } catch (error) {
          console.error(`Error fetching transport details:`, error);
        }
      }
      
      // Get ordered dispatched rolls
      const rollsResponse = await dispatchPlanningApi.getOrderedDispatchedRollsByDispatchOrderId(orderGroup.dispatchOrderId);
      const orderedRolls = apiUtils.extractData(rollsResponse);
      
      // Fetch weight data for each roll
      const rollsWithWeights = await Promise.all(orderedRolls.map(async (roll) => {
        try {
          // Get roll confirmation data by LotNo (which should be the same as AllotmentId)
          const rollConfirmationsResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(roll.lotNo);
          const rollConfirmations = apiUtils.extractData(rollConfirmationsResponse);
          const rollConfirmation = rollConfirmations.find(rc => rc.fgRollNo === parseInt(roll.fgRollNo));
          
          if (rollConfirmation) {
            return {
              ...roll,
              grossWeight: rollConfirmation.grossWeight || 0,
              netWeight: rollConfirmation.netWeight || 0
            };
          } else {
            // Return roll with default weights if we couldn't find the roll confirmation
            return {
              ...roll,
              grossWeight: 0,
              netWeight: 0
            };
          }
        } catch (error) {
          console.error(`Error fetching weight data for roll ${roll.fgRollNo}:`, error);
          // Return roll with default weights if we couldn't fetch the data
          return {
            ...roll,
            grossWeight: 0,
            netWeight: 0
          };
        }
      }));
      
      // Group rolls by lot number and prepare packing details
      const lotGroups: Record<string, (DispatchedRollDto & { grossWeight?: number; netWeight?: number })[]> = {};
      rollsWithWeights.forEach(roll => {
        if (!lotGroups[roll.lotNo]) {
          lotGroups[roll.lotNo] = [];
        }
        lotGroups[roll.lotNo].push(roll);
      });
      
      // Prepare packing details for PDF
      const packingDetails = Object.entries(lotGroups).flatMap(([lotNo, rolls], lotIndex) => {
        return rolls.map((roll, rollIndex) => ({
          srNo: lotIndex * 100 + rollIndex + 1, // Simple serial numbering
          psNo: parseInt(roll.fgRollNo) || 0,
          netWeight: roll.netWeight || 0,
          grossWeight: roll.grossWeight || 0,
          lotNo: lotNo // Include lotNo in the packing details
        }));
      });
      
      // Calculate totals
      const totalNetWeight = packingDetails.reduce((sum, item) => sum + item.netWeight, 0);
      const totalGrossWeight = packingDetails.reduce((sum, item) => sum + item.grossWeight, 0);
      
      // Get customer address information from sales orders
      let billToAddress = '';
      let shipToAddress = '';
      
      // Use the first sales order for address information
      const firstSalesOrder = Object.values(salesOrders)[0];
      if (firstSalesOrder) {
        billToAddress = firstSalesOrder.buyerAddress || '';
        // For ship to address, we can use the same as bill to address or customize as needed
        shipToAddress = firstSalesOrder.buyerAddress || '';
      }
      
      // Prepare data for PDF
      const packingMemoData = {
        dispatchOrderId: orderGroup.dispatchOrderId,
        customerName: orderGroup.customerName,
        dispatchDate: new Date(orderGroup.dispatchDate).toLocaleDateString(),
        lotNumber: orderGroup.lots.map(lot => lot.lotNo).join(', '),
        vehicleNumber,
        packingDetails,
        totalNetWeight,
        totalGrossWeight,
        remarks: '',
        billToAddress,
        shipToAddress
      };
      
      // Create PDF document
      const doc = <PackingMemoPDF {...packingMemoData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Packing_Memo_${orderGroup.dispatchOrderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Success', `Packing Memo PDF generated for ${orderGroup.dispatchOrderId}`);
    } catch (error) {
      console.error('Error generating packing memo PDF:', error);
      toast.error('Error', 'Failed to generate packing memo PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Function to generate and download gate pass PDF
  const handleGenerateGatePassPDF = async (orderGroup: DispatchOrderGroup) => {
    setIsGeneratingPDF(true);
    try {
      // Prepare data for PDF
      const gatePassData = {
        dispatchOrderId: orderGroup.dispatchOrderId,
        customerName: orderGroup.customerName,
        dispatchDate: orderGroup.dispatchDate,
        lots: orderGroup.lots,
        totalGrossWeight: orderGroup.totalGrossWeight,
        totalNetWeight: orderGroup.totalNetWeight
      };
      
      // Create PDF document
      const doc = <GatePassPDF gatePassData={gatePassData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GatePass_${orderGroup.dispatchOrderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Success', `Gate Pass PDF generated for ${orderGroup.dispatchOrderId}`);
    } catch (error) {
      console.error('Error generating gate pass PDF:', error);
      toast.error('Error', 'Failed to generate gate pass PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="p-2 max-w-6xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base font-semibold">
              Fully Dispatched Orders
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/20 h-6 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          </div>
          <p className="text-white/80 text-xs mt-1">
            List of all fully dispatched orders ready for invoicing
          </p>
        </CardHeader>

        <CardContent className="p-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Loading fully dispatched orders...
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-md">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-xs font-medium text-gray-700">Dispatch Order ID</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Customer</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Lots</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Dispatch Date</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right">Gross Weight (kg)</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right">Net Weight (kg)</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchOrders.length > 0 ? (
                    dispatchOrders.map((orderGroup) => (
                      <TableRow key={orderGroup.dispatchOrderId} className="border-b border-gray-100">
                        <TableCell className="py-2 text-xs font-medium">
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                            onClick={() => handleViewOrderDetails(orderGroup)}
                          >
                            {orderGroup.dispatchOrderId}
                          </Button>
                        </TableCell>
                        <TableCell className="py-2 text-xs">{orderGroup.customerName}</TableCell>
                        <TableCell className="py-2 text-xs">{orderGroup.lots.length}</TableCell>
                        <TableCell className="py-2 text-xs">{formatDate(orderGroup.dispatchDate)}</TableCell>
                        <TableCell className="py-2 text-xs text-right">{orderGroup.totalGrossWeight.toFixed(2)}</TableCell>
                        <TableCell className="py-2 text-xs text-right">{orderGroup.totalNetWeight.toFixed(2)}</TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGenerateInvoicePDF(orderGroup)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {isGeneratingPDF ? 'Generating...' : 'Generate Invoice'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGeneratePackingMemoPDF(orderGroup)}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              {isGeneratingPDF ? 'Generating...' : 'Packing Memo'}
                            </Button>
                            {/* Gate Pass Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGenerateGatePassPDF(orderGroup)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Gate Pass
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-4 text-center text-xs text-gray-500">
                        No fully dispatched orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Order Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Dispatch Order Details - {selectedOrderGroup?.dispatchOrderId}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            {selectedOrderGroup && (
              <div className="space-y-4">
                {/* Order Summary */}
                <Card className="border border-gray-200">
                  <CardHeader className="bg-gray-50 py-2 px-4">
                    <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Dispatch Order ID:</p>
                        <p className="text-sm">{selectedOrderGroup.dispatchOrderId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Customer:</p>
                        <p className="text-sm">{selectedOrderGroup.customerName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Lots:</p>
                        <p className="text-sm">{selectedOrderGroup.lots.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Dispatch Date:</p>
                        <p className="text-sm">{formatDate(selectedOrderGroup.dispatchDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Gross Weight:</p>
                        <p className="text-sm">{selectedOrderGroup.totalGrossWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Net Weight:</p>
                        <p className="text-sm">{selectedOrderGroup.totalNetWeight.toFixed(2)} kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lots Details */}
                <Card className="border border-gray-200">
                  <CardHeader className="bg-gray-50 py-2 px-4">
                    <CardTitle className="text-base font-semibold">Lots Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="text-xs font-medium py-2 px-3">Lot No</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Customer</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Tape</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Required Rolls</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Ready Rolls</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Dispatched Rolls</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Gross Weight (kg)</TableHead>
                          <TableHead className="text-xs font-medium py-2 px-3">Net Weight (kg)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderGroup.lots.map((lot, index) => (
                          <TableRow key={index} className="border-b border-gray-100">
                            <TableCell className="py-2 px-3 text-xs">{lot.lotNo}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.customerName}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.tape}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.totalRequiredRolls}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.totalReadyRolls}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.totalDispatchedRolls}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.totalGrossWeight?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell className="py-2 px-3 text-xs">{lot.totalNetWeight?.toFixed(2) || '0.00'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={handleCloseModal} variant="outline" size="sm">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicePage;