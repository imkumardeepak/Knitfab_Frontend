import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DispatchPlanningDto, SalesOrderDto } from '@/types/api-types';

// Create enhanced styles for better data presentation
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  companyInfo: {
    width: '50%',
  },
  buyerInfo: {
    width: '50%',
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
  label: {
    fontWeight: 'bold',
    width: 100,
  },
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
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableCol: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    borderRightStyle: 'solid',
    fontSize: 8,
  },
  lastTableCol: {
    padding: 3,
    borderRightWidth: 0,
  },
  rightAlign: {
    textAlign: 'right',
  },
  centerAlign: {
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 5,
    fontSize: 8,
  },
  // Invoice-specific styles
  invoiceHeader: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  addressBlock: {
    fontSize: 8,
    marginBottom: 5,
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
    width: 80,
  },
  value: {
    flex: 1,
  },
  smallText: {
    fontSize: 7,
  },
  boldText: {
    fontWeight: 'bold',
  },
  // Enhanced column widths for better data presentation
  colSerial: { width: '4%' },
  colDescription: { width: '25%' },
  colHSN: { width: '8%' },
  colQuantity: { width: '8%' },
  colRate: { width: '8%' },
  colPer: { width: '5%' },
  colDisc: { width: '5%' },
  colAmount: { width: '10%' },
  colPkgs: { width: '8%' },
  colLotNo: { width: '8%' },
  colGrossWeight: { width: '6%' },
  colNetWeight: { width: '6%' },
  // Tax table styles
  taxTable: {
    width: '60%',
    marginLeft: 'auto',
    marginTop: 10,
  },
  taxRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  taxCol: {
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    fontSize: 8,
  },
  taxColLast: {
    padding: 3,
    borderRightWidth: 0,
  },
  // Lot details table styles
  lotDetailsTable: {
    width: '100%',
    marginTop: 2,
    marginBottom: 5,
  },
  lotDetailsHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    borderBottomStyle: 'solid',
    fontWeight: 'bold',
  },
  lotDetailsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderBottomStyle: 'solid',
  },
  lotDetailsColHeader: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#999',
    borderRightStyle: 'solid',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 7,
  },
  lotDetailsCol: {
    padding: 2,
    borderRightWidth: 1,
    borderRightColor: '#eee',
    borderRightStyle: 'solid',
    fontSize: 7,
  },
  lotDetailsLastCol: {
    padding: 2,
    borderRightWidth: 0,
  },
  lotColLotNo: { width: '15%' },
  lotColDescription: { width: '25%' },
  lotColRolls: { width: '10%' },
  lotColGrossWeight: { width: '15%' },
  lotColNetWeight: { width: '15%' },
  lotColRate: { width: '10%' },
  lotColAmount: { width: '10%' },
});

// Helper function to parse rate as number
const parseRate = (rate: string): number => {
  if (!rate) return 0;
  // Remove any non-numeric characters except decimal point
  const cleanedRate = rate.replace(/[^\d.]/g, '');
  return parseFloat(cleanedRate) || 0;
};

// Helper function to calculate total amount
const calculateTotalAmount = (rate: number, quantity: number): number => {
  return rate * quantity;
};

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
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
  salesOrders: Record<number, SalesOrderDto>;
  totalGrossWeight: number;
  totalNetWeight: number;
}

// Interface for invoice items matching PDF structure
interface InvoiceItem {
  slNo: number;
  pkgs: string;
  description: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  per: string;
  discount: string;
  amount: number;
  lotDetails: {
    lotNo: string;
    description: string;
    rolls: number;
    grossWeight: number | null;
    netWeight: number | null;
  }[];
}

