import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { CalendarIcon, Eye, FileText, QrCode, Plus, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { toast } from '@/lib/toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ProductionAllotmentPDFDocument from './ProductionAllotmentPDFDocument';
import type {
  ProductionAllotmentResponseDto,
  MachineAllocationResponseDto,
  GeneratedBarcodeDto,
  RollAssignmentResponseDto,
  ProductionAllotmentSearchRequestDto,
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
      accessorKey: 'allotmentId',
      header: 'Lotment ID',
    },
    {
      accessorKey: 'itemName',
      header: 'Item Name',
    },
    {
      accessorKey: 'voucherNumber',
      header: 'Voucher Number',
    },
    {
      accessorKey: 'actualQuantity',
      header: 'Quantity',
    },
    {
      accessorKey: 'fabricType',
      header: 'Fabric Type',
    },
    {
      accessorKey: 'createdDate',
      header: 'Created Date',
      cell: ({ row }) => {
        const date = new Date(row.original.createdDate);
        return <div>{format(date, 'dd/MM/yyyy')}</div>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const allotment = row.original;
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Machine Load Details</DialogTitle>
              </DialogHeader>
              <MachineLoadDetails allotment={allotment} />
            </DialogContent>
          </Dialog>
        );
      },
    },
  ];

  // Machine Load Details Component
  const MachineLoadDetails = ({ allotment }: { allotment: ProductionAllotmentResponseDto }) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Lotment Information</h3>
            <p>
              <span className="font-medium">ID:</span> {allotment.allotmentId}
            </p>
            <p>
              <span className="font-medium">Item:</span> {allotment.itemName}
            </p>
            <p>
              <span className="font-medium">Voucher:</span> {allotment.voucherNumber}
            </p>
            <p>
              <span className="font-medium">Quantity:</span> {allotment.actualQuantity}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Fabric Details</h3>
            <p>
              <span className="font-medium">Type:</span> {allotment.fabricType}
            </p>
            <p>
              <span className="font-medium">Yarn Count:</span> {allotment.yarnCount}
            </p>
            <p>
              <span className="font-medium">Diameter:</span> {allotment.diameter}
            </p>
            <p>
              <span className="font-medium">Gauge:</span> {allotment.gauge}
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Machine Allocations</h3>
            <Link to={`/production-allotment/${allotment.allotmentId}/edit-load`}>
              <Button size="sm" variant="outline">
                <Edit className="h-4 w-4 mr-1" />
                Edit Load Distribution
              </Button>
            </Link>
          </div>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Machine Name</th>
                  <th className="text-left p-3">Needles</th>
                  <th className="text-left p-3">Feeders</th>
                  <th className="text-left p-3">RPM</th>
                  <th className="text-left p-3">Load Weight (kg)</th>
                  <th className="text-left p-3">Total Rolls</th>
                  <th className="text-left p-3">Rolls per Kg</th>
                  <th className="text-left p-3">Est. Production Time (days)</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allotment.machineAllocations.map((allocation: MachineAllocationResponseDto) => (
                  <tr key={allocation.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">{allocation.machineName}</td>
                    <td className="p-3">{allocation.numberOfNeedles}</td>
                    <td className="p-3">{allocation.feeders}</td>
                    <td className="p-3">{allocation.rpm}</td>
                    <td className="p-3">{allocation.totalLoadWeight.toFixed(2)}</td>
                    <td className="p-3">{allocation.totalRolls}</td>
                    <td className="p-3">{allocation.rollPerKg.toFixed(2)}</td>
                    <td className="p-3">{allocation.estimatedProductionTime.toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex space-x-2">
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
                            <Button size="sm" variant="outline" disabled={loading}>
                              {loading ? (
                                <span className="h-4 w-4 mr-1">...</span>
                              ) : (
                                <FileText className="h-4 w-4 mr-1" />
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
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign Rolls
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
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Lot List</span>
            <Badge variant="secondary">{displayAllotments.length} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Filters (removed voucher search) */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Date Range (From)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                <Label>Date Range (To)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
              <Button onClick={handleSearch}>Search</Button>
              <Button variant="outline" onClick={handleClearSearch}>Clear</Button>
            </div>
          </div>

          {/* Data Table with Pagination - Sorted by Created Date Descending */}
          <DataTable
            columns={columns}
            data={[...displayAllotments].sort((a, b) => 
              new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
            )}
            searchKey="voucherNumber"
            searchPlaceholder="Search by voucher number..."
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* Shift Assignment Dialog */}
      <Dialog open={showShiftAssignment} onOpenChange={setShowShiftAssignment}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shift-wise Roll Assignment</DialogTitle>
          </DialogHeader>

          {selectedAllotment && selectedMachine && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Lotment Information</h3>
                  <p>
                    <span className="font-medium">ID:</span> {selectedAllotment.allotmentId}
                  </p>
                  <p>
                    <span className="font-medium">Item:</span> {selectedAllotment.itemName}
                  </p>
                  <p>
                    <span className="font-medium">Machine:</span> {selectedMachine.machineName}
                  </p>
                  <p>
                    <span className="font-medium">Total Rolls:</span> {selectedMachine.totalRolls}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Assignment Summary</h3>
                  <p>
                    <span className="font-medium">Assigned Rolls:</span>{' '}
                    {shiftAssignments
                      .filter((a) => a.machineAllocationId === selectedMachine.id)
                      .reduce((sum, a) => sum + a.assignedRolls, 0)}
                  </p>
                  <p>
                    <span className="font-medium">Remaining Rolls:</span>{' '}
                    {selectedMachine.totalRolls -
                      shiftAssignments
                        .filter((a) => a.machineAllocationId === selectedMachine.id)
                        .reduce((sum, a) => sum + a.assignedRolls, 0)}
                  </p>
                </div>
              </div>

              {/* New Assignment Form */}
              <div className="border p-4 rounded-lg">
                <h4 className="font-semibold mb-3">New Shift Assignment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shift">Shift *</Label>
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
                    <Label htmlFor="assignedRolls">Rolls to Assign *</Label>
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
                    />
                  </div>

                  <div>
                    <Label htmlFor="operatorName">Operator Name *</Label>
                    <Input
                      id="operatorName"
                      value={newAssignment.operatorName}
                      onChange={(e) => handleAssignmentChange('operatorName', e.target.value)}
                      placeholder="Enter operator name"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Button onClick={addShiftAssignment}>Add Assignment</Button>
                </div>
              </div>

              {/* Existing Assignments */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Existing Assignments</h4>
                  <Button size="sm" onClick={handleReprintSticker}>
                    Reprint Sticker
                  </Button>
                </div>
                {shiftAssignments.filter((a) => a.machineAllocationId === selectedMachine.id)
                  .length > 0 ? (
                  <div className="rounded-md border">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3">Shift</th>
                          <th className="text-left p-3">Assigned Rolls</th>
                          <th className="text-left p-3">Generated Stickers</th>
                          <th className="text-left p-3">Remaining Rolls</th>
                          <th className="text-left p-3">Timestamp</th>
                          <th className="text-left p-3">Operator</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftAssignments
                          .filter((a) => a.machineAllocationId === selectedMachine.id)
                          .map((assignment) => {
                            const shift = shifts.find((s) => s.id === assignment.shiftId);
                            
                            // Calculate roll number range for display
                            let rollRangeDisplay = `${assignment.generatedStickers} barcodes generated`;
                            if (assignment.generatedBarcodes && assignment.generatedBarcodes.length > 0) {
                              // Sort barcodes by roll number to ensure proper range calculation
                              const sortedBarcodes = [...assignment.generatedBarcodes].sort((a, b) => a.rollNumber - b.rollNumber);
                              const firstRoll = sortedBarcodes[0]?.rollNumber;
                              const lastRoll = sortedBarcodes[sortedBarcodes.length - 1]?.rollNumber;
                              
                              if (firstRoll !== undefined && lastRoll !== undefined) {
                                rollRangeDisplay = `From Roll No. ${firstRoll} to ${lastRoll}`;
                              } else {
                                rollRangeDisplay = `${assignment.generatedStickers} barcodes generated`;
                              }
                            }
                            
                            return (
                              <tr key={assignment.id} className="border-t hover:bg-muted/50">
                                <td className="p-3">{shift?.shiftName || 'N/A'}</td>
                                <td className="p-3">{assignment.assignedRolls}</td>
                                <td className="p-3">
                                  {assignment.generatedStickers > 0 ? (
                                    <div>
                                      <div>{rollRangeDisplay}</div>
                                      <div className="text-xs text-gray-500">
                                        ({assignment.generatedStickers} total stickers)
                                      </div>
                                    </div>
                                  ) : (
                                    'None generated'
                                  )}
                                </td>
                                <td className="p-3">{assignment.remainingRolls}</td>
                                <td className="p-3">
                                  {new Date(assignment.timestamp).toLocaleString()}
                                </td>
                                <td className="p-3">{assignment.operatorName}</td>
                                <td className="p-3">
                                  {assignment.remainingRolls > 0 ? (
                                    <div className="flex space-x-2">
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
                                        placeholder="Barcodes to generate"
                                        className="w-24"
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
                                      >
                                        Generate
                                      </Button>
                                    </div>
                                  ) : (
                                    <span>{assignment.generatedStickers} barcodes generated</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No shift assignments yet.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sticker Generation Confirmation Dialog */}
      <Dialog open={showStickerConfirmation} onOpenChange={setShowStickerConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Sticker Generation</DialogTitle>
          </DialogHeader>
          {stickerConfirmationData && stickerConfirmationData.assignment && (
            <div className="space-y-4">
              <p>
                Are you sure you want to generate{' '}
                <strong>{stickerConfirmationData.barcodeCount}</strong> stickers?
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">Assignment ID:</div>
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

                <div className="font-medium">Assigned Rolls:</div>
                <div>{stickerConfirmationData.assignment.assignedRolls}</div>

                <div className="font-medium">Remaining Rolls:</div>
                <div>{stickerConfirmationData.assignment.remainingRolls}</div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={cancelStickerGeneration}>
                  Cancel
                </Button>
                <Button onClick={confirmStickerGeneration}>
                  Generate {stickerConfirmationData.barcodeCount} Stickers
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprint Sticker Dialog */}
      <Dialog open={showReprintDialog} onOpenChange={setShowReprintDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reprint Sticker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Enter the roll number for which you want to reprint the sticker</p>
            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number *</Label>
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
                placeholder="Enter roll number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Reprint *</Label>
              <Input
                id="reason"
                value={reprintData.reason}
                onChange={(e) =>
                  setReprintData((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Enter reason for reprint"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={cancelReprint}>
                Cancel
              </Button>
              <Button onClick={processReprint}>Reprint Sticker</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionAllotment;