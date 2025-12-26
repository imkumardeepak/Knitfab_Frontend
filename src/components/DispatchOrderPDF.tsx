import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import type { LoadingSheetDto } from '@/types/api-types';
import type { TransportResponseDto, CourierResponseDto } from '@/types/api-types';

// Create styles with compact layout for single page landscape
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 10,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563eb',
    borderBottomStyle: 'solid',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  section: {
    marginVertical: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 2,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#1e40af',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
    paddingBottom: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
    fontSize: 7,
  },
  value: {
    fontSize: 7,
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
  },
  qrLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 3,
    textAlign: 'center',
    color: '#1e40af',
  },
  qrCode: {
    width: 100,
    height: 100,
    margin: 'auto',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    textAlign: 'center',
    fontSize: 6,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 1,
    fontSize: 6,
    fontWeight: 'bold',
  },
  statusFullyDispatched: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusPartiallyDispatched: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    padding: 2,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 2,
  },
  tableCellHeader: {
    fontSize: 6,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 6,
    textAlign: 'center',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  signatureBox: {
    width: '32%',
    textAlign: 'center',
  },
  signatureTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 2,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    height: 15,
    marginTop: 2,
  },
  signatureLabel: {
    fontSize: 6,
    marginTop: 2,
  },
  lotmentSection: {
    marginTop: 6,
    marginBottom: 6,
    padding: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    backgroundColor: '#f8fafc',
  },
  lotmentHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderBottomStyle: 'solid',
  },
  loadingItem: {
    marginBottom: 5,
    padding: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 2,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  loadingTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  sequenceBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 6,
    fontWeight: 'bold',
  },
  compactTable: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 3,
  },
  compactTableRow: {
    flexDirection: 'row',
  },
  compactTableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    padding: 1.5,
  },
  compactTableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 1.5,
  },
  compactTableCellHeader: {
    fontSize: 6,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  compactTableCell: {
    fontSize: 6,
    textAlign: 'center',
  },
});

interface DispatchOrderPDFProps {
  dispatchOrderId: string;
  sheets: LoadingSheetDto[];
  qrCodeDataUrl: string; // Single QR code for the dispatch order
  transportDetails?: TransportResponseDto | null;
  courierDetails?: CourierResponseDto | null;
  manualTransportDetails?: ManualTransportDetails | null; // Add this line
}

// Add new interface for manual transport details
interface ManualTransportDetails {
  transportName?: string;
  contactPerson?: string;
  phone?: string;
  maximumCapacityKgs?: number | null;
}

const DispatchOrderPDF: React.FC<DispatchOrderPDFProps> = ({ dispatchOrderId, sheets, qrCodeDataUrl, transportDetails, courierDetails, manualTransportDetails }) => {
  // Group sheets by lotment ID (lotNo)
  const groupedByLotment: Record<string, LoadingSheetDto[]> = {};
  
  sheets.forEach(sheet => {
    const lotmentId = sheet.lotNo || 'Unknown Lotment';
    if (!groupedByLotment[lotmentId]) {
      groupedByLotment[lotmentId] = [];
    }
    groupedByLotment[lotmentId].push(sheet);
  });
  
  // Sort each group by sequence number
  Object.keys(groupedByLotment).forEach(lotmentId => {
    groupedByLotment[lotmentId].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
  });
  
  // Get common vehicle information from the first sheet
  const firstSheet = sheets[0];
  
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Avyyan Knitfab pvt. ltd.</Text>
       
          <Text style={[styles.subtitle, { marginTop: 3 }]}>Dispatch Order ID: {dispatchOrderId}</Text>
        </View>
        
        <View style={styles.section}>
          <View style={{ flexDirection: 'row' }}>
            {/* Left Column - Dispatch and Vehicle Information */}
            <View style={{ width: '70%' }}>
              <Text style={styles.sectionHeader}>DISPATCH ORDER INFORMATION</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Dispatch Order ID:</Text>
                <Text style={styles.value}>{dispatchOrderId}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total Loading Sheets:</Text>
                <Text style={styles.value}>{sheets.length}</Text>
              </View>
              
              {/* Display either transport, courier, or manual transport information, or fallback to vehicle info */}
              {transportDetails ? (
                <>
                  <Text style={[styles.sectionHeader, { marginTop: 6 }]}>TRANSPORT INFORMATION</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Transport Name:</Text>
                    <Text style={styles.value}>{transportDetails.transportName}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Contact Person:</Text>
                    <Text style={styles.value}>{transportDetails.contactPerson || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vehicle Number:</Text>
                    <Text style={styles.value}>{transportDetails.vehicleNumber || firstSheet.vehicleNo || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Driver Name:</Text>
                    <Text style={styles.value}>{transportDetails.driverName || firstSheet.driverName || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Driver Number:</Text>
                    <Text style={styles.value}>{transportDetails.driverNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>License Number:</Text>
                    <Text style={styles.value}>{transportDetails.licenseNumber || firstSheet.license || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Mobile Number:</Text>
                    <Text style={styles.value}>{transportDetails.driverNumber || firstSheet.mobileNumber || 'N/A'}</Text>
                  </View>
                </>
              ) : courierDetails ? (
                <>
                  <Text style={[styles.sectionHeader, { marginTop: 6 }]}>COURIER INFORMATION</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Courier Name:</Text>
                    <Text style={styles.value}>{courierDetails.courierName}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Contact Person:</Text>
                    <Text style={styles.value}>{courierDetails.contactPerson || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Phone:</Text>
                    <Text style={styles.value}>{courierDetails.phone || firstSheet.mobileNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{courierDetails.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Address:</Text>
                    <Text style={styles.value}>{courierDetails.address || 'N/A'}</Text>
                  </View>
                </>
              ) : manualTransportDetails ? ( // Add this new condition
                <>
                  <Text style={[styles.sectionHeader, { marginTop: 6 }]}>MANUAL TRANSPORT INFORMATION</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Transport Name:</Text>
                    <Text style={styles.value}>{manualTransportDetails.transportName || firstSheet.transportName || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Contact Person:</Text>
                    <Text style={styles.value}>{manualTransportDetails.contactPerson || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Phone:</Text>
                    <Text style={styles.value}>{manualTransportDetails.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vehicle Number:</Text>
                    <Text style={styles.value}>{firstSheet.vehicleNo || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Driver Name:</Text>
                    <Text style={styles.value}>{firstSheet.driverName || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>License Number:</Text>
                    <Text style={styles.value}>{firstSheet.license || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Mobile Number:</Text>
                    <Text style={styles.value}>{firstSheet.mobileNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Capacity (kg):</Text>
                    <Text style={styles.value}>
                      {manualTransportDetails.maximumCapacityKgs !== null && manualTransportDetails.maximumCapacityKgs !== undefined 
                        ? manualTransportDetails.maximumCapacityKgs.toString() 
                        : 'N/A'}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.sectionHeader, { marginTop: 6 }]}>VEHICLE INFORMATION</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vehicle Number:</Text>
                    <Text style={styles.value}>{firstSheet.vehicleNo}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Driver Name:</Text>
                    <Text style={styles.value}>{firstSheet.driverName}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>License Number:</Text>
                    <Text style={styles.value}>{firstSheet.license}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Mobile Number:</Text>
                    <Text style={styles.value}>{firstSheet.mobileNumber}</Text>
                  </View>
                </>
              )}
            </View>
            
            {/* Right Column - QR Code */}
            <View style={{ width: '30%', alignItems: 'center', justifyContent: 'center' }}>
              <View style={styles.qrContainer}>
                <Text style={styles.qrLabel}>SCAN QR CODE</Text>
                {qrCodeDataUrl ? (
                  <Image src={qrCodeDataUrl} style={styles.qrCode} />
                ) : (
                  <View style={[styles.qrCode, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#94a3b8', fontSize: 6 }}>QR Code Unavailable</Text>
                  </View>
                )}
                <Text style={{ textAlign: 'center', marginTop: 4, fontSize: 6, color: '#64748b' }}>
                  Dispatch Order ID: {dispatchOrderId}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        
        {/* <View style={styles.section}>
          <Text style={styles.sectionHeader}>DISPATCH SUMMARY</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Lotment ID</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Customer</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Tape</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={styles.tableCellHeader}>Loading Sheets</Text>
              </View>
            </View>
            {Object.entries(groupedByLotment).map(([lotmentId, lotmentSheets]) => (
              <View key={lotmentId} style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{lotmentId}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{lotmentSheets[0]?.customerName || 'N/A'}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{lotmentSheets[0]?.tape || 'N/A'}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{lotmentSheets.length}</Text>
                </View>
              </View>
            ))}
          </View>
        </View> */}
        
        {/* Lotment-wise Details */}
        {Object.entries(groupedByLotment).map(([lotmentId, lotmentSheets]) => (
          <View key={lotmentId} style={styles.lotmentSection}>
            <Text style={styles.lotmentHeader}>Lot: {lotmentId}</Text>
            
            <View style={styles.compactTable}>
              <View style={styles.compactTableRow}>
                <View style={styles.compactTableColHeader}>
                  <Text style={styles.compactTableCellHeader}>Loading No</Text>
                </View>
                <View style={styles.compactTableColHeader}>
                  <Text style={styles.compactTableCellHeader}>Loading No</Text>
                </View>
                <View style={styles.compactTableColHeader}>
                  <Text style={styles.compactTableCellHeader}>Customer</Text>
                </View>
                <View style={styles.compactTableColHeader}>
                  <Text style={styles.compactTableCellHeader}>Tape</Text>
                </View>
                <View style={styles.compactTableColHeader}>
                  <Text style={styles.compactTableCellHeader}>Status</Text>
                </View>
              </View>
              {lotmentSheets.map((sheet, index) => (
                <View key={sheet.id} style={styles.compactTableRow}>
                  <View style={styles.compactTableCol}>
                    <Text style={styles.compactTableCell}>{sheet.loadingNo}</Text>
                  </View>
                 <View style={styles.compactTableCol}>
                    <Text style={styles.compactTableCell}>{sheet.lotNo}</Text>
                  </View>
                  <View style={styles.compactTableCol}>
                    <Text style={styles.compactTableCell}>{sheet.customerName}</Text>
                  </View>
                  <View style={styles.compactTableCol}>
                    <Text style={styles.compactTableCell}>{sheet.tape}</Text>
                  </View>
                  <View style={styles.compactTableCol}>
                    <Text style={[styles.statusBadge, sheet.isFullyDispatched ? styles.statusFullyDispatched : styles.statusPartiallyDispatched]}>
                      {sheet.isFullyDispatched ? 'DISPATCHED' : 'PENDING'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            
            {/* Summary of quantities for this lotment */}
            <View style={[styles.row, { marginTop: 4 }]}>
              <Text style={styles.label}>Dispatched Planned Rolls:</Text>
              <Text style={styles.value}>
                {lotmentSheets.reduce((sum, sheet) => sum + (sheet.totalDispatchedRolls || 0), 0)}
              </Text>
            </View>
          </View>
        ))}
        
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Prepared By</Text>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureLabel}>Name & Designation</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Checked By</Text>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureLabel}>Name & Designation</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>Driver's Sign</Text>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureLabel}>Name & Sign</Text>
          </View>
        </View>
        
        <Text style={styles.footer}>
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} | 
          Dispatch Order ID: {dispatchOrderId}
        </Text>
      </Page>
    </Document>
  );
};

export default DispatchOrderPDF;