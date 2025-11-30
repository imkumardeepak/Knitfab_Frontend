import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, FileText, Download, Calendar, Truck } from 'lucide-react';
import { toast } from '@/lib/toast';
import { dispatchPlanningApi, apiUtils } from '@/lib/api-client';
import type { DispatchPlanningDto, LoadingSheetDto } from '@/types/api-types';
import QRCode from 'qrcode';
import { pdf } from '@react-pdf/renderer';
import DispatchOrderPDF from '@/components/DispatchOrderPDF';
import { transportApi, courierApi } from '@/lib/api-client';
import type { TransportResponseDto, CourierResponseDto } from '@/types/api-types';

const LoadingSheet = () => {
  const [loadingSheets, setLoadingSheets] = useState<LoadingSheetDto[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<LoadingSheetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedByDispatchOrder, setGroupedByDispatchOrder] = useState<Record<string, LoadingSheetDto[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Fetch loading sheets data
  useEffect(() => {
    fetchLoadingSheets();
  }, []);

  // Filter items when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredSheets(loadingSheets);
    } else {
      const filtered = loadingSheets.filter(sheet => 
        sheet.loadingNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.lotNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.tape?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.vehicleNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.salesOrderId.toString().includes(searchTerm) ||
        (sheet.dispatchOrderId && sheet.dispatchOrderId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSheets(filtered);
    }
  }, [searchTerm, loadingSheets]);

  // Group by dispatch order ID when filteredSheets changes
  useEffect(() => {
    const grouped: Record<string, LoadingSheetDto[]> = {};
    
    filteredSheets.forEach(sheet => {
      const dispatchOrderId = sheet.dispatchOrderId || 'Unknown';
      if (!grouped[dispatchOrderId]) {
        grouped[dispatchOrderId] = [];
      }
      grouped[dispatchOrderId].push(sheet);
    });
    
    // Sort each group by sequence number
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    });
    
    setGroupedByDispatchOrder(grouped);
    
    // Expand all groups by default
    const expanded: Record<string, boolean> = {};
    Object.keys(grouped).forEach(key => {
      expanded[key] = true;
    });
    setExpandedGroups(expanded);
  }, [filteredSheets]);

  const fetchLoadingSheets = async () => {
    try {
      setLoading(true);
      const response = await dispatchPlanningApi.getAllDispatchPlannings();
      const sheets: DispatchPlanningDto[] = apiUtils.extractData(response);
      
      // Sort by creation date to establish loading sequence
      const sortedSheets = [...sheets].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Add sequence numbers based on creation date order
      const sheetsWithSequence: LoadingSheetDto[] = sortedSheets.map((sheet, index) => ({
        ...sheet,
        sequenceNumber: index + 1
      }));
      
      setLoadingSheets(sheetsWithSequence);
      setFilteredSheets(sheetsWithSequence);
    } catch (error) {
      console.error('Error fetching loading sheets:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to fetch loading sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLoadingSheets();
  };

  const toggleGroup = (dispatchOrderId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [dispatchOrderId]: !prev[dispatchOrderId]
    }));
  };

  const generateQRCode = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
      return '';
    }
  };

  // New function to generate dispatch order PDF
  const handleGenerateDispatchOrderPDF = async (dispatchOrderId: string, sheets: LoadingSheetDto[]) => {
    try {
      // Validate inputs
      if (!dispatchOrderId || !sheets || sheets.length === 0) {
        toast.error('Error', 'Invalid dispatch order data');
        return;
      }
      
      // Validate that all sheets have required data
      const validSheets = sheets.filter(sheet => sheet !== null && sheet !== undefined);
      if (validSheets.length === 0) {
        toast.error('Error', 'No valid loading sheets found');
        return;
      }
      
      // Get the first sheet to check if it's transport or courier
      const firstSheet = validSheets[0];
      
      // Fetch transport or courier details if needed
      let transportDetails: TransportResponseDto | null = null;
      let courierDetails: CourierResponseDto | null = null;
      // Check for manual transport details
      let manualTransportDetails = null;
      
      if (firstSheet.isTransport && firstSheet.transportId) {
        try {
          const response = await transportApi.getTransport(firstSheet.transportId);
          transportDetails = apiUtils.extractData(response);
        } catch (error) {
          console.error('Error fetching transport details:', error);
        }
      } else if (firstSheet.isCourier && firstSheet.courierId) {
        try {
          const response = await courierApi.getCourier(firstSheet.courierId);
          courierDetails = apiUtils.extractData(response);
        } catch (error) {
          console.error('Error fetching courier details:', error);
        }
      } else if (firstSheet.transportName) {
        // Use manual transport details from the first sheet
        manualTransportDetails = {
          transportName: firstSheet.transportName,
          contactPerson: firstSheet.contactPerson || undefined,
          phone: firstSheet.phone || undefined,
          maximumCapacityKgs: firstSheet.maximumCapacityKgs
        };
      }
      
      // Generate QR code for the dispatch order ID
      const qrCodeDataUrl = await generateQRCode(dispatchOrderId);
      
      // Create PDF document with validation
      const doc = (
        <DispatchOrderPDF 
          dispatchOrderId={dispatchOrderId} 
          sheets={validSheets} 
          qrCodeDataUrl={qrCodeDataUrl || ''} 
          transportDetails={transportDetails}
          courierDetails={courierDetails}
          manualTransportDetails={manualTransportDetails}
        />
      );
      
      // Check if doc is valid before proceeding
      if (!doc) {
        toast.error('Error', 'Failed to create PDF document');
        return;
      }
      
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DispatchOrder_${dispatchOrderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Success', `PDF downloaded for Dispatch Order: ${dispatchOrderId}`);
    } catch (error) {
      console.error('Error generating dispatch order PDF:', error);
      toast.error('Error', 'Failed to generate dispatch order PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="p-2 max-w-7xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base font-semibold">
              Loading Sheets
            </CardTitle>
          </div>
          <p className="text-white/80 text-xs mt-1">
            View and manage loading sheets for dispatched goods grouped by dispatch order
          </p>
        </CardHeader>

        <CardContent className="p-3">
          {/* Search Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <Label htmlFor="search" className="text-xs font-medium text-gray-700 mb-1 block">
                  Search Loading Sheets
                </Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by Loading No, Lot No, Customer, Tape, Vehicle, SO ID, Dispatch Order ID, or Remarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 text-xs h-8"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleRefresh}
                  variant="outline" 
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="text-xs text-blue-600 font-medium">Total Loading Sheets</div>
              <div className="text-lg font-bold text-blue-800">{filteredSheets.length}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="text-xs text-green-600 font-medium">Dispatch Orders</div>
              <div className="text-lg font-bold text-green-800">
                {Object.keys(groupedByDispatchOrder).length}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <div className="text-xs text-orange-600 font-medium">Fully Dispatched</div>
              <div className="text-lg font-bold text-orange-800">
                {filteredSheets.filter(sheet => sheet.isFullyDispatched).length}
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
              <div className="text-xs text-purple-600 font-medium">Vehicles Used</div>
              <div className="text-lg font-bold text-purple-800">
                {new Set(filteredSheets.map(sheet => sheet.vehicleNo)).size}
              </div>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-md p-3">
              <div className="text-xs text-cyan-600 font-medium">First Loading</div>
              <div className="text-lg font-bold text-cyan-800">
                {filteredSheets.length > 0 ? `#${filteredSheets[0].sequenceNumber}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading loading sheets...</span>
            </div>
          )}

          {/* Loading Sheets Grouped by Dispatch Order in Columns */}
          {!loading && (
            <div className="space-y-4">
              {Object.keys(groupedByDispatchOrder).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No loading sheets found
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(groupedByDispatchOrder).map(([dispatchOrderId, sheets]) => (
                    <div key={dispatchOrderId} className="border border-gray-200 rounded-md overflow-hidden">
                      <div 
                        className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center"
                      >
                        <div className="cursor-pointer flex-1" onClick={() => toggleGroup(dispatchOrderId)}>
                          <h3 className="font-medium text-gray-800">
                            Dispatch Order: <span className="font-bold">{dispatchOrderId}</span>
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {sheets.length} loading sheet{sheets.length !== 1 ? 's' : ''} • Created on {new Date(sheets[0].createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              // Validate data before calling the function
                              if (dispatchOrderId && sheets && Array.isArray(sheets) && sheets.length > 0) {
                                handleGenerateDispatchOrderPDF(dispatchOrderId, sheets);
                              } else {
                                toast.error('Error', 'Invalid dispatch order data');
                              }
                            }}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Dispatch Order PDF
                          </Button>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {sheets.length}
                          </span>
                          <span className={`transform transition-transform cursor-pointer ${expandedGroups[dispatchOrderId] ? 'rotate-180' : ''}`} onClick={() => toggleGroup(dispatchOrderId)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      
                      {expandedGroups[dispatchOrderId] && (
                        <div className="p-2">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="text-xs font-medium text-gray-700 w-16">Seq</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700">Customer Name</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700">Lot No</TableHead>
                                <TableHead className="text-xs font-medium text-gray-700">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sheets.map((sheet) => (
                                <TableRow key={sheet.id} className="border-b border-gray-100">
                                  <TableCell className="py-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      #{sheet.sequenceNumber}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 font-medium text-xs">
                                    {sheet.customerName || 'N/A'}
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">
                                    {sheet.lotNo}
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      sheet.isFullyDispatched 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {sheet.isFullyDispatched ? 'Dispatched' : 'Pending'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Vehicle:</span> {sheets[0].vehicleNo}
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Driver:</span> {sheets[0].driverName}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Dispatch Planning Information */}
          {!loading && filteredSheets.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Dispatch Planning Information
              </h3>
              <div className="text-xs text-gray-600">
                <p className="mb-2">
                  <span className="font-medium">Loading Sequence:</span> Loading sheets are numbered sequentially based on their creation date. 
                  The sequence number indicates the order in which the loading was planned.
                </p>
                <p className="mb-2">
                  <span className="font-medium">Dispatch Planning:</span> Each loading sheet represents a dispatch planning record for a specific lot.
                  The loading number (LOADYYMM####) and dispatch order ID (DOYYMM###) are automatically generated when dispatch planning records are created.
                </p>
                <p>
                  <span className="font-medium">Grouping:</span> Loading sheets are grouped by dispatch order ID. All lots dispatched together share the same dispatch order ID.
                  Click on a group header to expand/collapse the details.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingSheet;