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
      // First, update the current lot status to 3 (Partially Completed)
      const updatedAllotment = await ProductionAllotmentService.updateProductionStatus(selectedAllotmentForNewLot.id, 3);
      
      // Fetch the roll confirmation summary for the sales order item
      const summary = await ProductionAllotmentService.getRollConfirmationSummaryForSalesOrderItem(
        selectedAllotmentForNewLot.salesOrderId,
        selectedAllotmentForNewLot.salesOrderItemId
      );
      
      // Show success message with summary information
      toast.success(
        `Production status updated to Partially Completed. ` +
        `Generated ${summary.TotalLots} lot(s), ` +
        `${summary.TotalRollConfirmations} roll confirmation(s), ` +
        `Total net weight: ${summary.TotalNetWeight} kg.`
      );
      
      // Refetch the data to update the table
      refetch();
      
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
      toast.error('Failed to update production status');
      console.error('Error updating production status:', error);
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
        <div className="text-xs">{row.original.partyName}</div>
      ),
    },
    {
      accessorKey: 'allotmentId',
      header: 'ID',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.allotmentId}</div>
      ),
    },
    {
      accessorKey: 'itemName',
      header: 'Item',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.itemName}</div>
      ),
    },
    {
      accessorKey: 'yarnCount',
      header: 'Count',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.yarnCount}</div>
      ),
    },
    {
      accessorKey: 'voucherNumber',
      header: 'Voucher',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.voucherNumber}</div>
      ),
    },
    {
      accessorKey: 'actualQuantity',
      header: 'Qty',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.actualQuantity}</div>
      ),
    },
    {
      accessorKey: 'fabricType',
      header: 'Fabric',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.fabricType}</div>
      ),
    },
    {
      accessorKey: 'tapeColor',
      header: 'Tape',
      cell: ({ row }) => (
        <div className="text-xs">{row.original.tapeColor}</div>
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
        // } else if (allotment.productionStatus === 2) {
        //   status = 'Suspended';
        //   statusVariant = 'secondary';
        } else if (allotment.productionStatus === 3) {
          status = 'Partially Completed';
          statusVariant = 'outline';
        }
        
        return (
          <Badge variant={statusVariant satisfies 'default' | 'destructive' | 'secondary' | 'outline' | null | undefined} className="text-xs">
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
        return <div className="text-xs">{format(date, 'dd/MM/yyyy')}</div>;
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
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                    <Eye className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Machine Load Details</DialogTitle>
                  </DialogHeader>
                  <MachineLoadDetails allotment={allotment} />
                </DialogContent>
              </Dialog>
            )}
            {/* Resume button when production is on hold */}
            {allotment.productionStatus === 1 && (
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 w-8 p-0 text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResumeFromTable(allotment);
                }}
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
            
            {/* Restart button when production is suspended */}
            {allotment.productionStatus === 2 && (
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 w-8 p-0 text-green-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestartFromTable(allotment);
                }}
              >
                <Play className="h-3 w-3" />
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
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Lotment Information</h3>
            <p className="text-sm">
              <span className="font-medium">ID:</span> {allotment.allotmentId}
            </p>
            <p className="text-sm">
              <span className="font-medium">Item:</span> {allotment.itemName}
            </p>
            <p className="text-sm">
              <span className="font-medium">Voucher:</span> {allotment.voucherNumber}
            </p>
            <p className="text-sm">
              <span className="font-medium">Quantity:</span> {allotment.actualQuantity}
            </p>
            <p className="text-sm">
              <span className="font-medium">Yarn Party:</span> {allotment.yarnPartyName || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Polybag:</span> {allotment.polybagColor || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Fabric Details</h3>
            <p className="text-sm">
              <span className="font-medium">Type:</span> {allotment.fabricType}
            </p>
            <p className="text-sm">
              <span className="font-medium">Count:</span> {allotment.yarnCount}
            </p>
            <p className="text-sm">
              <span className="font-medium">Diameter:</span> {allotment.diameter}
            </p>
            <p className="text-sm">
              <span className="font-medium">Gauge:</span> {allotment.gauge}
            </p>
            <p className="text-sm">
              <span className="font-medium">Tape:</span> {allotment.tapeColor || 'N/A'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Grey Specs</h3>
            <p className="text-sm">
              <span className="font-medium">GSM:</span> {allotment.reqGreyGsm || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Width:</span> {allotment.reqGreyWidth || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Finish Specs</h3>
            <p className="text-sm">
              <span className="font-medium">GSM:</span> {allotment.reqFinishGsm || 'N/A'}
            </p>
            <p className="text-sm">
              <span className="font-medium">Width:</span> {allotment.reqFinishWidth || 'N/A'}
            </p>
          </div>
        </div>
          
        <div>
          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <h3 className="font-semibold text-sm">Machine Allocations</h3>
            <div className="flex flex-wrap gap-2">
              {/* Show Suspend Planning button if NO roll assignments exist */}
              {/* {hasRollAssignment && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleSuspendPlanning}
                  disabled={productionStatus === 2 || loadingStatus}
                >
                  Suspend
                </Button>
              )} */}
              
              {/* Show Hold/Resume button if no roll assignments exist */}
              {hasRollConfirmation && (
                <Button
                  size="sm"
                  variant={productionStatus === 1 ? 'default' : 'outline' satisfies 'default' | 'destructive' | 'secondary' | 'outline' | null | undefined}
                  onClick={handleHoldResume}
                  disabled={productionStatus === 2 || loadingStatus}
                >
                  {productionStatus === 1 ? 'Resume' : 'Hold'}
                </Button>
              )}
              
              {/* Show Create New Lot button when status is suspended (2) */}
              {productionStatus === 0 && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleCreateNewLot(allotment)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create New Lot
                </Button>
              )}
              
              {/* Show message if roll assignments exist */}
              {hasRollAssignment && (
                <div className="text-xs text-muted-foreground">
                  Actions disabled
                </div>
              )}
              
              {/* Show loading indicator while checking status */}
              {loadingStatus && (
                <div className="text-xs text-muted-foreground">
                  Checking...
                </div>
              )}
            </div>
            <Link to={`/production-allotment/${allotment.allotmentId}/edit-load`}>
              <Button size="sm" variant="outline">
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            </Link>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 text-xs">Machine</th>
                  <th className="text-left p-2 text-xs">Needles</th>
                  <th className="text-left p-2 text-xs">Feeders</th>
                  <th className="text-left p-2 text-xs">RPM</th>
                  <th className="text-left p-2 text-xs">Weight (kg)</th>
                  <th className="text-left p-2 text-xs">Rolls</th>
                  <th className="text-left p-2 text-xs">Rolls/kg</th>
                  <th className="text-left p-2 text-xs">Time (days)</th>
                  <th className="text-left p-2 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allotment.machineAllocations.map((allocation: MachineAllocationResponseDto) => (
                  <tr key={allocation.id} className="border-t hover:bg-muted/50 text-xs">
                    <td className="p-2">{allocation.machineName}</td>
                    <td className="p-2">{allocation.numberOfNeedles}</td>
                    <td className="p-2">{allocation.feeders}</td>
                    <td className="p-2">{allocation.rpm}</td>
                    <td className="p-2">{allocation.totalLoadWeight.toFixed(2)}</td>
                    <td className="p-2">{allocation.totalRolls}</td>
                    <td className="p-2">{allocation.rollPerKg.toFixed(2)}</td>
                    <td className="p-2">{allocation.estimatedProductionTime.toFixed(2)}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
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
                            <Button size="sm" variant="outline" disabled={loading} className="h-7 p-1">
                              {loading ? (
                                <span className="h-3 w-3 mr-1">...</span>
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              PDF
                            </Button>
                          )}
                        </PDFDownloadLink>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            openShiftAssignment(allotment, allocation).catch(() => {
                              toast.error('Error opening shift assignment');
                            });
                          }}
                          className="h-7 p-1"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Assign
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
          {/* Search Filters (removed voucher search) */}
          <div className="mb-4 p-3 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-xs">Date Range (From)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Date Range (To)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleSearch}>Search</Button>
              <Button size="sm" variant="outline" onClick={handleClearSearch}>Clear</Button>
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Lotment Info</h3>
                  <p className="text-sm">
                    <span className="font-medium">ID:</span> {selectedAllotment.allotmentId}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Item:</span> {selectedAllotment.itemName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Machine:</span> {selectedMachine.machineName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Total Rolls:</span> {selectedMachine.totalRolls}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">Assignment Summary</h3>
                  <p className="text-sm">
                    <span className="font-medium">Assigned:</span>{' '}
                    {shiftAssignments
                      .filter((a) => a.machineAllocationId === selectedMachine.id)
                      .reduce((sum, a) => sum + a.assignedRolls, 0)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Remaining:</span>{' '}
                    {selectedMachine.totalRolls -
                      shiftAssignments
                        .filter((a) => a.machineAllocationId === selectedMachine.id)
                        .reduce((sum, a) => sum + a.assignedRolls, 0)}
                  </p>
                </div>
              </div>

              {/* New Assignment Form */}
              <div className="border p-3 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">New Assignment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="shift" className="text-xs">Shift *</Label>
                    <Select
                      value={newAssignment.shiftId.toString()}
                      onValueChange={(value) => handleAssignmentChange('shiftId', parseInt(value))}
                    >
                      <SelectTrigger>
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

                  <div>
                    <Label htmlFor="assignedRolls" className="text-xs">Rolls *</Label>
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
                      value={newAssignment.assignedRolls}
                      onChange={(e) =>
                        handleAssignmentChange('assignedRolls', parseInt(e.target.value) || 0)
                      }
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="operatorName" className="text-xs">Operator *</Label>
                    <Input
                      id="operatorName"
                      value={newAssignment.operatorName}
                      onChange={(e) => handleAssignmentChange('operatorName', e.target.value)}
                      placeholder="Enter operator name"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <Button size="sm" onClick={addShiftAssignment}>Add</Button>
                </div>
              </div>

              {/* Existing Assignments */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-sm">Existing Assignments</h4>
                  <Button size="sm" onClick={handleReprintSticker}>
                    Reprint
                  </Button>
                </div>
                {shiftAssignments.filter((a) => a.machineAllocationId === selectedMachine.id)
                  .length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 text-xs">Shift</th>
                          <th className="text-left p-2 text-xs">Assigned</th>
                          <th className="text-left p-2 text-xs">Stickers</th>
                          <th className="text-left p-2 text-xs">Remaining</th>
                          <th className="text-left p-2 text-xs">Time</th>
                          <th className="text-left p-2 text-xs">Operator</th>
                          <th className="text-left p-2 text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftAssignments
                          .filter((a) => a.machineAllocationId === selectedMachine.id)
                          .map((assignment) => {
                            const shift = shifts.find((s) => s.id === assignment.shiftId);
                            
                            // Calculate roll number range for display
                            let rollRangeDisplay = `${assignment.generatedStickers} generated`;
                            if (assignment.generatedBarcodes && assignment.generatedBarcodes.length > 0) {
                              // Sort barcodes by roll number to ensure proper range calculation
                              const sortedBarcodes = [...assignment.generatedBarcodes].sort((a, b) => a.rollNumber - b.rollNumber);
                              const firstRoll = sortedBarcodes[0]?.rollNumber;
                              const lastRoll = sortedBarcodes[sortedBarcodes.length - 1]?.rollNumber;
                              
                              if (firstRoll !== undefined && lastRoll !== undefined) {
                                rollRangeDisplay = `${firstRoll}-${lastRoll}`;
                              } else {
                                rollRangeDisplay = `${assignment.generatedStickers} generated`;
                              }
                            }
                            
                            return (
                              <tr key={assignment.id} className="border-t hover:bg-muted/50 text-xs">
                                <td className="p-2">{shift?.shiftName || 'N/A'}</td>
                                <td className="p-2">{assignment.assignedRolls}</td>
                                <td className="p-2">
                                  {assignment.generatedStickers > 0 ? (
                                    <div>
                                      <div>{rollRangeDisplay}</div>
                                      <div className="text-xs text-gray-500">
                                        ({assignment.generatedStickers} total)
                                      </div>
                                    </div>
                                  ) : (
                                    'None'
                                  )}
                                </td>
                                <td className="p-2">{assignment.remainingRolls}</td>
                                <td className="p-2">
                                  {new Date(assignment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-2">{assignment.operatorName}</td>
                                <td className="p-2">
                                  {assignment.remainingRolls > 0 ? (
                                    <div className="flex gap-1">
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
                                        placeholder="#"
                                        className="w-16 h-7 text-xs"
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
                                        className="h-7 text-xs"
                                      >
                                        Gen
                                      </Button>
                                    </div>
                                  ) : (
                                    <span>{assignment.generatedStickers} generated</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No assignments yet.</p>
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
    </div>
  );
};

export default ProductionAllotment;