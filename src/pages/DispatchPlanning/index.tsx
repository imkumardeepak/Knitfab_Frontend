import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Package, Truck, Eye, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/lib/toast';
import { storageCaptureApi, rollConfirmationApi, productionAllotmentApi, salesOrderApi, dispatchPlanningApi, apiUtils } from '@/lib/api-client';
import type { 
  StorageCaptureResponseDto, 
  RollConfirmationResponseDto,
  ProductionAllotmentDto,
  SalesOrderDto,
  DispatchPlanningDto
} from '@/types/api-types';

// Define types for our dispatch planning data
interface DispatchPlanningItem {
  lotNo: string;
  customerName: string;
  tape: string;
  totalRolls: number;
  totalNetWeight: number;
  totalActualQuantity: number;
  totalRequiredRolls: number;
  dispatchedRolls: number; // Add this new field
  isDispatched: boolean;
  rolls: RollDetail[];
  salesOrder?: SalesOrderDto;
  salesOrderItemName?: string;
  // Add loading sheet information
  loadingSheet?: DispatchPlanningDto;
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
  totalRequiredRolls: number;
  totalDispatchedRolls: number; // Add this new field
  isFullyDispatched: boolean;
  // Add loading sheet information
  loadingSheets?: DispatchPlanningDto[];
}

interface RollDetail {
  fgRollNo: string;
}

