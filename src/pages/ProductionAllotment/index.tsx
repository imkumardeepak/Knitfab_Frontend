import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProductionAllotments } from '@/hooks/queries/useProductionAllotmentQueries';
import { useSearchProductionAllotments } from '@/hooks/queries/useProductionAllotmentSearchQueries';
import { useShifts } from '@/hooks/queries/useShiftQueries';
import { useRollConfirmations } from '@/hooks/queries/useRollConfirmationQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Eye, FileText, QrCode, Plus, Edit, Play, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/DataTable';
import { productionAllotmentApi, rollAssignmentApi } from '@/lib/api-client';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import { toast } from '@/lib/toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ProductionAllotmentPDFDocument from './ProductionAllotmentPDFDocument';
import type {
  ProductionAllotmentResponseDto,
  MachineAllocationResponseDto,
  GeneratedBarcodeDto,
  RollAssignmentResponseDto,
  ProductionAllotmentSearchRequestDto,
  SalesOrderWebResponseDto,
  SalesOrderItemWebResponseDto,
} from '@/types/api-types';
import type { AxiosError } from 'axios';
import type { ColumnDef } from '@tanstack/react-table';

// Interface for shift-wise roll assignment
// Extending the API interface to match the backend response
type ShiftRollAssignment = RollAssignmentResponseDto;

// Interface for sticker generation confirmation
interface StickerGenerationConfirmation {
  assignmentId: number;
  barcodeCount: number;
  assignment?: ShiftRollAssignment;
}

// Interface for reprint sticker data
interface ReprintStickerData {
  rollNumber: number | null;
  reason: string;
}

interface LotAllocationSummary {
  id: number;
  allotmentId: string;
  actualQuantity: number;
  productionStatus: number;
  isOnHold: boolean;
  isSuspended: boolean;
  createdRollNetWeight: number;
  createdRollCount: number;
  createdDate: string;
  machineAllocations: MachineAllocationResponseDto[];
}

interface ItemAllocationSummary {
  salesOrderItemId: number;
  totalAllottedQuantity: number;
  totalCreatedRollNetWeight: number;
  totalCreatedRollCount: number;
  lotCount: number;
  lots: LotAllocationSummary[];
}

interface SplitLotContext {
  sourceLotId: number;
  sourceAllotmentId: string;
  sourceLotReadyQuantity: number;
  sourceLotFinalQuantity: number;
  markSourceLotComplete: boolean;
  newLotQuantity: number;
  salesOrderItemQuantity: number;
  totalLots: number;
  totalPlannedQuantity: number;
  totalReadyQuantity: number;
}

interface CreateNewLotDialogData {
  orderData: SalesOrderWebResponseDto;
  selectedItem: SalesOrderItemWebResponseDto;
  itemAllocation: ItemAllocationSummary;
  selectedLotSummary: LotAllocationSummary;
}

