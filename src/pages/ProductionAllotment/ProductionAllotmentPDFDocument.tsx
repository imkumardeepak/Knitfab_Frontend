import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type {
  ProductionAllotmentResponseDto,
  MachineAllocationResponseDto,
} from '@/types/api-types';

// Register font
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 300,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 600,
    },
  ],
});

// Create styles with reduced font size
const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontFamily: 'Roboto',
    fontSize: 8, // Reduced from 10 to 8
    borderWidth: 1,
    borderColor: '#000',
  },
  header: {
    fontSize: 14, // Reduced from 16 to 14
    fontWeight: 600,
    marginBottom: 0,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  subheader: {
    fontSize: 10, // Reduced from 12 to 10
    fontWeight: 600,
    marginBottom: 0,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#000',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  column: {
    flexDirection: 'column',
  },
  label: {
    width: '25%',
    fontWeight: 500,
    borderWidth: 1,
    borderColor: '#000',
    padding: 2, // Reduced padding
  },
  value: {
    width: '25%',
    borderWidth: 1,
    borderColor: '#000',
    padding: 2, // Reduced padding
  },
  wideLabel: {
    width: '50%',
    fontWeight: 500,
    borderWidth: 1,
    borderColor: '#000',
    padding: 2, // Reduced padding
  },
  wideValue: {
    width: '50%',
    borderWidth: 1,
    borderColor: '#000',
    padding: 2, // Reduced padding
  },
  table: {
    width: '100%',
    marginVertical: 5, // Reduced margin
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '10%', // Reduced width for more columns
    borderRightWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
    padding: 1, // Reduced padding
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 7, // Smaller font for headers
  },
  tableCol: {
    width: '10%', // Reduced width for more columns
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: '#000',
    padding: 1, // Reduced padding
    textAlign: 'center',
    fontSize: 7, // Smaller font for content
  },
  footer: {
    marginTop: 10, // Reduced margin
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerSection: {
    width: '40%',
  },
  footerLabel: {
    fontWeight: 600,
    marginTop: 5, // Reduced margin
    fontSize: 8, // Consistent font size
  },
});

// ProductionAllotmentPDFDocument Component
const ProductionAllotmentPDFDocument: React.FC<{
  allotment: ProductionAllotmentResponseDto;
  machine: MachineAllocationResponseDto;
}> = ({ allotment, machine }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>AVYAAN KNITFAB</Text>
        <Text style={styles.subheader}>MACHINE WISE PRODUCTION REPORT</Text>

        {/* Header Information */}
        <View style={styles.row}>
          <Text style={styles.label}>DATE</Text>
          <Text style={styles.value}>
            {allotment.createdDate ? new Date(allotment.createdDate).toLocaleDateString() : 'N/A'}
          </Text>
          <Text style={styles.label}>FABRIC LOT NO</Text>
          <Text style={styles.value}>{allotment.allotmentId || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>YARN COUNT</Text>
          <Text style={styles.value}>{allotment.yarnCount || 'N/A'}</Text>
          <Text style={styles.label}>PARTY NAME</Text>
          <Text style={styles.value}>{allotment.partyName || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>YARN LOT NO</Text>
          <Text style={styles.value}>{allotment.yarnLotNo || 'N/A'}</Text>
          <Text style={styles.label}>MIC RPM</Text>
          <Text style={styles.value}>{machine.rpm || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>S. LINE</Text>
          <Text style={styles.value}>{allotment.slitLine || 'N/A'}</Text>
          <Text style={styles.label}>COUNTER</Text>
          <Text style={styles.value}>{allotment.counter || 'N/A'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>D'/GG</Text>
          <Text
            style={styles.value}
          >{`${allotment.diameter || 'N/A'}"/${allotment.gauge || 'N/A'}`}</Text>
          <Text style={styles.label}>ROLL WT.</Text>
          <Text style={styles.value}>
            {machine.rollPerKg ? machine.rollPerKg.toFixed(2) : 'N/A'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>S/L</Text>
          <Text style={styles.value}>{allotment.stitchLength || 'N/A'}</Text>
          <Text style={styles.label}>M/C NO.</Text>
          <Text style={[styles.value, { fontWeight: 600 }]}>{machine.machineName || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>FABRIC STRUCTURE</Text>
          <Text style={styles.value}>{allotment.fabricType || 'N/A'}</Text>
          <Text style={styles.label}>COMPOSITION</Text>
          <Text style={styles.value}>{allotment.composition || 'N/A'}</Text>
        </View>

        {/* Shift A+B Table - 20 rows */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>SR.</Text>
            <Text style={styles.tableColHeader}>SHIFT</Text>
            <Text style={styles.tableColHeader}>ROLL</Text>
            <Text style={styles.tableColHeader}>WT</Text>
            <Text style={styles.tableColHeader}>FFD</Text>
            <Text style={styles.tableColHeader}>LYCRA</Text>
            <Text style={styles.tableColHeader}>NEEDLE</Text>
            <Text style={styles.tableColHeader}>OIL</Text>
            <Text style={styles.tableColHeader}>DROP</Text>
            <Text style={[styles.tableColHeader, { borderRightWidth: 0 }]}>REMARK</Text>
          </View>

          {Array.from({ length: 20 }).map((_, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol}>{index + 1}</Text>
              <Text style={styles.tableCol}>A+B</Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={[styles.tableCol, { borderRightWidth: 0 }]}></Text>
            </View>
          ))}
        </View>

        {/* Shift B+C Table - 20 rows */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>SR.</Text>
            <Text style={styles.tableColHeader}>SHIFT</Text>
            <Text style={styles.tableColHeader}>ROLL</Text>
            <Text style={styles.tableColHeader}>WT</Text>
            <Text style={styles.tableColHeader}>FFD</Text>
            <Text style={styles.tableColHeader}>LYCRA</Text>
            <Text style={styles.tableColHeader}>NEEDLE</Text>
            <Text style={styles.tableColHeader}>OIL</Text>
            <Text style={styles.tableColHeader}>DROP</Text>
            <Text style={[styles.tableColHeader, { borderRightWidth: 0 }]}>REMARK</Text>
          </View>

          {Array.from({ length: 20 }).map((_, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCol}>{index + 1}</Text>
              <Text style={styles.tableCol}>B+C</Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={styles.tableCol}></Text>
              <Text style={[styles.tableCol, { borderRightWidth: 0 }]}></Text>
            </View>
          ))}
        </View>

        {/* Footer Signatures */}
        <View style={styles.footer}>
          <View style={styles.footerSection}>
            <Text style={styles.footerLabel}>SHIFT OFFICER</Text>
          </View>
          <View style={styles.footerSection}>
            <Text style={styles.footerLabel}>PRODUCTION MANAGER</Text>
          </View>
        </View>

        <Text style={{ fontSize: 6, textAlign: 'center', marginTop: 5 }}>
          Generated by Avyaan Knitfab System - {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
};

export default ProductionAllotmentPDFDocument;