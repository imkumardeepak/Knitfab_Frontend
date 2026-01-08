import { useState, useEffect, useRef } from 'react';
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
  const [dispatchOrderId, setDispatchOrderId] = useState('');
  const [isValidDispatchOrder, setIsValidDispatchOrder] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [dispatchOrderDetails, setDispatchOrderDetails] = useState<DispatchPlanningDto[] | null>(null);
  const [rollNumber, setRollNumber] = useState(''); // Single input for both picking and loading
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setLoadingDriverName] = useState('');
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [scannedRolls, setScannedRolls] = useState<any[]>([]); // Combined rolls for both picking and loading
  const [lotWeights, setLotWeights] = useState<Record<string, { totalGrossWeight: number; totalNetWeight: number }>>({}); // Track weights per lot
  const [validating, setValidating] = useState(false);
  const [activeLotIndex, setActiveLotIndex] = useState<number>(0); // Track active lot by sequence

  const dispatchOrderIdRef = useRef<HTMLInputElement>(null);
  const rollNumberRef = useRef<HTMLInputElement>(null);

  // Focus on dispatch order ID input when component mounts
  useEffect(() => {
    if (dispatchOrderIdRef.current) {
      dispatchOrderIdRef.current.focus();
    }
  }, []);

  // Focus on roll number input when dispatch order details are loaded
  useEffect(() => {
    if (isValidDispatchOrder && dispatchOrderDetails && rollNumberRef.current) {
      // Small delay to ensure UI is rendered
      setTimeout(() => {
        rollNumberRef.current?.focus();
      }, 100);
    }
  }, [isValidDispatchOrder, dispatchOrderDetails]);

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
        
        // Load existing dispatched rolls for this dispatch order
        const allDispatchedRolls = [];
        
        // Get all dispatched rolls for this dispatch order ID
        const allDispatchedRollsResponse = await dispatchPlanningApi.getOrderedDispatchedRollsByDispatchOrderId(dispatchOrderId);
        const allDispatchedRollsData = apiUtils.extractData(allDispatchedRollsResponse) || [];
        
        // Process each dispatched roll to create the proper format for our UI
        for (const dr of allDispatchedRollsData) {
          // Find the matching dispatch planning record for this roll
          const matchingOrder = matchedOrders.find(order => order.lotNo === dr.lotNo);
          
          if (matchingOrder) {
            allDispatchedRolls.push({
              id: dr.id || Date.now() + allDispatchedRolls.length, // Use existing ID or generate one
              rollNumber: `${dr.lotNo}#${dr.fgRollNo}`, // Format as needed
              fgRollNo: dr.fgRollNo,
              lotNumber: dr.lotNo,
              lotNo: dr.lotNo,
              product: matchingOrder.tape || 'Product A',
              customer: matchingOrder.customerName || 'N/A',
              quantity: 1,
              status: 'Picked & Loaded',
              dispatchOrderId,
              sequence: allDispatchedRolls.length + 1,
              isLoaded: dr.isLoaded || true,
              loadedAt: dr.loadedAt || new Date().toISOString(),
              loadedBy: dr.loadedBy || 'System',
              grossWeight: 0, // Will fetch weight data if needed
              netWeight: 0
            });
          }
        }
        
        // Set the scanned rolls with the already dispatched rolls
        setScannedRolls(allDispatchedRolls);
        
        // Calculate and set lot weights based on the already dispatched rolls
        const calculatedWeights: Record<string, { totalGrossWeight: number; totalNetWeight: number }> = {};
        for (const roll of allDispatchedRolls) {
          if (!calculatedWeights[roll.lotNo]) {
            calculatedWeights[roll.lotNo] = { totalGrossWeight: 0, totalNetWeight: 0 };
          }
          
          // Fetch weight data for this roll if needed
          try {
            const rollResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(roll.lotNo);
            const rollConfirmations = apiUtils.extractData(rollResponse) || [];
            const matchingRoll = rollConfirmations.find(r => r.fgRollNo?.toString() === roll.fgRollNo);
            if (matchingRoll) {
              calculatedWeights[roll.lotNo].totalGrossWeight += matchingRoll.grossWeight || 0;
              calculatedWeights[roll.lotNo].totalNetWeight += matchingRoll.netWeight || 0;
            }
          } catch (weightError) {
            console.warn('Could not fetch weight data for roll:', roll.fgRollNo, weightError);
          }
        }
        
        setLotWeights(calculatedWeights);
        
      
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

  // Manually select lot
  const selectActiveLot = (index: number) => {
    if (!dispatchOrderDetails || index < 0 || index >= dispatchOrderDetails.length) return;
    setActiveLotIndex(index);
  };

  // Handle roll scan for both picking and loading
