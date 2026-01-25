import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Search, Truck, Eye, FileText, ChevronDown, ChevronRight, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { storageCaptureApi, rollConfirmationApi, productionAllotmentApi, dispatchPlanningApi, apiUtils } from '@/lib/api-client';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import type {
  StorageCaptureResponseDto,
  DispatchPlanningDto,
  SalesOrderWebResponseDto,
  RollConfirmationResponseDto
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
  salesOrder?: SalesOrderWebResponseDto;
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
  const [loading, setLoading] = useState(false); // Changed from true to false - only show loading when fetching data
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLot, setSelectedLot] = useState<DispatchPlanningItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLots, setSelectedLots] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({}); // Track expanded groups
  const [voucherNumbers, setVoucherNumbers] = useState<string[]>([]);
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([]); // Changed to array for multi-select
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Fetch voucher numbers on mount
  useEffect(() => {
    fetchVoucherNumbers();
  }, []);

  // Fetch dispatch planning data when voucher selection changes - only if vouchers are selected
  useEffect(() => {
    if (selectedVouchers.length > 0) {
      fetchDispatchPlanningData();
    } else {
      // Clear data when no vouchers selected
      setDispatchItems([]);
      setFilteredItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVouchers]);

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

  const fetchVoucherNumbers = async () => {
    try {
      const numbers = await SalesOrderWebService.getVoucherNumbers();
      setVoucherNumbers(numbers);
    } catch (error) {
      console.error('Error fetching voucher numbers:', error);
      toast.error('Error', 'Failed to fetch voucher numbers');
    }
  };

  const fetchDispatchPlanningData = async () => {
    try {
      setLoading(true);

      // ============================================================
      // PERFORMANCE OPTIMIZATIONS:
      // - Reduced API calls from 100+ to just 5 requests total
      // - Use bulk endpoints instead of N+1 query patterns
      // - Parallel fetching with Promise.all
      // - Map lookups (O(1)) instead of array.find() (O(n))
      // ============================================================

      // STEP 1: Fetch all core data in parallel (3 parallel requests)
      const [allSalesOrders, allAllotments, allDispatchPlannings] = await Promise.all([
        SalesOrderWebService.getAllSalesOrdersWeb(),
        productionAllotmentApi.getAllProductionAllotments().then(response => apiUtils.extractData(response)),
        dispatchPlanningApi.getAllDispatchPlannings().then(response => apiUtils.extractData(response))
      ]);

      // Filter selected sales orders
      const selectedSalesOrdersList = allSalesOrders.filter(so =>
        selectedVouchers.includes(so.voucherNumber)
      );

      if (selectedSalesOrdersList.length === 0) {
        setDispatchItems([]);
        setFilteredItems([]);
        setLoading(false);
        return;
      }

      // Build a map of salesOrderId -> salesOrder for quick lookup
      const salesOrderMap = new Map(selectedSalesOrdersList.map(so => [so.id, so]));

      // Get all lot numbers for selected sales orders in one pass
      const allowedLotNumbers = new Set<string>();
      const lotToSalesOrderMap = new Map<string, { salesOrder: SalesOrderWebResponseDto; itemName: string }>();

      for (const allot of allAllotments) {
        const salesOrder = salesOrderMap.get(allot.salesOrderId);
        if (salesOrder) {
          allowedLotNumbers.add(allot.allotmentId);

          // Store sales order info for this lot
          // Always map the lot to the sales order, even if item match fails
          // Use allot.itemName as fallback when salesOrder item is not found
          const item = salesOrder.items.find(i => i.id === allot.salesOrderItemId);
          lotToSalesOrderMap.set(allot.allotmentId, {
            salesOrder,
            itemName: item?.itemName || allot.itemName || 'Unknown Item'
          });
        }
      }

      if (allowedLotNumbers.size === 0) {
        setDispatchItems([]);
        setFilteredItems([]);
        setLoading(false);
        return;
      }

      // Fetch storage captures for all lots at once (already optimized)
      const lotNumbersArray = Array.from(allowedLotNumbers);
      const storageCaptures = await storageCaptureApi.getStorageCapturesByLots(lotNumbersArray)
        .then(response => apiUtils.extractData(response));

      // Group storage captures by lotNo
      const lotGroups: Record<string, StorageCaptureResponseDto[]> = {};
      storageCaptures.forEach((capture: StorageCaptureResponseDto) => {
        if (!lotGroups[capture.lotNo]) {
          lotGroups[capture.lotNo] = [];
        }
        lotGroups[capture.lotNo].push(capture);
      });

      // Build loading sheet lookup map
      const lotToLoadingSheetMap = new Map<string, DispatchPlanningDto>();
      allDispatchPlannings.forEach((dp: DispatchPlanningDto) => {
        if (dp.lotNo && allowedLotNumbers.has(dp.lotNo)) {
          lotToLoadingSheetMap.set(dp.lotNo, dp);
        }
      });

      // Build allotment lookup map
      const allotmentMap = new Map(allAllotments.map(a => [a.allotmentId, a]));

      // OPTIMIZATION: Fetch roll confirmations for all lots in a single bulk request
      const lotNumbers = Object.keys(lotGroups);
      const rollConfirmationsData = await rollConfirmationApi.getRollConfirmationsByAllotIds(lotNumbers)
        .then(response => apiUtils.extractData(response));

      // Process all lots to build allotment items (no more loops with API calls)
      const allotmentItems: DispatchPlanningItem[] = [];

      for (const [lotNo, captures] of Object.entries(lotGroups)) {
        const readyRolls = captures.filter(c => !c.isDispatched).length;
        const dispatchedRolls = captures.filter(c => c.isDispatched).length;
        const firstCapture = captures[0];

        // Get roll confirmations from bulk response
        const rollConfirmations = (rollConfirmationsData[lotNo] || []) as RollConfirmationResponseDto[];
        const uniqueRolls = Array.from(new Set(captures.map(c => c.fgRollNo)));
        const rollDetails: RollDetail[] = uniqueRolls
          .map(fgRollNo => rollConfirmations.find(r => r.fgRollNo?.toString() === fgRollNo))
          .filter((r): r is RollConfirmationResponseDto => !!r && !!r.fgRollNo)
          .map(r => ({ fgRollNo: r.fgRollNo!.toString() }));

        // Get allotment data from map
        const allotmentData = allotmentMap.get(lotNo);
        const totalActualQuantity = allotmentData?.actualQuantity || 0;
        const totalRequiredRolls = allotmentData?.machineAllocations?.reduce(
          (sum, ma) => sum + (ma.totalRolls || 0), 0
        ) || 0;

        // Get sales order info from map
        const salesOrderInfo = lotToSalesOrderMap.get(lotNo);

        allotmentItems.push({
          lotNo,
          customerName: firstCapture.customerName,
          tape: firstCapture.tape,
          totalRolls: readyRolls,
          totalNetWeight: 0,
          totalActualQuantity,
          totalRequiredRolls,
          dispatchedRolls,
          isDispatched: captures.every(c => c.isDispatched),
          rolls: rollDetails,
          salesOrder: salesOrderInfo?.salesOrder,
          salesOrderItemName: salesOrderInfo?.itemName,
          loadingSheet: lotToLoadingSheetMap.get(lotNo)
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
              partyName: item.salesOrder.buyerName,
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

      // Set group loading sheets from already loaded loadingSheet data
      Object.values(salesOrderGroups).forEach(group => {
        const groupLoadingSheets: DispatchPlanningDto[] = [];
        group.allotments.forEach(allotment => {
          if (allotment.loadingSheet) {
            groupLoadingSheets.push(allotment.loadingSheet);
          }
        });
        group.loadingSheets = groupLoadingSheets;
      });

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
          {/* Filter Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex flex-col gap-3">
              {/* Voucher Number Filter */}
              <div className="flex-1">
                <Label htmlFor="voucher-filter" className="text-xs font-medium text-gray-700 mb-1 block">
                  Select Sales Orders (Multi-select)
                </Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-8 justify-between text-xs"
                    >
                      {selectedVouchers.length === 0
                        ? 'Select sales orders...'
                        : `${selectedVouchers.length} selected`}
                      <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search sales orders..." className="h-8 text-xs" />
                      <CommandEmpty>No sales orders found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {voucherNumbers.map((voucher) => (
                          <CommandItem
                            key={voucher}
                            onSelect={() => {
                              const newSelected = selectedVouchers.includes(voucher)
                                ? selectedVouchers.filter((v) => v !== voucher)
                                : [...selectedVouchers, voucher];
                              setSelectedVouchers(newSelected);
                            }}
                            className="text-xs"
                          >
                            <Checkbox
                              checked={selectedVouchers.includes(voucher)}
                              className="mr-2 h-4 w-4"
                            />
                            {voucher}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {/* Display selected vouchers as badges */}
                {selectedVouchers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedVouchers.map((voucher) => (
                      <Badge
                        key={voucher}
                        variant="secondary"
                        className="text-xs pl-2 pr-1 py-0"
                      >
                        {voucher}
                        <button
                          onClick={() => {
                            setSelectedVouchers(selectedVouchers.filter((v) => v !== voucher));
                          }}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVouchers([])}
                      className="h-5 px-2 text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>

              {/* Search Section */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
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
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <Search className="h-12 w-12 mb-3 text-gray-400" />
                          <p className="text-sm font-medium">
                            {selectedVouchers.length === 0
                              ? 'Please select sales orders from the dropdown above to view dispatch planning data'
                              : 'No dispatch planning data found for selected sales orders'}
                          </p>
                        </div>
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

                                  const newSelectedLots = { ...selectedLots };
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
                          {new Date(selectedLot.salesOrder.orderDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
                        <div className="text-xs text-purple-600 font-medium">Party</div>
                        <div className="text-sm font-medium">{selectedLot.salesOrder.buyerName}</div>
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