const DispatchPlanning = () => {
  const navigate = useNavigate();
  const [dispatchItems, setDispatchItems] = useState<SalesOrderGroup[]>([]);
  const [filteredItems, setFilteredItems] = useState<SalesOrderGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLot, setSelectedLot] = useState<DispatchPlanningItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLots, setSelectedLots] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({}); // Track expanded groups

  // Fetch dispatch planning data
  useEffect(() => {
    fetchDispatchPlanningData();
  }, []);

  // Filter items when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(dispatchItems);
    } else {
      const filtered = dispatchItems.filter(group => 
        group.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.allotments.some(allotment => 
          allotment.tape.toLowerCase().includes(searchTerm.toLowerCase()) ||
          allotment.lotNo.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, dispatchItems]);

  const fetchDispatchPlanningData = async () => {
    try {
      setLoading(true);
      
      // Step 1: Fetch all storage captures
      const storageResponse = await storageCaptureApi.getAllStorageCaptures();
      const storageCaptures = apiUtils.extractData(storageResponse);
      
      // Group storage captures by lotNo
      const lotGroups: Record<string, StorageCaptureResponseDto[]> = {};
      
      storageCaptures.forEach(capture => {
        if (!lotGroups[capture.lotNo]) {
          lotGroups[capture.lotNo] = [];
        }
        lotGroups[capture.lotNo].push(capture);
      });
      
      // Step 2: For each lot, fetch roll details and sales order information
      const allotmentItems: DispatchPlanningItem[] = [];
      
      for (const [lotNo, captures] of Object.entries(lotGroups)) {
        // Get unique roll numbers for this lot
        const uniqueRolls = Array.from(new Set(captures.map(c => c.fgRollNo)));
        
        // Count only non-dispatched rolls as ready rolls
        const readyRolls = captures.filter(c => !c.isDispatched).length;
        
        // Fetch roll confirmation details for each roll
        const rollDetails: RollDetail[] = [];
        let totalNetWeight = 0;
        
        for (const fgRollNo of uniqueRolls) {
          try {
            // Get roll confirmations by lotNo
            const rollResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(lotNo);
            const rollConfirmations = apiUtils.extractData(rollResponse);
            
            // Find the specific roll with matching fgRollNo
            const roll = rollConfirmations.find(r => r.fgRollNo?.toString() === fgRollNo);
            
            if (roll) {
              rollDetails.push({
                fgRollNo: roll.fgRollNo?.toString() || ''
              });
            }
          } catch (error) {
            console.error(`Error fetching roll details for ${fgRollNo}:`, error);
          }
        }
        
        // Get customer and tape info from first capture
        const firstCapture = captures[0];
        
        // Calculate dispatched rolls count
        const dispatchedRolls = captures.filter(c => c.isDispatched).length;
        
        // Get total actual quantity, total required rolls and sales order info from production allotment
        let totalActualQuantity = 0;
        let totalRequiredRolls = 0;
        let salesOrder: SalesOrderDto | undefined;
        let salesOrderItemName: string | undefined;
        
        try {
          const allotmentResponse = await productionAllotmentApi.getProductionAllotmentByAllotId(lotNo);
          const allotmentData = apiUtils.extractData(allotmentResponse);
          totalActualQuantity = allotmentData?.actualQuantity || 0;
          
          // Calculate total required rolls from machine allocations
          if (allotmentData?.machineAllocations) {
            totalRequiredRolls = allotmentData.machineAllocations.reduce((sum, ma) => sum + (ma.totalRolls || 0), 0);
          }
          
          // Fetch the sales order details using the salesOrderId from allotment
          if (allotmentData?.salesOrderId) {
            try {
              const salesOrderResponse = await salesOrderApi.getSalesOrderById(allotmentData.salesOrderId);
              salesOrder = apiUtils.extractData(salesOrderResponse);
              
              // Find the specific sales order item
              const salesOrderItem = salesOrder.items.find(item => item.id === allotmentData.salesOrderItemId);
              salesOrderItemName = salesOrderItem?.stockItemName;
            } catch (error) {
              console.error(`Error fetching sales order data for ${allotmentData.salesOrderId}:`, error);
            }
          }
        } catch (error) {
          console.error(`Error fetching production allotment data for ${lotNo}:`, error);
        }
        
        allotmentItems.push({
          lotNo,
          customerName: firstCapture.customerName,
          tape: firstCapture.tape,
          totalRolls: readyRolls, // Use ready rolls instead of total unique rolls
          totalNetWeight,
          totalActualQuantity,
          totalRequiredRolls,
          dispatchedRolls, // Add the new field
          isDispatched: captures.every(c => c.isDispatched),
          rolls: rollDetails,
          salesOrder,
          salesOrderItemName
        });
      }
      
      // Group allotments by sales order
      const salesOrderGroups: Record<number, SalesOrderGroup> = {};
      
      allotmentItems.forEach(item => {
        if (item.salesOrder) {
          const salesOrderId = item.salesOrder.id;
          
          if (!salesOrderGroups[salesOrderId]) {
            salesOrderGroups[salesOrderId] = {
              salesOrderId,
              voucherNumber: item.salesOrder.voucherNumber,
              partyName: item.salesOrder.partyName,
              customerName: item.customerName,
              allotments: [],
              totalRolls: 0,
              totalNetWeight: 0,
              totalActualQuantity: 0,
              totalRequiredRolls: 0,
              totalDispatchedRolls: 0, // Add the new field
              isFullyDispatched: true
            };
          }
          
          salesOrderGroups[salesOrderId].allotments.push(item);
          salesOrderGroups[salesOrderId].totalRolls += item.totalRolls;
          salesOrderGroups[salesOrderId].totalNetWeight += item.totalNetWeight;
          salesOrderGroups[salesOrderId].totalActualQuantity += item.totalActualQuantity;
          salesOrderGroups[salesOrderId].totalRequiredRolls += item.totalRequiredRolls;
          salesOrderGroups[salesOrderId].totalDispatchedRolls += item.dispatchedRolls; // Add the new field
          
          // Check if all allotments are fully dispatched based on required rolls
          const allFullyDispatched = item.totalRequiredRolls <= item.dispatchedRolls;
          if (!allFullyDispatched) {
            salesOrderGroups[salesOrderId].isFullyDispatched = false;
          }
        }
      });
      
      // Fetch dispatch planning records to get loading sheet information
      try {
        const dispatchPlanningResponse = await dispatchPlanningApi.getAllDispatchPlannings();
        const dispatchPlannings: DispatchPlanningDto[] = apiUtils.extractData(dispatchPlanningResponse);
        
        // Map loading sheets to lot numbers
        const lotToLoadingSheetsMap: Record<string, DispatchPlanningDto[]> = {};
        dispatchPlannings.forEach((dp: DispatchPlanningDto) => {
          if (dp.lotNo) {
            if (!lotToLoadingSheetsMap[dp.lotNo]) {
              lotToLoadingSheetsMap[dp.lotNo] = [];
            }
            lotToLoadingSheetsMap[dp.lotNo].push(dp);
          }
        });
        
        // Update allotments with loading sheet information
        Object.values(salesOrderGroups).forEach(group => {
          group.allotments.forEach(allotment => {
            if (lotToLoadingSheetsMap[allotment.lotNo]) {
              allotment.loadingSheet = lotToLoadingSheetsMap[allotment.lotNo][0]; // Take the first one for now
            }
          });
          
          // Set group loading sheets
          const groupLoadingSheets: DispatchPlanningDto[] = [];
          group.allotments.forEach(allotment => {
            if (allotment.loadingSheet) {
              groupLoadingSheets.push(allotment.loadingSheet);
            }
          });
          group.loadingSheets = groupLoadingSheets;
        });
      } catch (error) {
        console.error('Error fetching dispatch planning data:', error);
      }
      
      const groupedItems = Object.values(salesOrderGroups);
      setDispatchItems(groupedItems);
      setFilteredItems(groupedItems);
    } catch (error) {
      console.error('Error fetching dispatch planning data:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to fetch dispatch planning data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDispatchPlanningData();
  };

  const toggleDispatchStatus = async (lotNo: string, currentStatus: boolean) => {
    try {
      // Find all storage captures for this lot
      const storageResponse = await storageCaptureApi.getAllStorageCaptures();
      const storageCaptures = apiUtils.extractData(storageResponse);
      
      // Filter captures for this lot
      const lotCaptures = storageCaptures.filter(capture => capture.lotNo === lotNo);
      
      // Update each capture's dispatch status
      const updatePromises = lotCaptures.map(capture => {
        const updateDto = {
          lotNo: capture.lotNo,
          fgRollNo: capture.fgRollNo,
          locationCode: capture.locationCode,
          tape: capture.tape,
          customerName: capture.customerName,
          isDispatched: !currentStatus, // Toggle the status
          isActive: capture.isActive
        };
        
        return storageCaptureApi.updateStorageCapture(capture.id, updateDto);
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      toast.success('Success', `Dispatch status for lot ${lotNo} updated to ${currentStatus ? 'Pending' : 'Dispatched'}`);
      // Refresh the data
      fetchDispatchPlanningData();
    } catch (error) {
      console.error('Error updating dispatch status:', error);
      const errorMessage = apiUtils.handleError(error);
      toast.error('Error', errorMessage || 'Failed to update dispatch status');
    }
  };

  return (
    <div className="p-2 max-w-7xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base font-semibold">
              Dispatch Planning
            </CardTitle>
          </div>
          <p className="text-white/80 text-xs mt-1">
            Plan and manage dispatch of finished goods
          </p>
        </CardHeader>

        <CardContent className="p-3">
          {/* Search Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1">
                <Label htmlFor="search" className="text-xs font-medium text-gray-700 mb-1 block">
                  Search Sales Orders
                </Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by SO number, party, customer, tape, or lot number..."
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
                <Button 
                  onClick={() => {
                    // Get selected lots
                    const selectedLotItems = filteredItems.flatMap(group => 
                      group.allotments.filter(allotment => selectedLots[allotment.lotNo])
                    );
                    if (selectedLotItems.length === 0) {
                      toast.error('Error', 'Please select at least one lot for dispatch');
                      return;
                    }
                    // Navigate to dispatch page with selected lots
                    navigate('/dispatch-details', { state: { selectedLots: selectedLotItems } });
                  }}
                  variant="default" 
                  size="sm"
                  className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                  disabled={!Object.values(selectedLots).some(selected => selected)}
                >
                  <Truck className="h-3 w-3 mr-1" />
                  Dispatch Selected ({Object.values(selectedLots).filter(selected => selected).length})
                </Button>
                <Button 
                  onClick={() => navigate('/loading-sheets')}
                  variant="outline" 
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Loading Sheets
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="text-xs text-blue-600 font-medium">Total Sales Orders</div>
              <div className="text-lg font-bold text-blue-800">{filteredItems.length}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="text-xs text-green-600 font-medium">Total Lots</div>
              <div className="text-lg font-bold text-green-800">
                {filteredItems.reduce((sum, group) => sum + group.allotments.length, 0)}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <div className="text-xs text-orange-600 font-medium">Pending Dispatch</div>
              <div className="text-lg font-bold text-orange-800">
                {filteredItems.filter(group => !group.isFullyDispatched).length}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading dispatch data...</span>
            </div>
          )}

          {/* Dispatch Planning Table */}
          {!loading && (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-xs font-medium text-gray-700 w-12"></TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">SO Number</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Party</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Customer</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Lot</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Ready Rolls</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Required Rolls</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Dispatched Rolls</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Loading Sheets</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Status</TableHead>
                    <TableHead className="text-xs font-medium text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No dispatch planning data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((group) => (
                      <Fragment key={group.salesOrderId}>
                        <TableRow className="border-b border-gray-100 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                          onClick={() => setExpandedGroups(prev => ({
                            ...prev,
                            [group.salesOrderId]: !prev[group.salesOrderId]
                          }))}>
                          <TableCell className="py-3">
                            <div className="flex items-center">
                              {expandedGroups[group.salesOrderId] ? 
                                <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              }
                              <input
                                type="checkbox"
                                checked={group.allotments.every(allotment => selectedLots[allotment.lotNo])}
                                onChange={(e) => {
                                  e.stopPropagation(); // Prevent row expansion when clicking checkbox
                                  // Check if any allotment has ready rolls
                                  const hasReadyRolls = group.allotments.some(allotment => allotment.totalRolls > 0);
                                  
                                  if (!hasReadyRolls) {
                                    toast.warning('Warning', 'Cannot select this group as none of the lotments have ready rolls available for dispatch');
                                    return;
                                  }
                                  
                                  const newSelectedLots = {...selectedLots};
                                  group.allotments.forEach(allotment => {
                                    // Only allow selection if allotment has ready rolls
                                    if (allotment.totalRolls > 0) {
                                      newSelectedLots[allotment.lotNo] = e.target.checked;
                                    }
                                  });
                                  setSelectedLots(newSelectedLots);
                                }}
                                className="h-4 w-4 rounded border-gray-900 text-blue-600 focus:ring-blue-500 ml-2"
                                // disabled={group.allotments.every(allotment => allotment.totalRolls === 0)}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-3 font-medium">
                            {group.voucherNumber}
                          </TableCell>
                          <TableCell className="py-3">
                            {group.partyName}
                          </TableCell>
                          <TableCell className="py-3">
                            {group.customerName}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {group.allotments.length} lot{group.allotments.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 font-medium">
                            {group.totalRolls}
                          </TableCell>
                          <TableCell className="py-3 font-medium">
                            {group.totalRequiredRolls}
                          </TableCell>
                          <TableCell className="py-3 font-medium">
                            {group.totalDispatchedRolls}
                          </TableCell>
                          <TableCell className="py-3 font-medium">
                            {group.loadingSheets && group.loadingSheets.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {group.loadingSheets.map((sheet, index) => (
                                  <span 
                                    key={sheet.id} 
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                    title={`Loading No: ${sheet.loadingNo}`}
                                  >
                                    #{index + 1}
                                  </span>
                                ))}
                                <span className="text-xs text-gray-500">
                                  ({group.loadingSheets.length} sheet{group.loadingSheets.length !== 1 ? 's' : ''})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">None</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge 
                              variant={group.isFullyDispatched ? "default" : "secondary"}
                              className={group.isFullyDispatched ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                            >
                              {group.isFullyDispatched ? "Dispatched" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row expansion when clicking button
                                navigate('/loading-sheets')
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* Expanded view for allotments in this group - only shown when expanded */}
                        {expandedGroups[group.salesOrderId] && group.allotments.map((allotment) => (
                          <TableRow key={`${group.salesOrderId}-${allotment.lotNo}`} className="border-b border-gray-100">
                            <TableCell className="py-2 pl-12">
                              <input
                                type="checkbox"
                                checked={selectedLots[allotment.lotNo] || false}
                                onChange={(e) => {
                                  e.stopPropagation(); // Prevent row expansion when clicking checkbox
                                  // Check if allotment has ready rolls before allowing selection
                                  if (allotment.totalRolls === 0) {
                                    toast.warning('Warning', `Cannot select lot ${allotment.lotNo} as it has no ready rolls available for dispatch`);
                                    return;
                                  }
                                  
                                  setSelectedLots({
                                    ...selectedLots,
                                    [allotment.lotNo]: e.target.checked
                                  });
                                }}
                                className="h-4 w-4 rounded border-gray-900 text-blue-600 focus:ring-blue-500"
                               // disabled={allotment.totalRolls === 0}
                              />
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">
                              Lot No.:
                            </TableCell>
                            <TableCell className="py-2" colSpan={2}>
                              <div className="font-medium text-sm">{allotment.lotNo}</div>
                              <div className="text-xs text-muted-foreground">{allotment.tape}</div>
                            </TableCell>
                            <TableCell className="py-2"></TableCell>
                            <TableCell className="py-2">
                              {allotment.totalRolls}
                            </TableCell>
                            <TableCell className="py-2">
                              {allotment.totalRequiredRolls}
                            </TableCell>
                            <TableCell className="py-2">
                              {allotment.dispatchedRolls}
                            </TableCell>
                            <TableCell className="py-2">
                              {allotment.loadingSheet ? (
                                <span 
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                  title={`Loading No: ${allotment.loadingSheet.loadingNo}`}
                                >
                                  Sheet
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">None</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge 
                                variant={allotment.totalRequiredRolls <= allotment.dispatchedRolls ? "default" : "secondary"}
                                className={allotment.totalRequiredRolls <= allotment.dispatchedRolls ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                              >
                                {allotment.totalRequiredRolls <= allotment.dispatchedRolls ? "Dispatched" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row expansion when clicking button
                                  setSelectedLot(allotment);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Roll Details Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Roll Details for Lot: {selectedLot?.lotNo} - {selectedLot?.customerName}
                </DialogTitle>
              </DialogHeader>
              {selectedLot && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                      <div className="text-xs text-blue-600 font-medium">Lot No</div>
                      <div className="text-sm font-medium">{selectedLot.lotNo}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-md p-2">
                      <div className="text-xs text-green-600 font-medium">Customer</div>
                      <div className="text-sm font-medium">{selectedLot.customerName}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
                      <div className="text-xs text-purple-600 font-medium">Tape</div>
                      <div className="text-sm font-medium">{selectedLot.tape}</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
                      <div className="text-xs text-orange-600 font-medium">Loading Sheet</div>
                      <div className="text-sm font-medium">
                        {selectedLot.loadingSheet ? selectedLot.loadingSheet.loadingNo : 'None'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                      <div className="text-xs text-blue-600 font-medium">Ready Rolls</div>
                      <div className="text-sm font-medium">{selectedLot.totalRolls}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-md p-2">
                      <div className="text-xs text-green-600 font-medium">Required Rolls</div>
                      <div className="text-sm font-medium">{selectedLot.totalRequiredRolls}</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                      <div className="text-xs text-yellow-600 font-medium">Dispatched Rolls</div>
                      <div className="text-sm font-medium">{selectedLot.dispatchedRolls}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
                      <div className="text-xs text-purple-600 font-medium">Status</div>
                      <div className="text-sm font-medium">
                        <Badge 
                          variant={selectedLot.totalRequiredRolls <= selectedLot.dispatchedRolls ? "default" : "secondary"}
                          className={selectedLot.totalRequiredRolls <= selectedLot.dispatchedRolls ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                        >
                          {selectedLot.totalRequiredRolls <= selectedLot.dispatchedRolls ? "Dispatched" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {selectedLot.salesOrder && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                        <div className="text-xs text-blue-600 font-medium">SO Number</div>
                        <div className="text-sm font-medium">{selectedLot.salesOrder.voucherNumber}</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-md p-2">
                        <div className="text-xs text-green-600 font-medium">SO Item</div>
                        <div className="text-sm font-medium">{selectedLot.salesOrderItemName || 'N/A'}</div>
                      </div>
                      <div className="bg-cyan-50 border border-cyan-200 rounded-md p-2">
                        <div className="text-xs text-cyan-600 font-medium">SO Date</div>
                        <div className="text-sm font-medium">
                          {new Date(selectedLot.salesOrder.salesDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
                        <div className="text-xs text-purple-600 font-medium">Party</div>
                        <div className="text-sm font-medium">{selectedLot.salesOrder.partyName}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-xs py-2 px-3">FG Roll No</TableHead>
                          <TableHead className="text-xs py-2 px-3">Machine</TableHead>
                          <TableHead className="text-xs py-2 px-3">Roll No</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLot.rolls.map((roll) => (
                          <TableRow key={roll.fgRollNo} className="border-b border-gray-100">
                            <TableCell className="py-2 px-3 text-sm">{roll.fgRollNo}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50 font-medium">
                          <TableCell className="py-2 px-3 text-sm" colSpan={3}>
                            Total for Lot {selectedLot.lotNo}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Loading Sheet Information */}
                  {selectedLot.loadingSheet && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-md p-3">
                      <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center">
                        <FileText className="h-3 w-3 mr-1" />
                        Loading Sheet Information
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Loading No:</span> {selectedLot.loadingSheet.loadingNo}
                        </div>
                        <div>
                          <span className="font-medium">Dispatch Order ID:</span> {selectedLot.loadingSheet.dispatchOrderId}
                        </div>
                        <div>
                          <span className="font-medium">Vehicle:</span> {selectedLot.loadingSheet.vehicleNo}
                        </div>
                        <div>
                          <span className="font-medium">Driver:</span> {selectedLot.loadingSheet.driverName}
                        </div>
                        <div>
                          <span className="font-medium">Dispatched Rolls:</span> {selectedLot.loadingSheet.totalDispatchedRolls}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Remarks:</span> {selectedLot.loadingSheet.remarks || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DispatchPlanning;