const ProductionAllotment: React.FC = () => {
  const navigate = useNavigate();
  const { data: productionAllotments = [], isLoading, error, refetch } = useProductionAllotments();
  const { data: shifts = [] } = useShifts();
  const { data: rollConfirmations = [], isLoading: isRcLoading } = useRollConfirmations();
  const [selectedAllotment, setSelectedAllotment] = useState<ProductionAllotmentResponseDto | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [showShiftAssignment, setShowShiftAssignment] = useState(false);
  // Add state for sticker generation confirmation
  const [showStickerConfirmation, setShowStickerConfirmation] = useState(false);
  const [stickerConfirmationData, setStickerConfirmationData] =
    useState<StickerGenerationConfirmation | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<MachineAllocationResponseDto | null>(null);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftRollAssignment[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    shiftId: 0,
    assignedRolls: 0,
    operatorName: '',
    timestamp: new Date().toISOString(),
  });

  // State for sticker generation
  const [stickerCounts, setStickerCounts] = useState<Record<number, number>>({});

  // Add state for reprint sticker functionality
  const [showReprintDialog, setShowReprintDialog] = useState(false);
  const [reprintData, setReprintData] = useState<ReprintStickerData>({
    rollNumber: null,
    reason: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('active');
  const itemsPerPage = 10; // Voucher groups per page

  // Search and filter states (removed voucher search)
  const [searchParams, setSearchParams] = useState<ProductionAllotmentSearchRequestDto>({});
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Use search query when search parameters are provided
  const { data: searchedAllotments = [], isLoading: isSearchLoading, error: searchError } = useSearchProductionAllotments(
    Object.keys(searchParams).length > 0 ? searchParams : undefined
  );

  // State for resume confirmation dialog
  const [showResumeConfirmation, setShowResumeConfirmation] = useState(false);
  const [selectedAllotmentForResume, setSelectedAllotmentForResume] = useState<ProductionAllotmentResponseDto | null>(null);

  // State for restart confirmation dialog
  const [showRestartConfirmation, setShowRestartConfirmation] = useState(false);
  const [selectedAllotmentForRestart, setSelectedAllotmentForRestart] = useState<ProductionAllotmentResponseDto | null>(null);

  // State for create new lot dialog
  const [showCreateNewLotDialog, setShowCreateNewLotDialog] = useState(false);
  const [selectedAllotmentForNewLot, setSelectedAllotmentForNewLot] = useState<ProductionAllotmentResponseDto | null>(null);
  const [createNewLotDialogData, setCreateNewLotDialogData] = useState<CreateNewLotDialogData | null>(null);
  const [isLoadingCreateNewLotDialog, setIsLoadingCreateNewLotDialog] = useState(false);
  const [createNewLotDialogError, setCreateNewLotDialogError] = useState<string | null>(null);
  const [completeSelectedLotBeforeSplit, setCompleteSelectedLotBeforeSplit] = useState(false);
  const [selectedLotQuantityToKeep, setSelectedLotQuantityToKeep] = useState(0);

  // State for hold/suspend functionality
  const [isOnHold, setIsOnHold] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({
    key: 'voucherNumber',
    direction: 'desc'
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const roundToThree = (value: number) => Number(value.toFixed(3));

  const getCreateNewLotPreview = React.useMemo(() => {
    if (!createNewLotDialogData) {
      return null;
    }

    const { itemAllocation, selectedItem, selectedLotSummary } = createNewLotDialogData;
    const otherLots = itemAllocation.lots.filter((lot) => lot.id !== selectedLotSummary.id);
    const otherLotsPlannedQuantity = otherLots.reduce(
      (sum, lot) => sum + (Number(lot.actualQuantity) || 0),
      0
    );
    const selectedLotReadyQuantity = Number(selectedLotSummary.createdRollNetWeight) || 0;
    const selectedLotCurrentPlannedQuantity = Number(selectedLotSummary.actualQuantity) || 0;
    const selectedLotFinalQuantity = completeSelectedLotBeforeSplit
      ? selectedLotReadyQuantity
      : Number(selectedLotQuantityToKeep) || 0;
    const newLotQuantity = roundToThree(
      Number(selectedItem.qty || 0) - otherLotsPlannedQuantity - selectedLotFinalQuantity
    );
    const totalMachineLoad = selectedLotSummary.machineAllocations.reduce(
      (sum, machine) => sum + (Number(machine.totalLoadWeight) || 0),
      0
    );
    const machineRatio = totalMachineLoad > 0 ? selectedLotFinalQuantity / totalMachineLoad : 0;
    const machinePreviews = selectedLotSummary.machineAllocations.map((machine) => {
      const revisedWeight = roundToThree((Number(machine.totalLoadWeight) || 0) * machineRatio);
      const revisedRollsExact = Number(machine.rollPerKg) > 0
        ? revisedWeight / Number(machine.rollPerKg)
        : 0;

      return {
        ...machine,
        revisedWeight,
        revisedRolls: revisedRollsExact > 0 ? Math.ceil(revisedRollsExact) : 0,
      };
    });

    return {
      otherLots,
      otherLotsPlannedQuantity,
      selectedLotReadyQuantity,
      selectedLotCurrentPlannedQuantity,
      selectedLotFinalQuantity,
      newLotQuantity,
      machinePreviews,
    };
  }, [createNewLotDialogData, completeSelectedLotBeforeSplit, selectedLotQuantityToKeep]);

  const handleResumeFromTable = (allotment: ProductionAllotmentResponseDto) => {
    setSelectedAllotmentForResume(allotment);
    setShowResumeConfirmation(true);
  };

  const confirmResume = async () => {
    if (!selectedAllotmentForResume) return;

    try {
      // Call the API to resume production
      const updatedAllotment = await ProductionAllotmentService.toggleHold(selectedAllotmentForResume.id);

      // Update local state and show success message
      toast.success('Production resumed');

      // Refetch the data to update the table
      refetch();
    } catch (error) {
      toast.error('Failed to resume production');
      console.error('Error resuming production:', error);
    } finally {
      setShowResumeConfirmation(false);
      setSelectedAllotmentForResume(null);
    }
  };

  const cancelResume = () => {
    setShowResumeConfirmation(false);
    setSelectedAllotmentForResume(null);
  };

  const handleRestartFromTable = (allotment: ProductionAllotmentResponseDto) => {
    setSelectedAllotmentForRestart(allotment);
    setShowRestartConfirmation(true);
  };

  const confirmRestart = async () => {
    if (!selectedAllotmentForRestart) return;

    try {
      // Call the API to restart production
      const updatedAllotment = await ProductionAllotmentService.restartProduction(selectedAllotmentForRestart.id);

      // Update local state and show success message
      toast.success('Production restarted');

      // Refetch the data to update the table
      refetch();
    } catch (error) {
      toast.error('Failed to restart production');
      console.error('Error restarting production:', error);
    } finally {
      setShowRestartConfirmation(false);
      setSelectedAllotmentForRestart(null);
    }
  };

  const cancelRestart = () => {
    setShowRestartConfirmation(false);
    setSelectedAllotmentForRestart(null);
  };

  const handleCreateNewLot = async (allotment: ProductionAllotmentResponseDto) => {
    setSelectedAllotmentForNewLot(allotment);
    setShowCreateNewLotDialog(true);
    setIsLoadingCreateNewLotDialog(true);
    setCreateNewLotDialogError(null);
    setCreateNewLotDialogData(null);

    try {
      const [orderData, allocationSummary] = await Promise.all([
        SalesOrderWebService.getSalesOrderWebById(allotment.salesOrderId),
        ProductionAllotmentService.getAllocationSummary(allotment.salesOrderId),
      ]);

      const selectedItem = orderData.items.find((item) => item.id === allotment.salesOrderItemId);
      if (!selectedItem) {
        throw new Error(`Sales order item ${allotment.salesOrderItemId} was not found.`);
      }

      const itemAllocation = allocationSummary?.items?.find(
        (item: ItemAllocationSummary) => item.salesOrderItemId === allotment.salesOrderItemId
      );

      if (!itemAllocation) {
        throw new Error('Existing lot allocation details are not available for this sales order item.');
      }

      const normalizedLots = [...(itemAllocation.lots || [])].sort(
        (left, right) => new Date(left.createdDate).getTime() - new Date(right.createdDate).getTime()
      );
      const selectedLotSummary = normalizedLots.find((lot) => lot.id === allotment.id);

      if (!selectedLotSummary) {
        throw new Error(`Lot ${allotment.allotmentId} was not found in the allocation summary.`);
      }

      const normalizedAllocation: ItemAllocationSummary = {
        ...itemAllocation,
        lots: normalizedLots,
      };

      setCreateNewLotDialogData({
        orderData,
        selectedItem,
        itemAllocation: normalizedAllocation,
        selectedLotSummary,
      });
      setCompleteSelectedLotBeforeSplit((Number(selectedLotSummary.createdRollNetWeight) || 0) > 0);
      setSelectedLotQuantityToKeep(Number(selectedLotSummary.actualQuantity) || 0);
    } catch (error) {
      console.error('Error preparing new lot dialog:', error);
      setCreateNewLotDialogError(
        error instanceof Error ? error.message : 'Failed to load lot split details.'
      );
    } finally {
      setIsLoadingCreateNewLotDialog(false);
    }
  };

  const handleHoldResume = async () => {
    try {
      // TODO: replace with API call
      // await productionService.toggleHold(allotment.allotmentId);

      setIsOnHold(prev => !prev);
      toast.success(isOnHold ? 'Production resumed' : 'Production put on hold');
    } catch {
      toast.error('Failed to update hold status');
    }
  };

  // const handleSuspendPlanning = async () => {
  //   try {
  //     // TODO: replace with API call
  //     // await productionService.suspendPlanning(allotment.allotmentId);

  //     setIsSuspended(true);
  //     toast.success('Production planning suspended');
  //   } catch {
  //     toast.error('Failed to suspend production planning');
  //   }
  // };

  const confirmCreateNewLot = async () => {
    if (!selectedAllotmentForNewLot || !createNewLotDialogData || !getCreateNewLotPreview) {
      return;
    }

    const finalSelectedLotQuantity = Number(getCreateNewLotPreview.selectedLotFinalQuantity) || 0;
    const newLotQuantity = Number(getCreateNewLotPreview.newLotQuantity) || 0;
    const selectedLotReadyQuantity = Number(getCreateNewLotPreview.selectedLotReadyQuantity) || 0;
    const currentPlannedQuantity = Number(getCreateNewLotPreview.selectedLotCurrentPlannedQuantity) || 0;

    if (!completeSelectedLotBeforeSplit && finalSelectedLotQuantity <= 0) {
      toast.error('Please enter a valid quantity to keep in the current lot.');
      return;
    }

    if (!completeSelectedLotBeforeSplit && finalSelectedLotQuantity > currentPlannedQuantity) {
      toast.error(`The kept quantity cannot exceed the current planned quantity of ${currentPlannedQuantity.toFixed(3)} kg.`);
      return;
    }

    if (completeSelectedLotBeforeSplit && selectedLotReadyQuantity <= 0) {
      toast.error('This lot cannot be completed yet because no ready net weight has been produced.');
      return;
    }

    if (newLotQuantity <= 0) {
      toast.error('No remaining quantity is available for a new lot. Reduce the current lot quantity first.');
      return;
    }

    const splitLotContext: SplitLotContext = {
      sourceLotId: createNewLotDialogData.selectedLotSummary.id,
      sourceAllotmentId: createNewLotDialogData.selectedLotSummary.allotmentId,
      sourceLotReadyQuantity: selectedLotReadyQuantity,
      sourceLotFinalQuantity: roundToThree(finalSelectedLotQuantity),
      markSourceLotComplete: completeSelectedLotBeforeSplit,
      newLotQuantity: roundToThree(newLotQuantity),
      salesOrderItemQuantity: Number(createNewLotDialogData.selectedItem.qty) || 0,
      totalLots: createNewLotDialogData.itemAllocation.lotCount,
      totalPlannedQuantity: Number(createNewLotDialogData.itemAllocation.totalAllottedQuantity) || 0,
      totalReadyQuantity: Number(createNewLotDialogData.itemAllocation.totalCreatedRollNetWeight) || 0,
    };

    toast.success(
      `Redirecting to create a new lot. Existing lots: ${splitLotContext.totalLots}, new lot quantity: ${splitLotContext.newLotQuantity.toFixed(3)} kg.`
    );

    navigate(
      `/sales-orders/${selectedAllotmentForNewLot.salesOrderId}/process-item/${selectedAllotmentForNewLot.salesOrderItemId}`,
      {
        state: {
          orderData: createNewLotDialogData.orderData,
          selectedItem: createNewLotDialogData.selectedItem,
          isCreatingNewLot: true,
          selectedAllotmentForNewLot,
          lotSplitContext: splitLotContext,
        },
      }
    );

    cancelCreateNewLot();
  };

  const cancelCreateNewLot = () => {
    setShowCreateNewLotDialog(false);
    setSelectedAllotmentForNewLot(null);
    setCreateNewLotDialogData(null);
    setCreateNewLotDialogError(null);
    setCompleteSelectedLotBeforeSplit(false);
    setSelectedLotQuantityToKeep(0);
  };

  // Determine which data to display
  const rawDisplayAllotments = Object.keys(searchParams).length > 0 ? searchedAllotments : productionAllotments;
  const isDataLoading = isLoading || isSearchLoading || isRcLoading;
  const dataError = error || searchError;

  // Calculate roll statistics for weight tracking
  const rollStatsByAllotment = React.useMemo(() => {
    const stats: Record<string, { count: number; totalWeight: number }> = {};
    rollConfirmations.forEach((rc) => {
      if (!stats[rc.allotId]) {
        stats[rc.allotId] = { count: 0, totalWeight: 0 };
      }
      stats[rc.allotId].count += 1;
      stats[rc.allotId].totalWeight += rc.netWeight || 0;
    });
    return stats;
  }, [rollConfirmations]);

  // Client-side search filtering and sorting
  const displayAllotments = React.useMemo(() => {
    let filtered = rawDisplayAllotments;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(lot => 
        lot.voucherNumber?.toLowerCase().includes(lowerSearch) ||
        lot.partyName?.toLowerCase().includes(lowerSearch) ||
        lot.itemName?.toLowerCase().includes(lowerSearch) ||
        lot.allotmentId?.toLowerCase().includes(lowerSearch) ||
        lot.yarnPartyName?.toLowerCase().includes(lowerSearch) ||
        lot.fabricType?.toLowerCase().includes(lowerSearch) ||
        lot.yarnCount?.toLowerCase().includes(lowerSearch)
      );
    }

    if (sortConfig) {
      filtered = [...filtered].sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle specific keys
        if (sortConfig.key === 'readyWeight') {
          aVal = rollStatsByAllotment[a.allotmentId]?.totalWeight || 0;
          bVal = rollStatsByAllotment[b.allotmentId]?.totalWeight || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [rawDisplayAllotments, searchTerm, sortConfig, rollStatsByAllotment]);

  // Reset page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // Compute roll confirmation stats
  // (Moved to top of component)

  // Group active and completed lots
  const activeLotsGrouped = React.useMemo(() => {
    const grouped: Record<string, ProductionAllotmentResponseDto[]> = {};
    displayAllotments.filter(lot => lot.productionStatus !== 2).forEach(lot => {
      const voucher = lot.voucherNumber || 'Unknown Voucher';
      if (!grouped[voucher]) grouped[voucher] = [];
      grouped[voucher].push(lot);
    });
    return grouped;
  }, [displayAllotments]);

  const completedLotsGrouped = React.useMemo(() => {
    const grouped: Record<string, ProductionAllotmentResponseDto[]> = {};
    displayAllotments.filter(lot => lot.productionStatus === 2).forEach(lot => {
      const voucher = lot.voucherNumber || 'Unknown Voucher';
      if (!grouped[voucher]) grouped[voucher] = [];
      grouped[voucher].push(lot);
    });
    return grouped;
  }, [displayAllotments]);

  // Handle search (without voucher search)
  const handleSearch = () => {
    const params: ProductionAllotmentSearchRequestDto = {};
    if (dateRange.from) {
      params.fromDate = dateRange.from.toISOString();
    }
    if (dateRange.to) {
      params.toDate = dateRange.to.toISOString();
    }
    setSearchParams(params);
  };

  // Clear search
  const handleClearSearch = () => {
    setDateRange({ from: undefined, to: undefined });
    setSearchParams({});
  };

  if (isDataLoading) {
    return <Loader />;
  }

  if (dataError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading production allotments: {(dataError as Error).message}
            <button onClick={() => refetch()} className="ml-4 text-sm underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Function to open shift assignment dialog
  const openShiftAssignment = async (
    allotment: ProductionAllotmentResponseDto,
    machine: MachineAllocationResponseDto
  ) => {
    setSelectedAllotment(allotment);
    setSelectedMachine(machine);
    setShowShiftAssignment(true);

    try {
      // Fetch existing assignments for this machine from the backend
      const response = await rollAssignmentApi.getRollAssignmentsByMachineAllocationId(machine.id);
      setShiftAssignments(response.data);
    } catch (error) {
      // Fallback to existing local assignments
      const machineAssignments = shiftAssignments.filter(
        (assignment) => assignment.machineAllocationId === machine.id
      );
      setShiftAssignments(machineAssignments);
      toast.error('Error fetching existing assignments');
    }
  };

  // Function to handle new assignment input changes
  const handleAssignmentChange = (field: string, value: string | number) => {
    setNewAssignment((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Function to add a new shift assignment
  const addShiftAssignment = async () => {
    if (!selectedMachine || !selectedAllotment) return;

    if (
      newAssignment.shiftId === 0 ||
      newAssignment.assignedRolls <= 0 ||
      !newAssignment.operatorName
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    // Check if assigned rolls exceed remaining rolls
    const totalAssigned = shiftAssignments
      .filter((a) => a.machineAllocationId === selectedMachine.id)
      .reduce((sum, a) => sum + a.assignedRolls, 0);

    const remainingRolls = selectedMachine.totalRolls - totalAssigned;

    if (newAssignment.assignedRolls > remainingRolls) {
      toast.error(`Cannot assign more than ${remainingRolls} remaining rolls`);
      return;
    }

    const shift = shifts.find((s) => s.id === newAssignment.shiftId);
    if (!shift) {
      toast.error('Invalid shift selected');
      return;
    }

    // Validation: Check if all previously assigned rolls have had their stickers generated
    const previousAssignments = shiftAssignments.filter(
      (a) => a.machineAllocationId === selectedMachine.id
    );

    for (const assignment of previousAssignments) {
      if (assignment.remainingRolls > 0) {
        toast.error(
          `Cannot assign new rolls until all previously assigned rolls are processed. `
          + `Assignment for shift ${shifts.find(s => s.id === assignment.shiftId)?.shiftName || assignment.shiftId} `
          + `has ${assignment.remainingRolls} rolls remaining.`
        );
        return;
      }
    }


    // // Check if there are existing assignments for this machine
    // const existingAssignments = shiftAssignments.filter(
    //   (a) => a.machineAllocationId === selectedMachine.id
    // );

    // // If there are existing assignments, validate against shift schedule timing
    // if (existingAssignments.length > 0) {
    //   // Get the current timestamp from the form
    //   const currentTimestamp = new Date(newAssignment.timestamp);

    //   // Check all existing assignments to see if any shift is still active based on schedule
    //   let isConflict = false;
    //   let conflictMessage = '';

    //   for (const assignment of existingAssignments) {
    //     // Get the shift details for the existing assignment
    //     const existingShift = shifts.find((s) => s.id === assignment.shiftId);

    //     if (existingShift) {
    //       // Parse the timestamp of the existing assignment
    //       const assignmentTime = new Date(assignment.timestamp);

    //       // Calculate the shift start and end times based on the assignment date
    //       const assignmentDateStr = assignmentTime.toISOString().split('T')[0]; // Get date part only

    //       // Create full datetime strings for shift start and end times
    //       const shiftStartStr = `${assignmentDateStr}T${existingShift.startTime}`;
    //       const shiftEndStr = `${assignmentDateStr}T${existingShift.endTime}`;

    //       // Parse shift start and end times
    //       const shiftStartDate = new Date(shiftStartStr);
    //       let shiftEndDate = new Date(shiftEndStr);

    //       // Handle case where shift ends next day (e.g., night shift)
    //       // If end time is earlier than start time, it means it crosses midnight
    //       if (shiftEndDate < shiftStartDate) {
    //         shiftEndDate = new Date(shiftEndDate);
    //         shiftEndDate.setDate(shiftEndDate.getDate() + 1);
    //       }

    // Check if the current timestamp falls within an active shift period
    // if (currentTimestamp >= shiftStartDate && currentTimestamp <= shiftEndDate) {
    //   isConflict = true;
    //   conflictMessage =
    //     `Cannot assign rolls for a new shift (${shift.shiftName}) while the current shift (${existingShift.shiftName}) is still active. ` +
    //     `Current shift is scheduled from ${shiftStartDate.toLocaleString()} to ${shiftEndDate.toLocaleString()}.`;
    //   break;
    // }

    //       // Additional check: If the new assignment is for a time before the last shift ended
    //       // if (currentTimestamp < shiftEndDate) {
    //       //   isConflict = true;
    //       //   conflictMessage =
    //       //     `Cannot assign rolls for a new shift (${shift.shiftName}) before the previous shift (${existingShift.shiftName}) has ended. ` +
    //       //     `Previous shift ends at ${shiftEndDate.toLocaleString()}.`;
    //       //   break;
    //       // }
    //     }
    //   }

    //   if (isConflict) {
    //     toast.error(conflictMessage);
    //     return;
    //   }
    // }

    try {
      // Create roll assignment in the backend
      const assignmentData = {
        machineAllocationId: selectedMachine.id,
        shiftId: newAssignment.shiftId,
        assignedRolls: newAssignment.assignedRolls,
        operatorName: newAssignment.operatorName,
        timestamp: newAssignment.timestamp,
      };

      const response = await rollAssignmentApi.createRollAssignment(assignmentData);
      const newAssignmentFromApi = response.data;

      // Update local state with the assignment from the API
      setShiftAssignments((prev) => [...prev, newAssignmentFromApi]);

      // Reset form
      setNewAssignment({
        shiftId: 0,
        assignedRolls: 0,
        operatorName: '',
        timestamp: new Date().toISOString(),
      });

      toast.success('Shift assignment added successfully');
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const errorMessage =
        axiosError.response?.data || axiosError.message || 'Error creating roll assignment';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  // Function to generate barcodes for assigned rolls
  const generateBarcodes = async (assignmentId: number, barcodeCount: number) => {
    const assignment = shiftAssignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Validate barcode count
    if (barcodeCount <= 0) {
      toast.error('Please enter a valid number of barcodes to generate');
      return;
    }

    if (barcodeCount > assignment.remainingRolls) {
      toast.error(`Cannot generate more than ${assignment.remainingRolls} barcodes`);
      return;
    }

    try {
      // First, call the API to generate barcodes
      const barcodeData = {
        rollAssignmentId: assignmentId,
        barcodeCount: barcodeCount,
      };

      const response = await rollAssignmentApi.generateBarcodes(barcodeData);
      const updatedAssignment = response.data;

      // Get the generated barcode roll numbers
      const generatedRollNumbers = updatedAssignment.generatedBarcodes
        .slice(-barcodeCount)
        .map((barcode: GeneratedBarcodeDto) => barcode.rollNumber);

      // Now, generate QR codes for the specific roll numbers
      const qrResponse = await productionAllotmentApi.generateQRCodesForRollAssignment(
        assignmentId,
        generatedRollNumbers
      );

      // Only update local state if both operations succeed
      setShiftAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? updatedAssignment : a))
      );

      // Clear the barcode count for this assignment
      setStickerCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[assignmentId];
        return newCounts;
      });

      toast.success(
        qrResponse.data.message || `Successfully generated ${barcodeCount} barcodes and QR codes`
      );
    } catch (error: unknown) {
      const axiosError = error as AxiosError;

      // Handle different types of errors
      if (axiosError.response?.status === 500) {
        // Server-side error, likely printer issue
        toast.error(
          'Printer not connected or printing failed. Please check printer connection and try again.'
        );
      } else if (axiosError.response?.status === 400) {
        // Client-side validation error
        const errorMessage =
          axiosError.response?.data || 'Invalid request. Please check your input.';
        toast.error(`Validation Error: ${errorMessage}`);
      } else {
        // Other errors
        const errorMessage =
          axiosError.response?.data || axiosError.message || 'Error generating barcodes';
        toast.error(`Error: ${errorMessage}`);
      }

      // Do not update the generated sticker count if there was an error
      // The UI will reflect that no stickers were actually generated
    }
  };

  // Modified function to handle sticker generation with confirmation
  const handleGenerateStickers = (assignmentId: number, barcodeCount: number) => {
    const assignment = shiftAssignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      toast.error('Assignment not found');
      return;
    }

    // Validate barcode count before showing confirmation
    if (barcodeCount <= 0) {
      toast.error('Please enter a valid number of barcodes to generate');
      return;
    }

    if (barcodeCount > assignment.remainingRolls) {
      toast.error(`Cannot generate more than ${assignment.remainingRolls} barcodes`);
      return;
    }

    // Set confirmation data and show dialog
    setStickerConfirmationData({
      assignmentId,
      barcodeCount,
      assignment,
    });
    setShowStickerConfirmation(true);
  };

  // Function to confirm and proceed with sticker generation
  const confirmStickerGeneration = async () => {
    if (!stickerConfirmationData) return;

    const { assignmentId, barcodeCount } = stickerConfirmationData;
    setShowStickerConfirmation(false);
    setStickerConfirmationData(null);

    // Call the original generateBarcodes function
    try {
      await generateBarcodes(assignmentId, barcodeCount);
    } catch (error) {
      toast.error('Error generating stickers');
    }
  };

  // Function to cancel sticker generation
  const cancelStickerGeneration = () => {
    setShowStickerConfirmation(false);
    setStickerConfirmationData(null);
    toast.info('Sticker generation cancelled');
  };

  // Function to handle reprint sticker request
  const handleReprintSticker = () => {
    setShowReprintDialog(true);
  };

  // Function to validate and process reprint
  const processReprint = async () => {
    if (!reprintData.rollNumber) {
      toast.error('Please enter a roll number');
      return;
    }

    if (!reprintData.reason.trim()) {
      toast.error('Please enter a reason for reprint');
      return;
    }

    try {
      // Find the assignment that contains this roll number
      let foundAssignment: ShiftRollAssignment | null = null;
      let foundBarcode: GeneratedBarcodeDto | null = null;

      // Search through all assignments to find the roll number
      for (const assignment of shiftAssignments) {
        // Get updated assignment data from backend to ensure we have latest barcodes
        const response = await rollAssignmentApi.getRollAssignmentsByMachineAllocationId(
          assignment.machineAllocationId
        );
        const updatedAssignments = response.data;

        const updatedAssignment = updatedAssignments.find((a) => a.id === assignment.id);
        if (updatedAssignment) {
          const barcode = updatedAssignment.generatedBarcodes.find(
            (b) => b.rollNumber === reprintData.rollNumber
          );
          if (barcode) {
            foundAssignment = updatedAssignment;
            foundBarcode = barcode;
            break;
          }
        }
      }

      if (!foundAssignment || !foundBarcode) {
        toast.error(`Roll number ${reprintData.rollNumber} not found in any assignment`);
        return;
      }

      // Generate QR code for this specific roll number
      const qrResponse = await productionAllotmentApi.generateQRCodesForRollAssignment(
        foundAssignment.id,
        [foundBarcode.rollNumber]
      );

      // Show success message from the response
      toast.success(
        qrResponse.data.message ||
        `Successfully reprinted sticker for roll ${reprintData.rollNumber}`
      );

      // Close dialog and reset form
      setShowReprintDialog(false);
      setReprintData({
        rollNumber: null,
        reason: '',
      });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;

      // Handle different types of errors for reprint
      if (axiosError.response?.status === 500) {
        // Server-side error, likely printer issue
        toast.error(
          'Printer not connected or printing failed. Please check printer connection and try again.'
        );
      } else if (axiosError.response?.status === 400) {
        // Client-side validation error
        const errorMessage =
          axiosError.response?.data || 'Invalid request. Please check your input.';
        toast.error(`Validation Error: ${errorMessage}`);
      } else if (axiosError.response?.status === 404) {
        // Not found error
        toast.error(
          `Roll number ${reprintData.rollNumber} not found. Please verify the roll number.`
        );
      } else {
        // Other errors
        const errorMessage =
          axiosError.response?.data || axiosError.message || 'Error reprinting sticker';
        toast.error(`Error: ${errorMessage}`);
      }

      // Keep the dialog open so user can try again
    }
  };

  // Function to cancel reprint
  const cancelReprint = () => {
    setShowReprintDialog(false);
    setReprintData({
      rollNumber: null,
      reason: '',
    });
  };

  // Define columns for the data table with default sorting
  const columns: ColumnDef<ProductionAllotmentResponseDto>[] = [
    {
      accessorKey: 'partyName',
      header: 'Party',
      cell: ({ row }) => (
        <div className="text-[11px] font-medium text-blue-800">{row.original.partyName}</div>
      ),
    },
    {
      accessorKey: 'allotmentId',
      header: 'Lot ID',
      cell: ({ row }) => (
        <div className="text-[11px] font-mono font-bold text-gray-700">{row.original.allotmentId}</div>
      ),
    },
    {
      accessorKey: 'itemName',
      header: 'Item',
      cell: ({ row }) => (
        <div className="text-[11px]">{row.original.itemName}</div>
      ),
    },
    {
      accessorKey: 'yarnCount',
      header: 'Count',
      cell: ({ row }) => (
        <div className="text-[11px]">{row.original.yarnCount}</div>
      ),
    },
    {
      accessorKey: 'voucherNumber',
      header: 'Voucher',
      cell: ({ row }) => (
        <div className="text-[11px] font-medium">{row.original.voucherNumber}</div>
      ),
    },
    {
      accessorKey: 'actualQuantity',
      header: 'Qty',
      cell: ({ row }) => (
        <div className="text-[11px] font-semibold">{row.original.actualQuantity}</div>
      ),
    },
    {
      accessorKey: 'fabricType',
      header: 'Fabric',
      cell: ({ row }) => (
        <div className="text-[11px]">{row.original.fabricType}</div>
      ),
    },
    {
      accessorKey: 'tapeColor',
      header: 'Tape',
      cell: ({ row }) => (
        <div className="text-[11px]">{row.original.tapeColor}</div>
      ),
    },
    {
      accessorKey: 'productionStatus',
      header: 'Status',
      cell: ({ row }) => {
        const allotment = row.original;

        let status = 'Active';
        let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default';

        if (allotment.productionStatus === 1) {
          status = 'Hold';
          statusVariant = 'destructive';
        } else if (allotment.productionStatus === 3) {
          status = 'Partly Completed';
          statusVariant = 'outline';
        }

        return (
          <Badge variant={statusVariant satisfies any} className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdDate',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.original.createdDate);
        return <div className="text-[11px] text-gray-500">{format(date, 'dd/MM/yyyy')}</div>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const allotment = row.original;
        return (
          <div className="flex space-x-1">
            {(allotment.productionStatus === 0 || allotment.productionStatus === 3) && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600 border-gray-200">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="flex justify-between items-center text-lg">
                      <span>Machine Load Details</span>
                      <Badge variant="outline" className="text-xs font-mono">{allotment.allotmentId}</Badge>
                    </DialogTitle>
                  </DialogHeader>
                  <MachineLoadDetails allotment={allotment} />
                </DialogContent>
              </Dialog>
            )}
                {allotment.productionStatus === 1 && (
                  <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 border-red-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResumeFromTable(allotment);
                }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
                {allotment.productionStatus === 2 && (
                  <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 text-green-500 hover:bg-green-50 border-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestartFromTable(allotment);
                }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Machine Load Details Component
  const MachineLoadDetails = ({ allotment }: { allotment: ProductionAllotmentResponseDto }) => {
    // Initialize state for production status based on the allotment prop
    const [productionStatus, setProductionStatus] = useState(allotment.productionStatus ?? 0); // 0 = normal, 1 = on hold, 2 = suspended
    // State to track if stickers have been generated, roll confirmation exists, and roll assignment exists
    const [hasStickersGenerated, setHasStickersGenerated] = useState(false);
    const [hasRollConfirmation, setHasRollConfirmation] = useState(false);
    const [hasRollAssignment, setHasRollAssignment] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // Effect to check the status when component mounts
    useEffect(() => {
      const checkStatus = async () => {
        try {
          // Use the new API to check if stickers have been generated or roll confirmations exist
          const statusResponse = await ProductionAllotmentService.checkAllotmentStatus(allotment.allotmentId);

          setHasRollConfirmation(statusResponse.hasRollConfirmation);
          setHasStickersGenerated(statusResponse.hasStickersGenerated);
          setHasRollAssignment(statusResponse.hasRollAssignment);

          // Also update the production status from the original allotment
          setProductionStatus(allotment.productionStatus ?? 0);

        } catch (error) {
          console.error('Error checking status:', error);
          setHasRollConfirmation(false);
          setHasStickersGenerated(false);
          setHasRollAssignment(false);
        } finally {
          setLoadingStatus(false);
        }
      };

      checkStatus();
    }, [allotment.allotmentId, allotment.productionStatus]);

    const handleHoldResume = async () => {
      try {
        // Call the API to toggle hold status
        const updatedAllotment = await ProductionAllotmentService.toggleHold(allotment.id);

        // Update local state with the response
        setProductionStatus(updatedAllotment.productionStatus);

        toast.success(updatedAllotment.productionStatus === 1 ? 'Production put on hold' : 'Production resumed');
      } catch (error) {
        toast.error('Failed to update hold status');
        console.error('Error toggling hold status:', error);
      }
    };

    // const handleSuspendPlanning = async () => {
    //   try {
    //     // Call the API to suspend planning
    //     const updatedAllotment = await ProductionAllotmentService.suspendPlanning(allotment.id);

    //     // Update local state with the response
    //     setProductionStatus(updatedAllotment.productionStatus);

    //     toast.success('Production planning suspended');
    //   } catch (error) {
    //     toast.error('Failed to suspend production planning');
    //     console.error('Error suspending production planning:', error);
    //   }
    // };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-none bg-blue-50/20 border-blue-100">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-xs uppercase font-bold text-blue-800 tracking-wider">Lot Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Lot ID</Label>
                <p className="text-xs font-mono font-bold">{allotment.allotmentId}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Item Name</Label>
                <p className="text-xs font-semibold">{allotment.itemName}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Voucher</Label>
                <p className="text-xs font-medium">{allotment.voucherNumber}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Total Qty</Label>
                <p className="text-xs font-bold text-blue-700">{allotment.actualQuantity} kg</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Yarn Party</Label>
                <p className="text-xs">{allotment.yarnPartyName || 'N/A'}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Polybag</Label>
                <p className="text-xs">{allotment.polybagColor || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none bg-orange-50/20 border-orange-100">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-xs uppercase font-bold text-orange-800 tracking-wider">Fabric & Specs</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Type</Label>
                <p className="text-xs font-medium">{allotment.fabricType}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Count</Label>
                <p className="text-xs font-medium">{allotment.yarnCount}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Dia / Gauge</Label>
                <p className="text-xs text-orange-700 font-bold">{allotment.diameter}" / {allotment.gauge}G</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Tape Color</Label>
                <p className="text-xs">{allotment.tapeColor || 'N/A'}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Gray GSM / Width</Label>
                <p className="text-xs font-medium">{allotment.reqGreyGsm || '-'} / {allotment.reqGreyWidth || '-'}</p>
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px] text-muted-foreground uppercase">Finish GSM / Width</Label>
                <p className="text-xs font-medium">{allotment.reqFinishGsm || '-'} / {allotment.reqFinishWidth || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Machine Allocations</h3>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 items-center">
                {hasRollConfirmation && (
                  <Button
                    size="sm"
                    variant={productionStatus === 1 ? 'default' : 'outline'}
                    onClick={handleHoldResume}
                    disabled={productionStatus === 2 || loadingStatus}
                    className={cn(
                      "h-8 text-[10px] font-bold uppercase",
                      productionStatus === 1 ? "bg-red-600 hover:bg-red-700" : ""
                    )}
                  >
                    {productionStatus === 1 ? 'Resume' : 'Hold'}
                  </Button>
                )}

                {productionStatus !== 1 && productionStatus !== 2 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      handleCreateNewLot(allotment).catch(() => {
                        toast.error('Failed to open the new lot dialog');
                      });
                    }}
                    className="h-8 text-[10px] font-bold uppercase bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create New Lot
                  </Button>
                )}
              </div>

              {hasRollAssignment && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  Allocations Locked
                </Badge>
              )}

              <Link to={`/production-allotment/${allotment.allotmentId}/edit-load`}>
                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold border-gray-300">
                  <Edit className="h-3 w-3 mr-1.5" />
                  EDIT LOAD
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-tight">Machine</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-tight text-center">N / F / R</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-tight text-right">Weight (kg)</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-tight text-center">Rolls / kg</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-tight text-right">Time (days)</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-400 tracking-tight text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allotment.machineAllocations.map((allocation: MachineAllocationResponseDto) => (
                  <tr key={allocation.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3">
                      <div className="text-xs font-bold text-blue-900">{allocation.machineName}</div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-xs font-medium text-gray-600">{allocation.numberOfNeedles} / {allocation.feeders} / {allocation.rpm}</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="text-xs font-black text-gray-900">{allocation.totalLoadWeight.toFixed(2)}</div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-xs">
                        <span className="font-bold text-blue-600">{allocation.totalRolls}</span>
                        <span className="text-gray-400 mx-1">@</span>
                        <span className="text-gray-500">{allocation.rollPerKg.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-xs font-medium text-indigo-600">
                      {allocation.estimatedProductionTime.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <PDFDownloadLink
                          document={
                            <ProductionAllotmentPDFDocument
                              allotment={allotment}
                              machine={allocation}
                            />
                          }
                          fileName={`production-allotment-${allotment.allotmentId}-${allocation.machineName.replace(/\s+/g, '_')}.pdf`}
                        >
                          {({ loading }) => (
                            <Button size="sm" variant="ghost" disabled={loading} className="h-7 text-[10px] font-bold hover:bg-red-50 hover:text-red-700">
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          )}
                        </PDFDownloadLink>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            openShiftAssignment(allotment, allocation).catch(() => {
                              toast.error('Error opening shift assignment');
                            });
                          }}
                          className="h-7 text-[10px] font-bold hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          ASSIGN
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedTable = (groupedLots: Record<string, ProductionAllotmentResponseDto[]>) => {
    // Get vouchers and sort them based on the sortConfig if it's voucherNumber
    const voucherKeys = Object.keys(groupedLots);
    
    // Default sorting for vouchers is descending unless overridden
    if (!sortConfig || sortConfig.key === 'voucherNumber') {
      const direction = sortConfig?.direction || 'desc';
      voucherKeys.sort((a, b) => {
        return direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      });
    }

    const totalPages = Math.ceil(voucherKeys.length / itemsPerPage);
    const paginatedKeys = voucherKeys.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (voucherKeys.length === 0) {
      return (
        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed">
          No lots found matching your criteria.
        </div>
      );
    }

    const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <Search className="ml-1 h-2.5 w-2.5 opacity-20" />;
      return sortConfig.direction === 'asc' 
        ? <ChevronUp className="ml-1 h-3 w-3 text-blue-600" /> 
        : <ChevronDown className="ml-1 h-3 w-3 text-blue-600" />;
    };

    return (
      <div className="space-y-4">
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-100/80 border-b border-gray-200">
                  <th onClick={() => handleSort('allotmentId')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Lot ID <SortIcon column="allotmentId" /></div>
                  </th>
                  <th onClick={() => handleSort('itemName')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Item <SortIcon column="itemName" /></div>
                  </th>
                  <th onClick={() => handleSort('yarnCount')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Count <SortIcon column="yarnCount" /></div>
                  </th>
                  <th onClick={() => handleSort('actualQuantity')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Total Qty <SortIcon column="actualQuantity" /></div>
                  </th>
                  <th onClick={() => handleSort('readyWeight')} className="p-3 text-[10px] font-black uppercase text-indigo-700 tracking-wider bg-indigo-50/50 border-x border-indigo-100 cursor-pointer hover:bg-indigo-100/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Ready Net Wt <SortIcon column="readyWeight" /></div>
                  </th>
                  <th onClick={() => handleSort('fabricType')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Fabric <SortIcon column="fabricType" /></div>
                  </th>
                  <th onClick={() => handleSort('tapeColor')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Tape <SortIcon column="tapeColor" /></div>
                  </th>
                  <th onClick={() => handleSort('productionStatus')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Status <SortIcon column="productionStatus" /></div>
                  </th>
                  <th onClick={() => handleSort('createdDate')} className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors whitespace-nowrap">
                    <div className="flex items-center">Date <SortIcon column="createdDate" /></div>
                  </th>
                  <th className="p-3 text-[10px] font-bold uppercase text-gray-500 tracking-wider text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedKeys.map((voucher) => {
                  const lots = groupedLots[voucher];
                  return (
                    <React.Fragment key={voucher}>
                      {/* Group Separator Row */}
                      <tr className="bg-blue-50/30 border-y border-blue-100/50">
                        <td colSpan={10} className="px-3 py-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-[9px] py-0 px-1.5 shadow-sm font-mono h-4">
                                {voucher}
                              </Badge>
                              <span className="font-black text-gray-700 uppercase tracking-tight text-[10px]">
                                {lots[0]?.partyName || 'Unknown Party'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{lots.length} LOTS</span>
                               <div className="h-0.5 w-12 bg-blue-100 rounded-full" />
                            </div>
                          </div>
                        </td>
                      </tr>
                      {/* Data Rows */}
                      {lots.map((lot) => {
                        const stats = rollStatsByAllotment[lot.allotmentId] || { count: 0, totalWeight: 0 };
                        
                        let status = 'Active';
                        let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'default';

                        if (lot.productionStatus === 1) {
                          status = 'Hold';
                          statusVariant = 'destructive';
                        } else if (lot.productionStatus === 2) {
                          status = 'Completed';
                          statusVariant = 'secondary';
                        } else if (lot.productionStatus === 3) {
                          status = 'Partly Completed';
                          statusVariant = 'outline';
                        }

                        return (
                          <tr key={lot.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="p-3">
                              <div className="text-[11px] font-mono font-bold text-gray-800">{lot.allotmentId}</div>
                            </td>
                            <td className="p-3 max-w-[180px] truncate">
                              <div className="text-[10px] font-medium text-gray-700" title={lot.itemName}>{lot.itemName}</div>
                            </td>
                            <td className="p-3 text-[10px] text-gray-600">
                              {lot.yarnCount}
                            </td>
                            <td className="p-3">
                              <div className="text-[10px] font-bold text-gray-900">{lot.actualQuantity} <span className="text-gray-400 font-normal">kg</span></div>
                            </td>
                            <td className="p-3 bg-indigo-50/20 border-x border-indigo-50/50 group-hover:bg-indigo-50/40">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] font-mono font-bold bg-white border-indigo-100 text-indigo-700 shadow-none h-4 px-1">
                                  {stats.count}
                                </Badge>
                                <span className="text-[11px] font-black text-indigo-700">{stats.totalWeight.toFixed(2)}<span className="text-[9px] font-medium ml-0.5 opacity-60">kg</span></span>
                              </div>
                            </td>
                            <td className="p-3 max-w-[120px] truncate text-[10px] text-gray-600">
                               {lot.fabricType}
                            </td>
                            <td className="p-3 text-[10px] text-gray-600">
                              {lot.tapeColor || '-'}
                            </td>
                            <td className="p-3">
                              <Badge variant={statusVariant as any} className={cn(
                                "text-[9px] h-4 px-1 uppercase font-black tracking-tighter",
                                lot.productionStatus === 2 && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-transparent shadow-none"
                              )}>
                                {status}
                              </Badge>
                            </td>
                            <td className="p-3 text-[10px] text-gray-500 whitespace-nowrap">
                               {format(new Date(lot.createdDate), 'dd/MM/yy')}
                            </td>
                            <td className="p-3">
                              <div className="flex space-x-1 justify-center">
                                {(lot.productionStatus === 0 || lot.productionStatus === 3) && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-6 w-6 p-0 hover:bg-blue-50 hover:text-blue-600 border-gray-200">
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-4 md:p-6">
                                      <DialogHeader className="mb-4">
                                        <DialogTitle className="flex justify-between items-center text-lg">
                                          <span>Machine Load Details</span>
                                          <Badge variant="outline" className="text-xs font-mono">{lot.allotmentId}</Badge>
                                        </DialogTitle>
                                      </DialogHeader>
                                      <MachineLoadDetails allotment={lot} />
                                    </DialogContent>
                                  </Dialog>
                                )}
                                {lot.productionStatus === 1 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 border-red-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResumeFromTable(lot);
                                    }}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                                {lot.productionStatus === 2 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 w-6 p-0 text-emerald-500 hover:bg-emerald-50 border-emerald-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestartFromTable(lot);
                                    }}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-3 bg-gray-50/50 rounded-lg border">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span>-<span>{Math.min(currentPage * itemsPerPage, voucherKeys.length)}</span> of <span>{voucherKeys.length}</span> Vouchers
            </div>
            <div className="flex items-center space-x-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i-1] !== p - 1 && <span className="text-gray-400 text-[10px]">...</span>}
                      <Button
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        className={cn("h-7 w-7 p-0 text-[10px] font-bold", currentPage === p ? "bg-blue-600" : "")}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    </React.Fragment>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] font-bold"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center text-lg">
            <span>Lot List</span>
            <Badge variant="secondary">{displayAllotments.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Filters - Compact Header Style */}
          <div className="mb-4 flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-gray-50/50 shadow-sm">
            <div className="flex-1 min-w-[200px] space-y-1">
              <Label className="text-[10px] uppercase font-bold text-gray-500">Global Search</Label>
              <div className="relative">
                <Input
                  placeholder="Search Voucher, Party, Item, Lot ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-[11px] pl-8 border-gray-300"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>
            <div className="flex-[1.5] min-w-[300px] flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-gray-500">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-[11px]",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase font-bold text-gray-500">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-[11px]",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 px-4 font-bold text-xs" onClick={handleSearch}>Apply Dates</Button>
              <Button size="sm" variant="outline" className="h-8 px-4 font-semibold text-xs border-gray-300" onClick={handleClearSearch}>Clear All</Button>
            </div>
          </div>

          {/* Custom Grouped Tabs */}
          <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-6">
              <TabsList className="bg-gray-100/80 p-1 h-9">
                <TabsTrigger value="active" className="text-xs font-bold px-6 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Active Lots
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 border-transparent hover:bg-blue-100">
                    {displayAllotments.filter(l => l.productionStatus !== 2).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs font-bold px-6 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Completed
                  <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 border-transparent hover:bg-emerald-100">
                    {displayAllotments.filter(l => l.productionStatus === 2).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="active" className="mt-0 outline-none">
              {renderGroupedTable(activeLotsGrouped)}
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0 outline-none">
              {renderGroupedTable(completedLotsGrouped)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Shift Assignment Dialog */}
      <Dialog open={showShiftAssignment} onOpenChange={setShowShiftAssignment}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Shift-wise Roll Assignment</DialogTitle>
          </DialogHeader>

          {selectedAllotment && selectedMachine && (
            <div className="space-y-6">
              {/* Summary Area */}
              <div className="flex flex-wrap gap-4 p-4 bg-muted/40 rounded-xl border border-muted-foreground/10">
                <div className="flex-1 min-w-[120px] space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Lot / Item</Label>
                  <p className="text-xs font-bold leading-tight truncate">
                    <span className="text-blue-600 mr-2">#{selectedAllotment.allotmentId}</span>
                    {selectedAllotment.itemName}
                  </p>
                </div>
                <div className="flex-1 min-w-[100px] space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Machine</Label>
                  <p className="text-xs font-bold">{selectedMachine.machineName}</p>
                </div>
                <div className="w-px bg-muted-foreground/20 self-stretch" />
                <div className="flex-1 min-w-[80px] space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Total Rolls</Label>
                  <p className="text-xs font-black">{selectedMachine.totalRolls}</p>
                </div>
                <div className="flex-1 min-w-[80px] space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Assigned</Label>
                  <p className="text-xs font-black text-blue-600">
                    {shiftAssignments
                      .filter((a) => a.machineAllocationId === selectedMachine.id)
                      .reduce((sum, a) => sum + a.assignedRolls, 0)}
                  </p>
                </div>
                <div className="flex-1 min-w-[80px] space-y-1">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Remaining</Label>
                  <p className="text-xs font-black text-orange-600 underline decoration-2 underline-offset-4">
                    {selectedMachine.totalRolls -
                      shiftAssignments
                        .filter((a) => a.machineAllocationId === selectedMachine.id)
                        .reduce((sum, a) => sum + a.assignedRolls, 0)}
                  </p>
                </div>
              </div>

              {/* New Assignment Form */}
              <Card className="shadow-none border-dashed border-2 bg-indigo-50/10">
                <CardHeader className="py-2.5 px-4 border-b bg-indigo-50/30">
                  <CardTitle className="text-xs uppercase font-black text-indigo-700">Add New Shift Assignment</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4 space-y-1.5">
                      <Label htmlFor="shift" className="text-[10px] font-bold uppercase text-gray-500">Shift Schedule *</Label>
                      <Select
                        value={newAssignment.shiftId.toString()}
                        onValueChange={(value) => handleAssignmentChange('shiftId', parseInt(value))}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id.toString()}>
                              {shift.shiftName} ({shift.startTime} - {shift.endTime})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                      <Label htmlFor="assignedRolls" className="text-[10px] font-bold uppercase text-gray-500">Roll Count *</Label>
                      <Input
                        id="assignedRolls"
                        type="number"
                        min="1"
                        max={
                          selectedMachine.totalRolls -
                          shiftAssignments
                            .filter((a) => a.machineAllocationId === selectedMachine.id)
                            .reduce((sum, a) => sum + a.assignedRolls, 0)
                        }
                        value={newAssignment.assignedRolls || ''}
                        onChange={(e) =>
                          handleAssignmentChange('assignedRolls', parseInt(e.target.value) || 0)
                        }
                        className="h-9 text-xs font-bold"
                        placeholder="Qty"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                      <Label htmlFor="operatorName" className="text-[10px] font-bold uppercase text-gray-500">Operator Name *</Label>
                      <Input
                        id="operatorName"
                        value={newAssignment.operatorName}
                        onChange={(e) => handleAssignmentChange('operatorName', e.target.value)}
                        placeholder="Name"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Button
                        size="sm"
                        onClick={addShiftAssignment}
                        className="w-full h-9 font-bold text-xs bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        ADD
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Assignments */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Assignment History</h4>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={handleReprintSticker}>
                    REPRINT STICKER
                  </Button>
                </div>

                {shiftAssignments.filter((a) => a.machineAllocationId === selectedMachine.id).length > 0 ? (
                  <div className="rounded-lg border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="p-2.5 text-[10px] font-bold uppercase text-muted-foreground">Shift</th>
                          <th className="p-2.5 text-[10px] font-bold uppercase text-muted-foreground text-center">Assigned</th>
                          <th className="p-2.5 text-[10px] font-bold uppercase text-muted-foreground text-center">Stickers / Range</th>
                          <th className="p-2.5 text-[10px] font-bold uppercase text-muted-foreground text-center">Rem.</th>
                          <th className="p-2.5 text-[10px] font-bold uppercase text-muted-foreground">Operator / Time</th>
                          <th className="p-2.5 text-[10px] font-bold uppercase text-muted-foreground text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {shiftAssignments
                          .filter((a) => a.machineAllocationId === selectedMachine.id)
                          .map((assignment) => {
                            const shift = shifts.find((s) => s.id === assignment.shiftId);
                            let rollRangeDisplay = "0 generated";
                            if (assignment.generatedBarcodes && assignment.generatedBarcodes.length > 0) {
                              const sortedBarcodes = [...assignment.generatedBarcodes].sort((a, b) => a.rollNumber - b.rollNumber);
                              const firstRoll = sortedBarcodes[0]?.rollNumber;
                              const lastRoll = sortedBarcodes[sortedBarcodes.length - 1]?.rollNumber;
                              rollRangeDisplay = firstRoll !== undefined && lastRoll !== undefined ? `${firstRoll}-${lastRoll}` : `${assignment.generatedStickers} generated`;
                            }

                            return (
                              <tr key={assignment.id} className="hover:bg-muted/20 transition-colors">
                                <td className="p-2.5">
                                  <div className="text-xs font-bold text-gray-800">{shift?.shiftName || 'N/A'}</div>
                                  <div className="text-[10px] text-muted-foreground">{shift?.startTime} - {shift?.endTime}</div>
                                </td>
                                <td className="p-2.5 text-center text-xs font-black">{assignment.assignedRolls}</td>
                                <td className="p-2.5 text-center">
                                  {assignment.generatedStickers > 0 ? (
                                    <div className="space-y-0.5">
                                      <Badge variant="outline" className="text-[10px] h-5 font-mono bg-blue-50 text-blue-700 border-blue-100">
                                        {rollRangeDisplay}
                                      </Badge>
                                      <div className="text-[10px] text-muted-foreground font-medium">({assignment.generatedStickers} stickers)</div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 font-medium">Pending</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <Badge
                                    variant={assignment.remainingRolls > 0 ? "secondary" : "outline"}
                                    className={cn(
                                      "text-[10px] h-5",
                                      assignment.remainingRolls > 0 ? "bg-orange-50 text-orange-700" : "bg-green-50 text-green-700 border-green-100"
                                    )}
                                  >
                                    {assignment.remainingRolls}
                                  </Badge>
                                </td>
                                <td className="p-2.5">
                                  <div className="text-xs font-medium">{assignment.operatorName}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {new Date(assignment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  {assignment.remainingRolls > 0 ? (
                                    <div className="flex justify-center gap-1.5">
                                      <Input
                                        type="number"
                                        min="1"
                                        max={assignment.remainingRolls}
                                        value={stickerCounts[assignment.id] || ''}
                                        onChange={(e) =>
                                          setStickerCounts((prev) => ({
                                            ...prev,
                                            [assignment.id]: parseInt(e.target.value) || 0,
                                          }))
                                        }
                                        placeholder="Qty"
                                        className="w-16 h-8 text-xs font-bold border-gray-300"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleGenerateStickers(
                                            assignment.id,
                                            stickerCounts[assignment.id] || 0
                                          )
                                        }
                                        disabled={
                                          !stickerCounts[assignment.id] ||
                                          stickerCounts[assignment.id] <= 0 ||
                                          stickerCounts[assignment.id] > assignment.remainingRolls
                                        }
                                        className="h-8 text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-700"
                                      >
                                        GEN
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-400 border-gray-200">
                                        COMPLETED
                                      </Badge>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed rounded-lg bg-gray-50/50">
                    <p className="text-sm text-muted-foreground font-medium">No shift assignments recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sticker Generation Confirmation Dialog */}
      <Dialog open={showStickerConfirmation} onOpenChange={setShowStickerConfirmation}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Generation</DialogTitle>
          </DialogHeader>
          {stickerConfirmationData && stickerConfirmationData.assignment && (
            <div className="space-y-3">
              <p className="text-sm">
                Generate{' '}
                <strong>{stickerConfirmationData.barcodeCount}</strong> stickers?
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="font-medium">ID:</div>
                <div>{stickerConfirmationData.assignmentId}</div>

                <div className="font-medium">Machine:</div>
                <div>{selectedMachine?.machineName || 'N/A'}</div>

                <div className="font-medium">Shift:</div>
                <div>
                  {shifts.find((s) => s.id === stickerConfirmationData.assignment?.shiftId)
                    ?.shiftName || 'N/A'}
                </div>

                <div className="font-medium">Operator:</div>
                <div>{stickerConfirmationData.assignment.operatorName}</div>

                <div className="font-medium">Assigned:</div>
                <div>{stickerConfirmationData.assignment.assignedRolls}</div>

                <div className="font-medium">Remaining:</div>
                <div>{stickerConfirmationData.assignment.remainingRolls}</div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button size="sm" variant="outline" onClick={cancelStickerGeneration}>
                  Cancel
                </Button>
                <Button size="sm" onClick={confirmStickerGeneration}>
                  Generate {stickerConfirmationData.barcodeCount}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprint Sticker Dialog */}
      <Dialog open={showReprintDialog} onOpenChange={setShowReprintDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Reprint Sticker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Enter roll number to reprint</p>
            <div className="space-y-1">
              <Label htmlFor="rollNumber" className="text-xs">Roll Number *</Label>
              <Input
                id="rollNumber"
                type="number"
                value={reprintData.rollNumber || ''}
                onChange={(e) =>
                  setReprintData((prev) => ({
                    ...prev,
                    rollNumber: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="Roll #"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reason" className="text-xs">Reason *</Label>
              <Input
                id="reason"
                value={reprintData.reason}
                onChange={(e) =>
                  setReprintData((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Reason"
                className="text-sm"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button size="sm" variant="outline" onClick={cancelReprint}>
                Cancel
              </Button>
              <Button size="sm" onClick={processReprint}>Reprint</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Confirmation Dialog */}
      <AlertDialog open={showResumeConfirmation} onOpenChange={setShowResumeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Production</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resume this lot? This will change the production status from hold to active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelResume}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmResume}>
              Yes, Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restart Confirmation Dialog */}
      {/* <AlertDialog open={showRestartConfirmation} onOpenChange={setShowRestartConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Production</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restart this lot? This will resume production from suspended status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRestart}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestart}>
              Yes, Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       */}
      {/* Create New Lot Dialog */}
      <Dialog
        open={showCreateNewLotDialog}
        onOpenChange={(open) => {
          if (!open) {
            cancelCreateNewLot();
          } else {
            setShowCreateNewLotDialog(true);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Create New Lot</DialogTitle>
          </DialogHeader>

          {isLoadingCreateNewLotDialog && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mr-3"></div>
              <span className="text-sm text-muted-foreground">Loading lot quantity details...</span>
            </div>
          )}

          {!isLoadingCreateNewLotDialog && createNewLotDialogError && (
            <Alert variant="destructive">
              <AlertDescription>{createNewLotDialogError}</AlertDescription>
            </Alert>
          )}

          {!isLoadingCreateNewLotDialog && createNewLotDialogData && getCreateNewLotPreview && (
            <div className="space-y-6">
              <div className="rounded-lg border bg-slate-50 p-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Sales Order</div>
                    <div className="text-sm font-semibold text-slate-900">{createNewLotDialogData.orderData.voucherNumber}</div>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Item</div>
                    <div className="text-sm font-semibold text-slate-900">{createNewLotDialogData.selectedItem.itemName}</div>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Selected Lot</div>
                    <div className="text-sm font-mono font-semibold text-indigo-700">{createNewLotDialogData.selectedLotSummary.allotmentId}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">SO Item Qty</div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {(Number(createNewLotDialogData.selectedItem.qty) || 0).toFixed(3)} kg
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Existing Lots</div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {createNewLotDialogData.itemAllocation.lotCount}
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Planned Qty</div>
                  <div className="mt-0.5 text-base font-bold text-blue-700">
                    {(Number(createNewLotDialogData.itemAllocation.totalAllottedQuantity) || 0).toFixed(3)} kg
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Ready Net Weight</div>
                  <div className="mt-0.5 text-base font-bold text-emerald-700">
                    {(Number(createNewLotDialogData.itemAllocation.totalCreatedRollNetWeight) || 0).toFixed(3)} kg
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Existing Lots For This Item</h3>
                  <p className="text-[10px] text-slate-500">Planned quantity and ready quantity are shown lot-wise before creating the next lot.</p>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">Lot</th>
                        <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">Status</th>
                        <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 text-right">Planned Qty</th>
                        <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 text-right">Ready Qty</th>
                        <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 text-right">Machine Rolls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {createNewLotDialogData.itemAllocation.lots.map((lot) => {
                        const isSelectedLot = lot.id === createNewLotDialogData.selectedLotSummary.id;
                        const plannedRolls = lot.machineAllocations.reduce(
                          (sum, machine) => sum + Math.ceil(Number(machine.totalRolls) || 0),
                          0
                        );

                        return (
                          <tr
                            key={lot.id}
                            className={isSelectedLot ? 'bg-indigo-50/60' : 'bg-white'}
                          >
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-semibold text-slate-900">{lot.allotmentId}</span>
                                {isSelectedLot && (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 border-indigo-200 text-indigo-700 bg-white">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1.5">
                              <Badge
                                variant={lot.productionStatus === 2 ? 'secondary' : lot.productionStatus === 1 ? 'destructive' : lot.productionStatus === 3 ? 'outline' : 'default'}
                                className="text-[9px] h-4 px-1"
                              >
                                {lot.productionStatus === 2
                                  ? 'Completed'
                                  : lot.productionStatus === 1
                                    ? 'Hold'
                                    : lot.productionStatus === 3
                                      ? 'Partly Completed'
                                      : 'Active'}
                              </Badge>
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-slate-900">
                              {(Number(lot.actualQuantity) || 0).toFixed(3)} kg
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-emerald-700">
                              {(Number(lot.createdRollNetWeight) || 0).toFixed(3)} kg
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-slate-700">
                              {plannedRolls}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border p-2.5 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Selected Lot Action</h3>
                  <p className="text-[10px] text-slate-500">
                    Decide whether to close the current lot at ready net weight or keep a custom planned quantity in it.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={completeSelectedLotBeforeSplit ? 'default' : 'outline'}
                    onClick={() => setCompleteSelectedLotBeforeSplit(true)}
                    disabled={(Number(getCreateNewLotPreview.selectedLotReadyQuantity) || 0) <= 0}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Complete Existing Lot
                  </Button>
                  <Button
                    type="button"
                    variant={!completeSelectedLotBeforeSplit ? 'default' : 'outline'}
                    onClick={() => setCompleteSelectedLotBeforeSplit(false)}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Keep Custom Quantity
                  </Button>
                </div>

                {completeSelectedLotBeforeSplit ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800">
                    The selected lot will be updated to the ready net weight of{' '}
                    <span className="font-semibold">
                      {getCreateNewLotPreview.selectedLotReadyQuantity.toFixed(3)} kg
                    </span>{' '}
                    and marked complete.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="selected-lot-quantity-to-keep" className="text-[11px]">Planned quantity to keep in the current lot</Label>
                    <Input
                      id="selected-lot-quantity-to-keep"
                      type="number"
                      step="0.001"
                      min="0"
                      value={selectedLotQuantityToKeep || ''}
                      onChange={(event) => {
                        const nextValue = event.target.value === '' ? 0 : Number(event.target.value);
                        setSelectedLotQuantityToKeep(nextValue);
                      }}
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-slate-500">
                      You can keep this below the ready quantity if production should stop on this lot. Actual produced weight stays tracked in roll confirmations.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Selected Lot Final Qty</div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {getCreateNewLotPreview.selectedLotFinalQuantity.toFixed(3)} kg
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Other Lots Planned Qty</div>
                  <div className="mt-0.5 text-base font-bold text-slate-900">
                    {getCreateNewLotPreview.otherLotsPlannedQuantity.toFixed(3)} kg
                  </div>
                </div>
                <div className="rounded-lg border bg-indigo-50 p-2 border-indigo-200">
                  <div className="text-[10px] uppercase tracking-wide text-indigo-600">New Lot Qty</div>
                  <div className="mt-0.5 text-base font-bold text-indigo-700">
                    {getCreateNewLotPreview.newLotQuantity.toFixed(3)} kg
                  </div>
                </div>
              </div>

              {!completeSelectedLotBeforeSplit &&
                getCreateNewLotPreview.selectedLotFinalQuantity < getCreateNewLotPreview.selectedLotReadyQuantity && (
                  <Alert>
                    <AlertDescription>
                      The kept quantity is lower than the ready quantity for the selected lot. Planned and actual production will remain tracked separately.
                    </AlertDescription>
                  </Alert>
                )}

              {getCreateNewLotPreview.newLotQuantity <= 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    No quantity remains for a new lot with the current values. Reduce the selected lot quantity to continue.
                  </AlertDescription>
                </Alert>
              )}

              {getCreateNewLotPreview.machinePreviews.length > 0 && (
                <div className="space-y-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Machine Roll Preview For Selected Lot</h3>
                    <p className="text-[10px] text-slate-500">Machine loads and planned rolls will be recalculated from the revised lot quantity.</p>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500">Machine</th>
                          <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 text-right">Current Load</th>
                          <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 text-right">Revised Load</th>
                          <th className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 text-right">Revised Rolls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {getCreateNewLotPreview.machinePreviews.map((machine) => (
                          <tr key={machine.id} className="bg-white">
                            <td className="px-2 py-1.5 font-medium text-slate-900">{machine.machineName}</td>
                            <td className="px-2 py-1.5 text-right text-slate-700">
                              {(Number(machine.totalLoadWeight) || 0).toFixed(3)} kg
                            </td>
                            <td className="px-2 py-1.5 text-right text-slate-900 font-semibold">
                              {machine.revisedWeight.toFixed(3)} kg
                            </td>
                            <td className="px-2 py-1.5 text-right text-slate-900 font-semibold">
                              {machine.revisedRolls}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={cancelCreateNewLot}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmCreateNewLot}
                  disabled={getCreateNewLotPreview.newLotQuantity <= 0}
                >
                  Continue To New Lot
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default ProductionAllotment;
