import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, ArrowLeft, Calendar, Scan, Truck } from 'lucide-react';
import { toast } from '@/lib/toast';
import { dispatchPlanningApi, storageCaptureApi, apiUtils, rollConfirmationApi } from '@/lib/api-client';
import { getUser } from '@/lib/auth'; // Import auth utilities
import type { DispatchPlanningDto, StorageCaptureResponseDto, DispatchedRollDto, CreateDispatchedRollRequestDto } from '@/types/api-types';


const PickingAndLoading = () => {
  const [activeTab, setActiveTab] = useState<'picking' | 'loading'>('picking');
  const [dispatchOrderId, setDispatchOrderId] = useState('');
  const [isValidDispatchOrder, setIsValidDispatchOrder] = useState(false);
  const [dispatchOrderDetails, setDispatchOrderDetails] = useState<DispatchPlanningDto[] | null>(null);
  const [rollNumber, setRollNumber] = useState(''); // Single input for both picking and loading
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setLoadingDriverName] = useState('');
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [scannedRolls, setScannedRolls] = useState<any[]>([]); // Combined rolls for both picking and loading
  const [lotWeights, setLotWeights] = useState<Record<string, { totalGrossWeight: number; totalNetWeight: number }>>({}); // Track weights per lot
  const [hasError, setHasError] = useState(false);
  const [validating, setValidating] = useState(false);
  const [activeLotIndex, setActiveLotIndex] = useState<number>(0); // Track active lot by sequence

  // Validate dispatch order ID
  const validateDispatchOrder = async () => {
    if (!dispatchOrderId) {
      toast.error('Error', 'Please enter a dispatch order ID');
      return;
    }

    try {
      setValidating(true);
      // Call API to get dispatch planning data by dispatch order ID
      const response = await dispatchPlanningApi.getAllDispatchPlannings();
      const allDispatchPlannings = apiUtils.extractData(response);
      
      // Find all entries with matching dispatch order ID
      const matchedOrders = allDispatchPlannings.filter(
        (order: DispatchPlanningDto) => order.dispatchOrderId === dispatchOrderId
      );
      
      // Check if any of the orders are already fully dispatched
      const isAlreadyDispatched = matchedOrders.some(order => order.isFullyDispatched);
      
      if (isAlreadyDispatched) {
        setIsValidDispatchOrder(false);
        setDispatchOrderDetails(null);
        toast.error('Error', `Dispatch order ${dispatchOrderId} has already been fully dispatched`);
        return;
      }
      
      if (matchedOrders.length > 0) {
        setIsValidDispatchOrder(true);
        setDispatchOrderDetails(matchedOrders);
        setActiveLotIndex(0); // Start with first lot
        
        // Don't load existing dispatched rolls - only show what user scans
        setScannedRolls([]);
        
        toast.success('Success', `Found ${matchedOrders.length} lot(s) for dispatch order ${dispatchOrderId}`);
      } else {
        setIsValidDispatchOrder(false);
        setDispatchOrderDetails(null);
        toast.error('Error', 'Invalid dispatch order ID. Please enter a correct dispatch order ID');
      }
    } catch (error) {
      console.error('Error validating dispatch order:', error);
      setIsValidDispatchOrder(false);
      setDispatchOrderDetails(null);
      toast.error('Error', 'Failed to validate dispatch order ID');
    } finally {
      setValidating(false);
    }
  };

  const handleDispatchOrderKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateDispatchOrder();
    }
  };

  // Get active lot details based on sequence
  const getActiveLotDetails = () => {
    if (!dispatchOrderDetails || dispatchOrderDetails.length === 0) return null;
    return dispatchOrderDetails[activeLotIndex];
  };

  // Calculate remaining quantity for active lot
  const getRemainingQuantityForActiveLot = () => {
    const activeLot = getActiveLotDetails();
    if (!activeLot) return 0;
    
    // Count how many rolls have been processed for this lot
    const processedCount = scannedRolls.filter(roll => roll.lotNo === activeLot.lotNo).length;
    const totalDispatchRolls = activeLot.totalDispatchedRolls || 0;
    
    return Math.max(0, totalDispatchRolls - processedCount);
  };

  // Check if all lots are finished
  const areAllLotsFinished = () => {
    if (!dispatchOrderDetails) return false;
    
    return dispatchOrderDetails.every(lot => {
      const processedCount = scannedRolls.filter(roll => roll.lotNo === lot.lotNo).length;
      const totalDispatchRolls = lot.totalDispatchedRolls || 0;
      return processedCount >= totalDispatchRolls;
    });
  };

  // Move to next lot
  const moveToNextLot = () => {
    if (!dispatchOrderDetails) return;
    
    const nextIndex = activeLotIndex + 1;
    if (nextIndex < dispatchOrderDetails.length) {
      setActiveLotIndex(nextIndex);
    }
  };

  // Handle roll scan for both picking and loading
  const handleRollScan = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && rollNumber) {
      if (!isValidDispatchOrder) {
        toast.error('Error', 'Please validate dispatch order ID first');
        return;
      }
      
      const activeLot = getActiveLotDetails();
      if (!activeLot) {
        toast.error('Error', 'No active lot selected');
        return;
      }
      
      // Parse the roll number (assuming format: allotId#machineName#rollNo#fgRollNo)
      const parts = rollNumber.split('#');
      const allotId = parts[0];
      const fgRollNo = parts[3]; // Get the 4th part as fgRollNo
      
      if (!allotId || !fgRollNo) {
        toast.error('Error', 'Invalid QR code format. Expected format: allotId#machineName#rollNo#fgRollNo');
        setRollNumber('');
        return;
      }
      
      // Validate that scanned lot matches active lot
      if (allotId !== activeLot.lotNo) {
        toast.error('Error', `Please scan rolls for Lot ${activeLot.lotNo} (Sequence #${activeLotIndex + 1}) first`);
        setRollNumber('');
        return;
      }
      
      // Check if we've reached the limit for this lot
      const remainingQuantity = getRemainingQuantityForActiveLot();
      if (remainingQuantity <= 0) {
        toast.error('Error', `All rolls for Lot ${activeLot.lotNo} have been processed. Please move to the next lot.`);
        setRollNumber('');
        return;
      }
      
      try {
        // First, validate that the roll exists in storage captures
        const searchResponse = await storageCaptureApi.searchStorageCaptures({
          fgRollNo: fgRollNo,
          lotNo: activeLot.lotNo
        });
        const storageCaptures = apiUtils.extractData(searchResponse);
        
        
        // Check if any storage captures were found
        if (!storageCaptures || storageCaptures.length === 0) {
          toast.error('Error', `Roll ${fgRollNo} not found or does not belong to Lot ${activeLot.lotNo}`);
          setRollNumber('');
          return;
        }
        
        // Get the first matching storage capture
        const storageCapture = storageCaptures[0];
        
        // Fetch weight data from roll confirmation
        let grossWeight = 0;
        let netWeight = 0;
        
        try {
          // Get all roll confirmations for this allotId
          const rollResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(activeLot.lotNo);
          const rollConfirmations = apiUtils.extractData(rollResponse);
          
          // Find the specific roll with matching fgRollNo
          const matchingRoll = rollConfirmations.find(roll => roll.fgRollNo?.toString() === fgRollNo);
          
          if (matchingRoll) {
            grossWeight = matchingRoll.grossWeight || 0;
            netWeight = matchingRoll.netWeight || 0;
          }
        } catch (weightError) {
          console.warn('Could not fetch weight data for roll:', fgRollNo, weightError);
        }
        
        // Check if this roll has already been scanned in the same lot
        const existingRoll = scannedRolls.find(roll => roll.fgRollNo === fgRollNo && roll.lotNo === activeLot.lotNo);
        if (existingRoll) {
          toast.error('Error', `Roll ${fgRollNo} has already been scanned for Lot ${activeLot.lotNo}`);
          setRollNumber('');
          return;
        }
        console.log('dispatchOrderDetails', dispatchOrderDetails);
        console.log('dispatchOrderId', dispatchOrderId);
        console.log('activeLot', activeLot);

        // Validate that this roll belongs to the current dispatch order
        // Check if there's a dispatch planning record for this lot in the current dispatch order
        const lotInCurrentDispatchOrder = dispatchOrderDetails?.find(order => 
          order.lotNo === activeLot.lotNo && order.dispatchOrderId === dispatchOrderId
        );

        console.log('lotInCurrentDispatchOrder', lotInCurrentDispatchOrder);
        
        if (!lotInCurrentDispatchOrder) {
          toast.error('Error', `Lot ${activeLot.lotNo} is not part of dispatch order ${dispatchOrderId}`);
          setRollNumber('');
          return;
        }
        
        // Add new roll as both picked and loaded (single scan does both)
        const newRoll = {
          id: Date.now(),
          rollNumber: rollNumber,
          fgRollNo: fgRollNo,
          lotNumber: activeLot.lotNo,
          lotNo: activeLot.lotNo,
          product: activeLot.tape || 'Product A',
          customer: activeLot.customerName || 'N/A',
          quantity: 1, // Each roll is counted as 1 unit
          status: 'Picked & Loaded', // Single status for both operations
          dispatchOrderId: dispatchOrderId,
          sequence: scannedRolls.length + 1,
          isLoaded: true, // Mark as loaded immediately
          loadedAt: new Date().toISOString(),
          loadedBy: 'System',
          grossWeight: grossWeight,
          netWeight: netWeight
        };
        
        // Update lot weights
        setLotWeights(prev => {
          const currentWeights = prev[activeLot.lotNo] || { totalGrossWeight: 0, totalNetWeight: 0 };
          return {
            ...prev,
            [activeLot.lotNo]: {
              totalGrossWeight: currentWeights.totalGrossWeight + grossWeight,
              totalNetWeight: currentWeights.totalNetWeight + netWeight
            }
          };
        });
        
        setScannedRolls([...scannedRolls, newRoll]);
        setRollNumber('');
        toast.success('Success', `Roll ${fgRollNo} validated and marked as picked & loaded successfully. ${remainingQuantity - 1} rolls remaining for this lot.`);
        
        // If this was the last roll for the current lot, automatically move to next lot
        if (remainingQuantity - 1 === 0) {
          setTimeout(() => {
            if (activeLotIndex < (dispatchOrderDetails?.length || 0) - 1) {
              moveToNextLot();
              toast.info('Info', `Moving to next lot in sequence`);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error validating roll:', error);
        toast.error('Error', `Failed to validate roll ${fgRollNo}. Please try again.`);
        setRollNumber('');
      }
    }
  };

  const removeScannedRoll = (id: number) => {
    // Find the roll being removed
    const rollToRemove = scannedRolls.find(roll => roll.id === id);
    
    if (rollToRemove) {
      // Update lot weights
      setLotWeights(prev => {
        const currentWeights = prev[rollToRemove.lotNo] || { totalGrossWeight: 0, totalNetWeight: 0 };
        return {
          ...prev,
          [rollToRemove.lotNo]: {
            totalGrossWeight: Math.max(0, currentWeights.totalGrossWeight - (rollToRemove.grossWeight || 0)),
            totalNetWeight: Math.max(0, currentWeights.totalNetWeight - (rollToRemove.netWeight || 0))
          }
        };
      });
    }
    
    setScannedRolls(scannedRolls.filter(roll => roll.id !== id));
    toast.success('Success', 'Roll removed from list');
  };

  // Submit both picking and loading
  const submitPickingAndLoading = async () => {
    if (!isValidDispatchOrder) {
      toast.error('Error', 'Please validate dispatch order ID first');
      return;
    }
    
    if (scannedRolls.length === 0) {
      toast.error('Error', 'Please scan at least one roll');
      return;
    }
    
    // Check for duplicate rolls within the same lot
    const duplicateRolls = scannedRolls.filter((roll, index) => 
      scannedRolls.findIndex(r => r.fgRollNo === roll.fgRollNo && r.lotNo === roll.lotNo) !== index
    );
    
    if (duplicateRolls.length > 0) {
      const duplicateInfo = duplicateRolls.map(roll => `${roll.fgRollNo} (Lot: ${roll.lotNo})`).join(', ');
      toast.error('Error', `Duplicate rolls found within the same lot: ${duplicateInfo}`);
      return;
    }
    
    // Validate that all scanned rolls belong to the current dispatch order
    try {
      for (const roll of scannedRolls) {
        // Parse the roll number to get the fgRollNo
        const parts = roll.rollNumber.split('#');
        const fgRollNo = parts[3]; // Get the 4th part as fgRollNo
        
        if (!fgRollNo) {
          toast.error('Error', `Invalid QR code format for roll ${roll.rollNumber}`);
          return;
        }
        
        // Validate that the roll exists in storage captures
        const searchResponse = await storageCaptureApi.searchStorageCaptures({
          fgRollNo: fgRollNo
        });
        const storageCaptures = apiUtils.extractData(searchResponse);
        
        if (!storageCaptures || storageCaptures.length === 0) {
          toast.error('Error', `Roll ${fgRollNo} not found in system`);
          return;
        }
        
        const storageCapture = storageCaptures[0];
        
        // Check if the roll belongs to one of the lots in the current dispatch order
        const isValidLot = dispatchOrderDetails?.some(order => 
          order.lotNo === storageCapture.lotNo && order.dispatchOrderId === dispatchOrderId
        );
        
        if (!isValidLot) {
          toast.error('Error', `Roll ${fgRollNo} (Lot: ${storageCapture.lotNo}) does not belong to dispatch order ${dispatchOrderId}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error validating scanned rolls:', error);
      toast.error('Error', 'Failed to validate scanned rolls. Please try again.');
      return;
    }
    
    // Check if all lots are finished
    if (!areAllLotsFinished()) {
      const unfinishedLots = dispatchOrderDetails?.filter(lot => {
        const processedCount = scannedRolls.filter(roll => roll.lotNo === lot.lotNo).length;
        return processedCount < (lot.totalDispatchedRolls || 0);
      }).map(lot => lot.lotNo) || [];
      
      toast.error('Error', `Please finish processing all rolls for lots: ${unfinishedLots.join(', ')}`);
      return;
    }
    
    // Submit to backend
    try {
      // For each scanned roll, update the storage capture and create a dispatched roll entry
      for (const roll of scannedRolls) {
        try {
          // Extract fgRollNo from the roll number (4th part of the QR code)
          const parts = roll.rollNumber.split('#');
          const fgRollNo = parts[3]; // Get the 4th part as fgRollNo
          
          if (!fgRollNo) {
            toast.error('Error', `Invalid QR code format for roll ${roll.rollNumber}`);
            continue;
          }
          
          // First, find the storage capture record for this roll
          const searchResponse = await storageCaptureApi.searchStorageCaptures({
            fgRollNo: fgRollNo
          });
          const storageCaptures = apiUtils.extractData(searchResponse);
          
          if (!storageCaptures || storageCaptures.length === 0) {
            toast.error('Error', `Roll ${fgRollNo} not found in system`);
            continue;
          }
          
          const storageCapture = storageCaptures[0];
          
          // Update the storage capture to mark it as dispatched
          await storageCaptureApi.updateStorageCapture(storageCapture.id, {
            lotNo: storageCapture.lotNo,
            fgRollNo: storageCapture.fgRollNo,
            locationCode: storageCapture.locationCode,
            tape: storageCapture.tape,
            customerName: storageCapture.customerName,
            isDispatched: true,
            isActive: storageCapture.isActive
          });
          
          // Find the corresponding dispatch planning record for this lot
          const dispatchPlanning = dispatchOrderDetails?.find(order => order.lotNo === storageCapture.lotNo);
          
          if (dispatchPlanning) {
            // Get current user information
            const currentUser = getUser();
            const loadedBy = currentUser?.firstName && currentUser?.lastName 
              ? `${currentUser.firstName} ${currentUser.lastName}` 
              : currentUser?.email || 'System';
            
            // Create a dispatched roll entry
            await dispatchPlanningApi.createDispatchedRoll({
              dispatchPlanningId: dispatchPlanning.id,
              lotNo: storageCapture.lotNo,
              fgRollNo: storageCapture.fgRollNo,
              isLoaded: true,
              loadedAt: new Date().toISOString(),
              loadedBy: loadedBy // Use actual user name instead of 'System'
            });
          }
        } catch (rollError) {
          console.error('Error processing roll:', rollError);
          toast.error('Error', `Failed to process roll ${roll.rollNumber}. Please try again.`);
        }
      }
      
      // Update dispatch planning records with total weights for each lot
      for (const [lotNo, weights] of Object.entries(lotWeights)) {
        try {
          // Find the corresponding dispatch planning record for this lot
          const dispatchPlanning = dispatchOrderDetails?.find(order => order.lotNo === lotNo);
          
          if (dispatchPlanning) {
            // Update the dispatch planning record with total weights
            await dispatchPlanningApi.updateDispatchPlanning(dispatchPlanning.id, {
              lotNo: dispatchPlanning.lotNo,
              salesOrderId: dispatchPlanning.salesOrderId,
              salesOrderItemId: dispatchPlanning.salesOrderItemId,
              customerName: dispatchPlanning.customerName,
              tape: dispatchPlanning.tape,
              totalRequiredRolls: dispatchPlanning.totalRequiredRolls,
              totalReadyRolls: dispatchPlanning.totalReadyRolls,
              totalDispatchedRolls: dispatchPlanning.totalDispatchedRolls,
              isFullyDispatched: true, // Mark as fully dispatched since all operations are completed
              dispatchStartDate: dispatchPlanning.dispatchStartDate,
              dispatchEndDate: dispatchPlanning.dispatchEndDate,
              vehicleNo: dispatchPlanning.vehicleNo,
              driverName: dispatchPlanning.driverName,
              license: dispatchPlanning.license,
              mobileNumber: dispatchPlanning.mobileNumber,
              remarks: dispatchPlanning.remarks,
              loadingNo: dispatchPlanning.loadingNo,
              dispatchOrderId: dispatchPlanning.dispatchOrderId,
              isTransport: dispatchPlanning.isTransport,
              isCourier: dispatchPlanning.isCourier,
              transportId: dispatchPlanning.transportId,
              courierId: dispatchPlanning.courierId,
              transportName: dispatchPlanning.transportName,
              contactPerson: dispatchPlanning.contactPerson,
              phone: dispatchPlanning.phone,
              maximumCapacityKgs: dispatchPlanning.maximumCapacityKgs,
              totalGrossWeight: weights.totalGrossWeight,
              totalNetWeight: weights.totalNetWeight
            });
          }
        } catch (weightError) {
          console.error('Error updating weights for lot:', lotNo, weightError);
          toast.error('Error', `Failed to update weights for lot ${lotNo}. Please try again.`);
        }
      }
      
      toast.success('Success', `Submitted ${scannedRolls.length} rolls under dispatch order ${dispatchOrderId}`);
      setScannedRolls([]);
      // Keep the dispatch order ID for potential additional scanning
    } catch (error) {
      console.error('Error submitting rolls:', error);
      toast.error('Error', 'Failed to submit rolls. Please try again.');
    }
  };

  const resetValidation = () => {
    setIsValidDispatchOrder(false);
    setDispatchOrderDetails(null);
    setScannedRolls([]);
    setLotWeights({});
    setActiveLotIndex(0);
  };

  // Group scanned rolls by lotNo
  const groupedScannedRolls: Record<string, any[]> = scannedRolls.reduce((acc: Record<string, any[]>, roll) => {
    if (!acc[roll.lotNo]) {
      acc[roll.lotNo] = [];
    }
    acc[roll.lotNo].push(roll);
    return acc;
  }, {});

  return (
    <div className="p-2 max-w-6xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base font-semibold">
              Picking and Loading Operations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/20 h-6 px-2"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          </div>
          <p className="text-white/80 text-xs mt-1">
            Manage both picking and loading operations in one place
          </p>
        </CardHeader>

        <CardContent className="p-3">
          {/* Dispatch Order Validation Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4">
            <h3 className="text-xs font-semibold text-blue-800 mb-2">Dispatch Order Validation</h3>
            <p className="text-xs text-blue-700/80 mb-2">
              Enter and validate the dispatch order ID before performing operations
            </p>
          
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="dispatchOrderId" className="text-xs font-medium text-gray-700">
                  Dispatch Order ID
                </Label>
                <div className="relative">
                  <Scan className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    id="dispatchOrderId"
                    value={dispatchOrderId}
                    onChange={(e) => setDispatchOrderId(e.target.value)}
                    onKeyPress={handleDispatchOrderKeyPress}
                    placeholder="Enter dispatch order ID"
                    className={`pl-7 text-xs h-8 ${hasError ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                    disabled={isValidDispatchOrder}
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isValidDispatchOrder ? (
                  <Button
                    onClick={validateDispatchOrder}
                    disabled={validating || !dispatchOrderId}
                    className="h-8 px-3 text-xs"
                  >
                    {validating ? (
                      <>
                        <div className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Validating...
                      </>
                    ) : (
                      'Validate Dispatch Order'
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={resetValidation}
                    className="h-8 px-3 text-xs"
                  >
                    Change Dispatch Order
                  </Button>
                )}
              </div>
            </div>
            
            {/* Dispatch Order Details */}
            {isValidDispatchOrder && dispatchOrderDetails && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <h4 className="text-xs font-semibold text-blue-700 mb-2">Dispatch Order Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="font-medium text-blue-800">Dispatch Order ID</p>
                    <p className="text-blue-600">{dispatchOrderId}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="font-medium text-blue-800">Customer(s)</p>
                    <p className="text-blue-600">{
                      dispatchOrderDetails ? 
                      [...new Set(dispatchOrderDetails.map(order => order.customerName).filter(name => name))]
                        .map((name, index) => `${index + 1}. ${name}`)
                        .join(', ') || 'N/A' :
                      'N/A'
                    }</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="font-medium text-blue-800">Total Lots</p>
                    <p className="text-blue-600">{dispatchOrderDetails.length}</p>
                  </div>
                </div>
                
                {/* Lot-wise details with sequence */}
                <div className="mt-3">
                  <h5 className="text-xs font-semibold text-blue-700 mb-2">Lot Details (Sequence-wise)</h5>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader className="bg-blue-50">
                        <TableRow>
                          <TableHead className="text-xs font-medium text-blue-700">Sequence</TableHead>
                          <TableHead className="text-xs font-medium text-blue-700">Lot No</TableHead>
                          <TableHead className="text-xs font-medium text-blue-700">Tape</TableHead>
                          <TableHead className="text-xs font-medium text-blue-700">Ready Dispatch Rolls</TableHead>
                          <TableHead className="text-xs font-medium text-blue-700">Processed Rolls</TableHead>
                          <TableHead className="text-xs font-medium text-blue-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispatchOrderDetails.map((order, index) => {
                          const processedCount = scannedRolls.filter(roll => roll.lotNo === order.lotNo).length;
                          const isCurrentActive = index === activeLotIndex;
                          const isFinished = processedCount >= (order.totalDispatchedRolls || 0);
                          
                          return (
                            <TableRow 
                              key={order.id} 
                              className={`border-b border-blue-100 ${isCurrentActive ? 'bg-blue-50' : ''}`}
                            >
                              <TableCell className="py-2 text-xs">#{index + 1}</TableCell>
                              <TableCell className="py-2 text-xs font-medium">{order.lotNo}</TableCell>
                              <TableCell className="py-2 text-xs">{order.tape || 'N/A'}</TableCell>
                              <TableCell className="py-2 text-xs">{order.totalDispatchedRolls || 0}</TableCell>
                              <TableCell className="py-2 text-xs">
                                {processedCount}
                              </TableCell>
                              <TableCell className="py-2">
                                {isCurrentActive ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Active
                                  </span>
                                ) : isFinished ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Finished
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Pending
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Active Lot Indicator */}
                  {getActiveLotDetails() && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-800">
                        <span className="font-medium">Active Lot:</span> {getActiveLotDetails()?.lotNo} (Sequence #{activeLotIndex + 1}) | 
                        <span className="font-medium"> Remaining Rolls:</span> {
                          getRemainingQuantityForActiveLot()
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Combined Picking and Loading Operations */}
          <div className="space-y-6">
            {/* Dispatch Order Details Reminder */}
            {isValidDispatchOrder && getActiveLotDetails() && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
                <h3 className="text-xs font-semibold text-blue-800 mb-2">
                  Current Active Lot: {getActiveLotDetails()?.lotNo} (Sequence #{activeLotIndex + 1})
                </h3>
                <p className="text-xs text-blue-700/80">
                  Dispatch Order ID: {dispatchOrderId}
                </p>
              </div>
            )}
            
            {/* Roll Scanning Section */}
            {isValidDispatchOrder && getActiveLotDetails() && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
                <h3 className="text-xs font-semibold text-blue-800 mb-2">
                  Scan Rolls for Lot: {getActiveLotDetails()?.lotNo} (Sequence #{activeLotIndex + 1})
                </h3>
                <p className="text-xs text-blue-700/80 mb-2">
                  Scan or enter the roll number to add to picking/loading list for dispatch order {dispatchOrderId}
                </p>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="rollNumber" className="text-xs font-medium text-gray-700">
                      Roll Number (Scan QR Code)
                    </Label>
                    <div className="relative">
                      <Scan className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="rollNumber"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        onKeyPress={handleRollScan}
                        placeholder="Scan QR code or enter roll number"
                        className={`pl-7 text-xs h-8 ${hasError ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                      />
                    </div>
                  </div>
                  
                  {/* Next Lot Button */}
                  {getRemainingQuantityForActiveLot() <= 0 && activeLotIndex < (dispatchOrderDetails?.length || 0) - 1 && (
                    <Button
                      onClick={moveToNextLot}
                      className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Move to Next Lot (Sequence #{activeLotIndex + 2})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Scanned Rolls Summary - Grouped by Lot No */}
            {Object.keys(groupedScannedRolls).length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-green-800">Scanned Rolls Summary</h3>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {scannedRolls.length} total rolls
                    </span>
                    {/* Calculate total weights across all lots */}
                    {(() => {
                      const totalWeights = Object.values(lotWeights).reduce((acc, weights) => ({
                        totalGrossWeight: acc.totalGrossWeight + weights.totalGrossWeight,
                        totalNetWeight: acc.totalNetWeight + weights.totalNetWeight
                      }), { totalGrossWeight: 0, totalNetWeight: 0 });
                      
                      return (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Total Gross: {totalWeights.totalGrossWeight.toFixed(2)} kg
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Total Net: {totalWeights.totalNetWeight.toFixed(2)} kg
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Lot-wise roll display */}
                {Object.entries(groupedScannedRolls).map(([lotNo, rolls]) => {
                  const allotmentDetail = dispatchOrderDetails?.find(order => order.lotNo === lotNo);
                  // Get weight information for this lot
                  const lotWeightInfo = lotWeights[lotNo] || { totalGrossWeight: 0, totalNetWeight: 0 };
                  
                  return (
                    <div key={lotNo} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-2 p-2 bg-green-100 rounded">
                        <div>
                          <h4 className="text-xs font-semibold text-green-800">Lot: {lotNo}</h4>
                          <p className="text-xs text-green-700">
                            {allotmentDetail?.tape || 'N/A'} - {allotmentDetail?.lotNo || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800">
                            {rolls.length} rolls
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                            Gross: {lotWeightInfo.totalGrossWeight.toFixed(2)} kg
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                            Net: {lotWeightInfo.totalNetWeight.toFixed(2)} kg
                          </span>
                        </div>
                      </div>
                      
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader className="bg-green-50">
                            <TableRow>
                              <TableHead className="text-xs font-medium text-green-700">Sequence</TableHead>
                              <TableHead className="text-xs font-medium text-green-700">Roll No</TableHead>
                              <TableHead className="text-xs font-medium text-green-700">Lot No</TableHead>
                              <TableHead className="text-xs font-medium text-green-700">Product</TableHead>
                              <TableHead className="text-xs font-medium text-green-700">Customer</TableHead>
                              <TableHead className="text-xs font-medium text-green-700">Status</TableHead>
                              <TableHead className="text-xs font-medium text-green-700 text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rolls.map((roll: any) => (
                              <TableRow key={roll.id} className="border-b border-green-100">
                                <TableCell className="py-2 text-xs font-medium">#{roll.sequence}</TableCell>
                                <TableCell className="py-2 text-xs font-medium">{roll.fgRollNo || roll.rollNumber}</TableCell>
                                <TableCell className="py-2 text-xs">{roll.lotNumber}</TableCell>
                                <TableCell className="py-2 text-xs">{roll.product}</TableCell>
                                <TableCell className="py-2 text-xs">{roll.customer}</TableCell>
                                <TableCell className="py-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {roll.status}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeScannedRoll(roll.id)}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setScannedRolls([])}
                    className="h-8 px-3 text-xs"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={submitPickingAndLoading}
                    disabled={!areAllLotsFinished()}
                    className={`h-8 px-4 text-xs ${areAllLotsFinished() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Submit All Operations
                  </Button>
                </div>
                
                {/* Submission Info */}
                {!areAllLotsFinished() && (
                  <div className="mt-2 text-xs text-green-700">
                    <p>Please finish processing all rolls for all lots before submitting.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PickingAndLoading;