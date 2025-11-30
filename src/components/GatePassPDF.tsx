import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DispatchPlanningDto } from '@/types/api-types';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    marginVertical: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    width: 120,
  },
  table: {
    width: '100%',
    marginTop: 10,
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
  },
  tableColHeader: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  tableCol: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  tableCellHeader: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tableCell: {
    textAlign: 'center',
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
        <View style={styles.header}>
          <Text style={styles.title}>GATE PASS</Text>
          <Text>Dispatch Order ID: {gatePassData.dispatchOrderId}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Customer Name:</Text>
            <Text>{gatePassData.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Dispatch Date:</Text>
            <Text>{new Date(gatePassData.dispatchDate).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>LOT DETAILS</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableColHeader]}>Lot No</Text>
              <Text style={[styles.tableColHeader]}>Sales Order</Text>
              <Text style={[styles.tableColHeader]}>Fabric</Text>
              <Text style={[styles.tableColHeader]}>Gross Weight (kg)</Text>
              <Text style={[styles.tableColHeader]}>Net Weight (kg)</Text>
            </View>
            {gatePassData.lots.map((lot, index) => (
              <View style={styles.tableRow} key={index}>
                <Text style={styles.tableCol}>{lot.lotNo}</Text>
                <Text style={styles.tableCol}>{lot.salesOrderId}</Text>
                <Text style={styles.tableCol}>{lot.tape}</Text>
                <Text style={styles.tableCol}>{(lot.totalGrossWeight || 0).toFixed(2)}</Text>
                <Text style={styles.tableCol}>{(lot.totalNetWeight || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Total Gross Weight:</Text>
            <Text>{gatePassData.totalGrossWeight.toFixed(2)} kg</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Net Weight:</Text>
            <Text>{gatePassData.totalNetWeight.toFixed(2)} kg</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</Text>
          <Text>Avyaan Knitfab - Gate Pass Document</Text>
        </View>
      </Page>
    </Document>
  );
};

export default GatePassPDF;