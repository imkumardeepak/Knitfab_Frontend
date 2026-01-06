import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileText, Package, Search } from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  dispatchPlanningApi,
  rollConfirmationApi,
  apiUtils,
  productionAllotmentApi,
} from '@/lib/api-client';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '@/components/InvoicePDF';
import PackingMemoPDF from '@/components/PackingMemoPDF';
import GatePassPDF from '@/components/GatePassPDF';
import type {
  DispatchPlanningDto,
  DispatchedRollDto,
  SalesOrderWebResponseDto,
} from '@/types/api-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SalesOrderWebService } from '@/services/salesOrderWebService';

// Use the globally declared XLSX from window
declare const XLSX: any;

interface DispatchOrderGroup {
  dispatchOrderId: string;
  loadingNo: string;
  customerName: string;
  lots: DispatchPlanningDto[];
  totalGrossWeight: number;
  totalNetWeight: number;
  dispatchDate: string;
  vehicleNo: string;
}

interface LotDetail {
  lotNo: string;
  tapeColor: string;
  fabricType: string;
  composition: string;
}

// Reusable function to get accurate weights from dispatched rolls + roll confirmations
const fetchAccurateDispatchWeights = async (dispatchOrderId: string) => {
  try {
    const rollsResponse =
      await dispatchPlanningApi.getOrderedDispatchedRollsByDispatchOrderId(dispatchOrderId);
    const orderedRolls: DispatchedRollDto[] = apiUtils.extractData(rollsResponse);

    if (orderedRolls.length === 0) {
      return { rolls: [], totalGrossWeight: 0, totalNetWeight: 0 };
    }

    const uniqueLotNos = [...new Set(orderedRolls.map((roll) => roll.lotNo))];
    const lotConfirmations: Record<string, any[]> = {};

    for (const lotNo of uniqueLotNos) {
      try {
        const confResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(lotNo);
        lotConfirmations[lotNo] = apiUtils.extractData(confResponse);
      } catch (error) {
        console.error(`Failed to fetch confirmations for lot ${lotNo}`, error);
        lotConfirmations[lotNo] = [];
      }
    }

    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    const rollsWithWeights = orderedRolls.map((roll) => {
      const confirmations = lotConfirmations[roll.lotNo] || [];
      const matchingConf = confirmations.find((rc) => rc.fgRollNo === parseInt(roll.fgRollNo));

      const grossWeight = matchingConf?.grossWeight || 0;
      const netWeight = matchingConf?.netWeight || 0;

      totalGrossWeight += grossWeight;
      totalNetWeight += netWeight;

      return {
        lotNo: roll.lotNo,
        fgRollNo: roll.fgRollNo,
        grossWeight,
        netWeight,
      };
    });

    return {
      rolls: rollsWithWeights,
      totalGrossWeight: parseFloat(totalGrossWeight.toFixed(4)),
      totalNetWeight: parseFloat(totalNetWeight.toFixed(4)),
    };
  } catch (error) {
    console.error('Error fetching accurate dispatch weights:', error);
    toast.error('Error', 'Failed to fetch accurate roll weights');
    return { rolls: [], totalGrossWeight: 0, totalNetWeight: 0 };
  }
};