const handleRollScan = async (e: React.KeyboardEvent) => {
  if (e.key !== 'Enter' || !rollNumber) return;

  try {
    if (!isValidDispatchOrder) {
      toast.error('Error', 'Please validate dispatch order ID first');
      setRollNumber('');
      return;
    }

    const activeLot = getActiveLotDetails();
    if (!activeLot) {
      toast.error('Error', 'No active lot selected');
      setRollNumber('');
      return;
    }

    // Parse QR
    const parts = rollNumber.split('#');
    const allotId = parts[0];
    const fgRollNo = parts[3];

    if (!allotId || !fgRollNo) {
      toast.error('Error', 'Invalid QR format. Expected: allotId#machineName#rollNo#fgRollNo');
      setRollNumber('');
      return;
    }

    if (allotId !== activeLot.lotNo) {
      toast.error('Error', `Please scan rolls for Lot ${activeLot.lotNo} first`);
      setRollNumber('');
      return;
    }

    const remainingQuantity = getRemainingQuantityForActiveLot();
    if (remainingQuantity <= 0) {
      toast.error('Error', `All rolls for Lot ${activeLot.lotNo} have been processed.`);
      setRollNumber('');
      return;
    }

    // --- 🔍 SEARCH IN STORAGE CAPTURE ---
    let storageCaptures = [];
    try {
      const searchResponse = await storageCaptureApi.searchStorageCaptures({
        fgRollNo: fgRollNo,
        lotNo: activeLot.lotNo
      });
      storageCaptures = apiUtils.extractData(searchResponse) || [];
    } catch (searchError: any) {
      console.error('Storage search failed:', searchError);
      toast.error('Error', `Failed to search roll ${fgRollNo}. Please retry.`);
      setRollNumber('');
      return;
    }

    if (storageCaptures.length === 0) {
      toast.error('Error', `Roll ${fgRollNo} not found for Lot ${activeLot.lotNo}`);
      setRollNumber('');
      return;
    }

    const storageCapture = storageCaptures[0];
    
    // Check if the roll is already dispatched
    if (storageCapture.isDispatched) {
      toast.error('Error', `Roll ${fgRollNo} already dispatched`);
      setRollNumber('');
      return;
    }

    // --- ⚖️ FETCH WEIGHT DATA ---
    let grossWeight = 0;
    let netWeight = 0;
    try {
      const rollResponse = await rollConfirmationApi.getRollConfirmationsByAllotId(activeLot.lotNo);
      const rollConfirmations = apiUtils.extractData(rollResponse) || [];
      const matchingRoll = rollConfirmations.find(roll => roll.fgRollNo?.toString() === fgRollNo);
      if (matchingRoll) {
        grossWeight = matchingRoll.grossWeight || 0;
        netWeight = matchingRoll.netWeight || 0;
      }
    } catch (weightError) {
      console.warn('Could not fetch weight data for roll:', fgRollNo, weightError);
    }

    // --- 🧩 DUPLICATE SCAN CHECK (both in scanned rolls and already dispatched rolls) ---
    const existingRoll = scannedRolls.find(roll => roll.fgRollNo === fgRollNo && roll.lotNo === activeLot.lotNo);
    if (existingRoll) {
      toast.error('Error', `Roll ${fgRollNo} already scanned for Lot ${activeLot.lotNo}`);
      setRollNumber('');
      return;
    }

    // --- 🚚 DISPATCH ORDER VALIDATION ---
    const lotInCurrentDispatchOrder = dispatchOrderDetails?.find(
      order => order.lotNo === activeLot.lotNo && order.dispatchOrderId === dispatchOrderId
    );

    if (!lotInCurrentDispatchOrder) {
      toast.error('Error', `Lot ${activeLot.lotNo} not part of dispatch order ${dispatchOrderId}`);
      setRollNumber('');
      return;
    }

    // --- ✅ ADD SCANNED ROLL ---
    const newRoll = {
      id: Date.now(),
      rollNumber,
      fgRollNo,
      lotNumber: activeLot.lotNo,
      lotNo: activeLot.lotNo,
      product: activeLot.tape || 'Product A',
      customer: activeLot.customerName || 'N/A',
      quantity: 1,
      status: 'Picked & Loaded',
      dispatchOrderId,
      sequence: scannedRolls.length + 1,
      isLoaded: true,
      loadedAt: new Date().toISOString(),
      loadedBy: 'System',
      grossWeight,
      netWeight
    };

    setLotWeights(prev => {
      const current = prev[activeLot.lotNo] || { totalGrossWeight: 0, totalNetWeight: 0 };
      return {
        ...prev,
        [activeLot.lotNo]: {
          totalGrossWeight: current.totalGrossWeight + grossWeight,
          totalNetWeight: current.totalNetWeight + netWeight
        }
      };
    });

    // Add roll to dispatched rolls table
    try {
      const dispatchPlanning = dispatchOrderDetails?.find(order => 
        order.lotNo === activeLot.lotNo && 
        order.dispatchOrderId === dispatchOrderId
      );
      
      if (dispatchPlanning && dispatchPlanning.id) {
        const currentUser = getUser();
        const loadedBy = currentUser?.firstName && currentUser?.lastName 
          ? `${currentUser.firstName} ${currentUser.lastName}` 
          : currentUser?.email || 'System';

        // Create a dispatched roll entry
        await dispatchPlanningApi.createDispatchedRoll({
          dispatchPlanningId: dispatchPlanning.id,
          lotNo: activeLot.lotNo,
          fgRollNo: fgRollNo,
          isLoaded: true,
          loadedAt: new Date().toISOString(),
          loadedBy: loadedBy
        });
      }
    } catch (dispatchError) {
      console.error('Error creating dispatched roll:', dispatchError);
      toast.error('Error', `Failed to add roll ${fgRollNo} to dispatched rolls. Please try again.`);
      setLotWeights(prev => {
        const current = prev[activeLot.lotNo] || { totalGrossWeight: 0, totalNetWeight: 0 };
        return {
          ...prev,
          [activeLot.lotNo]: {
            totalGrossWeight: Math.max(0, current.totalGrossWeight - grossWeight),
            totalNetWeight: Math.max(0, current.totalNetWeight - netWeight)
          }
        };
      });
      setRollNumber('');
      return;
    }

    // Update storage capture to mark as dispatched
    try {
      await storageCaptureApi.updateStorageCapture(storageCapture.id, {
        ...storageCapture,
        isDispatched: true
      });
    } catch (storageError) {
      console.error('Error updating storage capture:', storageError);
      toast.error('Error', `Failed to update storage capture for roll ${fgRollNo}. Please try again.`);
      // Remove the dispatched roll entry if storage update fails
      try {
        const dispatchPlanning = dispatchOrderDetails?.find(order => 
          order.lotNo === activeLot.lotNo && 
          order.dispatchOrderId === dispatchOrderId
        );
        
        if (dispatchPlanning && dispatchPlanning.id) {
          // Since we don't have a delete API, we'll just show an error
          // In a real implementation, you would need to delete the dispatched roll
        }
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      
      setLotWeights(prev => {
        const current = prev[activeLot.lotNo] || { totalGrossWeight: 0, totalNetWeight: 0 };
        return {
          ...prev,
          [activeLot.lotNo]: {
            totalGrossWeight: Math.max(0, current.totalGrossWeight - grossWeight),
            totalNetWeight: Math.max(0, current.totalNetWeight - netWeight)
          }
        };
      });
      setRollNumber('');
      return;
    }

    setScannedRolls(prev => [...prev, newRoll]);
    setRollNumber('');
    toast.success('Success', `Roll ${fgRollNo} marked as picked & loaded. ${remainingQuantity - 1} remaining.`);

    // --- 🔄 AUTO MOVE TO NEXT LOT ---
    if (remainingQuantity - 1 === 0) {
      setTimeout(() => {
        if (activeLotIndex < (dispatchOrderDetails?.length || 0) - 1) {
          moveToNextLot();
          toast.info('Info', `Moving to next lot`);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Error validating roll:', error);
    toast.error('Error', `Failed to validate roll. Please try again.`);
    setRollNumber('');
  }
};


  const removeScannedRoll = async (id: number) => {
    // Find the roll being removed
    const rollToRemove = scannedRolls.find(roll => roll.id === id);
    
    if (rollToRemove) {
      try {
        // Find the dispatch planning record for this roll
        const dispatchPlanning = dispatchOrderDetails?.find(order => 
          order.lotNo === rollToRemove.lotNo && 
          order.dispatchOrderId === dispatchOrderId
        );
        
        if (dispatchPlanning && dispatchPlanning.id) {
          // Find the dispatched roll entry to remove
          const dispatchedRollsResponse = await dispatchPlanningApi.getDispatchedRollsByPlanningId(dispatchPlanning.id);
          const allDispatchedRolls = apiUtils.extractData(dispatchedRollsResponse) || [];
          
          // Find the specific dispatched roll to remove
          const rollToDelete = allDispatchedRolls.find((dr: any) => 
            dr.fgRollNo === rollToRemove.fgRollNo && dr.lotNo === rollToRemove.lotNo
          );
          
          if (rollToDelete) {
            // Delete the dispatched roll entry
            await dispatchPlanningApi.deleteDispatchedRoll(rollToDelete.id);
          }
        }
        
        // Find the storage capture record for this roll
        const searchResponse = await storageCaptureApi.searchStorageCaptures({
          fgRollNo: rollToRemove.fgRollNo,
          lotNo: rollToRemove.lotNo
        });
        const storageCaptures = apiUtils.extractData(searchResponse) || [];
        
        if (storageCaptures.length > 0) {
          const storageCapture = storageCaptures[0];
          
          // Update storage capture to mark as NOT dispatched
          await storageCaptureApi.updateStorageCapture(storageCapture.id, {
            ...storageCapture,
            isDispatched: false
          });
        }
        
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
        
        setScannedRolls(scannedRolls.filter(roll => roll.id !== id));
        toast.success('Success', 'Roll removed and storage capture updated');
      } catch (error) {
        console.error('Error removing scanned roll:', error);
        toast.error('Error', 'Failed to remove roll. Please try again.');
      }
    }
  };

  // Submit both picking and loading
  const submitPickingAndLoading = async () => {
  if (!isValidDispatchOrder) {
    return toast.error('Error', 'Please validate dispatch order ID first');
  }

  if (scannedRolls.length === 0) {
    return toast.error('Error', 'Please scan at least one roll');
  }

  // --- Build confirmation message ---
  const scannedCountByLot: Record<string, number> = {};

  for (const roll of scannedRolls) {
    scannedCountByLot[roll.lotNo] = (scannedCountByLot[roll.lotNo] || 0) + 1;
  }

  const confirmationMessage = (dispatchOrderDetails ?? [])
    .map(lot => {
      const scannedCount = scannedCountByLot[lot.lotNo] || 0;
      const planned = lot.totalDispatchedRolls || 0;
      const status = scannedCount >= planned ? 'Complete' : 'Incomplete';
      return `Lot ${lot.lotNo}: Planned ${planned}, Scanned ${scannedCount} - ${status}`;
    })
    .join('\n');

  if (!window.confirm(`${confirmationMessage}\n\nConfirm submission?`)) return;

  try {
    // Update dispatch planning records with calculated weights
    const updates = (dispatchOrderDetails ?? []).map(dispatchPlanning => {
      const lotNo = dispatchPlanning.lotNo;

      const scannedCount = scannedCountByLot[lotNo] || 0;
      const plannedCount = dispatchPlanning.totalDispatchedRolls || 0;

      const lotWeightInfo = lotWeights[lotNo] || {
        totalGrossWeight: 0,
        totalNetWeight: 0,
      };

      return {
        id: dispatchPlanning.id,
        payload: {
          ...dispatchPlanning,
          totalGrossWeight: lotWeightInfo.totalGrossWeight,
          totalNetWeight: lotWeightInfo.totalNetWeight,
          isFullyDispatched: scannedCount >= plannedCount,
        },
      };
    });

    // Update dispatch planning records only
    await Promise.all(
      updates.map(u =>
        dispatchPlanningApi.updateDispatchPlanning(u.id, u.payload)
      )
    );

    toast.success(
      'Success',
      `Submitted ${scannedRolls.length} rolls under dispatch order ${dispatchOrderId}`
    );

    // Clear all form data and reset component state
    setDispatchOrderId('');
    setScannedRolls([]);
    setDispatchOrderDetails([]);
    setLotWeights({});
    setIsValidDispatchOrder(false);
    setRollNumber('');
    setActiveLotIndex(0);
  } catch (error) {
    console.error('Error submitting:', error);
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
    <div className="p-1 max-w-6xl mx-auto">
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg py-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm font-semibold">
              Picking and Loading
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
        </CardHeader>

        <CardContent className="p-2">
          {/* Dispatch Order Validation Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-2 mb-3">
          
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="dispatchOrderId" className="text-[10px] font-medium text-gray-700">
                  Dispatch Order ID
                </Label>
                <div className="relative">
                  <Scan className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    ref={dispatchOrderIdRef}
                    id="dispatchOrderId"
                    value={dispatchOrderId}
                    onChange={(e) => setDispatchOrderId(e.target.value)}
                    onKeyPress={handleDispatchOrderKeyPress}
                    placeholder="Scan or Enter dispatch order ID"
                    className={`pl-7 text-xs h-7 ${hasError ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                    disabled={isValidDispatchOrder}
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isValidDispatchOrder ? (
                  <Button
                    onClick={validateDispatchOrder}
                    disabled={validating || !dispatchOrderId}
                    className="h-7 px-2 text-xs"
                  >
                    {validating ? (
                      <>
                        <div className="mr-1 h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                        Validating...
                      </>
                    ) : (
                      'Validate Order'
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={resetValidation}
                    className="h-7 px-2 text-xs"
                  >
                    Change Order
                  </Button>
                )}
              </div>
            </div>
            
            {/* Dispatch Order Details */}
            {isValidDispatchOrder && dispatchOrderDetails && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <h4 className="text-xs font-semibold text-blue-700 mb-1">Dispatch Order Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[10px]">
                  <div className="bg-blue-50 p-1 rounded">
                    <p className="font-medium text-blue-800">Order ID</p>
                    <p className="text-blue-600">{dispatchOrderId}</p>
                  </div>
                  <div className="bg-blue-50 p-1 rounded">
                    <p className="font-medium text-blue-800">Customers</p>
                    <p className="text-blue-600">{
                      dispatchOrderDetails ? 
                      [...new Set(dispatchOrderDetails.map(order => order.customerName).filter(name => name))]
                        .map((name, index) => `${index + 1}. ${name}`)
                        .join(', ') || 'N/A' :
                      'N/A'
                    }</p>
                  </div>
                  <div className="bg-blue-50 p-1 rounded">
                    <p className="font-medium text-blue-800">Total Lots</p>
                    <p className="text-blue-600">{dispatchOrderDetails.length}</p>
                  </div>
                </div>
                
                {/* Lot-wise details with sequence */}
                <div className="mt-2">
                  <h5 className="text-xs font-semibold text-blue-700 mb-1">Lot Details</h5>
                  <div className="border rounded-md text-[9px]">
                    <Table>
                      <TableHeader className="bg-blue-50">
                        <TableRow>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Seq</TableHead>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Lot No</TableHead>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Tape</TableHead>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Rolls</TableHead>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Proc</TableHead>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Status</TableHead>
                          <TableHead className="text-[9px] font-medium text-blue-700 p-1">Action</TableHead>
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
                              <TableCell className="p-1 text-[9px]">#{index + 1}</TableCell>
                              <TableCell className="p-1 text-[9px] font-medium">{order.lotNo}</TableCell>
                              <TableCell className="p-1 text-[9px]">{order.tape || 'N/A'}</TableCell>
                              <TableCell className="p-1 text-[9px]">{order.totalDispatchedRolls || 0}</TableCell>
                              <TableCell className="p-1 text-[9px]">
                                {processedCount}
                              </TableCell>
                              <TableCell className="p-1">
                                {isCurrentActive ? (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[8px] font-medium bg-yellow-100 text-yellow-800">
                                    Active
                                  </span>
                                ) : isFinished ? (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[8px] font-medium bg-green-100 text-green-800">
                                    Finished
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[8px] font-medium bg-gray-100 text-gray-800">
                                    Pending
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="p-1">
                                {!isCurrentActive && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectActiveLot(index)}
                                    className="h-5 px-1 text-[8px]"
                                  >
                                    Select
                                  </Button>
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
                    <div className="mt-2 p-1 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-[9px] text-yellow-800">
                        <span className="font-medium">Active Lot:</span> {getActiveLotDetails()?.lotNo} (Seq #{activeLotIndex + 1}) | 
                        <span className="font-medium"> Remaining:</span> {
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
          <div className="space-y-4">
            {/* Dispatch Order Details Reminder */}
            {isValidDispatchOrder && getActiveLotDetails() && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-2">
                <h3 className="text-xs font-semibold text-blue-800 mb-1">
                  Active Lot: {getActiveLotDetails()?.lotNo} (Seq #{activeLotIndex + 1})
                </h3>
                <p className="text-[10px] text-blue-700/80">
                  Dispatch Order ID: {dispatchOrderId}
                </p>
              </div>
            )}
            
            {/* Roll Scanning Section */}
            {isValidDispatchOrder && getActiveLotDetails() && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-2">
                <h3 className="text-xs font-semibold text-blue-800 mb-1">
                  Scan Rolls for Lot: {getActiveLotDetails()?.lotNo} (Seq #{activeLotIndex + 1})
                </h3>
                <p className="text-[10px] text-blue-700/80 mb-1">
                  Scan or enter roll number for dispatch order {dispatchOrderId}
                </p>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="rollNumber" className="text-[10px] font-medium text-gray-700">
                      Roll Number (Scan QR Code)
                    </Label>
                    <div className="relative">
                      <Scan className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                      <Input
                        ref={rollNumberRef}
                        id="rollNumber"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        onKeyPress={handleRollScan}
                        placeholder="Scan QR code or enter roll number"
                        className={`pl-7 text-xs h-7 ${hasError ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                      />
                    </div>
                  </div>
                  
                  {/* Next Lot Button */}
                  {getRemainingQuantityForActiveLot() <= 0 && activeLotIndex < (dispatchOrderDetails?.length || 0) - 1 && (
                    <Button
                      onClick={moveToNextLot}
                      className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Next Lot (Seq #{activeLotIndex + 2})
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Scanned Rolls Summary - Grouped by Lot No */}
            {Object.keys(groupedScannedRolls).length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-2">
                <div className="flex flex-wrap justify-between items-center mb-1">
                  <h3 className="text-xs font-semibold text-green-800">Scanned Rolls Summary</h3>
                  <div className="flex flex-wrap items-center space-x-1 mt-1 sm:mt-0">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-green-100 text-green-800">
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
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-100 text-blue-800">
                            Gross: {totalWeights.totalGrossWeight.toFixed(2)} kg
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-100 text-purple-800">
                            Net: {totalWeights.totalNetWeight.toFixed(2)} kg
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
                    <div key={lotNo} className="mb-3 last:mb-0">
                      <div className="flex flex-wrap justify-between items-center mb-1 p-1 bg-green-100 rounded">
                        <div>
                          <h4 className="text-[10px] font-semibold text-green-800">Lot: {lotNo}</h4>
                          <p className="text-[9px] text-green-700">
                            {allotmentDetail?.tape || 'N/A'} - {allotmentDetail?.lotNo || 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center space-x-1 mt-1 sm:mt-0">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-green-200 text-green-800">
                            {rolls.length} rolls
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-200 text-blue-800">
                            Gross: {lotWeightInfo.totalGrossWeight.toFixed(2)} kg
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-purple-200 text-purple-800">
                            Net: {lotWeightInfo.totalNetWeight.toFixed(2)} kg
                          </span>
                        </div>
                      </div>
                      
                      <div className="border rounded-md text-[9px]">
                        <Table>
                          <TableHeader className="bg-green-50">
                            <TableRow>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1">Seq</TableHead>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1">Roll No</TableHead>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1">Lot No</TableHead>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1">Product</TableHead>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1">Customer</TableHead>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1">Status</TableHead>
                              <TableHead className="text-[9px] font-medium text-green-700 p-1 text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rolls.map((roll: any) => (
                              <TableRow key={roll.id} className="border-b border-green-100">
                                <TableCell className="p-1 text-[9px] font-medium">#{roll.sequence}</TableCell>
                                <TableCell className="p-1 text-[9px] font-medium">{roll.fgRollNo || roll.rollNumber}</TableCell>
                                <TableCell className="p-1 text-[9px]">{roll.lotNumber}</TableCell>
                                <TableCell className="p-1 text-[9px]">{roll.product}</TableCell>
                                <TableCell className="p-1 text-[9px]">{roll.customer}</TableCell>
                                <TableCell className="p-1">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-medium bg-purple-100 text-purple-800">
                                    {roll.status}
                                  </span>
                                </TableCell>
                                <TableCell className="p-1 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeScannedRoll(roll.id)}
                                    className="h-5 w-5 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="flex flex-wrap justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setScannedRolls([])}
                    className="h-7 px-2 text-xs"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={submitPickingAndLoading}
                    disabled={scannedRolls.length === 0}
                    className={`h-7 px-3 text-xs ${scannedRolls.length > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Submit All
                  </Button>
                </div>
                
                {/* Submission Info */}
                {scannedRolls.length > 0 && (
                  <div className="mt-1 text-[10px] text-green-700">
                    <p>You can submit the scanned rolls even if all planned rolls are not processed.</p>
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