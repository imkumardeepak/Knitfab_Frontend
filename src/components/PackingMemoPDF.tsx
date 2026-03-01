import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// Create styles for a more compact, Excel-like format
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 15,
    fontFamily: 'Helvetica',
    fontSize: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  logo: {
    width: 40,
    height: 40,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 6,
    textAlign: 'center',
    marginBottom: 1,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 3,
  },
  section: {
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    fontSize: 7,
    fontWeight: 'bold',
    width: 70,
  },
  value: {
    fontSize: 7,
    flex: 1,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderColor: '#000',
    borderWidth: 1,
    marginTop: 5,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCol: {
    borderStyle: 'solid',
    borderColor: '#000',
    borderWidth: 0.5,
    padding: 2,
    fontSize: 7,
  },
  tableHeader: {
    backgroundColor: '#e0e0e0',
    fontWeight: 'bold',
    fontSize: 7,
    textAlign: 'center',
  },
  footer: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureSection: {
    textAlign: 'center',
    width: '30%',
  },
  signatureLine: {
    marginTop: 15,
    width: 100,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
  },

  spacer: {
    width: 5,
  }
  ,
  // Address section styles
  addressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    marginBottom: 5,
  },
  addressColumn: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    padding: 3,
  },
  addressTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
    textDecoration: 'underline',
  },
  addressText: {
    fontSize: 6,
    marginBottom: 1,
    lineHeight: 1.1,
  },
  // Compact info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  infoBox: {
    width: '32%',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'solid',
    padding: 2,
    borderRadius: 1,
  },
  infoLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 7,
    fontWeight: 'bold',
  },
  // Center align for table
  centerAlign: {
    textAlign: 'center',
  },
  rightAlign: {
    textAlign: 'right',
  },
  // Border styles for better Excel-like appearance
  borderRight: {
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  borderBottom: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  // Compact table styles
  compactTable: {
    width: '100%',
    borderStyle: 'solid',
    borderColor: '#000',
    borderWidth: 1,
  },
  compactTableRow: {
    flexDirection: 'row',
  },
  compactTableHeader: {
    backgroundColor: '#d0d0d0',
    fontWeight: 'bold',
    fontSize: 7,
  },
  compactTableCol: {
    borderStyle: 'solid',
    borderColor: '#000',
    borderWidth: 0.5,
    padding: 1.5,
    fontSize: 6.5,
    textAlign: 'center',
  },
});

interface PackingMemoProps {
  dispatchOrderId: string;
  loadingNo?: string; // Add loadingNo field
  customerName: string;
  dispatchDate: string;
  lotNumber: string;
  vehicleNumber: string;
  packingDetails: {
    srNo: number;
    psNo: number;
    netWeight: number;
    grossWeight: number;
    machineName?: string;
    mcRollNo?: string;
  }[];
  totalNetWeight: number;
  totalGrossWeight: number;
  remarks?: string;
  billToAddress?: string;
  shipToAddress?: string;
  lotDetails?: Record<string, {
    tapeColor: string;
    fabricType: string;
    composition: string;
    diameter: number;
    gauge: number;
    polybagColor: string;
    stitchLength: string | number;
    orderNo?: string;
    itemName?: string; // Added itemName
  }>;
  companyName?: string;
  companyGSTIN?: string;
  companyState?: string;
  showMachineName?: boolean;
}