// New function to get accurate weights for a specific loading sheet
const fetchAccurateDispatchWeightsForLoadingNo = async (loadingNo: string) => {
  try {
    const response = await dispatchPlanningApi.getAllDispatchPlannings();
    const allDispatchPlannings = apiUtils.extractData(response);
    
    // Filter dispatch planning records by loading number
    const dispatchPlanningsForLoadingNo = allDispatchPlannings.filter(
      (dp: DispatchPlanningDto) => dp.loadingNo === loadingNo
    );

    if (dispatchPlanningsForLoadingNo.length === 0) {
      return { rolls: [], totalGrossWeight: 0, totalNetWeight: 0 };
    }

    // Get all dispatch order IDs for this loading number to fetch rolls
    const dispatchOrderIds = [...new Set(dispatchPlanningsForLoadingNo.map(dp => dp.dispatchOrderId))];
    let allRolls: any[] = [];
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    // Fetch rolls for each dispatch order associated with this loading number
    for (const dispatchOrderId of dispatchOrderIds) {
      const rollsResponse =
        await dispatchPlanningApi.getOrderedDispatchedRollsByDispatchOrderId(dispatchOrderId);
      const orderedRolls: DispatchedRollDto[] = apiUtils.extractData(rollsResponse);
      
      // Filter rolls that belong to the dispatch planning records for this loading number
      const filteredRolls = orderedRolls.filter(roll => {
        // Check if this roll's lotNo matches any lotNo in the dispatch planning records for this loading number
        return dispatchPlanningsForLoadingNo.some(dp => dp.lotNo === roll.lotNo);
      });

      if (filteredRolls.length === 0) continue;

      const uniqueLotNos = [...new Set(filteredRolls.map((roll) => roll.lotNo))];
      const lotConfirmations: Record<string, any[]> = {};

      for (const lotNo of uniqueLotNos) {
        try {
          const confResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(lotNo);
          lotConfirmations[lotNo] = apiUtils.extractData(confResponse);
        } catch (error) {
          console.error(`Failed to fetch confirmations for lot ${lotNo}`, error);
          lotConfirmations[lotNo] = [];
        }
      }

      const rollsWithWeights = filteredRolls.map((roll) => {
        const confirmations = lotConfirmations[roll.lotNo] || [];
        const matchingConf = confirmations.find((rc) => rc.fgRollNo === parseInt(roll.fgRollNo));

        const grossWeight = matchingConf?.grossWeight || 0;
        const netWeight = matchingConf?.netWeight || 0;

        totalGrossWeight += grossWeight;
        totalNetWeight += netWeight;

        return {
          lotNo: roll.lotNo,
          fgRollNo: roll.fgRollNo,
          grossWeight,
          netWeight,
        };
      });

      allRolls = allRolls.concat(rollsWithWeights);
    }

    return {
      rolls: allRolls,
      totalGrossWeight: parseFloat(totalGrossWeight.toFixed(4)),
      totalNetWeight: parseFloat(totalNetWeight.toFixed(4)),
    };
  } catch (error) {
    console.error('Error fetching accurate dispatch weights for loading no:', error);
    toast.error('Error', 'Failed to fetch accurate roll weights for loading sheet');
    return { rolls: [], totalGrossWeight: 0, totalNetWeight: 0 };
  }
};

// New function to fetch production lot details
const fetchLotDetails = async (lots: DispatchPlanningDto[]): Promise<Record<string, LotDetail>> => {
  const lotDetails: Record<string, LotDetail> = {};

  for (const lot of lots) {
    try {
      const response = await productionAllotmentApi.getProductionAllotmentByAllotId(lot.lotNo);
      const productionAllotment = apiUtils.extractData(response);

      lotDetails[lot.lotNo] = {
        lotNo: lot.lotNo,
        tapeColor: productionAllotment.tapeColor || 'N/A',
        fabricType: productionAllotment.fabricType || 'N/A',
        composition: productionAllotment.composition || 'N/A',
      };
    } catch (error) {
      console.error(`Failed to fetch production allotment for lot ${lot.lotNo}`, error);
      lotDetails[lot.lotNo] = {
        lotNo: lot.lotNo,
        tapeColor: 'N/A',
        fabricType: 'N/A',
        composition: 'N/A',
      };
    }
  }

  return lotDetails;
};

