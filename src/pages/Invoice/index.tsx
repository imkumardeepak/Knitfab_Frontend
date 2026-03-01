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
import { ArrowLeft, FileText, Package, Search, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import * as ExcelJS from 'exceljs';
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
  customerName: string; // Added customerName
  totalGrossWeight: number;
  totalNetWeight: number;
  dispatchDate: string;
  vehicleNo: string;
  voucherNumbers: string;
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
  orderNo?: string; // Optional buyer's order number
  itemName?: string; // Added itemName
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
          machineName: matchingConf?.machineName || 'N/A',
          mcRollNo: matchingConf?.rollNo || 'N/A',
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
        itemName: productionAllotment.itemName || 'N/A', // Map itemName
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
        itemName: 'N/A',
      };
    }
  }

  return lotDetails;
};

const InvoicePage = () => {
  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrderGroup[]>([]);
  const [availableDispatchOrders, setAvailableDispatchOrders] = useState<{ id: string, loadingNo: string, customerName: string, voucherNumbers?: string, dispatchDate?: string }[]>([]);
  const [selectedDispatchOrderId, setSelectedDispatchOrderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<DispatchOrderGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [voucherMapping, setVoucherMapping] = useState<Record<number, string>>({});

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

      // Fetch voucher info for all sales orders in this dispatch order
      const salesOrderIds = [...new Set(dispatchPlanningsForOrder.map(lot => lot.salesOrderId))];
      const voucherMap: Record<number, string> = {};

      for (const id of salesOrderIds) {
        try {
          const so = await SalesOrderWebService.getSalesOrderWebById(id);
          voucherMap[id] = so.voucherNumber;
        } catch (e) {
          voucherMap[id] = 'Unknown';
        }
      }

      setVoucherMapping(voucherMap);

      for (const [loadingNo, lots] of loadingSheetMap.entries()) {
        // Calculate date per loading sheet with fallback to updatedAt
        const dispatchDate = lots.reduce((latest: string, lot: DispatchPlanningDto) => {
          const lotDate = lot.dispatchEndDate || lot.dispatchStartDate || lot.updatedAt;
          if (!latest || (lotDate && new Date(lotDate) > new Date(latest))) {
            return lotDate || latest;
          }
          return latest;
        }, '');

        const loadingSheetVouchers = [...new Set(lots.map(lot => voucherMap[lot.salesOrderId]))].filter(Boolean).join(', ');

        // Fetch accurate weights for this loading sheet
        const { totalGrossWeight, totalNetWeight } =
          await fetchAccurateDispatchWeightsForLoadingNo(loadingNo);

        totalOrderGrossWeight += totalGrossWeight;
        totalOrderNetWeight += totalNetWeight;

        loadingSheetGroups.push({
          loadingNo,
          lots,
          customerName: lots[0]?.customerName || 'N/A', // Use customer from the first lot of this specific loading sheet
          totalGrossWeight,
          totalNetWeight,
          dispatchDate: dispatchDate || new Date().toISOString(),
          vehicleNo: lots[0].vehicleNo || 'N/A',
          voucherNumbers: loadingSheetVouchers
        });
      }

      const orderGroup: DispatchOrderGroup = {
        dispatchOrderId: dispatchOrderId,
        loadingSheets: loadingSheetGroups,
        customerName: loadingSheetGroups[0]?.customerName || fullyDispatchedOnly[0].customerName || 'N/A',
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
      customerName: loadingSheet.customerName, // Use loadingSheet specific customer name
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

  const handleGenerateInvoicePDF = async (loadingSheet: LoadingSheetGroup, dispatchOrderId: string) => {
    setIsGeneratingPDF(true);
    try {
      const customerName = loadingSheet.customerName; // Use per-loading-sheet customer name
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

      // Get first sales order for company details
      const firstSalesOrder = Object.values(salesOrders)[0];

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
        // Company details from the first sales order
        companyName: firstSalesOrder?.companyName || 'AVYAAN KNITFAB',
        companyGSTIN: firstSalesOrder?.companyGSTIN || '27ABYFA2736N1ZD',
        companyState: firstSalesOrder?.companyState || 'Maharashtra',
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

  const handleGeneratePackingMemoExcel = async (
    loadingSheet: LoadingSheetGroup,
    dispatchOrderId: string,
    sortOption: 'default' | 'machineAsc' | 'machineDesc' | 'mcRollAsc' | 'mcRollDesc' = 'default'
  ) => {
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

      // Sort rolls based on the selected option (copying existing logic)
      let sortedRolls = [...rollsWithWeights];

      if (sortOption === 'machineAsc') {
        sortedRolls.sort((a, b) => {
          const machA = (a.machineName || '').toLowerCase();
          const machB = (b.machineName || '').toLowerCase();
          if (machA < machB) return -1;
          if (machA > machB) return 1;
          const numA = parseInt(a.fgRollNo) || 0;
          const numB = parseInt(b.fgRollNo) || 0;
          return numA - numB;
        });
      } else if (sortOption === 'machineDesc') {
        sortedRolls.sort((a, b) => {
          const machA = (a.machineName || '').toLowerCase();
          const machB = (b.machineName || '').toLowerCase();
          if (machA < machB) return 1;
          if (machA > machB) return -1;
          const numA = parseInt(a.fgRollNo) || 0;
          const numB = parseInt(b.fgRollNo) || 0;
          return numA - numB;
        });
      } else if (sortOption === 'mcRollAsc') {
        sortedRolls.sort((a, b) => {
          const numA = parseInt(a.mcRollNo) || 0;
          const numB = parseInt(b.mcRollNo) || 0;
          if (numA !== numB) return numA - numB;
          const psA = parseInt(a.fgRollNo) || 0;
          const psB = parseInt(b.fgRollNo) || 0;
          return psA - psB;
        });
      } else if (sortOption === 'mcRollDesc') {
        sortedRolls.sort((a, b) => {
          const numA = parseInt(a.mcRollNo) || 0;
          const numB = parseInt(b.mcRollNo) || 0;
          if (numA !== numB) return numB - numA;
          const psA = parseInt(a.fgRollNo) || 0;
          const psB = parseInt(b.fgRollNo) || 0;
          return psA - psB;
        });
      } else {
        sortedRolls.sort((a, b) => (parseInt(a.fgRollNo) || 0) - (parseInt(b.fgRollNo) || 0));
      }

      const packingDetails = sortedRolls.map((roll, index) => ({
        srNo: index + 1,
        psNo: parseInt(roll.fgRollNo) || 0,
        netWeight: roll.netWeight,
        grossWeight: roll.grossWeight,
        lotNo: roll.lotNo,
        machineName: roll.machineName || 'N/A',
        mcRollNo: roll.mcRollNo || 'N/A',
      }));

      const firstSalesOrder = Object.values(salesOrders)[0];
      const lotDetails = await fetchLotDetails(loadingSheet.lots);
      const firstLotDetail = Object.values(lotDetails)[0] || { tapeColor: 'N/A', fabricType: 'N/A', composition: 'N/A' };

      // Initialize Workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Packing Memo');

      // Styles
      const companyStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial Black', size: 22, bold: true, color: { argb: 'FF1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const reportTitleStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const sectionHeaderStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 11, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
        border: { bottom: { style: 'thin' } },
        alignment: { horizontal: 'left' }
      };

      const tableHeaderStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const dataCellStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10 },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center' }
      };

      const greyHeaderStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10, bold: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const leftDataStyle: Partial<ExcelJS.Style> = {
        font: { name: 'Arial', size: 10 },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'left', wrapText: true }
      };

      // Set Column Widths
      worksheet.columns = [
        { width: 8 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 16 }, { width: 16 }, // Left Table
        { width: 4 }, // Spacer
        { width: 8 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 16 }, { width: 16 }  // Right Table
      ];

      // 1. Company Header
      const companyName = firstSalesOrder?.companyName || 'AVYAAN KNITFAB';
      const companyGSTIN = firstSalesOrder?.companyGSTIN || '27ABYFA2736N1ZD';
      const companyState = firstSalesOrder?.companyState || 'Maharashtra';

      const row1 = worksheet.addRow([companyName.toUpperCase()]);
      worksheet.mergeCells('A1:M1');
      row1.getCell(1).style = companyStyle;
      row1.height = 35;

      const row2 = worksheet.addRow([`Sr.No.547-551/1, At.Waigaoon-Deoli State Highway, Waigaon (M), Wardha-442001, ${companyState}`]);
      worksheet.mergeCells('A2:M2');
      row2.getCell(1).alignment = { horizontal: 'center' };
      row2.getCell(1).font = { italic: true, size: 10 };

      const row3 = worksheet.addRow([`GSTIN: ${companyGSTIN}`]);
      worksheet.mergeCells('A3:M3');
      row3.getCell(1).alignment = { horizontal: 'center' };
      row3.getCell(1).font = { bold: true };

      worksheet.addRow([]); // Spacer

      // 2. Report Information
      const titleRow = worksheet.addRow(['PACKING MEMO REPORT']);
      worksheet.mergeCells('A5:M5');
      titleRow.getCell(1).style = reportTitleStyle;
      titleRow.height = 25;

      const infoRow1 = worksheet.addRow([`Dispatch Order ID: ${dispatchOrderId}`, '', '', '', '', '', '', `Date of Generation: ${new Date().toLocaleDateString('en-IN')}`]);
      worksheet.mergeCells('A6:G6');
      worksheet.mergeCells('H6:M6');
      infoRow1.getCell(1).font = { bold: true };
      infoRow1.getCell(8).font = { bold: true };
      infoRow1.getCell(8).alignment = { horizontal: 'right' };

      worksheet.addRow([]); // Spacer

      // 3. Loading & Weight Details Grid (As per PDF layout)
      const loadHead1 = worksheet.addRow(['Loading Sheet No', '', '', 'Dispatch Order ID', '', '', 'Date', '', '', 'Vehicle No.', '', '', '']);
      worksheet.mergeCells(`A${loadHead1.number}:C${loadHead1.number}`);
      worksheet.mergeCells(`D${loadHead1.number}:F${loadHead1.number}`);
      worksheet.mergeCells(`G${loadHead1.number}:I${loadHead1.number}`);
      worksheet.mergeCells(`J${loadHead1.number}:M${loadHead1.number}`);
      loadHead1.eachCell({ includeEmpty: true }, (c) => c.style = greyHeaderStyle);

      const loadVal1 = worksheet.addRow([loadingSheet.loadingNo || 'N/A', '', '', dispatchOrderId, '', '', new Date(loadingSheet.dispatchDate).toLocaleDateString('en-IN'), '', '', loadingSheet.vehicleNo || 'N/A', '', '', '']);
      worksheet.mergeCells(`A${loadVal1.number}:C${loadVal1.number}`);
      worksheet.mergeCells(`D${loadVal1.number}:F${loadVal1.number}`);
      worksheet.mergeCells(`G${loadVal1.number}:I${loadVal1.number}`);
      worksheet.mergeCells(`J${loadVal1.number}:M${loadVal1.number}`);
      loadVal1.eachCell({ includeEmpty: true }, (c) => c.style = dataCellStyle);

      const loadHead2 = worksheet.addRow(['Total Net Weight (kg)', '', '', '', 'Gross Weight (kg)', '', '', '', 'No. of Packages', '', '', '', '']);
      worksheet.mergeCells(`A${loadHead2.number}:D${loadHead2.number}`);
      worksheet.mergeCells(`E${loadHead2.number}:H${loadHead2.number}`);
      worksheet.mergeCells(`I${loadHead2.number}:M${loadHead2.number}`);
      loadHead2.eachCell({ includeEmpty: true }, (c) => c.style = greyHeaderStyle);

      const loadVal2 = worksheet.addRow([loadingSheet.totalNetWeight.toFixed(2), '', '', '', loadingSheet.totalGrossWeight.toFixed(2), '', '', '', packingDetails.length, '', '', '', '']);
      worksheet.mergeCells(`A${loadVal2.number}:D${loadVal2.number}`);
      worksheet.mergeCells(`E${loadVal2.number}:H${loadVal2.number}`);
      worksheet.mergeCells(`I${loadVal2.number}:M${loadVal2.number}`);
      loadVal2.eachCell({ includeEmpty: true }, (c) => c.style = dataCellStyle);

      worksheet.addRow([]); // Spacer

      // 4. Lot Details Section
      const lotTitleRow = worksheet.addRow(['Lot Details']);
      lotTitleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true };
      worksheet.addRow([]); // Small gap

      const lotHead1 = worksheet.addRow(['LOT NO', '', '', '', 'ITEM NAME', '', '', '', '', 'ORDER NO', '', '', '']);
      worksheet.mergeCells(`A${lotHead1.number}:D${lotHead1.number}`);
      worksheet.mergeCells(`E${lotHead1.number}:I${lotHead1.number}`);
      worksheet.mergeCells(`J${lotHead1.number}:M${lotHead1.number}`);
      lotHead1.eachCell({ includeEmpty: true }, (c) => c.style = greyHeaderStyle);

      const lotVal1 = worksheet.addRow([firstLotDetail.lotNo || 'N/A', '', '', '', firstLotDetail.itemName || 'N/A', '', '', '', '', firstSalesOrder?.orderNo || 'N/A', '', '', '']);
      worksheet.mergeCells(`A${lotVal1.number}:D${lotVal1.number}`);
      worksheet.mergeCells(`E${lotVal1.number}:I${lotVal1.number}`);
      worksheet.mergeCells(`J${lotVal1.number}:M${lotVal1.number}`);
      lotVal1.eachCell({ includeEmpty: true }, (c) => c.style = dataCellStyle);

      const lotHead2 = worksheet.addRow(['FABRIC DETAILS', '', '', '', 'DIA x GG', '', '', 'STITCH LEN', '', 'PACKING SPECS', '', '', '']);
      worksheet.mergeCells(`A${lotHead2.number}:D${lotHead2.number}`);
      worksheet.mergeCells(`E${lotHead2.number}:G${lotHead2.number}`);
      worksheet.mergeCells(`H${lotHead2.number}:I${lotHead2.number}`);
      worksheet.mergeCells(`J${lotHead2.number}:M${lotHead2.number}`);
      lotHead2.eachCell({ includeEmpty: true }, (c) => c.style = greyHeaderStyle);

      const fabricDetails = `${firstLotDetail.fabricType} | ${firstLotDetail.composition}`;
      const diaGG = `${firstLotDetail.diameter} x ${firstLotDetail.gauge}`;
      const packingSpecs = `Tape: ${firstLotDetail.tapeColor} | Polybag: ${firstLotDetail.polybagColor}`;

      const lotVal2 = worksheet.addRow([fabricDetails, '', '', '', diaGG, '', '', firstLotDetail.stitchLength || 'N/A', '', packingSpecs, '', '', '']);
      worksheet.mergeCells(`A${lotVal2.number}:D${lotVal2.number}`);
      worksheet.mergeCells(`E${lotVal2.number}:G${lotVal2.number}`);
      worksheet.mergeCells(`H${lotVal2.number}:I${lotVal2.number}`);
      worksheet.mergeCells(`J${lotVal2.number}:M${lotVal2.number}`);
      lotVal2.eachCell({ includeEmpty: true }, (c) => c.style = dataCellStyle);

      worksheet.addRow([]); // Spacer

      // 5. Bill To / Ship To Section
      const billShipHead = worksheet.addRow(['BILL TO:', '', '', '', '', '', '', 'SHIP TO:', '', '', '', '', '']);
      worksheet.mergeCells(`A${billShipHead.number}:F${billShipHead.number}`);
      worksheet.mergeCells(`H${billShipHead.number}:M${billShipHead.number}`);
      billShipHead.getCell(1).font = { bold: true, underline: true };
      billShipHead.getCell(8).font = { bold: true, underline: true };

      const customerNameDisplay = loadingSheet.customerName || 'N/A';
      const buyerAddress = firstSalesOrder?.buyerAddress || 'N/A';
      const addressContent = `${customerNameDisplay}\n${buyerAddress}`;

      const billShipData = worksheet.addRow([addressContent, '', '', '', '', '', '', addressContent, '', '', '', '', '']); // Multi-line address
      worksheet.mergeCells(`A${billShipData.number}:F${billShipData.number}`);
      worksheet.mergeCells(`H${billShipData.number}:M${billShipData.number}`);
      billShipData.getCell(1).style = leftDataStyle;
      billShipData.getCell(8).style = leftDataStyle;
      billShipData.height = 60; // Increased height for customer name + address

      worksheet.addRow([]); // Spacer

      // 5. Packing List (Two Column Table)
      const listHeaderRow = worksheet.addRow(['PACKING LIST DETAILS']);
      worksheet.mergeCells(listHeaderRow.number, 1, listHeaderRow.number, 13);
      listHeaderRow.getCell(1).style = sectionHeaderStyle;

      const tableHeaderNames = ['Sr No.', 'P.S. No.', 'Mc Roll No.', 'Machine', 'Net (kg)', 'Gross (kg)', '', 'Sr No.', 'P.S. No.', 'Mc Roll No.', 'Machine', 'Net (kg)', 'Gross (kg)'];
      const tableHeaderRow = worksheet.addRow(tableHeaderNames);
      tableHeaderRow.eachCell((cell, colNum) => {
        if (colNum !== 7) cell.style = tableHeaderStyle;
      });

      const halfLength = Math.ceil(packingDetails.length / 2);
      for (let i = 0; i < halfLength; i++) {
        const left = packingDetails[i];
        const right = packingDetails[i + halfLength];

        const dataRow = worksheet.addRow([
          left?.srNo || '',
          left?.psNo || '',
          left?.mcRollNo || '',
          left?.machineName || '',
          left?.netWeight.toFixed(2) || '',
          left?.grossWeight.toFixed(2) || '',
          '',
          right?.srNo || '',
          right?.psNo || '',
          right?.mcRollNo || '',
          right?.machineName || '',
          right?.netWeight.toFixed(2) || '',
          right?.grossWeight.toFixed(2) || ''
        ]);

        dataRow.eachCell((cell, colNum) => {
          if (colNum !== 7) {
            cell.style = dataCellStyle;
            if (i % 2 === 1) { // Alternating row color
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            }
          }
        });
      }



      worksheet.addRow([]); // Spacer
      const sigHeader = worksheet.addRow(['CHECKED BY', '', 'PACKING MANAGER', '', 'AUTHORISED SIGNATORY']);
      sigHeader.eachCell(c => { if (c.value) c.font = { bold: true, size: 10 }; });
      worksheet.addRow(['______________', '', '______________', '', '______________']);

      // Final Borders for the whole table (optional)

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Packing_Memo_${loadingSheet.loadingNo}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast.success('Success', `Premium Excel report generated for ${loadingSheet.loadingNo}`);
    } catch (error) {
      console.error('Error generating packing memo Excel:', error);
      toast.error('Error', 'Failed to generate premium Excel report');
    }
  };

  const handleGeneratePackingMemoPDF = async (
    loadingSheet: LoadingSheetGroup,
    dispatchOrderId: string,
    includeMachineName: boolean = false
  ) => {
    setIsGeneratingPDF(true);
    try {
      const customerName = loadingSheet.customerName; // Use per-loading-sheet customer name
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
        machineName: roll.machineName || 'N/A',
        mcRollNo: roll.mcRollNo || 'N/A',
      }));

      const firstSalesOrder = Object.values(salesOrders)[0];
      const billToAddress = firstSalesOrder?.buyerAddress || '';
      const shipToAddress = billToAddress;
      const orderNo = firstSalesOrder?.orderNo || '-'; // Extract buyer's order number

      // Get lot details and add order number to each lot
      const baseLotDetails = await fetchLotDetails(loadingSheet.lots);

      // Add order number to each lot detail
      const lotDetailsWithOrderNo: Record<string, LotDetail> = { ...baseLotDetails };
      Object.keys(lotDetailsWithOrderNo).forEach(lotNo => {
        lotDetailsWithOrderNo[lotNo] = {
          ...lotDetailsWithOrderNo[lotNo],
          orderNo: orderNo // Add the buyer's order number to each lot
        } as LotDetail;
      });

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
        lotDetails: lotDetailsWithOrderNo, // Add lot details with order number
        // Company details from the first sales order
        companyName: firstSalesOrder?.companyName || 'AVYAAN KNITFAB',
        companyGSTIN: firstSalesOrder?.companyGSTIN || '27ABYFA2736N1ZD',
        companyState: firstSalesOrder?.companyState || 'Maharashtra',
        showMachineName: includeMachineName,
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

  const handleGenerateGatePassPDF = async (loadingSheet: LoadingSheetGroup, dispatchOrderId: string) => {
    setIsGeneratingPDF(true);
    try {
      const customerName = loadingSheet.customerName; // Use per-loading-sheet customer name
      // Fetch sales orders to get company details
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

      const firstSalesOrder = Object.values(salesOrders)[0];

      const gatePassData = {
        dispatchOrderId: dispatchOrderId,
        loadingNo: loadingSheet.loadingNo,
        customerName: customerName,
        dispatchDate: loadingSheet.dispatchDate,
        lots: loadingSheet.lots,
        totalGrossWeight: loadingSheet.totalGrossWeight,
        totalNetWeight: loadingSheet.totalNetWeight,
        // Company details from the first sales order
        companyName: firstSalesOrder?.companyName || 'AVYAAN KNITFAB',
        companyGSTIN: firstSalesOrder?.companyGSTIN || '27ABYFA2736N1ZD',
        companyState: firstSalesOrder?.companyState || 'Maharashtra',
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
                      const filteredOrders = availableDispatchOrders.filter((order) => {
                        const searchLower = searchQuery.toLowerCase();
                        return searchQuery
                          ? order.id.toLowerCase().includes(searchLower) ||
                          order.customerName.toLowerCase().includes(searchLower) ||
                          (order.voucherNumbers && order.voucherNumbers.toLowerCase().includes(searchLower)) ||
                          (order.dispatchDate && formatDate(order.dispatchDate).toLowerCase().includes(searchLower))
                          : true;
                      });

                      return filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.id} - ({order.voucherNumbers || 'No Voucher'}) {order.dispatchDate && ` - ${formatDate(order.dispatchDate)}`}
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
                    <TableHead className="text-xs font-medium text-gray-700">Voucher</TableHead>
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
                        <TableCell className="py-2 text-xs font-medium">
                          {loadingSheet.voucherNumbers || 'N/A'}
                        </TableCell>
                        <TableCell className="py-2 text-xs">{loadingSheet.customerName}</TableCell>
                        <TableCell className="py-2 text-xs">{loadingSheet.lots.map(l => l.lotNo).join(', ')}</TableCell>
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
                              onClick={() => handleGenerateInvoicePDF(loadingSheet, dispatchOrders[0].dispatchOrderId)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {isGeneratingPDF ? 'Generating...' : 'Invoice'}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  disabled={isGeneratingPDF}
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  PDF
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoPDF(loadingSheet, dispatchOrders[0].dispatchOrderId, false)}>
                                  Standard PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoPDF(loadingSheet, dispatchOrders[0].dispatchOrderId, true)}>
                                  PDF with Machine
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  disabled={isGeneratingPDF}
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  Excel
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoExcel(loadingSheet, dispatchOrders[0].dispatchOrderId, 'default')}>
                                  Default (By Roll No)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoExcel(loadingSheet, dispatchOrders[0].dispatchOrderId, 'machineAsc')}>
                                  By Machine Name (A-Z)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoExcel(loadingSheet, dispatchOrders[0].dispatchOrderId, 'machineDesc')}>
                                  By Machine Name (Z-A)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoExcel(loadingSheet, dispatchOrders[0].dispatchOrderId, 'mcRollAsc')}>
                                  By Mc Roll No (0-9)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGeneratePackingMemoExcel(loadingSheet, dispatchOrders[0].dispatchOrderId, 'mcRollDesc')}>
                                  By Mc Roll No (9-0)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs"
                              disabled={isGeneratingPDF}
                              onClick={() => handleGenerateGatePassPDF(loadingSheet, dispatchOrders[0].dispatchOrderId)}
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
                        <p className="text-sm font-medium">Voucher(s):</p>
                        <p className="text-sm">{selectedOrderGroup.loadingSheets[0].voucherNumbers}</p>
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
                          <TableHead className="text-xs">Voucher No</TableHead>
                          <TableHead className="text-xs">Customer Name</TableHead>
                          <TableHead className="text-xs">Tape Color</TableHead>
                          <TableHead className="text-xs">Required Rolls</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderGroup.loadingSheets[0].lots.map((lot) => (
                          <TableRow key={lot.lotNo}>
                            <TableCell className="text-xs">{lot.lotNo}</TableCell>
                            <TableCell className="text-xs">{voucherMapping[lot.salesOrderId] || lot.salesOrderId}</TableCell>
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