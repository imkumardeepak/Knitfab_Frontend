import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Save, Truck, FileText, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from '@/lib/toast';
import { storageCaptureApi, dispatchPlanningApi, apiUtils, transportApi, courierApi, productionAllotmentApi } from '@/lib/api-client';
import type { 
  StorageCaptureResponseDto, 
  UpdateStorageCaptureRequestDto,
  CreateDispatchPlanningRequestDto,
  DispatchPlanningDto,
  CreateDispatchedRollRequestDto,
  DispatchedRollDto,
  TransportResponseDto,
  CourierResponseDto
} from '@/types/api-types';

// Define types for transport and courier
interface TransportMaster {
  id: number;
  transportName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  vehicleNumber: string;
  driverName: string;
  driverNumber: string;
  maximumCapacityKgs: number | null;
  isActive: boolean;
}


interface CourierMaster {
  id: number;
  courierName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

// Define types for our dispatch details data
interface DispatchPlanningItem {
  lotNo: string;
  customerName: string;
  tape: string;
  totalRolls: number;
  totalNetWeight: number;
  totalActualQuantity: number;
  totalRequiredRolls: number; // Add this field
  dispatchedRolls: number; // Add this new field
  isDispatched: boolean;
  rolls: RollDetail[];
  dispatchRolls?: number; // Number of rolls to dispatch (optional)
  salesOrder?: {
    id: number;
    voucherNumber: string;
    partyName: string;
  };
  salesOrderItemName?: string;
  salesOrderId?: number;
  salesOrderItemId?: number;
  // Add loading sheet information
  loadingSheet?: DispatchPlanningDto;
}

interface RollDetail {
  fgRollNo: string;
}

// New interface for grouping by sales order
interface SalesOrderGroup {
  salesOrderId: number;
  voucherNumber: string;
  partyName: string;
  customerName: string;
  allotments: DispatchPlanningItem[];
  totalRolls: number;
  totalNetWeight: number;
  totalActualQuantity: number;
  totalRequiredRolls: number; // Add this field
  totalDispatchedRolls: number; // Add this new field
  isFullyDispatched: boolean;
  dispatchRolls?: number; // Number of rolls to dispatch for the entire group
  sequenceNumber?: number; // Add sequenceNumber property
  // Add loading sheet information
  loadingSheets?: DispatchPlanningDto[];
}

// Define types for our dispatch details data
interface DispatchData {
  dispatchDate: string;
  vehicleNo: string;
  driverName: string;
  license: string;
  mobileNumber: string;
  remarks: string;
}

const DispatchDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedLots } = location.state || { selectedLots: [] };

  // Group items by sales order
  // Get sales order item IDs for selected lots
  const fetchSalesOrderItemIds = async (lotNumbers: string[]) => {
    try {
      // Create a set of unique lot numbers to avoid duplicate requests
      const uniqueLots = Array.from(new Set(lotNumbers));
      
      // Create a map to store the sales order item IDs
      const salesOrderItemMap: Record<string, number> = {};
      
      // Fetch production allotment data for each unique lot
      for (const lotNo of uniqueLots) {
        try {
          const response = await productionAllotmentApi.getProductionAllotmentByAllotId(lotNo);
          const allotment = apiUtils.extractData(response);
          if (allotment && allotment.salesOrderItemId) {
            salesOrderItemMap[lotNo] = allotment.salesOrderItemId;
          }
        } catch (error) {
          console.warn(`Could not fetch production allotment for lot ${lotNo}:`, error);
          // If we can't get the specific allotment, continue to next
          continue;
        }
      }
      
      return salesOrderItemMap;
    } catch (error) {
      console.error('Error fetching sales order item IDs:', error);
      toast.error('Error', 'Failed to fetch sales order item data');
      return {};
    }
  };

  // Use the production allotments mapping to get correct sales order item IDs
  const [salesOrderItemMap, setSalesOrderItemMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadSalesOrderItemMap = async () => {
      const lotNumbers = selectedLots.map((item: DispatchPlanningItem) => item.lotNo);
      const map = await fetchSalesOrderItemIds(lotNumbers);
      setSalesOrderItemMap(map);
    };

    loadSalesOrderItemMap();
  }, [selectedLots]);

  const groupedItems = selectedLots.reduce(
    (acc: Record<number, SalesOrderGroup>, item: DispatchPlanningItem) => {
      const salesOrderId = item.salesOrder?.id || 0;

      if (!acc[salesOrderId]) {
        acc[salesOrderId] = {
          salesOrderId,
          voucherNumber: item.salesOrder?.voucherNumber || 'N/A',
          partyName: item.salesOrder?.partyName || 'N/A',
          customerName: item.customerName,
          allotments: [],
          totalRolls: 0,
          totalNetWeight: 0,
          totalActualQuantity: 0,
          totalRequiredRolls: 0, // Add this field
          totalDispatchedRolls: 0, // Add this new field
          isFullyDispatched: true,
          dispatchRolls: 0,
        };
      }

      // Update the item with the correct salesOrderItemId from the mapping
      const updatedItem = {
        ...item,
        salesOrderItemId: item.salesOrderItemId || salesOrderItemMap[item.lotNo] || 0,
        dispatchRolls: item.dispatchRolls || item.totalRolls,
      };

      acc[salesOrderId].allotments.push(updatedItem);

      acc[salesOrderId].totalRolls += item.totalRolls;
      acc[salesOrderId].totalNetWeight += item.totalNetWeight;
      acc[salesOrderId].totalActualQuantity += item.totalActualQuantity;
      acc[salesOrderId].totalRequiredRolls += item.totalRequiredRolls; // Add this line
      // Calculate dispatched rolls as the difference between total captured rolls and ready rolls
      // Since totalRolls now represents ready rolls (non-dispatched), we need to get total captured rolls differently
      // For now, we'll assume dispatchedRolls field contains the correct value or calculate it as 0
      acc[salesOrderId].totalDispatchedRolls += item.dispatchedRolls || 0; // Add this line
      acc[salesOrderId].dispatchRolls =
        (acc[salesOrderId].dispatchRolls || 0) + (item.dispatchRolls || item.totalRolls);

      // If any allotment is not dispatched, the whole group is not fully dispatched
      if (!item.isDispatched) {
        acc[salesOrderId].isFullyDispatched = false;
      }

      return acc;
    },
    {} as Record<number, SalesOrderGroup>
  );

 
  // Initialize sequence numbers
  const groupedItemsArray: SalesOrderGroup[] = Object.values(groupedItems);
  groupedItemsArray.forEach((group, index) => {
    group.sequenceNumber = index + 1;
  });

  const [dispatchItems, setDispatchItems] = useState<SalesOrderGroup[]>(groupedItemsArray);
  const [loading, setLoading] = useState(false);
  const [dispatchData, setDispatchData] = useState<DispatchData>({
    dispatchDate: new Date().toISOString().split('T')[0],
    vehicleNo: '',
    driverName: '',
    license: '',
    mobileNumber: '',
    remarks: '',
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'confirm'>('details');

  // Refs for drag and drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Transport and Courier states
  const [transports, setTransports] = useState<TransportMaster[]>([]);
  const [couriers, setCouriers] = useState<CourierMaster[]>([]);
  const [isTransport, setIsTransport] = useState(false);
  const [isCourier, setIsCourier] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<number | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<number | null>(null);
  const [transportDetails, setTransportDetails] = useState<TransportMaster | null>(null);
  const [courierDetails, setCourierDetails] = useState<CourierMaster | null>(null);
  
  // Manual transport details state
  const [manualTransportDetails, setManualTransportDetails] = useState({
    transportName: '',
    vehicleNumber: '',
    driverName: '',
    mobileNumber: '',
    contactPerson: '',
    phone: '',
    maximumCapacityKgs: '',
    license: ''
  });

  // Fetch transports and couriers
  useEffect(() => {
    const fetchTransportsAndCouriers = async () => {
      try {
        // Fetch transports
        const transportResponse = await transportApi.getAllTransports();
        const transportData = apiUtils.extractData(transportResponse);
        setTransports(transportData.map((t: TransportResponseDto) => ({
          id: t.id,
          transportName: t.transportName,
          contactPerson: t.contactPerson || '',
          phone: t.driverNumber || '', // Use driverNumber as phone
          email: '',
          address: t.address || '',
          vehicleNumber: t.vehicleNumber || '',
          driverName: t.driverName || '',
          driverNumber: t.driverNumber || '',
          maximumCapacityKgs: t.maximumCapacityKgs || null,
          isActive: t.isActive
        })));

        // Fetch couriers
        const courierResponse = await courierApi.getAllCouriers();
        const courierData = apiUtils.extractData(courierResponse);
        setCouriers(courierData.map((c: CourierResponseDto) => ({
          id: c.id,
          courierName: c.courierName,
          contactPerson: c.contactPerson || '',
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          isActive: c.isActive
        })));
      } catch (error) {
        console.error('Error fetching transports/couriers:', error);
        toast.error('Error', 'Failed to fetch transport/courier data');
      }
    };

    fetchTransportsAndCouriers();
  }, []);

  // Handle transport selection
  const handleTransportChange = (transportId: number) => {
    setSelectedTransport(transportId);
    const transport = transports.find(t => t.id === transportId) || null;
    setTransportDetails(transport);
    
    // Auto-populate vehicle and driver details if available
    if (transport) {
      setDispatchData(prev => ({
        ...prev,
        vehicleNo: transport.vehicleNumber || prev.vehicleNo,
        driverName: transport.driverName || prev.driverName,
        mobileNumber: transport.phone || prev.mobileNumber // Auto-populate mobile number from driver number
      }));
      
      // Clear manual transport details when selecting from dropdown
      setManualTransportDetails({
        transportName: '',
        vehicleNumber: '',
        driverName: '',
        mobileNumber: '',
        contactPerson: '',
        phone: '',
        maximumCapacityKgs: '',
        license: ''
      });
    }
  };

  // Handle courier selection
  const handleCourierChange = (courierId: number) => {
    setSelectedCourier(courierId);
    const courier = couriers.find(c => c.id === courierId) || null;
    setCourierDetails(courier);
    
    // Auto-populate mobile number if available
    if (courier) {
      setDispatchData(prev => ({
        ...prev,
        mobileNumber: courier.phone || prev.mobileNumber
      }));
      
      // Clear manual transport details when selecting courier
      setManualTransportDetails({
        transportName: '',
        vehicleNumber: '',
        driverName: '',
        mobileNumber: '',
        contactPerson: '',
        phone: '',
        maximumCapacityKgs: '',
        license: ''
      });
    }
  };

  // Handle manual transport details change
  const handleManualTransportChange = (field: string, value: string) => {
    setManualTransportDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Also update dispatchData for vehicleNo, driverName, and mobileNumber
    if (field === 'vehicleNumber') {
      setDispatchData(prev => ({ ...prev, vehicleNo: value }));
    } else if (field === 'driverName') {
      setDispatchData(prev => ({ ...prev, driverName: value }));
    } else if (field === 'mobileNumber') {
      setDispatchData(prev => ({ ...prev, mobileNumber: value }));
    } else if (field === 'license') {
      setDispatchData(prev => ({ ...prev, license: value }));  // Add license update
    }
  };

  // Function to handle drag start
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  // Function to handle drag enter
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  // Function to handle drag end (drop)
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;

    const newItems = [...dispatchItems];
    const draggedItem = newItems[dragItem.current];

    // Remove dragged item
    newItems.splice(dragItem.current, 1);
    // Insert dragged item at new position
    newItems.splice(dragOverItem.current, 0, draggedItem);

    // Update state
    setDispatchItems(newItems);

    // Reset positions
    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Function to move sales order up in the sequence
  const moveSalesOrderUp = (index: number) => {
    if (index <= 0) return;
    const newItems = [...dispatchItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setDispatchItems(newItems);
  };

  // Function to move sales order down in the sequence
  const moveSalesOrderDown = (index: number) => {
    if (index >= dispatchItems.length - 1) return;
    const newItems = [...dispatchItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setDispatchItems(newItems);
  };

  // Update dispatch status for all selected lots
  const handleDispatch = async () => {
    try {
      setLoading(true);

      // Validation
      if (isTransport && !selectedTransport && !manualTransportDetails.transportName) {
        toast.error('Error', 'Please select a transport or enter transport details');
        setLoading(false);
        return;
      }

      if (isCourier && !selectedCourier) {
        toast.error('Error', 'Please select a courier');
        setLoading(false);
        return;
      }

      // If neither transport nor courier is selected, but manual transport details are entered
      if (!isTransport && !isCourier && manualTransportDetails.transportName) {
        // Use manual transport details
        setDispatchData(prev => ({
          ...prev,
          vehicleNo: manualTransportDetails.vehicleNumber || prev.vehicleNo,
          driverName: manualTransportDetails.driverName || prev.driverName,
          mobileNumber: manualTransportDetails.mobileNumber || prev.mobileNumber,
          license: manualTransportDetails.license || prev.license
        }));
      }

      // Prepare dispatch planning data for all lots
      const dispatchPlanningDataList: CreateDispatchPlanningRequestDto[] = [];
      
      for (const group of dispatchItems) {
        for (const item of group.allotments) {
          // Create dispatch planning record for this lot
          const dispatchPlanningData: CreateDispatchPlanningRequestDto = {
            lotNo: item.lotNo,
            salesOrderId: item.salesOrder?.id || 0,
            salesOrderItemId: item.salesOrderItemId || 0,
            customerName: item.customerName,
            tape: item.tape,
            totalRequiredRolls: item.totalRequiredRolls, // Use required rolls
            totalReadyRolls: item.totalRolls,
            totalDispatchedRolls: item.dispatchRolls || 0,
            isFullyDispatched: (item.dispatchRolls || 0) >= item.totalRequiredRolls, // Check if required rolls are fulfilled
            vehicleNo: dispatchData.vehicleNo,
            driverName: dispatchData.driverName,
            license: dispatchData.license,
            mobileNumber: dispatchData.mobileNumber,
            remarks: dispatchData.remarks,
            // Transport/Courier data
            isTransport: isTransport,
            isCourier: isCourier,
            transportId: isTransport ? selectedTransport : null,
            courierId: isCourier ? selectedCourier : null,
            // Manual transport details
            transportName: manualTransportDetails.transportName,
            contactPerson: manualTransportDetails.contactPerson,
            phone: manualTransportDetails.phone,
            maximumCapacityKgs: manualTransportDetails.maximumCapacityKgs ? 
              parseFloat(manualTransportDetails.maximumCapacityKgs) : null,
            // LoadingNo and DispatchOrderId will be auto-generated by the backend
          };
          
          dispatchPlanningDataList.push(dispatchPlanningData);
        }
      }

      // Create all dispatch planning records with the same dispatch order ID
      const dispatchPlanningResult = await dispatchPlanningApi.createBatchDispatchPlanning(dispatchPlanningDataList);
      const createdDispatchPlannings = dispatchPlanningResult.data;

      const totalGroups = dispatchItems.length;
      const totalLots = dispatchItems.reduce((sum, group) => sum + group.allotments.length, 0);
      const totalRolls = dispatchItems.reduce(
        (sum, group) =>
          sum +
          group.allotments.reduce(
            (itemSum, item) =>
              itemSum + (item.dispatchRolls !== undefined ? item.dispatchRolls : item.totalRolls),
            0
          ),
        0
      );

      toast.success(
        'Success',
        `Successfully created dispatch planning for ${totalGroups} sales orders with ${totalLots} lots and ${totalRolls} rolls under dispatch order ${createdDispatchPlannings[0]?.dispatchOrderId || 'N/A'}.`
      );

      // Navigate back to dispatch planning
      navigate('/dispatch-planning');
    } catch (error) {
      console.error('Error creating dispatch planning:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to create dispatch planning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 max-w-7xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base font-semibold">Dispatch Details</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dispatch-planning')}
              className="text-white hover:bg-white/20 h-6 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          </div>
          <p className="text-white/80 text-xs mt-1">
            Review and confirm dispatch details for selected lots
          </p>
        </CardHeader>

        <CardContent className="p-3">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`py-2 px-4 text-sm font-medium flex items-center ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('details')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Dispatch Planning
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium flex items-center ${
                activeTab === 'confirm'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('confirm')}
              disabled={dispatchItems.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Dispatch
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div>
          
              {/* Selected Lots Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-3 mb-4">
                <h3 className="text-xs font-semibold text-green-800 mb-2">
                  Selected Sales Orders for Dispatch ({dispatchItems.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                    <div className="text-xs text-blue-600 font-medium">Sales Orders</div>
                    <div className="text-lg font-bold text-blue-800">{dispatchItems.length}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-2">
                    <div className="text-xs text-green-600 font-medium">Total Lots</div>
                    <div className="text-lg font-bold text-green-800">
                      {dispatchItems.reduce((sum, group) => sum + group.allotments.length, 0)}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                    <div className="text-xs text-yellow-600 font-medium">Dispatch Rolls</div>
                    <div className="text-lg font-bold text-yellow-800">
                      {dispatchItems.reduce((sum, group) => 
                        sum + group.allotments.reduce((itemSum, item) => 
                          itemSum + (item.dispatchRolls !== undefined ? item.dispatchRolls : item.totalRolls), 0), 0)}
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
                    <div className="text-xs text-purple-600 font-medium">Dispatched Rolls</div>
                    <div className="text-lg font-bold text-purple-800">
                      {dispatchItems.reduce((sum, group) => sum + group.totalDispatchedRolls, 0)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Lots Details */}
              <div className="border border-gray-200 rounded-md overflow-hidden mb-4">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-xs font-medium text-gray-700 w-12"></TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">SO Number</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Party</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Customer</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Lots</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Ready Rolls</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Required Rolls</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Dispatch Rolls</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Dispatched Rolls</TableHead>
                      <TableHead className="text-xs font-medium text-gray-700">Loading Sheets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          No dispatch details found
                        </TableCell>
                      </TableRow>
                    ) : (
                      dispatchItems.map((group) => (
                        <>
                          <TableRow
                            key={group.salesOrderId}
                            className="border-b border-gray-100 bg-gray-50"
                          >
                            <TableCell className="py-3">
                              <div className="font-medium text-sm">SO</div>
                            </TableCell>
                            <TableCell className="py-3 font-medium">
                              {group.voucherNumber}
                            </TableCell>
                            <TableCell className="py-3">{group.partyName}</TableCell>
                            <TableCell className="py-3">{group.customerName}</TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {group.allotments.length} lot
                                  {group.allotments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 font-medium">{group.totalRolls}</TableCell>
                            <TableCell className="py-3 font-medium">{group.totalRequiredRolls}</TableCell>
                            <TableCell className="py-3">
                              <Input
                                type="number"
                                min="0"
                                max={group.totalRolls}
                                value={group.dispatchRolls || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? NaN : parseInt(e.target.value);
                                  const newDispatchRolls = isNaN(value) ? 0 : value;
                                  const updatedItems = [...dispatchItems];
                                  const groupIndex = updatedItems.findIndex(
                                    (g) => g.salesOrderId === group.salesOrderId
                                  );

                                  if (groupIndex !== -1) {
                                    updatedItems[groupIndex] = {
                                      ...group,
                                      dispatchRolls: Math.min(newDispatchRolls, group.totalRolls),
                                    };

                                    // Distribute rolls proportionally among allotments
                                    let remainingRolls = Math.min(
                                      newDispatchRolls,
                                      group.totalRolls
                                    );
                                    const updatedAllotments = group.allotments.map((allotment) => {
                                      if (remainingRolls <= 0) {
                                        return { ...allotment, dispatchRolls: 0 };
                                      }

                                      // Calculate proportional allocation
                                      const allotmentProportion =
                                        allotment.totalRolls / group.totalRolls;
                                      const allotmentRolls = Math.min(
                                        Math.round(allotmentProportion * newDispatchRolls),
                                        allotment.totalRolls,
                                        remainingRolls
                                      );

                                      remainingRolls -= allotmentRolls;

                                      return { ...allotment, dispatchRolls: allotmentRolls };
                                    });

                                    // Distribute any remaining rolls to the first allotments
                                    if (remainingRolls > 0) {
                                      for (
                                        let i = 0;
                                        i < updatedAllotments.length && remainingRolls > 0;
                                        i++
                                      ) {
                                        const allotment = updatedAllotments[i];
                                        if (allotment.dispatchRolls < allotment.totalRolls) {
                                          const additionalRolls = Math.min(
                                            remainingRolls,
                                            allotment.totalRolls - allotment.dispatchRolls
                                          );
                                          updatedAllotments[i] = {
                                            ...allotment,
                                            dispatchRolls:
                                              allotment.dispatchRolls + additionalRolls,
                                          };
                                          remainingRolls -= additionalRolls;
                                        }
                                      }
                                    }

                                    updatedItems[groupIndex] = {
                                      ...updatedItems[groupIndex],
                                      allotments: updatedAllotments,
                                      dispatchRolls: newDispatchRolls,
                                    };
                                  }

                                  setDispatchItems(updatedItems);
                                }}
                                className="text-xs h-8 w-20"
                              />
                            </TableCell>
                            <TableCell className="py-3 font-medium">
                              {group.totalDispatchedRolls}
                            </TableCell>
                            <TableCell className="py-3 font-medium">
                              {group.loadingSheets && group.loadingSheets.length > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {group.loadingSheets.length} sheet{group.loadingSheets.length !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Will be created</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {/* Expanded view for allotments in this group */}
                          {group.allotments.map((allotment, allotmentIndex) => (
                            <TableRow
                              key={`${group.salesOrderId}-${allotment.lotNo}`}
                              className="border-b border-gray-100"
                            >
                              <TableCell className="py-2 pl-8">
                                <div className="text-xs text-muted-foreground">Lot</div>
                              </TableCell>
                              <TableCell className="py-2 text-xs text-muted-foreground" colSpan={2}>
                             
                              </TableCell>
                              <TableCell className="py-2" colSpan={2}>
                                <div className="font-medium text-sm">{allotment.lotNo}</div>
                                <div className="text-xs text-muted-foreground">
                                  {allotment.tape}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">{allotment.totalRolls}</TableCell>
                              <TableCell className="py-2">{allotment.totalRequiredRolls}</TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={allotment.totalRolls}
                                  value={allotment.dispatchRolls || ''}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? NaN : parseInt(e.target.value);
                                    const newDispatchRolls = isNaN(value) ? 0 : value;
                                    const updatedItems = [...dispatchItems];
                                    const groupIndex = updatedItems.findIndex(
                                      (g) => g.salesOrderId === group.salesOrderId
                                    );

                                    if (groupIndex !== -1) {
                                      const allotmentIndex = updatedItems[
                                        groupIndex
                                      ].allotments.findIndex((a) => a.lotNo === allotment.lotNo);
                                      if (allotmentIndex !== -1) {
                                        updatedItems[groupIndex].allotments[allotmentIndex] = {
                                          ...allotment,
                                          dispatchRolls: Math.min(
                                            newDispatchRolls,
                                            allotment.totalRolls
                                          ),
                                        };

                                        // Update group dispatch rolls total
                                        const groupDispatchRolls = updatedItems[
                                          groupIndex
                                        ].allotments.reduce(
                                          (sum, a) => sum + (a.dispatchRolls || 0),
                                          0
                                        );

                                        updatedItems[groupIndex] = {
                                          ...updatedItems[groupIndex],
                                          dispatchRolls: groupDispatchRolls,
                                        };
                                      }
                                    }

                                    setDispatchItems(updatedItems);
                                  }}
                                  className="text-xs h-8 w-20"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                {allotment.dispatchedRolls}
                              </TableCell>
                              <TableCell className="py-2">
                                {allotment.loadingSheet ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {allotment.loadingSheet.loadingNo}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">Will be created</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

                {/* Sequence Reordering Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <h4 className="text-xs font-semibold text-yellow-800 mb-1">
                    Reorder Sales Orders
                  </h4>
                  <p className="text-xs text-yellow-700">
                    Drag and drop the sales orders to reorder them in the sequence you want them to
                    be dispatched.
                  </p>
                </div>

                {/* Dispatch Sequence Table */}
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs font-medium text-gray-700 w-16">
                          Order
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">
                          SO Number
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">Party</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">
                          Customer
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">
                         LOTS
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">
                          Total Rolls
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">
                          Required Rolls
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">
                          Dispatch Rolls
                        </TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">Loading Sheets</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">Dispatch Order ID</TableHead>
                        <TableHead className="text-xs font-medium text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispatchItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                            No sales orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        dispatchItems.map((group, index) => (
                          <TableRow
                            key={group.salesOrderId}
                            className="border-b border-gray-100"
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={handleDragEnd}
                          >
                            <TableCell className="py-3">
                              <div className="font-medium text-sm cursor-move">#{index + 1} ≡</div>
                            </TableCell>
                            <TableCell className="py-3 font-medium">
                              {group.voucherNumber}
                            </TableCell>
                            <TableCell className="py-3">{group.partyName}</TableCell>
                            <TableCell className="py-3">{group.customerName}</TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {group.allotments.length} lot
                                  {group.allotments.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">{group.totalRolls}</TableCell>
                            <TableCell className="py-3">{group.totalRequiredRolls}</TableCell>
                            <TableCell className="py-3">
                              {group.allotments.reduce(
                                (sum, item) =>
                                  sum +
                                  (item.dispatchRolls !== undefined
                                    ? item.dispatchRolls
                                    : item.totalRolls),
                                0
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              {group.loadingSheets && group.loadingSheets.length > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {group.loadingSheets.length} sheet{group.loadingSheets.length !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Will be created</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              {group.loadingSheets && group.loadingSheets.length > 0 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {group.loadingSheets[0]?.dispatchOrderId || 'N/A'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Will be created</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveSalesOrderUp(index)}
                                  disabled={index === 0}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => moveSalesOrderDown(index)}
                                  disabled={index === dispatchItems.length - 1}
                                  className="h-6 w-6 p-0"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>  
              {/* Navigation Button */}
              <div className="flex  py-4 justify-end">
                <Button
                  onClick={() => setActiveTab('confirm')}
                  disabled={dispatchItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-4 text-xs"
                >
                  Review & Confirm Dispatch
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'confirm' && (
            <div>
              {/* Confirmation Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4">
                <h3 className="text-xs font-semibold text-blue-800 mb-2">Dispatch Confirmation</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Please review the details below before confirming the dispatch. You can reorder
                  the sales orders as needed.
                </p>
                    {/* Dispatch Information Form */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4">
                <h3 className="text-xs font-semibold text-blue-800 mb-2">Dispatch Information</h3>

                {/* Transport/Courier Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="transportCheckbox"
                      checked={isTransport}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setIsTransport(isChecked);
                        if (isChecked) {
                          setIsCourier(false);
                          setSelectedCourier(null);
                          setCourierDetails(null);
                          // Clear manual transport details when switching to courier
                          setManualTransportDetails({
                            transportName: '',
                            vehicleNumber: '',
                            driverName: '',
                            mobileNumber: '',
                            contactPerson: '',
                            phone: '',
                            maximumCapacityKgs: '',
                            license: ''
                          });
                        } else {
                          setSelectedTransport(null);
                          setTransportDetails(null);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="transportCheckbox" className="text-xs font-medium text-gray-700">
                      Transport
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="courierCheckbox"
                      checked={isCourier}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setIsCourier(isChecked);
                        if (isChecked) {
                          setIsTransport(false);
                          setSelectedTransport(null);
                          setTransportDetails(null);
                          // Clear manual transport details when switching to courier
                          setManualTransportDetails({
                            transportName: '',
                            vehicleNumber: '',
                            driverName: '',
                            mobileNumber: '',
                            contactPerson: '',
                            phone: '',
                            maximumCapacityKgs: '',
                            license: ''
                          });
                        } else {
                          setSelectedCourier(null);
                          setCourierDetails(null);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="courierCheckbox" className="text-xs font-medium text-gray-700">
                      Courier
                    </Label>
                  </div>
                </div>

                {/* Transport Dropdown */}
                {isTransport && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label htmlFor="transportSelect" className="text-xs font-medium text-gray-700">
                        Select Transport
                      </Label>
                      <select
                        id="transportSelect"
                        value={selectedTransport || ''}
                        onChange={(e) => handleTransportChange(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-300 bg-white py-1.5 px-3 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a transport</option>
                        {transports
                          .filter(t => t.isActive)
                          .map((transport) => (
                            <option key={transport.id} value={transport.id}>
                              {transport.transportName}
                            </option>
                          ))}
                      </select>
                    </div>

                    {transportDetails && (
                      <div className="bg-white border border-gray-200 rounded-md p-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Transport Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Name:</span> {transportDetails.transportName}
                          </div>
                          <div>
                            <span className="font-medium">Contact Person:</span> {transportDetails.contactPerson}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {transportDetails.phone}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {transportDetails.email}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">Address:</span> {transportDetails.address}
                          </div>
                          {transportDetails.vehicleNumber && (
                            <div>
                              <span className="font-medium">Vehicle No:</span> {transportDetails.vehicleNumber}
                            </div>
                          )}
                          {transportDetails.driverName && (
                            <div>
                              <span className="font-medium">Driver:</span> {transportDetails.driverName}
                            </div>
                          )}
                          {transportDetails.driverNumber && (
                            <div>
                              <span className="font-medium">Driver Number:</span> {transportDetails.driverNumber}
                            </div>
                          )}
                          {transportDetails.maximumCapacityKgs && (
                            <div>
                              <span className="font-medium">Capacity:</span> {transportDetails.maximumCapacityKgs} kgs
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Manual Transport Details Entry */}
                    {!selectedTransport && (
                      <div className="bg-white border border-gray-200 rounded-md p-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Enter Transport Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="manualTransportName" className="text-xs font-medium text-gray-700">
                              Transport Name *
                            </Label>
                            <Input
                              id="manualTransportName"
                              placeholder="Enter transport name"
                              value={manualTransportDetails.transportName}
                              onChange={(e) => handleManualTransportChange('transportName', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualContactPerson" className="text-xs font-medium text-gray-700">
                              Contact Person
                            </Label>
                            <Input
                              id="manualContactPerson"
                              placeholder="Enter contact person"
                              value={manualTransportDetails.contactPerson}
                              onChange={(e) => handleManualTransportChange('contactPerson', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualVehicleNumber" className="text-xs font-medium text-gray-700">
                              Vehicle Number
                            </Label>
                            <Input
                              id="manualVehicleNumber"
                              placeholder="Enter vehicle number"
                              value={manualTransportDetails.vehicleNumber}
                              onChange={(e) => handleManualTransportChange('vehicleNumber', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualPhone" className="text-xs font-medium text-gray-700">
                              Phone
                            </Label>
                            <Input
                              id="manualPhone"
                              placeholder="Enter phone number"
                              value={manualTransportDetails.phone}
                              onChange={(e) => handleManualTransportChange('phone', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualDriverName" className="text-xs font-medium text-gray-700">
                              Driver Name
                            </Label>
                            <Input
                              id="manualDriverName"
                              placeholder="Enter driver name"
                              value={manualTransportDetails.driverName}
                              onChange={(e) => handleManualTransportChange('driverName', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualMobileNumber" className="text-xs font-medium text-gray-700">
                              Mobile Number
                            </Label>
                            <Input
                              id="manualMobileNumber"
                              placeholder="Enter mobile number"
                              value={manualTransportDetails.mobileNumber}
                              onChange={(e) => handleManualTransportChange('mobileNumber', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualLicense" className="text-xs font-medium text-gray-700">
                              License
                            </Label>
                            <Input
                              id="manualLicense"
                              placeholder="Enter license"
                              value={manualTransportDetails.license}
                              onChange={(e) => handleManualTransportChange('license', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manualCapacity" className="text-xs font-medium text-gray-700">
                              Vehicle Capacity (kg)
                            </Label>
                            <Input
                              id="manualCapacity"
                              type="number"
                              placeholder="Enter capacity in kg"
                              value={manualTransportDetails.maximumCapacityKgs}
                              onChange={(e) => handleManualTransportChange('maximumCapacityKgs', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Courier Dropdown */}
                {isCourier && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label htmlFor="courierSelect" className="text-xs font-medium text-gray-700">
                        Select Courier
                      </Label>
                      <select
                        id="courierSelect"
                        value={selectedCourier || ''}
                        onChange={(e) => handleCourierChange(Number(e.target.value))}
                        className="w-full rounded-md border border-gray-300 bg-white py-1.5 px-3 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a courier</option>
                        {couriers
                          .filter(c => c.isActive)
                          .map((courier) => (
                            <option key={courier.id} value={courier.id}>
                              {courier.courierName}
                            </option>
                          ))}
                      </select>
                    </div>

                    {courierDetails && (
                      <div className="bg-white border border-gray-200 rounded-md p-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Courier Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-medium">Name:</span> {courierDetails.courierName}
                          </div>
                          <div>
                            <span className="font-medium">Contact Person:</span> {courierDetails.contactPerson}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {courierDetails.phone}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {courierDetails.email}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">Address:</span> {courierDetails.address}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Transport Entry when neither transport nor courier is selected */}
                {!isTransport && !isCourier && (
                  <div className="bg-white border border-gray-200 rounded-md p-3 mb-3">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Transport Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="manualTransportName2" className="text-xs font-medium text-gray-700">
                          Transport Name *
                        </Label>
                        <Input
                          id="manualTransportName2"
                          placeholder="Enter transport name"
                          value={manualTransportDetails.transportName}
                          onChange={(e) => handleManualTransportChange('transportName', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualContactPerson2" className="text-xs font-medium text-gray-700">
                          Contact Person
                        </Label>
                        <Input
                          id="manualContactPerson2"
                          placeholder="Enter contact person"
                          value={manualTransportDetails.contactPerson}
                          onChange={(e) => handleManualTransportChange('contactPerson', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualVehicleNumber2" className="text-xs font-medium text-gray-700">
                          Vehicle Number
                        </Label>
                        <Input
                          id="manualVehicleNumber2"
                          placeholder="Enter vehicle number"
                          value={manualTransportDetails.vehicleNumber}
                          onChange={(e) => handleManualTransportChange('vehicleNumber', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualPhone2" className="text-xs font-medium text-gray-700">
                          Phone
                        </Label>
                        <Input
                          id="manualPhone2"
                          placeholder="Enter phone number"
                          value={manualTransportDetails.phone}
                          onChange={(e) => handleManualTransportChange('phone', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualDriverName2" className="text-xs font-medium text-gray-700">
                          Driver Name
                        </Label>
                        <Input
                          id="manualDriverName2"
                          placeholder="Enter driver name"
                          value={manualTransportDetails.driverName}
                          onChange={(e) => handleManualTransportChange('driverName', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualMobileNumber2" className="text-xs font-medium text-gray-700">
                          Mobile Number
                        </Label>
                        <Input
                          id="manualMobileNumber2"
                          placeholder="Enter mobile number"
                          value={manualTransportDetails.mobileNumber}
                          onChange={(e) => handleManualTransportChange('mobileNumber', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualLicense2" className="text-xs font-medium text-gray-700">
                          License
                        </Label>
                        <Input
                          id="manualLicense2"
                          placeholder="Enter license"
                          value={manualTransportDetails.license}
                          onChange={(e) => handleManualTransportChange('license', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="manualCapacity2" className="text-xs font-medium text-gray-700">
                          Vehicle Capacity (kg)
                        </Label>
                        <Input
                          id="manualCapacity2"
                          type="number"
                          placeholder="Enter capacity in kg"
                          value={manualTransportDetails.maximumCapacityKgs}
                          onChange={(e) => handleManualTransportChange('maximumCapacityKgs', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid with dispatch data fields - removing vehicle, driver, license, and mobile number fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="dispatchDate" className="text-xs font-medium text-gray-700">
                      Dispatch Planning Date
                    </Label>
                    <Input
                      id="dispatchDate"
                      type="date"
                      value={dispatchData.dispatchDate}
                      onChange={(e) =>
                        setDispatchData({ ...dispatchData, dispatchDate: e.target.value })
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  {/* Removed vehicleNo, driverName, license, and mobileNumber fields as requested */}
                  
                  <div className="md:col-span-3 space-y-1">
                    <Label htmlFor="remarks" className="text-xs font-medium text-gray-700">
                      Remarks
                    </Label>
                    <Input
                      id="remarks"
                      placeholder="Any additional remarks"
                      value={dispatchData.remarks}
                      onChange={(e) =>
                        setDispatchData({ ...dispatchData, remarks: e.target.value })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>

          

              {/* Dispatch Summary */}
              <div className="bg-white border border-gray-200 rounded-md p-3 mt-4">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Dispatch Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                    <div className="text-xs text-blue-600 font-medium">Sales Orders</div>
                    <div className="text-lg font-bold text-blue-800">{dispatchItems.length}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-md p-2">
                    <div className="text-xs text-green-600 font-medium">Total Lots</div>
                    <div className="text-lg font-bold text-green-800">
                      {dispatchItems.reduce((sum, group) => sum + group.allotments.length, 0)}
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                    <div className="text-xs text-yellow-600 font-medium">Planned Rolls</div>
                    <div className="text-lg font-bold text-yellow-800">
                      {dispatchItems.reduce(
                        (sum, group) =>
                          sum +
                          group.allotments.reduce(
                            (itemSum, item) =>
                              itemSum +
                              (item.dispatchRolls !== undefined
                                ? item.dispatchRolls
                                : item.totalRolls),
                            0
                          ),
                        0
                      )}
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
                    <div className="text-xs text-purple-600 font-medium">Dispatched Rolls</div>
                    <div className="text-lg font-bold text-purple-800">
                      {dispatchItems.reduce((sum, group) => sum + group.totalDispatchedRolls, 0)}
                    </div>
                  </div>
                </div>
                  
                  {/* Status Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-md p-2">
                      <div className="text-xs text-green-600 font-medium">Fully Dispatched</div>
                      <div className="text-lg font-bold text-green-800">
                        {dispatchItems.filter(group => 
                          group.allotments.every(allotment => 
                            (allotment.dispatchRolls || 0) >= allotment.totalRequiredRolls
                          )
                        ).length} Sales Orders
                      </div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                      <div className="text-xs text-yellow-600 font-medium">Partially Dispatched</div>
                      <div className="text-lg font-bold text-yellow-800">
                        {dispatchItems.filter(group => 
                          group.allotments.some(allotment => 
                            (allotment.dispatchRolls || 0) < allotment.totalRequiredRolls && 
                            (allotment.dispatchRolls || 0) > 0
                          )
                        ).length} Sales Orders
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmation Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <h3 className="text-xs font-semibold text-yellow-800 mb-1">Important Notice</h3>
                  <p className="text-xs text-yellow-700">
                    Once you confirm the dispatch, the status of the selected items will be updated
                    and this action cannot be undone. Please ensure all details are correct before
                    proceeding.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    <strong>Note:</strong> Only lots where dispatched rolls match or exceed required rolls will be marked as fully dispatched.
                    Loading sheets will be automatically created for each dispatch.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('details')}
                    className="h-8 px-3 text-xs"
                  >
                    Back to Details
                  </Button>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dispatch-planning')}
                      className="h-8 px-3 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDispatch}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 px-4 text-xs"
                    >
                      {loading ? (
                        <>
                          <div className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          Dispatching...
                        </>
                      ) : (
                        <>
                          <Truck className="h-3 w-3 mr-1" />
                          Confirm Dispatch
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchDetails;