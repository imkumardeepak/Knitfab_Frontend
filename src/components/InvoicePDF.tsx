import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DispatchPlanningDto, SalesOrderWebResponseDto } from '@/types/api-types';

// Create styles to match the PDF layout
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
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
      } else {
        mainDescription = `${yarnCount} ${fabricType}`;
      }

      // Detailed description (like "Fabric - Knitted 100% COTTON 30S SINGLE JERSEY 160 GSM - BEIGE-12-0304")
      const detailedDescription = `Fabric - ${composition} ${yarnCount} ${fabricType} - ${color}`;

      // Lot description (like "HO/534GSM :- Lot No:-Vw-3551")
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
  const companyName = firstSalesOrder?.companyName || 'Avyaan Knitfab';
  const companyAddress = 'Factory: Survey No.547-551/1, Wajgaon-Deoli Highway, At:-Wajgaon(NI) Dist:-Wardha-442001';
  const companyGSTIN = firstSalesOrder?.companyGSTIN || '27ABYFA2736N1ZO';
  const companyState = firstSalesOrder?.companyState || 'Maharashtra';

  // Buyer info
  const buyerName = firstSalesOrder?.buyerName || invoiceData.customerName;
  const buyerAddress = firstSalesOrder?.buyerAddress || 'E-49, E-49/1/2, MIDC Industrial Area, Tarapur, Boisar-401506, Dist- Thane';
  const buyerGSTIN = firstSalesOrder?.buyerGSTIN || '27AABCP7263L1ZO';
  const buyerState = firstSalesOrder?.buyerState || 'Maharashtra';

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

  // Invoice number
  const invoiceNo = `MX25-XRF00137`;
  const eWayBillNo = invoiceData.eWayBillNo || '212006970209';
  const irn = invoiceData.irn || '411253872033325044bfda9684a8ff8c3985541ee-73137949aeb2bb6306ee9c0';
  const ackNo = invoiceData.ackNo || '122527857266607';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Tax Invoice */}
        <Text style={styles.invoiceHeader}>Tax Invoice</Text>

        {/* IRN and Ack Details */}
        <View style={styles.row}>
          <Text>IRN : {irn}</Text>
        </View>
        <View style={styles.row}>
          <Text>Ack No. : {ackNo}</Text>
          <Text style={{ marginLeft: 20 }}>Ack Date : {formattedDate}</Text>
        </View>

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

        {/* Invoice Details Table */}
        <View style={styles.invoiceDetails}>
          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Invoice No. : {invoiceNo}</Text>
              <Text>Delivery Note : </Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>e-Way Bill No. : {eWayBillNo}</Text>
              <Text>Dated : {formattedDate}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Reference No. & Date. : </Text>
              <Text>Other References : Self</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>Mode/Terms of Payment : Against Delivery</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Buyer's Order No. : 01/07/2020/11</Text>
              <Text>Dated : 15 Jun 25, 29 Jul 25, 8 Jul 25, 12 Jun 25</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>Dispatch Doc No. : </Text>
              <Text>Delivery Note Date : </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ width: '50%' }}>
              <Text>Dispatched through : {invoiceData.vehicleNo || 'MH18BG6848'}</Text>
              <Text>Destination : Valsad</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text>Bill of Lading/LR-RR No. : </Text>
              <Text>Motor Vehicle No. : {invoiceData.vehicleNo || 'MH18BG6848'}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text>Terms of Delivery : Against GST</Text>
          </View>
        </View>

        {/* Main Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colSerial]}>Sl No</Text>
            <Text style={[styles.tableColHeader, styles.colPkgs]}>No. & Kind of Pkgs.</Text>
            <Text style={[styles.tableColHeader, styles.colDescription]}>Description of Goods</Text>
            <Text style={[styles.tableColHeader, styles.colHSN]}>HSN/SAC</Text>
            <Text style={[styles.tableColHeader, styles.colQuantity]}>Quantity</Text>
            <Text style={[styles.tableColHeader, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableColHeader, styles.colPer]}>per</Text>
            <Text style={[styles.tableColHeader, styles.colDisc]}>Disc. %</Text>
            <Text style={[styles.tableColHeader, styles.colAmount]}>Amount</Text>
          </View>

          {/* Invoice Items */}
          {invoiceItems.map((item, index) => (
            <View key={index}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.colSerial, styles.centerAlign]}>{item.slNo}</Text>
                <Text style={[styles.tableCol, styles.colPkgs, styles.centerAlign]}>{item.pkgs}</Text>
                <Text style={[styles.tableCol, styles.colDescription]}>
                  <Text style={styles.boldText}>{item.description}</Text>
                  {'\n'}
                  {item.detailedDescription}
                  {'\n'}
                  {item.lotDescription}
                </Text>
                <Text style={[styles.tableCol, styles.colHSN, styles.centerAlign]}>{item.hsnSac}</Text>
                <Text style={[styles.tableCol, styles.colQuantity, styles.rightAlign]}>{item.quantity.toFixed(4)}</Text>
                <Text style={[styles.tableCol, styles.colRate, styles.rightAlign]}>{item.rate.toFixed(2)}</Text>
                <Text style={[styles.tableCol, styles.colPer, styles.centerAlign]}>{item.per}</Text>
                <Text style={[styles.tableCol, styles.colDisc, styles.centerAlign]}>{item.discount}</Text>
                <Text style={[styles.tableCol, styles.colAmount, styles.rightAlign]}>{item.amount.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          {/* Total Row */}
          <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
            <Text style={[styles.tableCol, styles.colSerial]}></Text>
            <Text style={[styles.tableCol, styles.colPkgs]}></Text>
            <Text style={[styles.tableCol, styles.colDescription]}></Text>
            <Text style={[styles.tableCol, styles.colHSN]}></Text>
            <Text style={[styles.tableCol, styles.colQuantity, styles.rightAlign, styles.boldText]}>
              {totalQuantity.toFixed(4)} Kgs
            </Text>
            <Text style={[styles.tableCol, styles.colRate]}></Text>
            <Text style={[styles.tableCol, styles.colPer]}></Text>
            <Text style={[styles.tableCol, styles.colDisc]}></Text>
            <Text style={[styles.tableCol, styles.colAmount, styles.rightAlign, styles.boldText]}>
              ₹ {totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Total Amount and Tax Table */}
        <View style={{ marginTop: 10 }}>
          {/* Total Amount Row */}
          <View style={styles.row}>
            <Text style={{ width: '60%' }}></Text>
            <Text style={[styles.boldText, { width: '15%' }]}>Total</Text>
            <Text style={[styles.boldText, { width: '25%', textAlign: 'right' }]}>
              ₹ {grandTotal.toFixed(2)}
            </Text>
          </View>

          {/* Amount in Words */}
          <View style={{ marginTop: 5 }}>
            <Text style={styles.boldText}>Amount Chargeable (in words)</Text>
            <Text>INR {amountInWords} Only</Text>
            <Text style={{ textAlign: 'right', fontSize: 8 }}>E. & O.E</Text>
          </View>

          {/* Tax Table */}
          <View style={styles.taxTable}>
            <View style={styles.taxRow}>
              <Text style={[styles.taxCol, { width: '20%' }]}>HSN/SAC</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>Taxable Value</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>CGST</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>SGST/UTGST</Text>
              <Text style={[styles.taxColLast, { width: '20%' }]}>Total</Text>
            </View>

            <View style={styles.taxRow}>
              <Text style={[styles.taxCol, { width: '20%' }]}>60063200</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>{taxableValue.toFixed(2)}</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>
                Rate: 2.5%{'\n'}
                Amount: {cgstAmount.toFixed(2)}
              </Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>
                Rate: 2.5%{'\n'}
                Amount: {sgstAmount.toFixed(2)}
              </Text>
              <Text style={[styles.taxColLast, { width: '20%' }]}>{totalTax.toFixed(2)}</Text>
            </View>

            <View style={[styles.taxRow, { backgroundColor: '#f0f0f0' }]}>
              <Text style={[styles.taxCol, { width: '20%' }]}>Total</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>{taxableValue.toFixed(2)}</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>{cgstAmount.toFixed(2)}</Text>
              <Text style={[styles.taxCol, { width: '20%' }]}>{sgstAmount.toFixed(2)}</Text>
              <Text style={[styles.taxColLast, { width: '20%' }]}>{totalTax.toFixed(2)}</Text>
            </View>
          </View>

          {/* Tax Amount in Words */}
          <View style={{ marginTop: 5 }}>
            <Text style={styles.boldText}>
              Tax Amount (in words) : INR {taxAmountInWords} Only
            </Text>
          </View>
        </View>

        {/* Bank Details */}
        <View style={styles.bankDetails}>
          <Text style={styles.boldText}>Company's Bank Details</Text>
          <Text>Acc Holder's Name : Avyaan Knitfab</Text>
          <Text>Bank Name : Punjab National Bank A/C No. 0467008700012227</Text>
          <Text>Branch & IFS Code : Wardha-442001 & PUNB0046700</Text>
        </View>

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