import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  loadingSheets: LoadingSheetGroup[];
  customerName: string;
  totalGrossWeight: number;
  totalNetWeight: number;
}

interface LoadingSheetGroup {
  loadingNo: string;
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
    diameter: number;
    gauge: number;
    polybagColor: string;
    stitchLength: string | number;
}


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
        diameter: productionAllotment.diameter || 0,
        gauge: productionAllotment.gauge || 0,
        polybagColor: productionAllotment.polybagColor || 'N/A',
        stitchLength: productionAllotment.stitchLength || 'N/A',
      };
    } catch (error) {
      console.error(`Failed to fetch production allotment for lot ${lot.lotNo}`, error);
      lotDetails[lot.lotNo] = {
        lotNo: lot.lotNo,
        tapeColor: 'N/A',
        fabricType: 'N/A',
        composition: 'N/A',
        diameter: 0,
        gauge: 0,
        polybagColor: 'N/A',
        stitchLength: 'N/A',
      };
    }
  }

  return lotDetails;
};

const InvoicePage = () => {
  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrderGroup[]>([]);
  const [availableDispatchOrders, setAvailableDispatchOrders] = useState<{id: string, loadingNo: string, customerName: string}[]>([]);
  const [selectedDispatchOrderId, setSelectedDispatchOrderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
      // Use optimized endpoint to fetch only unique fully dispatched dispatch order IDs
      const response = await dispatchPlanningApi.getFullyDispatchedOrders();
      const uniqueDispatchOrders = apiUtils.extractData(response);

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
      // Use optimized endpoint to fetch only dispatch plannings for this dispatch order ID
      const response = await dispatchPlanningApi.getDispatchPlanningsByDispatchOrderId(dispatchOrderId);
      const dispatchPlanningsForOrder = apiUtils.extractData(response);

      // Filter only fully dispatched orders
      const fullyDispatchedOnly = dispatchPlanningsForOrder.filter(
        (order: DispatchPlanningDto) => order.isFullyDispatched
      );

      if (fullyDispatchedOnly.length === 0) {
        setDispatchOrders([]);
        toast.info('Info', `No fully dispatched orders found for dispatch order ${dispatchOrderId}`);
        return;
      }

      // Group by loading sheet number
      const loadingSheetMap = new Map<string, DispatchPlanningDto[]>();
      fullyDispatchedOnly.forEach((lot) => {
        const loadingNo = lot.loadingNo || 'N/A';
        if (!loadingSheetMap.has(loadingNo)) {
          loadingSheetMap.set(loadingNo, []);
        }
        loadingSheetMap.get(loadingNo)!.push(lot);
      });

      // Create loading sheet groups with their weights
      const loadingSheetGroups: LoadingSheetGroup[] = [];
      let totalOrderGrossWeight = 0;
      let totalOrderNetWeight = 0;

      for (const [loadingNo, lots] of loadingSheetMap.entries()) {
        const dispatchDate = lots.reduce((latest, lot) => {
          const lotDate = lot.dispatchEndDate || lot.dispatchStartDate;
          if (!latest || (lotDate && new Date(lotDate) > new Date(latest))) {
            return lotDate || latest;
          }
          return latest;
        }, '');

        // Fetch accurate weights for this loading sheet
        const { totalGrossWeight, totalNetWeight } =
          await fetchAccurateDispatchWeightsForLoadingNo(loadingNo);

        totalOrderGrossWeight += totalGrossWeight;
        totalOrderNetWeight += totalNetWeight;

        loadingSheetGroups.push({
          loadingNo,
          lots,
          totalGrossWeight,
          totalNetWeight,
          dispatchDate: dispatchDate || new Date().toISOString(),
          vehicleNo: lots[0].vehicleNo || 'N/A',
        });
      }

      const orderGroup: DispatchOrderGroup = {
        dispatchOrderId: dispatchOrderId,
        loadingSheets: loadingSheetGroups,
        customerName: fullyDispatchedOnly[0].customerName || 'N/A',
        totalGrossWeight: totalOrderGrossWeight,
        totalNetWeight: totalOrderNetWeight,
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

  const handleViewLoadingSheetDetails = (loadingSheet: LoadingSheetGroup, dispatchOrderId: string) => {
    // Create a temporary order group for modal display
    const tempOrderGroup: DispatchOrderGroup = {
      dispatchOrderId,
      loadingSheets: [loadingSheet],
      customerName: dispatchOrders[0]?.customerName || 'N/A',
      totalGrossWeight: loadingSheet.totalGrossWeight,
      totalNetWeight: loadingSheet.totalNetWeight,
    };
    setSelectedOrderGroup(tempOrderGroup);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderGroup(null);
  };

  const handleGenerateInvoicePDF = async (loadingSheet: LoadingSheetGroup, dispatchOrderId: string, customerName: string) => {
    setIsGeneratingPDF(true);
    try {
      const salesOrderIds = [...new Set(loadingSheet.lots.map((lot) => lot.salesOrderId))];
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
        await fetchAccurateDispatchWeightsForLoadingNo(loadingSheet.loadingNo);

      // Get lot details
      const lotDetails = await fetchLotDetails(loadingSheet.lots);

      const invoiceData = {
        dispatchOrderId: dispatchOrderId,
        loadingNo: loadingSheet.loadingNo,
        customerName: customerName,
        dispatchDate: loadingSheet.dispatchDate,
        lots: loadingSheet.lots,
        salesOrders,
        totalGrossWeight: loadingSheet.totalGrossWeight,
        totalNetWeight: loadingSheet.totalNetWeight,
        rollWeights: rollsWithWeights,
        lotDetails, // Add lot details to invoice data
      };

      const doc = <InvoicePDF invoiceData={invoiceData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${loadingSheet.loadingNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', `Invoice PDF generated for loading sheet ${loadingSheet.loadingNo}`);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Error', 'Failed to generate invoice PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGeneratePackingMemoExcel = async (loadingSheet: LoadingSheetGroup, dispatchOrderId: string) => {
    try {
      // Dynamically import XLSX to ensure it's available
      const XLSX = await import('xlsx');

      const salesOrderIds = [...new Set(loadingSheet.lots.map((lot) => lot.salesOrderId))];
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
        await fetchAccurateDispatchWeightsForLoadingNo(loadingSheet.loadingNo);
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
      const lotDetails = await fetchLotDetails(loadingSheet.lots);

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
        loadingSheet.loadingNo || 'N/A',
        dispatchOrderId,
        new Date(loadingSheet.dispatchDate).toLocaleDateString(),
        loadingSheet.vehicleNo || 'N/A',
        loadingSheet.lots.map((lot) => lot.lotNo).join(', '),
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
        loadingSheet.totalNetWeight.toFixed(2),
        loadingSheet.totalGrossWeight.toFixed(2),
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
        `Net Weight: ${loadingSheet.totalNetWeight.toFixed(2)}`,
        `Gross Weight: ${loadingSheet.totalGrossWeight.toFixed(2)}`,
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
      XLSX.writeFile(wb, `Packing_Memo_${loadingSheet.loadingNo}.xlsx`);

      toast.success('Success', `Packing Memo Excel generated for loading sheet ${loadingSheet.loadingNo}`);
    } catch (error) {
      console.error('Error generating packing memo Excel:', error);
      toast.error('Error', 'Failed to generate packing memo Excel');
    }
  };

  const handleGeneratePackingMemoPDF = async (loadingSheet: LoadingSheetGroup, dispatchOrderId: string, customerName: string) => {
    setIsGeneratingPDF(true);
    try {
      const salesOrderIds = [...new Set(loadingSheet.lots.map((lot) => lot.salesOrderId))];
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
      } = await fetchAccurateDispatchWeightsForLoadingNo(loadingSheet.loadingNo);
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
      const lotDetails = await fetchLotDetails(loadingSheet.lots);

      const packingMemoData = {
        dispatchOrderId: dispatchOrderId,
        loadingNo: loadingSheet.loadingNo,
        customerName: customerName,
        dispatchDate: new Date(loadingSheet.dispatchDate).toLocaleDateString(),
        lotNumber: loadingSheet.lots.map((lot) => lot.lotNo).join(', '),
        vehicleNumber: loadingSheet.vehicleNo || 'N/A',
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
      link.download = `Packing_Memo_${loadingSheet.loadingNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', `Packing Memo PDF generated for loading sheet ${loadingSheet.loadingNo}`);
    } catch (error) {
      console.error('Error generating packing memo:', error);
      toast.error('Error', 'Failed to generate packing memo PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateGatePassPDF = async (loadingSheet: LoadingSheetGroup, dispatchOrderId: string, customerName: string) => {
    setIsGeneratingPDF(true);
    try {
      const gatePassData = {
        dispatchOrderId: dispatchOrderId,
        loadingNo: loadingSheet.loadingNo,
        customerName: customerName,
        dispatchDate: loadingSheet.dispatchDate,
        lots: loadingSheet.lots,
        totalGrossWeight: loadingSheet.totalGrossWeight,
        totalNetWeight: loadingSheet.totalNetWeight,
      };

      const doc = <GatePassPDF gatePassData={gatePassData} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GatePass_${loadingSheet.loadingNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Success', `Gate Pass PDF generated for loading sheet ${loadingSheet.loadingNo}`);
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
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="dispatchOrderId" className="text-sm font-medium text-gray-700 mb-2 block">
                  Select Dispatch Order
                </Label>
                {/* Search Input */}
                <Input
                  type="text"
                  placeholder="Search dispatch order ID, customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
                {/* Dropdown */}
                <Select value={selectedDispatchOrderId} onValueChange={setSelectedDispatchOrderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a dispatch order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingList ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (() => {
                      // Filter orders based on search query
                      const filteredOrders = availableDispatchOrders.filter((order) =>
                        searchQuery
                          ? order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
                          : true
                      );

                      return filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.id}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-data" disabled>
                          {searchQuery ? 'No matching dispatch orders found' : 'No dispatch orders available'}
                        </SelectItem>
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDispatchOrderId('');
                    setSearchQuery('');
                  }}
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
                  {dispatchOrders.length > 0 && dispatchOrders[0] ? (
                    // Render all loading sheets for the selected dispatch order
                    dispatchOrders[0].loadingSheets.map((loadingSheet) => (
                      <TableRow
                        key={loadingSheet.loadingNo}
                        className="border-b border-gray-100"
                      >
                        <TableCell className="py-2 text-xs font-medium">
                          {loadingSheet.loadingNo || 'N/A'}
                        </TableCell>
                        <TableCell className="py-2 text-xs font-medium">
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                            onClick={() => handleViewLoadingSheetDetails(loadingSheet, dispatchOrders[0].dispatchOrderId)}
                          >
                            {dispatchOrders[0].dispatchOrderId}
                          </Button>
                        </TableCell>
                        <TableCell className="py-2 text-xs">{dispatchOrders[0].customerName}</TableCell>
                        <TableCell className="py-2 text-xs">{loadingSheet.lots.length}</TableCell>
                        <TableCell className="py-2 text-xs">
                          {formatDate(loadingSheet.dispatchDate)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-right">
                          {loadingSheet.totalGrossWeight.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-right">
                          {loadingSheet.totalNetWeight.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGenerateInvoicePDF(loadingSheet, dispatchOrders[0].dispatchOrderId, dispatchOrders[0].customerName)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {isGeneratingPDF ? 'Generating...' : 'Invoice'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGeneratePackingMemoPDF(loadingSheet, dispatchOrders[0].dispatchOrderId, dispatchOrders[0].customerName)}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGeneratePackingMemoExcel(loadingSheet, dispatchOrders[0].dispatchOrderId)}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              Excel
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGenerateGatePassPDF(loadingSheet, dispatchOrders[0].dispatchOrderId, dispatchOrders[0].customerName)}
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

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Loading Sheet Details - {selectedOrderGroup?.loadingSheets[0]?.loadingNo || selectedOrderGroup?.dispatchOrderId}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            {selectedOrderGroup && selectedOrderGroup.loadingSheets.length > 0 && (
              <div className="space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader className="bg-gray-50 py-2 px-4">
                    <CardTitle className="text-base font-semibold">Loading Sheet Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Loading Sheet No:</p>
                        <p className="text-sm">{selectedOrderGroup.loadingSheets[0].loadingNo || 'N/A'}</p>
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
                        <p className="text-sm">{selectedOrderGroup.loadingSheets[0].lots.length}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Dispatch Date:</p>
                        <p className="text-sm">{formatDate(selectedOrderGroup.loadingSheets[0].dispatchDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Gross Weight:</p>
                        <p className="text-sm">
                          {selectedOrderGroup.loadingSheets[0].totalGrossWeight.toFixed(2)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Net Weight:</p>
                        <p className="text-sm">{selectedOrderGroup.loadingSheets[0].totalNetWeight.toFixed(2)} kg</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Vehicle No:</p>
                        <p className="text-sm">{selectedOrderGroup.loadingSheets[0].vehicleNo || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lots Table */}
                <Card className="border border-gray-200">
                  <CardHeader className="bg-gray-50 py-2 px-4">
                    <CardTitle className="text-base font-semibold">Lot Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Lot No</TableHead>
                          <TableHead className="text-xs">Sales Order ID</TableHead>
                          <TableHead className="text-xs">Customer Name</TableHead>
                          <TableHead className="text-xs">Tape Color</TableHead>
                          <TableHead className="text-xs">Required Rolls</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderGroup.loadingSheets[0].lots.map((lot) => (
                          <TableRow key={lot.lotNo}>
                            <TableCell className="text-xs">{lot.lotNo}</TableCell>
                            <TableCell className="text-xs">{lot.salesOrderId}</TableCell>
                            <TableCell className="text-xs">{lot.customerName || 'N/A'}</TableCell>
                            <TableCell className="text-xs">{lot.tape || 'N/A'}</TableCell>
                            <TableCell className="text-xs">{lot.totalRequiredRolls || 0}</TableCell>
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