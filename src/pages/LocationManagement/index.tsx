import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Edit, Trash2, QrCode } from 'lucide-react';
import { useLocations, useDeleteLocation } from '@/hooks/queries';
import { apiUtils } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { pdf, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import logo from '@/assets/Images/avyaanlogo.png';
import type { Row } from '@tanstack/react-table';
import type { LocationResponseDto } from '@/types/api-types';

// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30, // Increased padding for better A4 margins
    fontFamily: 'Helvetica', // Use a clean font (or import custom if needed)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottom: '2px solid #2563eb',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 5,
  },

  section: {
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 25,
    textAlign: 'center',
    marginBottom: 5,
    color: '#1e40af',
    fontWeight: 'bold',
    letterSpacing: 1, // Subtle spacing for elegance
  },
  qrContainer: {
    margin: 20,
    padding: 30,
    border: '3px solid #2563eb',
    borderRadius: 20, // Softer corners
    alignItems: 'center',
    backgroundColor: '#f0f9ff', // Subtle blue tint for background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5, // Enhanced shadow for depth
    width: '80%', // Better fit on A4
  },
  qrCode: {
    width: 260, // Larger QR for scannability
    height: 260,
    marginBottom: 20,
  },
  locationInfo: {
    fontSize: 50,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    flex: 1, // Even spacing
  },
  infoValue: {
    fontSize: 14,
    color: '#64748b',
    flex: 2,
    textAlign: 'right',
  },
  code: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
    textAlign: 'center',
    width: '60%',
  },
});
// PDF component with actual QR code
const LocationQRCodePDF = ({ location }: { location: LocationResponseDto }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR code as data URL
    QRCode.toDataURL(location.locationcode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });
  }, [location.locationcode]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Company Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src={logo} style={styles.logo} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Location QR Code</Text>

          <View style={styles.qrContainer}>
            {qrCodeDataUrl ? (
              <Image src={qrCodeDataUrl} style={styles.qrCode} />
            ) : (
              <Text>Loading QR Code...</Text>
            )}

            <Text style={styles.locationInfo}>{location.location}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Warehouse:</Text>
              <Text style={styles.infoValue}>{location.warehousename}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{location.location || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sub Location:</Text>
              <Text style={styles.infoValue}>{location.sublocation || 'N/A'}</Text>
            </View>

            <Text style={styles.code}>Code: {location.locationcode}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

type LocationCellProps = { row: Row<LocationResponseDto> };

const LocationManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: locations = [], isLoading, error } = useLocations();
  const { mutate: deleteLocationMutation, isPending: isDeleting } = useDeleteLocation();

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    location: LocationResponseDto | null;
  }>({
    open: false,
    location: null,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownloadPDF = async (location: LocationResponseDto) => {
    setIsGenerating(true);
    try {
      // Create the PDF document
      const doc = <LocationQRCodePDF location={location} />;

      // Generate the PDF blob
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `location-${location.locationcode}-qrcode.pdf`;

      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate QR code PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = [
    {
      accessorKey: 'warehousename',
      header: 'Warehouse',
      cell: ({ row }: LocationCellProps) => {
        const location = row.original;
        return <div className="font-medium">{location.warehousename}</div>;
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }: LocationCellProps) => {
        const location = row.original;
        return (
          <div>
            <div className="font-medium">{location.location}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'locationcode',
      header: 'Code',
      cell: ({ row }: LocationCellProps) => {
        const location = row.original;
        return <div className="font-medium">{location.locationcode}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: LocationCellProps) => {
        const isActive = row.getValue('isActive') as boolean;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: LocationCellProps) => {
        const location = row.original;
        return (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/locations/${location.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateAndDownloadPDF(location)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(location.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDelete = (id: number) => {
    const location = locations.find((m) => m.id === id);
    if (location) {
      setDeleteDialog({
        open: true,
        location,
      });
    }
  };

  const confirmDelete = () => {
    if (deleteDialog.location) {
      deleteLocationMutation(deleteDialog.location.id);
      // Add query invalidation to refresh the list after delete
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setDeleteDialog({ open: false, location: null });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = apiUtils.handleError(error);
    return (
      <div className="text-center text-red-500 p-4">Error loading locations: {errorMessage}</div>
    );
  }

  const activeLocations = locations.filter((location) => location.isActive).length;
  const inactiveLocations = locations.length - activeLocations;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Location Management</h1>
          <p className="text-muted-foreground">Manage warehouse locations and sublocations</p>
        </div>
        <Button onClick={() => navigate('/locations/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">{activeLocations} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLocations}</div>
            <p className="text-xs text-muted-foreground">{inactiveLocations} inactive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warehouses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(locations.map((l) => l.warehousename))).length}
            </div>
            <p className="text-xs text-muted-foreground">Unique warehouses</p>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({locations.length} locations)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={locations}
            searchKey="locationcode"
            searchPlaceholder="Search by Any Field..."
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, location: null })}
        itemName={deleteDialog.location ? deleteDialog.location.locationcode : ''}
        itemType="Location"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default LocationManagement;
