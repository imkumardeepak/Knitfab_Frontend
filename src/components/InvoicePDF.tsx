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
    lineHeight: 1.4,
  },
  companyInfo: {
    width: '50%',
    paddingRight: 5,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    borderRightStyle: 'solid',
  },
  buyerInfo: {
    width: '50%',
    paddingLeft: 5,
  },
  boldText: {
    fontWeight: 'bold',
  },
  gstin: {
    fontWeight: 'bold',
    fontSize: 7.5,
  },
  stateInfo: {
    fontSize: 7.5,
    color: '#333',
  },
  emailInfo: {
    fontSize: 7.5,
    color: '#0066cc',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#000',
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
    marginBottom: 1,
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
    marginTop: 5,
  },
  invoiceDetailsRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingVertical: 1,
  },
  invoiceDetailsLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#000',
    minWidth: 100,
  },
  invoiceDetailsValue: {
    fontSize: 7.5,
    color: '#333',
    flex: 1,
  },
  invoiceDetailsColumn: {
    width: '50%',
    paddingRight: 5,
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
    minHeight: 22,
    alignItems: 'center',
  },
  soItemsTableColHeader: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 8,
    backgroundColor: '#e8e8e8',
  },
  soItemsTableCol: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    borderRightStyle: 'solid',
    fontSize: 7,
    minHeight: 15,
  },
  // SO Items table column widths - Optimized for better balance
  colSOSerial: { width: '5%' },
  colItemName: { width: '30%' },
  colHSNCode: { width: '10%' },
  colSORate: { width: '12%' },
  colSOQty: { width: '15%' },
  colSOAmount: { width: '18%' },
  colTaxes: { width: '10%' },
  colStitchLength: { width: '10%' },
});

// Helper function to parse rate as number
const parseRate = (rate: string | number): number => {
  if (rate === undefined || rate === null) return 0;
  const rateStr = typeof rate === 'number' ? rate.toString() : rate;
  if (!rateStr) return 0;
  const cleanedRate = rateStr.replace(/[^\d.]/g, '');
  return parseFloat(cleanedRate) || 0;
};

// Helper function to convert number to words (currently unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  loadingNo?: string; // Add loadingNo field for grouping by loading sheet
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

  // Company details
  companyName?: string;
  companyGSTIN?: string;
  companyState?: string;
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
      const detailedDescription = `Count:-
DIA X GG:-${diaGG}
S.L:-${stitchLength}
Lot No:-${lot.lotNo}
Packing:-${packingType}
Ps No:-${psNumbers}
Gross Wt:-${lotGrossWeight.toFixed(4)}
Policy No:-`;

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

  // Get first sales order for company info
  const firstSalesOrder = Object.values(invoiceData.salesOrders)[0];

  // Company info - use passed values if available, otherwise fall back to sales order
  const companyName = invoiceData.companyName || firstSalesOrder?.companyName || 'AVYAAN KNITFAB';
  const companyAddress = 'Factory: Survey No.547-551/1, Wajgaon-Deoli Highway, At:-Wajgaon(NI) Dist:-Wardha-442001';
  const companyGSTIN = invoiceData.companyGSTIN || firstSalesOrder?.companyGSTIN || '27ABYFA2736N1ZD';
  const companyState = invoiceData.companyState || firstSalesOrder?.companyState || 'Maharashtra';

  // Buyer info
  const buyerName = firstSalesOrder?.buyerName || invoiceData.customerName;
  const buyerAddress = firstSalesOrder?.buyerAddress;
  const buyerGSTIN = firstSalesOrder?.buyerGSTIN;
  const buyerState = firstSalesOrder?.buyerState;

  // Extract state codes from GSTIN (first 2 digits)
  const getStateCode = (gstin: string | null | undefined): string => {
    if (!gstin || gstin.length < 2) return '';
    return gstin.substring(0, 2);
  };

  const companyStateCode = getStateCode(companyGSTIN);
  const buyerStateCode = getStateCode(buyerGSTIN);

  // Determine if transaction is Intra-state or Inter-state
  // Rule: If Supplier State Code == Buyer State Code => Intra-state (CGST + SGST)
  //       If Supplier State Code != Buyer State Code => Inter-state (IGST)
  const isIntraState = companyStateCode === buyerStateCode && companyStateCode !== '';

  // ============================================================
  // QUANTITY & AMOUNT CALCULATION FROM ROLL WEIGHTS
  // ============================================================
  // Use Total Net Weight from Roll Weights section as the Quantity
  // This ensures the invoice quantity matches the actual dispatched weight

  // Calculate Total Gross Weight and Net Weight from rollWeights
  const totalGrossWeight = invoiceData.rollWeights?.reduce((sum, roll) => sum + roll.grossWeight, 0) || 0;
  const totalNetWeight = invoiceData.rollWeights?.reduce((sum, roll) => sum + roll.netWeight, 0) || 0;

  // Get the rate from first sales order item (assuming uniform rate)
  const itemRate = firstSalesOrder?.items?.[0]?.rate || 0;

  // Calculate Taxable Value (Amount) = Rate × Total Net Weight
  // This is the base price on which GST will be calculated
  const taxableValue = itemRate * totalNetWeight;

  // Total Quantity = Total Net Weight (in Kgs)
  const totalQuantity = totalNetWeight;

  // ============================================================
  // GST CALCULATION LOGIC (As per Indian GST Standards)
  // ============================================================
  // 
  // 1. GST EXCLUSIVE FORMULA (Adding Tax to Base Price):
  //    GST Amount = (Taxable Value × GST Rate) / 100
  //    Total Invoice Value = Taxable Value + GST Amount
  //
  // 2. For INTRA-STATE (Same State - e.g., Maharashtra to Maharashtra):
  //    CGST Rate = Total GST Rate / 2
  //    SGST Rate = Total GST Rate / 2
  //    CGST Amount = (Taxable Value × CGST Rate) / 100
  //    SGST Amount = (Taxable Value × SGST Rate) / 100
  //
  // 3. For INTER-STATE (Different States - e.g., Maharashtra to Gujarat):
  //    IGST Amount = (Taxable Value × Total GST Rate) / 100
  // ============================================================

  // Total GST Rate: 5% (for HSN 60063200 - Knitted Fabrics)
  const totalGSTRate = 5.0;

  // Initialize tax variables
  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isIntraState) {
    // INTRA-STATE: Split GST equally between CGST and SGST
    // CGST Rate = Total GST Rate / 2 = 5.0 / 2 = 2.5%
    // SGST Rate = Total GST Rate / 2 = 5.0 / 2 = 2.5%
    cgstRate = totalGSTRate / 2;
    sgstRate = totalGSTRate / 2;

    // CGST Amount = (Taxable Value × CGST Rate) / 100
    cgstAmount = (taxableValue * cgstRate) / 100;

    // SGST Amount = (Taxable Value × SGST Rate) / 100
    sgstAmount = (taxableValue * sgstRate) / 100;
  } else {
    // INTER-STATE: Apply IGST only
    // IGST Rate = Total GST Rate = 5.0%
    igstRate = totalGSTRate;

    // IGST Amount = (Taxable Value × IGST Rate) / 100
    igstAmount = (taxableValue * igstRate) / 100;
  }

  // Total Tax = CGST + SGST + IGST
  // (Only one set will have values based on transaction type)
  const totalTax = cgstAmount + sgstAmount + igstAmount;

  // Grand Total = Taxable Value + Total Tax
  const grandTotal = taxableValue + totalTax;

  // Format dates
  const invoiceDate = new Date(invoiceData.dispatchDate);
  const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });


  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Tax Invoice */}
        <Text style={styles.invoiceHeader}>Tax Invoice</Text>

        <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', marginVertical: 5 }}></View>

        {/* Company and Buyer Information - Side by side */}
        <View style={styles.row}>
          {/* Company/Supplier Information */}
          <View style={styles.companyInfo}>
            <Text style={styles.sectionTitle}>Supplier</Text>
            <Text style={styles.partyName}>{companyName}</Text>
            <Text style={styles.addressBlock}>
              {companyAddress}
            </Text>
            <View style={{ marginTop: 3 }}>
              <Text style={styles.gstin}>GSTIN/UIN: {companyGSTIN}</Text>
              <Text style={styles.stateInfo}>
                State: {companyState}, Code: {companyStateCode || '27'}
              </Text>
              <Text style={styles.emailInfo}>Email: info@avyaanknitfab.com</Text>
            </View>
          </View>

          {/* Buyer Information */}
          <View style={styles.buyerInfo}>
            <Text style={styles.sectionTitle}>Buyer (Bill To)</Text>
            <Text style={styles.partyName}>{buyerName}</Text>
            <Text style={styles.addressBlock}>
              {buyerAddress}
            </Text>
            <View style={{ marginTop: 3 }}>
              <Text style={styles.gstin}>GSTIN/UIN: {buyerGSTIN}</Text>
              <Text style={styles.stateInfo}>
                State: {buyerState}, Code: {buyerStateCode || '27'}
              </Text>
            </View>
          </View>
        </View>

        {/* Horizontal Divider */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 5 }}></View>

        {/* Consignee Information (Ship To) */}
        <View style={styles.row}>
          <View style={styles.companyInfo}>
            <Text style={styles.sectionTitle}>Consignee (Ship To)</Text>
            <Text style={styles.partyName}>{firstSalesOrder?.consigneeName || buyerName}</Text>
            <Text style={styles.addressBlock}>
              {firstSalesOrder?.consigneeAddress || buyerAddress}
            </Text>
            <View style={{ marginTop: 3 }}>
              <Text style={styles.gstin}>
                GSTIN/UIN: {firstSalesOrder?.consigneeGSTIN || buyerGSTIN}
              </Text>
              <Text style={styles.stateInfo}>
                State: {firstSalesOrder?.consigneeState || buyerState}, Code: {getStateCode(firstSalesOrder?.consigneeGSTIN || buyerGSTIN) || buyerStateCode || '27'}
              </Text>
            </View>
          </View>

          {/* Empty Space for Balance */}
          <View style={styles.buyerInfo}>
            {/* Reserved for additional information if needed */}
          </View>
        </View>

        {/* Invoice Details Table */}
        <View style={styles.invoiceDetails}>
          {/* Row 1: Invoice No. & e-Way Bill */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Invoice No.</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.voucherNumber || '-'}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>e-Way Bill No.</Text>
                <Text style={styles.invoiceDetailsValue}>: {invoiceData.eWayBillNo || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Row 2: Delivery Note & Dated */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Delivery Note</Text>
                <Text style={styles.invoiceDetailsValue}>: </Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Dated</Text>
                <Text style={styles.invoiceDetailsValue}>: {formattedDate}</Text>
              </View>
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginVertical: 3 }}></View>

          {/* Row 3: Reference No. & Mode of Payment */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Reference No.</Text>
                <Text style={styles.invoiceDetailsValue}>: </Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Payment Terms</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.termsOfPayment || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Row 4: Other References */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Other References</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.otherReference || '-'}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              {/* Empty */}
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginVertical: 3 }}></View>

          {/* Row 5: Buyer's Order No. & Dispatch Doc No. */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Buyer's Order No.</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.orderNo || '-'}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Dispatch Doc No.</Text>
                <Text style={styles.invoiceDetailsValue}>: {invoiceData.loadingNo || invoiceData.dispatchOrderId || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Row 6: Order Dated & Delivery Note Date */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Order Dated</Text>
                <Text style={styles.invoiceDetailsValue}>: {formattedDate}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Delivery Date</Text>
                <Text style={styles.invoiceDetailsValue}>: {formattedDate}</Text>
              </View>
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginVertical: 3 }}></View>

          {/* Row 7: Dispatched Through & Bill of Lading */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Dispatched Through</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.dispatchThrough || invoiceData.vehicleNo || '-'}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Bill of Lading</Text>
                <Text style={styles.invoiceDetailsValue}>: {invoiceData.loadingNo || invoiceData.dispatchOrderId || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Row 8: Destination & Motor Vehicle No. */}
          <View style={styles.invoiceDetailsRow}>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Destination</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.consigneeState || '-'}</Text>
              </View>
            </View>
            <View style={styles.invoiceDetailsColumn}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Vehicle No.</Text>
                <Text style={styles.invoiceDetailsValue}>: {invoiceData.vehicleNo || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Horizontal Divider */}
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginVertical: 3 }}></View>

          {/* Row 9: Terms of Delivery */}
          <View style={styles.invoiceDetailsRow}>
            <View style={{ width: '100%' }}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.invoiceDetailsLabel}>Terms of Delivery</Text>
                <Text style={styles.invoiceDetailsValue}>: {firstSalesOrder?.termsOfDelivery || '-'}</Text>
              </View>
            </View>
          </View>
        </View>



        {/* Sales Order Items Detail Table */}
        {Object.values(invoiceData.salesOrders).map((salesOrder, soIndex) => (
          salesOrder?.items && salesOrder.items.length > 0 && (
            <View key={soIndex} style={styles.soItemsTable}>
              <Text style={styles.soItemsTableHeader}>
                Invoice Items - {salesOrder.voucherNumber}
              </Text>

              {/* Table Header */}
              <View style={[styles.soItemsTableRow, { backgroundColor: '#f5f5f5', borderBottomWidth: 2, borderBottomColor: '#000' }]}>
                <Text style={[styles.soItemsTableColHeader, styles.colSOSerial]}>Sl.{' \n'}No.</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colItemName]}>Description of Goods</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colHSNCode]}>HSN/{' \n'}SAC</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colSORate]}>Rate</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colSOQty]}>Quantity{' \n'}(Kg)</Text>
                <Text style={[styles.soItemsTableColHeader, styles.colSOAmount]}>Amount</Text>
              </View>

              {/* Table Rows */}
              {salesOrder.items.map((item, index) => (
                <React.Fragment key={index}>
                  {/* Main Item Row */}
                  <View style={[styles.soItemsTableRow, { backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa' }]}>
                    <Text style={[styles.soItemsTableCol, styles.colSOSerial, styles.centerAlign, styles.boldText]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.soItemsTableCol, styles.colItemName, { paddingLeft: 6 }]}>
                      {item.itemName || '-'}
                    </Text>
                    <Text style={[styles.soItemsTableCol, styles.colHSNCode, styles.centerAlign]}>
                      {item.hsncode || '-'}
                    </Text>
                    <Text style={[styles.soItemsTableCol, styles.colSORate, styles.rightAlign, { paddingRight: 6 }]}>
                      {item.rate ? item.rate.toFixed(2) : '-'}
                    </Text>
                    <Text style={[styles.soItemsTableCol, styles.colSOQty, styles.rightAlign, { paddingRight: 6 }]}>
                      {totalQuantity.toFixed(2)} Kgs
                    </Text>
                    <Text style={[styles.soItemsTableCol, styles.colSOAmount, styles.rightAlign, { paddingRight: 8, fontWeight: 'bold' }]}>
                      {taxableValue.toFixed(2)}
                    </Text>
                  </View>

                  {/* Details Sub-row */}
                  <View style={[styles.soItemsTableRow, { backgroundColor: '#f9f9f9', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', minHeight: 18 }]}>
                    <Text style={[styles.soItemsTableCol, styles.colSOSerial]}></Text>
                    <Text style={[styles.soItemsTableCol, { width: '95%', fontSize: 6.5, paddingLeft: 12, paddingTop: 2, paddingBottom: 2, fontStyle: 'italic', color: '#444' }]}>
                      <Text style={{ fontWeight: 'bold', color: '#000' }}>Count:</Text> {item.yarnCount || '-'} | <Text style={{ fontWeight: 'bold', color: '#000' }}>Dia×GG:</Text> {item.dia && item.gg ? `${item.dia}×${item.gg}` : '-'} | <Text style={{ fontWeight: 'bold', color: '#000' }}>Type:</Text> {item.fabricType || '-'} | <Text style={{ fontWeight: 'bold', color: '#000' }}>Composition:</Text> {item.composition || '-'} | <Text style={{ fontWeight: 'bold', color: '#000' }}>Wt/Roll:</Text> {item.wtPerRoll ? item.wtPerRoll.toFixed(2) : '-'} Kg | <Text style={{ fontWeight: 'bold', color: '#000' }}>Rolls:</Text> {item.noOfRolls || '-'} | <Text style={{ fontWeight: 'bold', color: '#000' }}>S.L.:</Text> {item.stitchLength || '-'} | <Text style={{ fontWeight: 'bold', color: '#000' }}>Slit Line:</Text> {item.slitLine || 'N/A'}
                    </Text>
                  </View>
                </React.Fragment>
              ))}

              {/* Subtotal Row - Taxable Value (Base Price) */}
              <View style={[styles.soItemsTableRow, { backgroundColor: '#e8f4f8', borderTopWidth: 2, borderTopColor: '#000' }]}>
                <Text style={[styles.soItemsTableCol, styles.colSOSerial, styles.boldText]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colItemName, styles.boldText, { paddingLeft: 6 }]}>Subtotal (Taxable Value)</Text>
                <Text style={[styles.soItemsTableCol, styles.colHSNCode]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colSORate]}></Text>
                <Text style={[styles.soItemsTableCol, styles.colSOQty, styles.rightAlign, styles.boldText, { paddingRight: 6 }]}>
                  {totalQuantity.toFixed(2)} Kgs
                </Text>
                <Text style={[styles.soItemsTableCol, styles.colSOAmount, styles.rightAlign, styles.boldText, { paddingRight: 8, fontSize: 8 }]}>
                  {taxableValue.toFixed(2)}
                </Text>
              </View>

              {/* Conditional Tax Rows based on Intra-state or Inter-state */}
              {isIntraState ? (
                <>
                  {/* CGST Row - Intra-state */}
                  <View style={[styles.soItemsTableRow, { backgroundColor: '#ffffff', minHeight: 18 }]}>
                    <Text style={[styles.soItemsTableCol, styles.colSOSerial]}></Text>
                    <Text style={[styles.soItemsTableCol, { width: '65%', paddingLeft: 12 }]}>
                      CGST Output @ {cgstRate.toFixed(2)}%
                    </Text>
                    <Text style={[styles.soItemsTableCol, { width: '12%' }, styles.centerAlign, { fontSize: 6.5 }]}>
                      @ {cgstRate.toFixed(2)}%
                    </Text>
                    <Text style={[styles.soItemsTableCol, { width: '18%' }, styles.rightAlign, { paddingRight: 8 }]}>
                      {cgstAmount.toFixed(2)}
                    </Text>
                  </View>

                  {/* SGST Row - Intra-state */}
                  <View style={[styles.soItemsTableRow, { backgroundColor: '#ffffff', minHeight: 18 }]}>
                    <Text style={[styles.soItemsTableCol, styles.colSOSerial]}></Text>
                    <Text style={[styles.soItemsTableCol, { width: '65%', paddingLeft: 12 }]}>
                      SGST Output @ {sgstRate.toFixed(2)}%
                    </Text>
                    <Text style={[styles.soItemsTableCol, { width: '12%' }, styles.centerAlign, { fontSize: 6.5 }]}>
                      @ {sgstRate.toFixed(2)}%
                    </Text>
                    <Text style={[styles.soItemsTableCol, { width: '18%' }, styles.rightAlign, { paddingRight: 8 }]}>
                      {sgstAmount.toFixed(2)}
                    </Text>
                  </View>
                </>
              ) : (
                /* IGST Row - Inter-state */
                <View style={[styles.soItemsTableRow, { backgroundColor: '#ffffff', minHeight: 18 }]}>
                  <Text style={[styles.soItemsTableCol, styles.colSOSerial]}></Text>
                  <Text style={[styles.soItemsTableCol, { width: '65%', paddingLeft: 12 }]}>
                    IGST Output @ {igstRate.toFixed(2)}%
                  </Text>
                  <Text style={[styles.soItemsTableCol, { width: '12%' }, styles.centerAlign, { fontSize: 6.5 }]}>
                    @ {igstRate.toFixed(2)}%
                  </Text>
                  <Text style={[styles.soItemsTableCol, { width: '18%' }, styles.rightAlign, { paddingRight: 8 }]}>
                    {igstAmount.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Total Tax Row */}
              <View style={[styles.soItemsTableRow, { backgroundColor: '#fff8e1', minHeight: 20 }]}>
                <Text style={[styles.soItemsTableCol, styles.colSOSerial]}></Text>
                <Text style={[styles.soItemsTableCol, { width: '65%', paddingLeft: 12 }, styles.boldText]}>
                  Total Tax ({isIntraState ? 'CGST + SGST' : 'IGST'})
                </Text>
                <Text style={[styles.soItemsTableCol, { width: '12%' }, styles.centerAlign, { fontSize: 6.5 }]}>
                  @ {totalGSTRate.toFixed(2)}%
                </Text>
                <Text style={[styles.soItemsTableCol, { width: '18%' }, styles.rightAlign, styles.boldText, { paddingRight: 8 }]}>
                  {totalTax.toFixed(2)}
                </Text>
              </View>

              {/* Grand Total Row */}
              <View style={[styles.soItemsTableRow, { backgroundColor: '#d4edda', borderTopWidth: 2, borderTopColor: '#000', borderBottomWidth: 2, borderBottomColor: '#000', minHeight: 25 }]}>
                <Text style={[styles.soItemsTableCol, styles.colSOSerial, styles.boldText]}></Text>
                <Text style={[styles.soItemsTableCol, { width: '50%' }, styles.boldText, { fontSize: 9, paddingLeft: 6 }]}>
                  Total Amount
                </Text>
                <Text style={[styles.soItemsTableCol, { width: '15%' }, styles.rightAlign, styles.boldText, { paddingRight: 6, fontSize: 7 }]}>
                  {totalQuantity.toFixed(4)} Kgs
                </Text>
                <Text style={[styles.soItemsTableCol, { width: '30%' }, styles.rightAlign, styles.boldText, { fontSize: 10, paddingRight: 8 }]}>
                  {grandTotal.toFixed(2)}
                </Text>
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
          }, {} as Record<string, { lotNo: string; rolls: { lotNo: string; fgRollNo: string; grossWeight: number; netWeight: number }[]; totalGrossWeight: number; totalNetWeight: number; rollCount: number }>);

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