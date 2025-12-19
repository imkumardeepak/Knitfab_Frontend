import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DispatchPlanningDto } from '@/types/api-types';

// Optimized styles for compact layout
const styles = StyleSheet.create({
  page: {
    padding: 20, // Reduced from 30
    fontSize: 9,  // Slightly smaller base font
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 11,
    fontWeight: 'bold' as const,
  },
  section: {
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 10,
  },
  label: {
    fontWeight: 'bold' as const,
    width: 100, // Reduced from 120
    marginRight: 10,
  },
  value: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#999',
  },
  table: {
    width: '100%',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e6e6e6',
    fontSize: 9,
    fontWeight: 'bold' as const,
  },
  tableRow: {
    flexDirection: 'row',
    fontSize: 8.5, // Smaller text in table rows
    minHeight: 20,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f9f9f9',
  },
  // Column widths optimized for content
  colLot: { width: '32%' },
  colSO: { width: '17%' },
  colFabric: { width: '17%' },
  colGross: { width: '17%' },
  colNet: { width: '17%' },

  cell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
    textAlign: 'center' as const,
  },
  cellHeader: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#000',
    textAlign: 'center' as const,
  },
  cellNoBorder: {
    borderRightWidth: 0,
  },
  totals: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 30,
    fontSize: 11,
    fontWeight: 'bold' as const,
  },
footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    textAlign: 'center',
    fontSize: 8,
  },
});


interface GatePassData {
  dispatchOrderId: string;
  customerName: string;
  dispatchDate: string;
  lots: DispatchPlanningDto[];
  totalGrossWeight: number;
  totalNetWeight: number;
}

const GatePassPDF = ({ gatePassData }: { gatePassData: GatePassData }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>GATE PASS</Text>
          <Text style={styles.orderId}>Dispatch Order ID: {gatePassData.dispatchOrderId}</Text>
        </View>

        {/* Customer & Date */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{gatePassData.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dispatch Date:</Text>
            <Text style={styles.value}>
              {new Date(gatePassData.dispatchDate).toLocaleDateString('en-GB')}
            </Text>
          </View>
        </View>

        {/* Lot Details Table */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>LOT DETAILS</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.cellHeader, styles.colLot]}>Lot No</Text>
              <Text style={[styles.cellHeader, styles.colSO]}>Sales Order</Text>
              <Text style={[styles.cellHeader, styles.colFabric]}>Fabric</Text>
              <Text style={[styles.cellHeader, styles.colGross]}>Gross Wt (kg)</Text>
              <Text style={[styles.cellHeader, styles.colNet, styles.cellNoBorder]}>Net Wt (kg)</Text>
            </View>

            {/* Table Rows */}
            {gatePassData.lots.map((lot, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? { backgroundColor: '#f9f9f9' } : {}, // Light zebra striping
                ]}
              >
                <Text style={[styles.cell, styles.colLot]}>{lot.lotNo}</Text>
                <Text style={[styles.cell, styles.colSO]}>{lot.salesOrderId}</Text>
                <Text style={[styles.cell, styles.colFabric]}>{lot.tape}</Text>
                <Text style={[styles.cell, styles.colGross]}>{(lot.totalGrossWeight || 0).toFixed(2)}</Text>
                <Text style={[styles.cell, styles.colNet, styles.cellNoBorder]}>
                  {(lot.totalNetWeight || 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <Text>Total Gross: {gatePassData.totalGrossWeight.toFixed(2)} kg</Text>
          <Text>Total Net: {gatePassData.totalNetWeight.toFixed(2)} kg</Text>
        </View>

        {/* Footer (fixed position) */}
        <View style={styles.footer} fixed>
          <Text>Generated on {new Date().toLocaleString()}</Text>
          <Text>Avyaan Knitfab - Gate Pass Document</Text>
        </View>
      </Page>
    </Document>
  );
};

export default GatePassPDF;