import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DispatchPlanningDto, SalesOrderWebResponseDto } from '@/types/api-types';

// Create styles to match the PDF layout
const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  invoiceHeader: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerColumn: {
    width: '33%',
  },
  section: {
    marginVertical: 5,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  addressBlock: {
    fontSize: 8,
    marginBottom: 5,
  },
  companyInfo: {
    width: '50%',
  },
  buyerInfo: {
    width: '50%',
  },
  boldText: {
    fontWeight: 'bold',
  },
  gstin: {
    fontWeight: 'bold',
  },
  keyValueRow: {
    flexDirection: 'row',
    marginBottom: 1,
  },
  key: {
    fontWeight: 'bold',
    width: 120,
  },
  value: {
    flex: 1,
  },
  // Table styles
  table: {
    width: '100%',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
  },
  tableColHeader: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 7,
  },
  tableCol: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    borderRightStyle: 'solid',
    fontSize: 7,
  },
  tableColLast: {
    padding: 2,
    borderRightWidth: 0,
  },
  rightAlign: {
    textAlign: 'right',
  },
  centerAlign: {
    textAlign: 'center',
  },
  // Column widths based on PDF
  colSerial: { width: '4%' },
  colPkgs: { width: '7%' },
  colDescription: { width: '34%' },
  colHSN: { width: '8%' },
  colQuantity: { width: '8%' },
  colRate: { width: '7%' },
  colPer: { width: '5%' },
  colDisc: { width: '5%' },
  colAmount: { width: '10%' },
  // Tax table
  taxTable: {
    width: '70%',
    marginLeft: 'auto',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  taxRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  taxCol: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    fontSize: 7,
  },
  taxColLast: {
    padding: 2,
    borderRightWidth: 0,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  // Invoice details section
  invoiceDetails: {
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    padding: 5,
    marginBottom: 10,
  },
  // Bank details
  bankDetails: {
    marginTop: 10,
    fontSize: 8,
  },
  // Declaration
  declaration: {
    marginTop: 15,
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  // Rolls detail table
  rollsTable: {
    width: '100%',
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  rollsTableHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    textAlign: 'center',
  },
  rollsTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
  },
  rollsTableColHeader: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 8,
    backgroundColor: '#f5f5f5',
  },
  rollsTableCol: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    borderRightStyle: 'solid',
    fontSize: 7,
  },
  // Roll table column widths
  colRollSerial: { width: '10%' },
  colLotNo: { width: '45%' },
  colRollCount: { width: '15%' },
  colGrossWeight: { width: '15%' },
  colNetWeight: { width: '15%' },
  // Summary section
  summarySection: {
    marginTop: 5,
    padding: 5,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryLabel: {
    fontWeight: 'bold',
    fontSize: 9,
  },
  summaryValue: {
    fontSize: 9,
  },
  // Sales Order Items Detail Table
  soItemsTable: {
    width: '100%',
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  soItemsTableHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    textAlign: 'center',
  },
  soItemsTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    minHeight: 20,
  },
  soItemsTableColHeader: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 7,
    backgroundColor: '#f5f5f5',
  },
  soItemsTableCol: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    borderRightStyle: 'solid',
    fontSize: 6,
  },
  // SO Items table column widths
  colSOSerial: { width: '4%' },
  colItemName: { width: '15%' },
  colHSNCode: { width: '6%' },
  colYarnCount: { width: '10%' },
  colDiaGG: { width: '6%' },
  colFabricType: { width: '8%' },
  colComposition: { width: '8%' },
  colWtPerRoll: { width: '6%' },
  colNoOfRolls: { width: '5%' },
  colSORate: { width: '6%' },
  colSOQty: { width: '6%' },
  colSOAmount: { width: '7%' },
  colTaxes: { width: '7%' },
  colStitchLength: { width: '6%' },
});

