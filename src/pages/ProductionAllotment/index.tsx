import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProductionAllotments } from '@/hooks/queries/useProductionAllotmentQueries';
import { useSearchProductionAllotments } from '@/hooks/queries/useProductionAllotmentSearchQueries';
import { useShifts } from '@/hooks/queries/useShiftQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Eye, FileText, QrCode, Plus, Edit, Play } from 'lucide-react';
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

const ProductionAllotment: React.FC = () => {
  const navigate = useNavigate();
  const { data: productionAllotments = [], isLoading, error, refetch } = useProductionAllotments();
  const { data: shifts = [] } = useShifts();
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

  // State for hold/suspend functionality
  const [isOnHold, setIsOnHold] = useState(false);
  // const [isSuspended, setIsSuspended] = useState(false);

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

  const handleCreateNewLot = (allotment: ProductionAllotmentResponseDto) => {
    setSelectedAllotmentForNewLot(allotment);
    setShowCreateNewLotDialog(true);
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
    if (!selectedAllotmentForNewLot) return;

    try {
      // Fetch the roll confirmation summary for the sales order item
      const summary = await ProductionAllotmentService.getRollConfirmationSummaryForSalesOrderItem(
        selectedAllotmentForNewLot.salesOrderId,
        selectedAllotmentForNewLot.salesOrderItemId
      );

      // Show success message with summary information
      toast.success(
        `Redirecting to create a new lot. ` +
        `Current Progress: Generated ${summary.TotalLots} lot(s), ` +
        `${summary.TotalRollConfirmations} roll confirmation(s), ` +
        `Total net weight: ${summary.TotalNetWeight} kg.`
      );

      // Fetch the sales order item data to pass to the new lot creation page
      try {
        const orderResponse = await SalesOrderWebService.getSalesOrderWebById(selectedAllotmentForNewLot.salesOrderId);
        const orderData = orderResponse;

        // Find the specific item in the order's items array
        const selectedItem = orderData.items.find((item: any) => item.id === selectedAllotmentForNewLot.salesOrderItemId);

        if (!selectedItem) {
          throw new Error(`Sales order item with ID ${selectedAllotmentForNewLot.salesOrderItemId} not found in order ${selectedAllotmentForNewLot.salesOrderId}`);
        }
        // /sales-orders/38/process-item/37
        // Navigate to the sales order item processing page to create a new lot
        navigate(`/sales-orders/${selectedAllotmentForNewLot.salesOrderId}/process-item/${selectedAllotmentForNewLot.salesOrderItemId}`, {
          state: {
            orderData,
            selectedItem,
            isCreatingNewLot: true,
            selectedAllotmentForNewLot: selectedAllotmentForNewLot
          }
        });
      } catch (error) {
        console.error('Error fetching sales order data:', error);
        toast.error('Error fetching sales order data for new lot creation');
        // Fallback navigation without state
        navigate(`/sales-orders/${selectedAllotmentForNewLot.salesOrderId}/process-item/${selectedAllotmentForNewLot.salesOrderItemId}`);
      }
    } catch (error) {
      toast.error('Failed to initiate new lot creation');
      console.error('Error in new lot creation flow:', error);
    } finally {
      setShowCreateNewLotDialog(false);
      setSelectedAllotmentForNewLot(null);
    }
  };

  const cancelCreateNewLot = () => {
    setShowCreateNewLotDialog(false);
    setSelectedAllotmentForNewLot(null);
  };

  // Determine which data to display
  const displayAllotments = Object.keys(searchParams).length > 0 ? searchedAllotments : productionAllotments;
  const isDataLoading = isLoading || isSearchLoading;
  const dataError = error || searchError;

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
            {allotment.productionStatus === 0 && (
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

                {productionStatus === 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleCreateNewLot(allotment)}
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
            <div className="flex-1 min-w-[300px] flex gap-3">
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
              <Button size="sm" className="h-8 px-4 font-bold text-xs" onClick={handleSearch}>Search</Button>
              <Button size="sm" variant="outline" className="h-8 px-4 font-semibold text-xs border-gray-300" onClick={handleClearSearch}>Clear</Button>
            </div>
          </div>

          {/* Data Table with Pagination - Sorted by Created Date Descending */}
          <DataTable
            columns={columns}
            data={[...displayAllotments].sort((a, b) =>
              new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
            )}
            searchKey="voucherNumber"
            searchPlaceholder="Search..."
            pageSize={15}
          />
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
      <AlertDialog open={showCreateNewLotDialog} onOpenChange={setShowCreateNewLotDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Lot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to create a new lot? This will update the production status to Partially Completed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCreateNewLot}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateNewLot}>
              Yes, Create New Lot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
};

export default ProductionAllotment;