const InvoicePDF: React.FC<{ invoiceData: InvoiceData }> = ({ invoiceData }) => {
  // Create invoice items in the exact format as the PDF
  const invoiceItems: InvoiceItem[] = [];

  // Process lots to create invoice items
  invoiceData.lots.forEach((lot, index) => {
    const salesOrder = invoiceData.salesOrders[lot.salesOrderId];
    const salesOrderItem = salesOrder?.items?.find(
      (item) => item.salesOrderId === lot.salesOrderId
    );

    if (salesOrderItem) {
      const rate = parseRate(salesOrderItem.rate);
      const amount = calculateTotalAmount(rate, lot.totalNetWeight || 0);

      // Extract fabric type and details from stock item name and descriptions
      const fabricType = salesOrderItem.stockItemName || 'N/A';
      const descriptions = salesOrderItem.descriptions || '';

      // Create main description similar to PDF format
      const mainDescription = `${fabricType}\nFabric - ${descriptions}`;

      invoiceItems.push({
        slNo: index + 1,
        pkgs: `${lot.totalDispatchedRolls} Roll`,
        description: mainDescription,
        hsnSac: '60063200',
        quantity: lot.totalNetWeight || 0,
        rate: rate,
        per: 'Kgs',
        discount: '',
        amount: amount,
        lotDetails: [
          {
            lotNo: lot.lotNo,
            description: `HO/${lot.lotNo} GSM :- Lot No:-${lot.lotNo}`,
            rolls: lot.totalDispatchedRolls,
            grossWeight: lot.totalGrossWeight || null,
            netWeight: lot.totalNetWeight || null,
          },
        ],
      });
    }
  });

  // Calculate totals
  const totalQuantity = invoiceItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

  // Tax calculation (as per PDF: 2.5% CGST + 2.5% SGST)
  const taxableValue = totalAmount;
  const cgstRate = 2.5;
  const sgstRate = 2.5;
  const cgstAmount = (taxableValue * cgstRate) / 100;
  const sgstAmount = (taxableValue * sgstRate) / 100;
  const totalTax = cgstAmount + sgstAmount;

  // Get company and buyer info
  const buyerName = invoiceData.customerName;

  // Format date
  const invoiceDate = new Date(invoiceData.dispatchDate);
  const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  // Get first sales order for voucher information
  const firstSalesOrder = Object.values(invoiceData.salesOrders)[0];
  
  // Convert amounts to words
  const amountInWords = numberToWords(Math.round(totalAmount));
  const taxAmountInWords = numberToWords(Math.round(totalTax));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.invoiceHeader}>Tax Invoice</Text>

        {/* IRN and Ack Details */}
        <View style={styles.row}>
          {firstSalesOrder ? (
            <Text>Voucher No: {firstSalesOrder.voucherNumber}</Text>
          ) : (
            <Text>Voucher No: N/A</Text>
          )}
          <Text style={{ marginLeft: 20 }}>Ack No. : N/A</Text>
          <Text style={{ marginLeft: 20 }}>Ack Date : {formattedDate}</Text>
        </View>

        <View style={{ borderBottomWidth: 1, borderBottomColor: '#000', marginVertical: 5 }}></View>

        {/* Company and Buyer Information */}
        <View style={styles.headerSection}>
          <View style={styles.companyInfo}>
            <Text style={styles.addressBlock}>
              <Text style={styles.boldText}>Avyaan Knitfab</Text>
              {'\n'}
              Factory: Survey No.547-551/1, Wajgaon-Deoli Highway,{'\n'}
              At:-Wajgaon(NI) Dist:-Wardha-442001{'\n'}
              <Text style={styles.gstin}>GSTIN/UIN: 27ABYFA2736N1ZO</Text>
              {'\n'}
              State Name : Maharashtra, Code : 27{'\n'}
              E-Mail : info@avyaanknitfab.com
            </Text>
          </View>

          <View style={styles.buyerInfo}>
            <Text style={styles.addressBlock}>
              <Text style={styles.boldText}>Buyer (Bill to)</Text>
              {'\n'}
              <Text style={styles.boldText}>{buyerName}</Text>
              {'\n'}
              {firstSalesOrder?.buyerAddress ? firstSalesOrder.buyerAddress : 'N/A'}
              {'\n'}
              <Text style={styles.gstin}>GSTIN/UIN : 27AABCP7263L1ZO</Text>
              {'\n'}
              State Name : Maharashtra, Code : 27
            </Text>
          </View>
        </View>

        {/* Invoice Details Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, styles.colSerial]}>SR No</Text>
            <Text style={[styles.tableColHeader, styles.colPkgs]}>Packages</Text>
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
              {/* Main Item Row */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.colSerial]}>{item.slNo}</Text>
                <Text style={[styles.tableCol, styles.colPkgs]}>{item.pkgs}</Text>
                <Text style={[styles.tableCol, styles.colDescription]}>
                  <Text style={styles.boldText}>{item.description.split('\n')[0]}</Text>
                  {'\n'}
                  {item.description.split('\n').slice(1).join('\n')}
                </Text>
                <Text style={[styles.tableCol, styles.colHSN, styles.centerAlign]}>
                  {item.hsnSac}
                </Text>
                <Text style={[styles.tableCol, styles.colQuantity, styles.rightAlign]}>
                  {item.quantity.toFixed(4)}
                </Text>
                <Text style={[styles.tableCol, styles.colRate, styles.rightAlign]}>
                  {item.rate.toFixed(2)}
                </Text>
                <Text style={[styles.tableCol, styles.colPer, styles.centerAlign]}>{item.per}</Text>
                <Text style={[styles.tableCol, styles.colDisc, styles.centerAlign]}>
                  {item.discount}
                </Text>
                <Text style={[styles.tableCol, styles.colAmount, styles.rightAlign]}>
                  {item.amount.toFixed(2)}
                </Text>
              </View>

              {/* Enhanced Lot Details Table */}
              <View style={styles.lotDetailsTable}>
                <View style={styles.lotDetailsHeader}>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColLotNo]}>Lot No</Text>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColDescription]}>Description</Text>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColRolls]}>Rolls</Text>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColGrossWeight]}>Gross Wt</Text>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColNetWeight]}>Net Wt</Text>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColRate]}>Rate</Text>
                  <Text style={[styles.lotDetailsColHeader, styles.lotColAmount]}>Amount</Text>
                </View>
                
                {item.lotDetails.map((lot, lotIndex) => (
                  <View key={lotIndex} style={styles.lotDetailsRow}>
                    <Text style={[styles.lotDetailsCol, styles.lotColLotNo]}>{lot.lotNo}</Text>
                    <Text style={[styles.lotDetailsCol, styles.lotColDescription]}>{lot.description}</Text>
                    <Text style={[styles.lotDetailsCol, styles.lotColRolls, styles.centerAlign]}>{lot.rolls}</Text>
                    <Text style={[styles.lotDetailsCol, styles.lotColGrossWeight, styles.rightAlign]}>
                      {lot.grossWeight !== null ? lot.grossWeight.toFixed(4) : 'N/A'}
                    </Text>
                    <Text style={[styles.lotDetailsCol, styles.lotColNetWeight, styles.rightAlign]}>
                      {lot.netWeight !== null ? lot.netWeight.toFixed(4) : 'N/A'}
                    </Text>
                    <Text style={[styles.lotDetailsCol, styles.lotColRate, styles.rightAlign]}>
                      {item.rate.toFixed(2)}
                    </Text>
                    <Text style={[styles.lotDetailsCol, styles.lotColAmount, styles.rightAlign]}>
                      {calculateTotalAmount(item.rate, lot.netWeight || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Total Row */}
          <View style={[styles.tableRow, { backgroundColor: '#f0f0f0' }]}>
            <Text style={[styles.tableCol, styles.colSerial]}></Text>
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

        {/* Total Amount in Words */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.boldText}>Amount Chargeable (in words)</Text>
          <Text>INR {amountInWords} Only</Text>
          <Text style={{ textAlign: 'right', fontSize: 8 }}>E. & O.E</Text>
        </View>

        {/* Tax Table */}
        <View style={styles.taxTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableColHeader, { width: '25%' }]}>HSN/SAC</Text>
            <Text style={[styles.tableColHeader, { width: '25%' }]}>Taxable Value</Text>
            <Text style={[styles.tableColHeader, { width: '25%' }]}>CGST</Text>
            <Text style={[styles.tableColHeader, { width: '25%' }]}>SGST/UTGST</Text>
            <Text style={[styles.tableColHeader, { width: '25%' }]}>Total</Text>
          </View>

          <View style={styles.taxRow}>
            <Text style={[styles.taxCol, { width: '25%' }]}>60063200</Text>
            <Text style={[styles.taxCol, { width: '25%' }]}>{taxableValue.toFixed(2)}</Text>
            <Text style={[styles.taxCol, { width: '25%' }]}>
              Rate: {cgstRate}%{'\n'}
              Amount: {cgstAmount.toFixed(2)}
            </Text>
            <Text style={[styles.taxCol, { width: '25%' }]}>
              Rate: {sgstRate}%{'\n'}
              Amount: {sgstAmount.toFixed(2)}
            </Text>
            <Text style={[styles.taxColLast, { width: '25%' }]}>{totalTax.toFixed(2)}</Text>
          </View>

          <View style={[styles.taxRow, { backgroundColor: '#f0f0f0' }]}>
            <Text style={[styles.taxCol, { width: '25%' }]}>Total</Text>
            <Text style={[styles.taxCol, { width: '25%' }]}>{taxableValue.toFixed(2)}</Text>
            <Text style={[styles.taxCol, { width: '25%' }]}>{cgstAmount.toFixed(2)}</Text>
            <Text style={[styles.taxCol, { width: '25%' }]}>{sgstAmount.toFixed(2)}</Text>
            <Text style={[styles.taxColLast, { width: '25%' }]}>{totalTax.toFixed(2)}</Text>
          </View>
        </View>

        {/* Tax Amount in Words */}
        <View style={{ marginTop: 5 }}>
          <Text style={styles.boldText}>
            Tax Amount (in words) : INR {taxAmountInWords} Only
          </Text>
        </View>

        {/* Bank Details */}
        <View style={{ marginTop: 10, fontSize: 8 }}>
          <Text style={styles.boldText}>Company's Bank Details</Text>
          <Text>Acc Holder's Name : Avyaan Knitfab</Text>
          <Text>Bank Name : Punjab National Bank A/C No. 0467008700012227</Text>
          <Text>Branch & IFS Code : Wardha-442001 & PUNB0046700</Text>
        </View>

        {/* Remarks and Declaration */}
        <View style={{ marginTop: 10, fontSize: 8 }}>
          <Text>
            <Text style={styles.boldText}>Remarks:</Text> Being sale of knitted fabric
          </Text>
          <Text style={styles.boldText}>Declaration for Avyaan Knitfab</Text>
          <Text>
            We declare that this invoice shows the actual price of the goods described and that all
            particulars are true and correct.
          </Text>
          <Text style={{ textAlign: 'right', marginTop: 20 }}>Authorised Signatory</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a Computer Generated Invoice</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;