// Helper function to parse rate as number
const parseRate = (rate: string | number): number => {
  if (rate === undefined || rate === null) return 0;
  const rateStr = typeof rate === 'number' ? rate.toString() : rate;
  if (!rateStr) return 0;
  const cleanedRate = rateStr.replace(/[^\d.]/g, '');
  return parseFloat(cleanedRate) || 0;
};

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  if (num === 0) return 'Zero';

  if (num < 20) return ones[num];

  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }

  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
  }

  if (num < 100000) {
    return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  }

  if (num < 10000000) {
    return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
  }

  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
};

// Interface for roll data
interface RollData {
  id: number;
  dispatchPlanningId: number;
  lotNo: string;
  fgRollNo: string;
  isLoaded: boolean;
  loadedAt?: string;
  loadedBy?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Interface for invoice data
interface InvoiceData {
  dispatchOrderId: string;
  customerName: string;
  dispatchDate: string;
  lots: DispatchPlanningDto[];
  salesOrders: Record<number, SalesOrderWebResponseDto>;
  totalGrossWeight: number;
  totalNetWeight: number;
  lotDetails?: Record<string, { tapeColor: string; fabricType: string; composition: string }>;
  rollWeights?: { lotNo: string; fgRollNo: string; grossWeight: number; netWeight: number }[];
  rolls?: RollData[]; // Add rolls data

  // Additional fields
  vehicleNo?: string;
  remarks?: string;
  eWayBillNo?: string;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
}

// Interface for invoice items
interface InvoiceItem {
  slNo: number;
  pkgs: string;
  description: string;
  detailedDescription: string;
  lotDescription: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  per: string;
  discount: string;
  amount: number;
  lotNo: string;
}

const InvoicePDF: React.FC<{ invoiceData: InvoiceData }> = ({ invoiceData }) => {
  // Create invoice items based on the PDF structure
  const invoiceItems: InvoiceItem[] = [];

  // Process lots to create invoice items
  invoiceData.lots.forEach((lot, index) => {
    const salesOrder = invoiceData.salesOrders[lot.salesOrderId];
    const salesOrderItem = salesOrder?.items?.find((item) => item.id === lot.salesOrderItemId);

    if (salesOrderItem) {
      const rate = parseRate(salesOrderItem.rate);

      // Get accurate weights for this lot
      const lotRolls = invoiceData.rollWeights?.filter((roll) => roll.lotNo === lot.lotNo) || [];
      const lotGrossWeight = lotRolls.reduce((sum, roll) => sum + roll.grossWeight, 0);
      const lotNetWeight = lotRolls.reduce((sum, roll) => sum + roll.netWeight, 0);
      const amount = calculateTotalAmount(rate, lotNetWeight);

      // Get lot details
      const lotDetail = invoiceData.lotDetails?.[lot.lotNo];

      // Create descriptions as per PDF format
      const yarnCount = salesOrderItem.yarnCount || '';
      const fabricType = lotDetail?.fabricType || salesOrderItem.fabricType || '';
      const composition = lotDetail?.composition || salesOrderItem.composition || '';
      const color = lotDetail?.tapeColor || '';

      // Main description (like "30s/1 CCH 100% Cotton S/J Fabric")
      let mainDescription = '';
      if (yarnCount.includes('30s') && fabricType.includes('SINGLE JERSEY')) {
        mainDescription = `${yarnCount} CCH 100% Cotton S/J Fabric`;
      } else if (yarnCount.includes('24s') && fabricType.includes('SINGLE JERSEY')) {
        mainDescription = `${yarnCount} CCH 100% Cotton Single Jersey Fabric`;
      } else if (yarnCount.includes('30s') && fabricType.includes('RIB')) {
        mainDescription = `${yarnCount} CCH + 40D. LY 1x1 Rib Fabric`;
      } else if (yarnCount.includes('20s') && fabricType.includes('RIB')) {
        mainDescription = `${yarnCount} CCH + 40D 1X1 Rib Fabric`;
      } else {
        mainDescription = `${yarnCount} ${fabricType}`;
      }

      // Create detailed description matching the image format
      // With sub-details: Count:-, DIA X GG:-30X24, S.L:-3.10, Lot No:-, Packing:-, Ps No:-, Gross Wt:-, Policy No:-
      const diaGG = salesOrderItem.dia && salesOrderItem.gg ? `${salesOrderItem.dia}X${salesOrderItem.gg}` : '-';
      const stitchLength = salesOrderItem.stitchLength || '-';
      const packingType = 'White Polybag + Cello Tape'; // Default packing
      const psNumbers = lotRolls.map(r => r.fgRollNo).join(', ') || '-';

      // Build detailed description with all sub-fields as shown in the image
      const detailedDescription = `Count:-\nDIA X GG:-${diaGG}\nS.L:-${stitchLength}\nLot No:-${lot.lotNo}\nPacking:-${packingType}\nPs No:-${psNumbers}\nGross Wt:-${lotGrossWeight.toFixed(4)}\nPolicy No:-`;

      // Lot description for bottom of item
      const lotDescription = `HO/${lot.lotNo} GSM :- Lot No:-${lot.lotNo}`;

      invoiceItems.push({
        slNo: index + 1,
        pkgs: `${lot.totalDispatchedRolls} Roll`,
        description: mainDescription,
        detailedDescription: detailedDescription,
        lotDescription: lotDescription,
        hsnSac: salesOrderItem.hsncode || '60063200',
        quantity: lotNetWeight,
        rate: rate,
        per: 'Kgs',
        discount: '',
        amount: amount,
        lotNo: lot.lotNo,
      });
    }
  });

  // Calculate totals
  const totalQuantity = invoiceItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

  // Tax calculation (2.5% CGST + 2.5% SGST)
  const taxableValue = totalAmount;
  const cgstRate = 2.5;
  const sgstRate = 2.5;
  const cgstAmount = (taxableValue * cgstRate) / 100;
  const sgstAmount = (taxableValue * sgstRate) / 100;
  const totalTax = cgstAmount + sgstAmount;
  const grandTotal = totalAmount + totalTax;

  // Get first sales order for company info
  const firstSalesOrder = Object.values(invoiceData.salesOrders)[0];

  // Company info
  const companyName = firstSalesOrder?.companyName;
  const companyAddress = 'Factory: Survey No.547-551/1, Wajgaon-Deoli Highway, At:-Wajgaon(NI) Dist:-Wardha-442001';
  const companyGSTIN = firstSalesOrder?.companyGSTIN;
  const companyState = firstSalesOrder?.companyState;

  // Buyer info
  const buyerName = firstSalesOrder?.buyerName || invoiceData.customerName;
  const buyerAddress = firstSalesOrder?.buyerAddress;
  const buyerGSTIN = firstSalesOrder?.buyerGSTIN;
  const buyerState = firstSalesOrder?.buyerState;

  // Format dates
  const invoiceDate = new Date(invoiceData.dispatchDate);
  const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  // Convert amounts to words
  const amountInWords = numberToWords(Math.round(grandTotal));
  const taxAmountInWords = numberToWords(Math.round(totalTax));


  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Tax Invoice */}
        <Text style={styles.invoiceHeader}>Tax Invoice</Text>

        <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', marginVertical: 5 }}></View>

        {/* Company and Buyer Information - Side by side */}
        <View style={styles.row}>
          <View style={styles.companyInfo}>
            <Text style={styles.addressBlock}>
              <Text style={styles.boldText}>{companyName}</Text>
              {'\n'}
              {companyAddress}
              {'\n'}
              <Text style={styles.gstin}>GSTIN/UIN: {companyGSTIN}</Text>
              {'\n'}
              State Name : {companyState}, Code : 27
              {'\n'}
              E-Mail : info@avyaanknitfab.com
            </Text>
          </View>

          <View style={styles.buyerInfo}>
            <Text style={styles.addressBlock}>
              <Text style={styles.boldText}>Buyer (Bill to)</Text>
              {'\n'}
              <Text style={styles.boldText}>{buyerName}</Text>
              {'\n'}
              {buyerAddress}
              {'\n'}
              <Text style={styles.gstin}>GSTIN/UIN : {buyerGSTIN}</Text>
              {'\n'}
              State Name : {buyerState}, Code : 27
            </Text>
          </View>
        </View>