const InvoicePage = () => {
  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrderGroup[]>([]);
  const [availableDispatchOrders, setAvailableDispatchOrders] = useState<{id: string, loadingNo: string, customerName: string}[]>([]);
  const [selectedDispatchOrderId, setSelectedDispatchOrderId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<DispatchOrderGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch available dispatch orders on mount
  useEffect(() => {
    loadAvailableDispatchOrders();
  }, []);

  // Fetch dispatch order details when a dispatch order is selected
  useEffect(() => {
    if (selectedDispatchOrderId) {
      loadDispatchOrderDetails(selectedDispatchOrderId);
    } else {
      setDispatchOrders([]);
    }
  }, [selectedDispatchOrderId]);

  const loadAvailableDispatchOrders = async () => {
    setIsLoadingList(true);
    try {
      const response = await dispatchPlanningApi.getAllDispatchPlannings();
      const allDispatchPlannings = apiUtils.extractData(response);

      // Get unique dispatch orders from fully dispatched orders
      const fullyDispatched = allDispatchPlannings.filter(
        (order: DispatchPlanningDto) => order.isFullyDispatched
      );

      // Group by dispatch order ID to get unique dispatch orders with their details
      const dispatchOrderMap = new Map<string, {id: string, loadingNo: string, customerName: string}>();
      fullyDispatched.forEach((order: DispatchPlanningDto) => {
        if (!dispatchOrderMap.has(order.dispatchOrderId)) {
          dispatchOrderMap.set(order.dispatchOrderId, {
            id: order.dispatchOrderId,
            loadingNo: order.loadingNo || 'N/A',
            customerName: order.customerName || 'N/A'
          });
        }
      });

      const uniqueDispatchOrders = Array.from(dispatchOrderMap.values()).sort((a, b) => a.id.localeCompare(b.id));
      setAvailableDispatchOrders(uniqueDispatchOrders);
    } catch (error) {
      console.error('Error loading available dispatch orders:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to load dispatch orders');
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadDispatchOrderDetails = async (dispatchOrderId: string) => {
    setIsLoading(true);
    try {
      const response = await dispatchPlanningApi.getAllDispatchPlannings();
      const allDispatchPlannings = apiUtils.extractData(response);

      // Filter by selected dispatch order ID and fully dispatched
      const dispatchPlanningsForOrder = allDispatchPlannings.filter(
        (order: DispatchPlanningDto) => 
          order.isFullyDispatched && order.dispatchOrderId === dispatchOrderId
      );

      if (dispatchPlanningsForOrder.length === 0) {
        setDispatchOrders([]);
        toast.info('Info', `No fully dispatched orders found for dispatch order ${dispatchOrderId}`);
        return;
      }

      const lots = dispatchPlanningsForOrder;
      const loadingNo = lots[0].loadingNo || 'N/A';

      const dispatchDate = lots.reduce((latest, lot) => {
        const lotDate = lot.dispatchEndDate || lot.dispatchStartDate;
        if (!latest || (lotDate && new Date(lotDate) > new Date(latest))) {
          return lotDate || latest;
        }
        return latest;
      }, '');

      // Fetch accurate weights from roll confirmations for this dispatch order
      const { totalGrossWeight, totalNetWeight } =
        await fetchAccurateDispatchWeights(dispatchOrderId);

      const orderGroup: DispatchOrderGroup = {
        dispatchOrderId: dispatchOrderId,
        loadingNo: loadingNo,
        customerName: lots[0].customerName || 'N/A',
        lots,
        totalGrossWeight,
        totalNetWeight,
        dispatchDate: dispatchDate || new Date().toISOString(),
        vehicleNo: lots[0].vehicleNo || 'N/A',
      };

      setDispatchOrders([orderGroup]);
    } catch (error) {
      console.error('Error loading dispatch order details:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to load dispatch order details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  };

  const handleViewOrderDetails = (orderGroup: DispatchOrderGroup) => {
    setSelectedOrderGroup(orderGroup);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderGroup(null);
  };

  const handleGenerateInvoicePDF = async (orderGroup: DispatchOrderGroup) => {
    setIsGeneratingPDF(true);
    try {
      const salesOrderIds = [...new Set(orderGroup.lots.map((lot) => lot.salesOrderId))];
      const salesOrders: Record<number, SalesOrderWebResponseDto> = {};

      for (const salesOrderId of salesOrderIds) {
        try {
          const response = await SalesOrderWebService.getSalesOrderWebById(salesOrderId);
          salesOrders[salesOrderId] = response;
        } catch (error) {
          console.error(`Error fetching sales order ${salesOrderId}:`, error);
        }
      }

      // Fetch accurate roll weights for this loading number
      const { rolls: rollsWithWeights } =
        await fetchAccurateDispatchWeightsForLoadingNo(orderGroup.loadingNo);

      const invoiceData = {
        dispatchOrderId: orderGroup.dispatchOrderId,
        loadingNo: orderGroup.loadingNo, // Add loadingNo to invoice data
        customerName: orderGroup.customerName,
        dispatchDate: orderGroup.dispatchDate,
        lots: orderGroup.lots,
        salesOrders,
        totalGrossWeight: orderGroup.totalGrossWeight,
        totalNetWeight: orderGroup.totalNetWeight,
        rollWeights: rollsWithWeights, // Use the rolls for this loading number
      };

      const doc = <InvoicePDF invoiceData={invoiceData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${orderGroup.loadingNo}.pdf`; // Use loadingNo in filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', `Invoice PDF generated for loading sheet ${orderGroup.loadingNo}`);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Error', 'Failed to generate invoice PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGeneratePackingMemoExcel = async (orderGroup: DispatchOrderGroup) => {
    try {
      // Dynamically import XLSX to ensure it's available
      const XLSX = await import('xlsx');

      const salesOrderIds = [...new Set(orderGroup.lots.map((lot) => lot.salesOrderId))];
      const salesOrders: Record<number, SalesOrderWebResponseDto> = {};

      for (const salesOrderId of salesOrderIds) {
        try {
          const response = await SalesOrderWebService.getSalesOrderWebById(salesOrderId);
          salesOrders[salesOrderId] = response;
        } catch (error) {
          console.error(`Error fetching sales order ${salesOrderId}:`, error);
        }
      }

      // Fetch accurate roll weights for this loading number
      const { rolls: rollsWithWeights } =
        await fetchAccurateDispatchWeightsForLoadingNo(orderGroup.loadingNo);
      // Sort rolls by fgRollNo in ascending order
      const sortedRolls = [...rollsWithWeights].sort((a, b) => {
        const numA = parseInt(a.fgRollNo) || 0;
        const numB = parseInt(b.fgRollNo) || 0;
        return numA - numB;
      });

      const packingDetails = sortedRolls.map((roll, index) => ({
        srNo: index + 1,
        psNo: parseInt(roll.fgRollNo) || 0,
        netWeight: roll.netWeight,
        grossWeight: roll.grossWeight,
        lotNo: roll.lotNo,
      }));

      const firstSalesOrder = Object.values(salesOrders)[0];
      const billToAddress = firstSalesOrder?.buyerAddress || '';
      const shipToAddress = billToAddress;

      // Get lot details
      const lotDetails = await fetchLotDetails(orderGroup.lots);

      // Get the first lot's details for the summary row
      const firstLotDetail = Object.values(lotDetails)[0] || {
        tapeColor: 'N/A',
        fabricType: 'N/A',
        composition: 'N/A',
      };

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Prepare worksheet data to match the exact format provided
      const wsData = [];

      // Company Header
      wsData.push(['AVYAAN KNITFAB']);
      wsData.push([
        'Sr.No.547-551/1, At.Waigaoon-Deoli State Highway, Waigaon (M), Wardha-442001, Maharashtra',
      ]);
      wsData.push(['']); // Empty row

      // Title
      wsData.push(['PACKING MEMO']);
      wsData.push(['']); // Empty row

      // Dispatch Information
      wsData.push(['Loading Sheet No', 'Dispatch Order ID', 'Date', 'Vehicle No.', 'Lot No.']);
      wsData.push([
        orderGroup.loadingNo || 'N/A',
        orderGroup.dispatchOrderId,
        new Date(orderGroup.dispatchDate).toLocaleDateString(),
        orderGroup.vehicleNo || 'N/A',
        orderGroup.lots.map((lot) => lot.lotNo).join(', '),
      ]);
      wsData.push(['']); // Empty row

      // Weight Summary with additional details
      wsData.push([
        'Total Net Weight (kg)',
        'Gross Weight (kg)',
        'No. of Packages',
        'Tape Color',
        'Fabric Type',
        'Composition',
      ]);
      wsData.push([
        orderGroup.totalNetWeight.toFixed(2),
        orderGroup.totalGrossWeight.toFixed(2),
        packingDetails.length,
        firstLotDetail.tapeColor,
        firstLotDetail.fabricType,
        firstLotDetail.composition,
      ]);
      wsData.push(['']); // Empty row

      // Packing Details Header (for two-column layout)
      wsData.push([
        'Sr No.',
        'P.S. No.',
        'Net Weight (kg)',
        'Gross Weight (kg)',
        '',
        'Sr No.',
        'P.S. No.',
        'Net Weight (kg)',
        'Gross Weight (kg)',
      ]);

      // Packing Details - Two column layout
      const halfLength = Math.ceil(packingDetails.length / 2);
      for (let i = 0; i < halfLength; i++) {
        const leftItem = packingDetails[i];
        const rightItem = packingDetails[i + halfLength];

        wsData.push([
          leftItem?.srNo || '',
          leftItem?.psNo || '',
          leftItem?.netWeight.toFixed(2) || '',
          leftItem?.grossWeight.toFixed(2) || '',
          '', // Spacer column
          rightItem?.srNo || '',
          rightItem?.psNo || '',
          rightItem?.netWeight.toFixed(2) || '',
          rightItem?.grossWeight.toFixed(2) || '',
        ]);
      }

      // Total Row
      wsData.push(['']); // Empty row
      wsData.push([
        'TOTAL',
        '',
        `Net Weight: ${orderGroup.totalNetWeight.toFixed(2)}`,
        `Gross Weight: ${orderGroup.totalGrossWeight.toFixed(2)}`,
        '',
        '',
        '',
        '',
        '',
      ]);

      // Additional Information
      wsData.push(['']); // Empty row
      wsData.push(['PACKING TYPE: White Polybag + Cello Tape']);

      // Signatures
      wsData.push(['']); // Empty row
      wsData.push(['']); // Empty row
      wsData.push(['CHECKED BY', '', 'PACKING MANAGER', '', 'AUTHORISED SIGNATORY']);
      wsData.push(['______________', '', '______________', '', '______________']);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths for better readability
      ws['!cols'] = [
        { wch: 12 }, // Sr No. (left)
        { wch: 15 }, // P.S. No. (left)
        { wch: 18 }, // Net Weight (left)
        { wch: 18 }, // Gross Weight (left)
        { wch: 3 }, // Spacer
        { wch: 12 }, // Sr No. (right)
        { wch: 15 }, // P.S. No. (right)
        { wch: 18 }, // Net Weight (right)
        { wch: 18 }, // Gross Weight (right)
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Packing Memo');

      // Export the Excel file
      XLSX.writeFile(wb, `Packing_Memo_${orderGroup.loadingNo}.xlsx`); // Use loadingNo in filename

      toast.success('Success', `Packing Memo Excel generated for loading sheet ${orderGroup.loadingNo}`);
    } catch (error) {
      console.error('Error generating packing memo Excel:', error);
      toast.error('Error', 'Failed to generate packing memo Excel');
    }
  };

  const handleGeneratePackingMemoPDF = async (orderGroup: DispatchOrderGroup) => {
    setIsGeneratingPDF(true);
    try {
      const salesOrderIds = [...new Set(orderGroup.lots.map((lot) => lot.salesOrderId))];
      const salesOrders: Record<number, SalesOrderWebResponseDto> = {};

      for (const salesOrderId of salesOrderIds) {
        try {
          const response = await SalesOrderWebService.getSalesOrderWebById(salesOrderId);
          salesOrders[salesOrderId] = response;
        } catch (error) {
          console.error(`Error fetching sales order ${salesOrderId}:`, error);
        }
      }

      // Fetch accurate roll weights for this loading number
      const {
        rolls: rollsWithWeights,
        totalGrossWeight,
        totalNetWeight,
      } = await fetchAccurateDispatchWeightsForLoadingNo(orderGroup.loadingNo);
      // Sort rolls by fgRollNo in ascending order
      const sortedRolls = [...rollsWithWeights].sort((a, b) => {
        const numA = parseInt(a.fgRollNo) || 0;
        const numB = parseInt(b.fgRollNo) || 0;
        return numA - numB;
      });

      const packingDetails = sortedRolls.map((roll, index) => ({
        srNo: index + 1,
        psNo: parseInt(roll.fgRollNo) || 0,
        netWeight: roll.netWeight,
        grossWeight: roll.grossWeight,
        lotNo: roll.lotNo,
      }));

      const firstSalesOrder = Object.values(salesOrders)[0];
      const billToAddress = firstSalesOrder?.buyerAddress || '';
      const shipToAddress = billToAddress;

      // Get lot details
      const lotDetails = await fetchLotDetails(orderGroup.lots);

      const packingMemoData = {
        dispatchOrderId: orderGroup.dispatchOrderId,
        loadingNo: orderGroup.loadingNo, // Add loadingNo to packing memo data
        customerName: orderGroup.customerName,
        dispatchDate: new Date(orderGroup.dispatchDate).toLocaleDateString(),
        lotNumber: orderGroup.lots.map((lot) => lot.lotNo).join(', '),
        vehicleNumber: orderGroup.vehicleNo || 'N/A',
        packingDetails,
        totalNetWeight,
        totalGrossWeight,
        remarks: '',
        billToAddress,
        shipToAddress,
        lotDetails, // Add lot details to packing memo data
      };

      const doc = <PackingMemoPDF {...packingMemoData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Packing_Memo_${orderGroup.loadingNo}.pdf`; // Use loadingNo in filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', `Packing Memo PDF generated for loading sheet ${orderGroup.loadingNo}`);
    } catch (error) {
      console.error('Error generating packing memo:', error);
      toast.error('Error', 'Failed to generate packing memo PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateGatePassPDF = async (orderGroup: DispatchOrderGroup) => {
    setIsGeneratingPDF(true);
    try {
      const gatePassData = {
        dispatchOrderId: orderGroup.dispatchOrderId,
        loadingNo: orderGroup.loadingNo, // Add loadingNo to gate pass data
        customerName: orderGroup.customerName,
        dispatchDate: orderGroup.dispatchDate,
        lots: orderGroup.lots,
        totalGrossWeight: orderGroup.totalGrossWeight,
        totalNetWeight: orderGroup.totalNetWeight,
      };

      const doc = <GatePassPDF gatePassData={gatePassData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GatePass_${orderGroup.loadingNo || orderGroup.dispatchOrderId}.pdf`; // Use loadingNo in filename if available
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', `Gate Pass PDF generated for loading sheet ${orderGroup.loadingNo || orderGroup.dispatchOrderId}`);
    } catch (error) {
      console.error('Error generating gate pass:', error);
      toast.error('Error', 'Failed to generate gate pass PDF');
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
            List of all fully dispatched orders ready for invoicing (with accurate roll weights)
          </p>
        </CardHeader>
        <CardContent className="p-3">
          {/* Filter Section */}
          <div className="mb-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <Label htmlFor="dispatchOrderId" className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Dispatch Order
                </Label>
                <Select value={selectedDispatchOrderId} onValueChange={setSelectedDispatchOrderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a dispatch order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingList ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : availableDispatchOrders.length > 0 ? (
                      availableDispatchOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.id} - {order.customerName} (Loading: {order.loadingNo})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No dispatch orders available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedDispatchOrderId('')}
                  disabled={!selectedDispatchOrderId}
                  className="w-full"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center h-32">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              Loading dispatch orders...
            </div>
          )}

          {/* Empty State - No selection */}
          {!isLoading && !selectedDispatchOrderId && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Search className="h-16 w-16 mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No Dispatch Order Selected</p>
              <p className="text-sm text-center max-w-md">
                Please select a dispatch order from the dropdown above to view details
              </p>
            </div>
          )}

          {/* Results Table */}
          {!isLoading && selectedDispatchOrderId && (
            <div className="bg-white border border-gray-200 rounded-md">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-xs font-medium text-gray-700">
                      Loading Sheet No
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Dispatch Order ID</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Customer</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Lots</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">
                      Dispatch Date
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right">
                      Gross Weight (kg)
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right">
                      Net Weight (kg)
                    </TableHead>
                    <TableHead className="text-xs font-medium text-gray-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatchOrders.length > 0 ? (
                    dispatchOrders.map((orderGroup) => (
                      <TableRow
                        key={orderGroup.loadingNo || orderGroup.dispatchOrderId}
                        className="border-b border-gray-100"
                      >
                        <TableCell className="py-2 text-xs font-medium">
                          {orderGroup.loadingNo || 'N/A'}
                        </TableCell>
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
                        <TableCell className="py-2 text-xs">
                          {formatDate(orderGroup.dispatchDate)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-right">
                          {orderGroup.totalGrossWeight.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-right">
                          {orderGroup.totalNetWeight.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGenerateInvoicePDF(orderGroup)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {isGeneratingPDF ? 'Generating...' : 'Invoice'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGeneratePackingMemoPDF(orderGroup)}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGeneratePackingMemoExcel(orderGroup)}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              Excel
                            </Button>
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
                      <TableCell colSpan={8} className="py-4 text-center text-xs text-gray-500">
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

      {/* Modal remains unchanged */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Dispatch Order Details - {selectedOrderGroup?.loadingNo || selectedOrderGroup?.dispatchOrderId}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            {selectedOrderGroup && (
              <div className="space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader className="bg-gray-50 py-2 px-4">
                    <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Loading Sheet No:</p>
                        <p className="text-sm">{selectedOrderGroup.loadingNo || 'N/A'}</p>
                      </div>
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
                        <p className="text-sm">
                          {selectedOrderGroup.totalGrossWeight.toFixed(2)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Net Weight:</p>
                        <p className="text-sm">{selectedOrderGroup.totalNetWeight.toFixed(2)} kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Lots table remains same */}
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