const PackingMemoPDF = ({
  dispatchOrderId,
  loadingNo,
  customerName,
  dispatchDate,
  lotNumber,
  vehicleNumber,
  packingDetails,
  totalNetWeight,
  totalGrossWeight,
  remarks,
  billToAddress,
  shipToAddress,
  lotDetails,
  companyName = 'AVYAAN KNITFAB',
  companyGSTIN = '27ABYFA2736N1ZD',
  companyState = 'Maharashtra',
  showMachineName = false,
}: PackingMemoProps) => {
  // Ensure packingDetails is an array
  const safePackingDetails = Array.isArray(packingDetails) ? packingDetails : [];

  // Ensure weights are numbers
  const safeTotalNetWeight = typeof totalNetWeight === 'number' ? totalNetWeight : 0;
  const safeTotalGrossWeight = typeof totalGrossWeight === 'number' ? totalGrossWeight : 0;

  // Ensure lotDetails is an object
  const safeLotDetails = lotDetails && typeof lotDetails === 'object' ? lotDetails : {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {/* Placeholder for company logo */}
            <Image
              src="https://via.placeholder.com/40x40"
              style={styles.logo}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyAddress}>
              Sr.No.547-551/1, At.Waigaoon-Deoli State Highway, Waigaon (M), Wardha-442001, {companyState}
            </Text>
            <Text style={styles.companyAddress}>
              GSTIN: {companyGSTIN}
            </Text>
          </View>
          <View style={{ width: 40 }}></View>
        </View>

        <Text style={styles.title}>PACKING MEMO</Text>

        {/* Summary Information in Grid Format */}
        <View style={styles.compactTable}>
          <View style={[styles.compactTableRow, styles.compactTableHeader]}>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>Loading Sheet No</Text>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>Dispatch Order ID</Text>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>Date</Text>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>Vehicle No.</Text>
          </View>
          <View style={styles.compactTableRow}>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>{loadingNo || 'N/A'}</Text>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>{dispatchOrderId}</Text>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>{dispatchDate}</Text>
            <Text style={[styles.compactTableCol, { width: '25%' }]}>{vehicleNumber}</Text>
          </View>
        </View>

        <View style={[styles.compactTable, { marginTop: 3 }]}>
          <View style={[styles.compactTableRow, styles.compactTableHeader]}>
            <Text style={[styles.compactTableCol, { width: '33.33%' }]}>Total Net Weight (kg)</Text>
            <Text style={[styles.compactTableCol, { width: '33.33%' }]}>Gross Weight (kg)</Text>
            <Text style={[styles.compactTableCol, { width: '33.33%' }]}>No. of Packages</Text>
          </View>
          <View style={styles.compactTableRow}>
            <Text style={[styles.compactTableCol, { width: '33.33%' }]}>{safeTotalNetWeight.toFixed(2)}</Text>
            <Text style={[styles.compactTableCol, { width: '33.33%' }]}>{safeTotalGrossWeight.toFixed(2)}</Text>
            <Text style={[styles.compactTableCol, { width: '33.33%' }]}>{safePackingDetails.length}</Text>
          </View>
        </View>

        {/* Lot Details Section - Improved Card Layout */}
        <View style={{ marginTop: 5 }}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2 }}>Lot Details</Text>
          {Object.entries(safeLotDetails).map(([lotNo, details]) => (
            <View key={lotNo} style={{ border: '1px solid #000', marginBottom: 4 }}>
              {/* Header Row */}
              <View style={{ flexDirection: 'row', backgroundColor: '#e0e0e0', borderBottom: '1px solid #000', padding: 2 }}>
                <View style={{ width: '25%' }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>LOT NO</Text>
                  <Text style={{ fontSize: 8, fontWeight: 'bold' }}>{lotNo}</Text>
                </View>
                <View style={{ width: '50%', borderLeft: '1px solid #000', paddingLeft: 4 }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>ITEM NAME</Text>
                  <Text style={{ fontSize: 7 }}>{details.itemName || '-'}</Text>
                </View>
                <View style={{ width: '25%', borderLeft: '1px solid #000', paddingLeft: 4 }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>ORDER NO</Text>
                  <Text style={{ fontSize: 7 }}>{details.orderNo || '-'}</Text>
                </View>
              </View>

              {/* Specs Row */}
              <View style={{ flexDirection: 'row', padding: 2, borderBottom: '1px dotted #999' }}>
                <View style={{ width: '50%' }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>FABRIC DETAILS</Text>
                  <Text style={{ fontSize: 7 }}>{details.fabricType} - {details.composition}</Text>
                </View>
                <View style={{ width: '25%', borderLeft: '1px dotted #999', paddingLeft: 4 }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>DIA x GG</Text>
                  <Text style={{ fontSize: 7 }}>{details.diameter} x {details.gauge}</Text>
                </View>
                <View style={{ width: '25%', borderLeft: '1px dotted #999', paddingLeft: 4 }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>STITCH LEN</Text>
                  <Text style={{ fontSize: 7 }}>{details.stitchLength}</Text>
                </View>
              </View>

              {/* Extras Row */}
              <View style={{ flexDirection: 'row', padding: 2 }}>
                <View style={{ width: '50%' }}>
                  <Text style={{ fontSize: 6, fontWeight: 'bold' }}>PACKING SPECS</Text>
                  <Text style={{ fontSize: 7 }}>Tape: {details.tapeColor} | Polybag: {details.polybagColor}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        {/* Bill To and Ship To Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressColumn}>
            <Text style={styles.addressTitle}>BILL TO:</Text>
            <Text style={styles.addressText}>{customerName}</Text>
            {billToAddress ? (
              billToAddress.split('\n').map((line, index) => (
                <Text key={index} style={styles.addressText}>{line}</Text>
              ))
            ) : (
              <Text style={styles.addressText}>N/A</Text>
            )}
          </View>
          <View style={styles.addressColumn}>
            <Text style={styles.addressTitle}>SHIP TO:</Text>
            <Text style={styles.addressText}>{customerName}</Text>
            {shipToAddress ? (
              shipToAddress.split('\n').map((line, index) => (
                <Text key={index} style={styles.addressText}>{line}</Text>
              ))
            ) : (
              <Text style={styles.addressText}>Same as Bill To</Text>
            )}
          </View>
        </View>

        {/* Lot Details Section */}


        {/* Packing Details Table - Excel-like format */}
        <View style={styles.compactTable}>
          <View style={[styles.compactTableRow, styles.compactTableHeader]}>
            {showMachineName ? (
              <>
                <Text style={[styles.compactTableCol, { width: '5%' }]}>Sr No.</Text>
                <Text style={[styles.compactTableCol, { width: '7%' }]}>P.S. No.</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Mc Roll No.</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Machine</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Net Wt (kg)</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Gross Wt (kg)</Text>
              </>
            ) : (
              <>
                <Text style={[styles.compactTableCol, { width: '10%' }]}>Sr No.</Text>
                <Text style={[styles.compactTableCol, { width: '15%' }]}>P.S. No.</Text>
                <Text style={[styles.compactTableCol, { width: '20%' }]}>Net Wt (kg)</Text>
                <Text style={[styles.compactTableCol, { width: '20%' }]}>Gross Wt (kg)</Text>
              </>
            )}

            {/* Second set of headers for side-by-side display */}
            <View style={styles.spacer} />

            {showMachineName ? (
              <>
                <Text style={[styles.compactTableCol, { width: '5%' }]}>Sr No.</Text>
                <Text style={[styles.compactTableCol, { width: '7%' }]}>P.S. No.</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Mc Roll No.</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Machine</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Net Wt (kg)</Text>
                <Text style={[styles.compactTableCol, { width: '9%' }]}>Gross Wt (kg)</Text>
              </>
            ) : (
              <>
                <Text style={[styles.compactTableCol, { width: '10%' }]}>Sr No.</Text>
                <Text style={[styles.compactTableCol, { width: '15%' }]}>P.S. No.</Text>
                <Text style={[styles.compactTableCol, { width: '20%' }]}>Net Wt (kg)</Text>
                <Text style={[styles.compactTableCol, { width: '20%' }]}>Gross Wt (kg)</Text>
              </>
            )}
          </View>

          {/* Render items in two vertical columns - first half on left, second half on right */}
          {Array.from({ length: Math.ceil(safePackingDetails.length / 2) }).map((_, rowIndex) => {
            const firstItem = safePackingDetails[rowIndex];
            const secondItem = safePackingDetails[rowIndex + Math.ceil(safePackingDetails.length / 2)];

            return (
              <View key={rowIndex} style={styles.compactTableRow}>
                {/* First item in the left column */}
                {firstItem ? (
                  showMachineName ? (
                    <>
                      <Text style={[styles.compactTableCol, { width: '5%' }]}>{firstItem.srNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '7%' }]}>{firstItem.psNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{firstItem.mcRollNo || '-'}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{firstItem.machineName || '-'}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{firstItem.netWeight.toFixed(2)}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{firstItem.grossWeight.toFixed(2)}</Text>
                      <View style={styles.spacer} />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.compactTableCol, { width: '10%' }]}>{firstItem.srNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '15%' }]}>{firstItem.psNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}>{firstItem.netWeight.toFixed(2)}</Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}>{firstItem.grossWeight.toFixed(2)}</Text>
                      <View style={styles.spacer} />
                    </>
                  )
                ) : (
                  showMachineName ? (
                    <>
                      <Text style={[styles.compactTableCol, { width: '5%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '7%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <View style={styles.spacer} />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.compactTableCol, { width: '10%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '15%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}></Text>
                      <View style={styles.spacer} />
                    </>
                  )
                )}

                {/* Second item in the right column */}
                {secondItem ? (
                  showMachineName ? (
                    <>
                      <Text style={[styles.compactTableCol, { width: '5%' }]}>{secondItem.srNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '7%' }]}>{secondItem.psNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{secondItem.mcRollNo || '-'}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{secondItem.machineName || '-'}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{secondItem.netWeight.toFixed(2)}</Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}>{secondItem.grossWeight.toFixed(2)}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.compactTableCol, { width: '10%' }]}>{secondItem.srNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '15%' }]}>{secondItem.psNo}</Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}>{secondItem.netWeight.toFixed(2)}</Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}>{secondItem.grossWeight.toFixed(2)}</Text>
                    </>
                  )
                ) : (
                  showMachineName ? (
                    <>
                      <Text style={[styles.compactTableCol, { width: '5%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '7%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '9%' }]}></Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.compactTableCol, { width: '10%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '15%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}></Text>
                      <Text style={[styles.compactTableCol, { width: '20%' }]}></Text>
                    </>
                  )
                )}
              </View>
            );
          })}



        </View>



        {/* Signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureSection}>
            <Text style={[styles.label, { fontSize: 7 }]}>CHECKED BY</Text>
            <View style={styles.signatureLine}></View>
          </View>
          <View style={styles.signatureSection}>
            <Text style={[styles.label, { fontSize: 7 }]}>PACKING MANAGER</Text>
            <View style={styles.signatureLine}></View>
          </View>
          <View style={styles.signatureSection}>
            <Text style={[styles.label, { fontSize: 7 }]}>AUTHORISED SIGNATORY</Text>
            <View style={styles.signatureLine}></View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PackingMemoPDF;