        {/* Consignee Information (Ship To) */}
        <View style={styles.row}>
          <View style={styles.companyInfo}>
            <Text style={styles.addressBlock}>
              <Text style={styles.boldText}>Consignee (Ship to)</Text>
              {'\n'}
              <Text style={styles.boldText}>{firstSalesOrder?.consigneeName || buyerName}</Text>
              {'\n'}
              {firstSalesOrder?.consigneeAddress || buyerAddress}
              {'\n'}
              <Text style={styles.gstin}>GSTIN/UIN : {firstSalesOrder?.consigneeGSTIN || buyerGSTIN}</Text>
              {'\n'}
              State Name : {firstSalesOrder?.consigneeState || buyerState}, Code : 27
            </Text>
          </View>
          <View style={styles.buyerInfo}>
            {/* Empty for layout */}
          </View>
        </View>

        {/* Invoice Details Table */}
        <View style={styles.invoiceDetails}>
          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Invoice No. : {firstSalesOrder?.voucherNumber}</Text>
              <Text>Delivery Note : </Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>e-Way Bill No. : {invoiceData.eWayBillNo}</Text>
              <Text>Dated : {formattedDate}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Reference No. & Date. : </Text>
              <Text>Other References : {firstSalesOrder?.otherReference}</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>Mode/Terms of Payment : {firstSalesOrder?.termsOfPayment}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Buyer's Order No. : {firstSalesOrder?.orderNo}</Text>
              <Text>Dated : {formattedDate}</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>Dispatch Doc No. : {invoiceData.dispatchOrderId}</Text>
              <Text>Delivery Note Date : {formattedDate}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Dispatched through : {firstSalesOrder?.dispatchThrough || invoiceData.vehicleNo}</Text>
              <Text>Destination : {firstSalesOrder?.consigneeState}</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>Bill of Lading/LR-RR No. : {invoiceData.dispatchOrderId}</Text>
              <Text>Motor Vehicle No. : {invoiceData.vehicleNo}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text>Terms of Delivery : {firstSalesOrder?.termsOfDelivery}</Text>
          </View>
        </View>



        {/* Sales Order Items Detail Table */}
        {Object.values(invoiceData.salesOrders).map((salesOrder, soIndex) => (
          salesOrder?.items && salesOrder.items.length > 0 && (
            <View key={soIndex} style={styles.soItemsTable}>
              <Text style={styles.soItemsTableHeader}>
                Sales Order Items Details - {salesOrder.voucherNumber}
              </Text>

              {/* Table Header */}
              <View style={styles.soItemsTableRow}>
                <Text style={[styles.soItemsTableColHeader, styles.colSOSerial]}>Sr.</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colItemName]}>Item Name</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colHSNCode]}>HSN</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colYarnCount]}>Yarn Count</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colDiaGG]}>Dia×GG</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colFabricType]}>Fabric Type</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colComposition]}>Composition</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colWtPerRoll]}>Wt/Roll</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colNoOfRolls]}>Rolls</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colSORate]}>Rate</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colSOQty]}>Qty (Kg)</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colSOAmount]}>Amount</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colTaxes]}>Tax %</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colStitchLength]}>S.L.</Text>
              </View>

              {/* Table Rows */}
              {salesOrder.items.map((item, index) => (
                <View key={index} style={styles.soItemsTableRow}>
                  <Text style={[styles.soItemsTableCol, styles.colSOSerial, styles.centerAlign]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colItemName]}>
                    {item.itemName || '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colHSNCode, styles.centerAlign]}>
                    {item.hsncode || '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colYarnCount]}>
                    {item.yarnCount || '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colDiaGG, styles.centerAlign]}>
                    {item.dia && item.gg ? `${item.dia}×${item.gg}` : '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colFabricType]}>
                    {item.fabricType || '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colComposition]}>
                    {item.composition || '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colWtPerRoll, styles.rightAlign]}>
                    {item.wtPerRoll ? item.wtPerRoll.toFixed(2) : '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colNoOfRolls, styles.centerAlign]}>
                    {item.noOfRolls || '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colSORate, styles.rightAlign]}>
                    {item.rate ? item.rate.toFixed(2) : '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colSOQty, styles.rightAlign]}>
                    {item.qty ? item.qty.toFixed(2) : '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colSOAmount, styles.rightAlign]}>
                    {item.amount ? item.amount.toFixed(2) : '-'}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colTaxes, styles.centerAlign]}>
                    {item.igst > 0 ? `I:${item.igst}%` : `C:${item.cgst}% S:${item.sgst}%`}
                  </Text>
                  <Text style={[styles.soItemsTableCol, styles.colStitchLength, styles.centerAlign]}>
                    {item.stitchLength || '-'}
                  </Text>
                </View>
              ))}

              {/* Additional Details Row */}
              <View style={[styles.soItemsTableRow, { backgroundColor: '#f9f9f9' }]}>
                <Text style={[styles.soItemsTableCol, styles.colSOSerial]}></Text>
                <Text style={[styles.soItemsTableCol, { width: '96%' }, styles.boldText]}>
                  Additional Details:{'\n'}
                  {salesOrder.items.map((item, idx) => (
                    `Item ${idx + 1}: Slit Line: ${item.slitLine || 'N/A'}, Due Date: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : 'N/A'}, Remarks: ${item.remarks || 'None'}`
                  )).join('\n')}
                </Text>
              </View>

              {/* Total Row */}
              <View style={[styles.soItemsTableRow, { backgroundColor: '#f0f0f0' }]}>
                <Text style={[styles.soItemsTableCol, styles.colSOSerial, styles.boldText]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colItemName, styles.boldText]}>Total</Text>
                <Text style={[styles.soItemsTableCol, styles.colHSNCode]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colYarnCount]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colDiaGG]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colFabricType]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colComposition]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colWtPerRoll]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colNoOfRolls, styles.centerAlign, styles.boldText]}>
                  {salesOrder.items.reduce((sum, item) => sum + (item.noOfRolls || 0), 0)}
                </Text>
                <Text style={[styles.soItemsTableCol, styles.colSORate]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colSOQty, styles.rightAlign, styles.boldText]}>
                  {salesOrder.items.reduce((sum, item) => sum + (item.qty || 0), 0).toFixed(2)}
                </Text>
                <Text style={[styles.soItemsTableCol, styles.colSOAmount, styles.rightAlign, styles.boldText]}>
                  {salesOrder.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                </Text>
                <Text style={[styles.soItemsTableCol, styles.colTaxes]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colStitchLength]}></Text>
              </View>
            </View>
          )
        ))}

        {/* Rolls Detail Table - Grouped by Lot */}
        {invoiceData.rollWeights && invoiceData.rollWeights.length > 0 && (() => {
          // Group rolls by lot number
          const lotGroups = invoiceData.rollWeights.reduce((acc, roll) => {
            if (!acc[roll.lotNo]) {
              acc[roll.lotNo] = {
                lotNo: roll.lotNo,
                rolls: [],
                totalGrossWeight: 0,
                totalNetWeight: 0,
                rollCount: 0
              };
            }
            acc[roll.lotNo].rolls.push(roll);
            acc[roll.lotNo].totalGrossWeight += roll.grossWeight;
            acc[roll.lotNo].totalNetWeight += roll.netWeight;
            acc[roll.lotNo].rollCount += 1;
            return acc;
          }, {} as Record<string, { lotNo: string; rolls: any[]; totalGrossWeight: number; totalNetWeight: number; rollCount: number }>);

          const lotGroupsArray = Object.values(lotGroups);

          return (
            <View style={styles.rollsTable}>
              <Text style={styles.rollsTableHeader}>Dispatch Roll Details (Grouped by Lot)</Text>

              {/* Table Header */}
              <View style={styles.rollsTableRow}>
                <Text style={[styles.rollsTableColHeader, styles.colRollSerial]}>Sr. No.</Text>
                <Text style={[styles.rollsTableColHeader, styles.colLotNo]}>Lot Number</Text>
                <Text style={[styles.rollsTableColHeader, styles.colRollCount]}>Roll Count</Text>
                <Text style={[styles.rollsTableColHeader, styles.colGrossWeight]}>Gross Wt (Kg)</Text>
                <Text style={[styles.rollsTableColHeader, styles.colNetWeight]}>Net Wt (Kg)</Text>
              </View>

              {/* Table Rows - Grouped by Lot */}
              {lotGroupsArray.map((lotGroup, index) => (
                <View key={index} style={styles.rollsTableRow}>
                  <Text style={[styles.rollsTableCol, styles.colRollSerial, styles.centerAlign]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.rollsTableCol, styles.colLotNo]}>
                    {lotGroup.lotNo}
                  </Text>
                  <Text style={[styles.rollsTableCol, styles.colRollCount, styles.centerAlign]}>
                    {lotGroup.rollCount}
                  </Text>
                  <Text style={[styles.rollsTableCol, styles.colGrossWeight, styles.rightAlign]}>
                    {lotGroup.totalGrossWeight.toFixed(4)}
                  </Text>
                  <Text style={[styles.rollsTableCol, styles.colNetWeight, styles.rightAlign]}>
                    {lotGroup.totalNetWeight.toFixed(4)}
                  </Text>
                </View>
              ))}

              {/* Total Row */}
              <View style={[styles.rollsTableRow, { backgroundColor: '#f0f0f0' }]}>
                <Text style={[styles.rollsTableCol, styles.colRollSerial, styles.boldText]}></Text>
                <Text style={[styles.rollsTableCol, styles.colLotNo, styles.boldText]}>
                  Grand Total
                </Text>
                <Text style={[styles.rollsTableCol, styles.colRollCount, styles.centerAlign, styles.boldText]}>
                  {invoiceData.rollWeights.length}
                </Text>
                <Text style={[styles.rollsTableCol, styles.colGrossWeight, styles.rightAlign, styles.boldText]}>
                  {invoiceData.rollWeights.reduce((sum, roll) => sum + roll.grossWeight, 0).toFixed(4)}
                </Text>
                <Text style={[styles.rollsTableCol, styles.colNetWeight, styles.rightAlign, styles.boldText]}>
                  {invoiceData.rollWeights.reduce((sum, roll) => sum + roll.netWeight, 0).toFixed(4)}
                </Text>
              </View>

              {/* Summary Section */}
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Lots:</Text>
                  <Text style={styles.summaryValue}>{lotGroupsArray.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Rolls:</Text>
                  <Text style={styles.summaryValue}>{invoiceData.rollWeights.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Gross Weight:</Text>
                  <Text style={styles.summaryValue}>
                    {invoiceData.rollWeights.reduce((sum, roll) => sum + roll.grossWeight, 0).toFixed(4)} Kg
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Net Weight:</Text>
                  <Text style={styles.summaryValue}>
                    {invoiceData.rollWeights.reduce((sum, roll) => sum + roll.netWeight, 0).toFixed(4)} Kg
                  </Text>
                </View>
              </View>
            </View>
          );
        })()}



        {/* Remarks and Declaration */}
        <View style={styles.declaration}>
          <Text>
            <Text style={styles.boldText}>Remarks:</Text> Being sale of knitted fabric
          </Text>
          <Text style={styles.boldText}>Declaration for Avyaan Knitfab</Text>
          <Text>
            We declare that this invoice shows the actual price of the goods described and that all
            particulars are true and correct.
          </Text>
          <Text style={{ textAlign: 'right', marginTop: 10 }}>Authorised Signatory</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a Computer Generated Invoice</Text>
        </View>
      </Page>
    </Document>
  );
};

// Helper function to calculate total amount
const calculateTotalAmount = (rate: number, quantity: number): number => {
  return rate * quantity;
};

export default InvoicePDF;