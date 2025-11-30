import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, ArrowLeft, Calendar, Truck, Scan } from 'lucide-react';
import { toast } from '@/lib/toast';
import { dispatchPlanningApi, apiUtils } from '@/lib/api-client';
import type { DispatchPlanningDto } from '@/types/api-types';

const LoadCapture = () => {
  const [dispatchOrderId, setDispatchOrderId] = useState('');
  const [isValidDispatchOrder, setIsValidDispatchOrder] = useState(false);
  const [dispatchOrderDetails, setDispatchOrderDetails] = useState<DispatchPlanningDto[] | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [loadedRolls, setLoadedRolls] = useState<any[]>([]);
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
      
      if (matchedOrders.length > 0) {
        setIsValidDispatchOrder(true);
        setDispatchOrderDetails(matchedOrders);
        setActiveLotIndex(0); // Start with first lot
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
    
    // Count how many rolls have been loaded for this lot
    const loadedCount = loadedRolls.filter(roll => roll.lotNo === activeLot.lotNo).length;
    const readyRolls = activeLot.totalReadyRolls || 0;
    
    return Math.max(0, readyRolls - loadedCount);
  };

  // Check if all lots are finished
  const areAllLotsFinished = () => {
    if (!dispatchOrderDetails) return false;
    
    return dispatchOrderDetails.every(lot => {
      const loadedCount = loadedRolls.filter(roll => roll.lotNo === lot.lotNo).length;
      const readyRolls = lot.totalReadyRolls || 0;
      return loadedCount >= readyRolls;
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

  const handleAddRoll = () => {
    if (!isValidDispatchOrder) {
      toast.error('Error', 'Please validate dispatch order ID first');
      return;
    }
    
    const activeLot = getActiveLotDetails();
    if (!activeLot) {
      toast.error('Error', 'No active lot selected');
      return;
    }
    
    // Check if we've reached the limit for this lot
    const remainingQuantity = getRemainingQuantityForActiveLot();
    if (remainingQuantity <= 0) {
      toast.error('Error', `All rolls for Lot ${activeLot.lotNo} have been loaded. Please move to the next lot.`);
      return;
    }
    
    // Mock data for demonstration
    const newRoll = {
      id: Date.now(),
      rollNumber: 'ROLL-' + Math.floor(Math.random() * 10000),
      lotNumber: activeLot.lotNo,
      lotNo: activeLot.lotNo,
      customer: activeLot.customerName || 'Customer ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      quantity: Math.floor(Math.random() * 100) + 50,
      status: 'Loaded',
      dispatchOrderId: dispatchOrderId,
      sequence: loadedRolls.length + 1,
    };
    
    setLoadedRolls([...loadedRolls, newRoll]);
    toast.success('Success', `Roll added to loading list. ${remainingQuantity - 1} rolls remaining for this lot.`);
    
    // If this was the last roll for the current lot, automatically move to next lot
    if (remainingQuantity - 1 === 0) {
      setTimeout(() => {
        if (activeLotIndex < (dispatchOrderDetails?.length || 0) - 1) {
          moveToNextLot();
          toast.info('Info', `Moving to next lot in sequence`);
        }
      }, 1000);
    }
  };

  const removeRoll = (id: number) => {
    setLoadedRolls(loadedRolls.filter(roll => roll.id !== id));
    toast.success('Success', 'Roll removed from loading list');
  };

  const handleSubmit = () => {
    if (!isValidDispatchOrder) {
      toast.error('Error', 'Please validate dispatch order ID first');
      return;
    }
    
    if (!vehicleNo || !driverName) {
      toast.error('Error', 'Please enter vehicle number and driver name');
      return;
    }
    
    if (loadedRolls.length === 0) {
      toast.error('Error', 'Please add at least one roll to load');
      return;
    }
    
    // Check if all lots are finished
    if (!areAllLotsFinished()) {
      const unfinishedLots = dispatchOrderDetails?.filter(lot => {
        const loadedCount = loadedRolls.filter(roll => roll.lotNo === lot.lotNo).length;
        return loadedCount < (lot.totalReadyRolls || 0);
      }).map(lot => lot.lotNo) || [];
      
      toast.error('Error', `Please finish loading all rolls for lots: ${unfinishedLots.join(', ')}`);
      return;
    }
    
    // Mock submission
    toast.success('Success', `Submitted loading for ${loadedRolls.length} rolls under dispatch order ${dispatchOrderId}`);
    setLoadedRolls([]);
    setVehicleNo('');
    setDriverName('');
    setRemarks('');
    // Keep the dispatch order ID for potential additional loading
  };

  const resetValidation = () => {
    setIsValidDispatchOrder(false);
    setDispatchOrderDetails(null);
    setLoadedRolls([]);
    setActiveLotIndex(0);
  };

  // Group loaded rolls by lotNo
  const groupedRolls: Record<string, any[]> = loadedRolls.reduce((acc: Record<string, any[]>, roll) => {
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
              Load Capture
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
            Capture and manage loading operations for dispatch
          </p>
        </CardHeader>

        <CardContent className="p-3">
          <div className="space-y-4">
            {/* Dispatch Order Validation Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-blue-800 mb-2">Dispatch Order Validation</h3>
              <p className="text-xs text-blue-700/80 mb-2">
                Enter and validate the dispatch order ID before loading rolls
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
                      <p className="font-medium text-blue-800">Customer</p>
                      <p className="text-blue-600">{dispatchOrderDetails[0]?.customerName || 'N/A'}</p>
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
                            <TableHead className="text-xs font-medium text-blue-700">Loaded Rolls</TableHead>
                            <TableHead className="text-xs font-medium text-blue-700">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dispatchOrderDetails.map((order, index) => {
                            const loadedCount = loadedRolls.filter(roll => roll.lotNo === order.lotNo).length;
                            const isCurrentActive = index === activeLotIndex;
                            const isFinished = loadedCount >= (order.totalReadyRolls || 0);
                            
                            return (
                              <TableRow 
                                key={order.id} 
                                className={`border-b border-blue-100 ${isCurrentActive ? 'bg-blue-50' : ''}`}
                              >
                                <TableCell className="py-2 text-xs">#{index + 1}</TableCell>
                                <TableCell className="py-2 text-xs font-medium">{order.lotNo}</TableCell>
                                <TableCell className="py-2 text-xs">{order.tape || 'N/A'}</TableCell>
                                <TableCell className="py-2 text-xs">{order.totalReadyRolls || 0}</TableCell>
                                <TableCell className="py-2 text-xs">{loadedCount}</TableCell>
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
                          <span className="font-medium"> Remaining Rolls:</span> {getRemainingQuantityForActiveLot()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Loading Details Section */}
            {isValidDispatchOrder && getActiveLotDetails() && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3">
                <h3 className="text-xs font-semibold text-blue-800 mb-2">
                  Load Rolls for Lot: {getActiveLotDetails()?.lotNo} (Sequence #{activeLotIndex + 1})
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="vehicleNo" className="text-xs font-medium text-gray-700">
                      Vehicle Number
                    </Label>
                    <div className="relative">
                      <Truck className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="vehicleNo"
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        placeholder="Enter vehicle number"
                        className={`pl-7 text-xs h-8 ${hasError && !vehicleNo ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="driverName" className="text-xs font-medium text-gray-700">
                      Driver Name
                    </Label>
                    <Input
                      id="driverName"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Enter driver name"
                      className={`text-xs h-8 ${hasError && !driverName ? 'bg-red-50 border-red-300' : 'bg-white'}`}
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="loadingDate" className="text-xs font-medium text-gray-700">
                      Loading Date
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="loadingDate"
                        type="date"
                        value={loadingDate}
                        onChange={(e) => setLoadingDate(e.target.value)}
                        className="pl-7 text-xs h-8"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="remarks" className="text-xs font-medium text-gray-700">
                      Remarks
                    </Label>
                    <Textarea
                      id="remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Any additional remarks"
                      className="text-xs resize-none"
                    />
                  </div>
                </div>
                
                {/* Next Lot Button */}
                {getRemainingQuantityForActiveLot() <= 0 && activeLotIndex < (dispatchOrderDetails?.length || 0) - 1 && (
                  <div className="pt-3">
                    <Button
                      onClick={moveToNextLot}
                      className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      Move to Next Lot (Sequence #{activeLotIndex + 2})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Add Rolls Section */}
            {isValidDispatchOrder && getActiveLotDetails() && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-green-800">Add Rolls to Load</h3>
                  <Button
                    onClick={handleAddRoll}
                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                  >
                    Add Sample Roll
                  </Button>
                </div>
                <p className="text-xs text-green-700/80 mb-2">
                  Add rolls to the loading list for dispatch order {dispatchOrderId}
                </p>
              </div>
            )}

            {/* Loaded Rolls Summary - Grouped by Lot No */}
            {Object.keys(groupedRolls).length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-semibold text-purple-800">Loaded Rolls Summary</h3>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {loadedRolls.length} total rolls
                  </span>
                </div>

                {/* Lot-wise roll display */}
                {Object.entries(groupedRolls).map(([lotNo, rolls]) => {
                  const allotmentDetail = dispatchOrderDetails?.find(order => order.lotNo === lotNo);
                  return (
                    <div key={lotNo} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-2 p-2 bg-purple-100 rounded">
                        <div>
                          <h4 className="text-xs font-semibold text-purple-800">Lot: {lotNo}</h4>
                          <p className="text-xs text-purple-700">
                            {allotmentDetail?.tape || 'N/A'} - {allotmentDetail?.lotNo || 'N/A'}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                          {rolls.length} rolls
                        </span>
                      </div>
                      
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader className="bg-purple-50">
                            <TableRow>
                              <TableHead className="text-xs font-medium text-purple-700">Sequence</TableHead>
                              <TableHead className="text-xs font-medium text-purple-700">Roll No</TableHead>
                              <TableHead className="text-xs font-medium text-purple-700">Lot No</TableHead>
                              <TableHead className="text-xs font-medium text-purple-700">Customer</TableHead>
                              <TableHead className="text-xs font-medium text-purple-700">Quantity</TableHead>
                              <TableHead className="text-xs font-medium text-purple-700">Status</TableHead>
                              <TableHead className="text-xs font-medium text-purple-700 text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rolls.map((roll: any) => (
                              <TableRow key={roll.id} className="border-b border-purple-100">
                                <TableCell className="py-2 text-xs font-medium">#{roll.sequence}</TableCell>
                                <TableCell className="py-2 text-xs font-medium">{roll.rollNumber}</TableCell>
                                <TableCell className="py-2 text-xs">{roll.lotNumber}</TableCell>
                                <TableCell className="py-2 text-xs">{roll.customer}</TableCell>
                                <TableCell className="py-2 text-xs">{roll.quantity} kg</TableCell>
                                <TableCell className="py-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {roll.status}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeRoll(roll.id)}
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
                    onClick={() => setLoadedRolls([])}
                    className="h-8 px-3 text-xs"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!areAllLotsFinished()}
                    className={`h-8 px-4 text-xs ${areAllLotsFinished() ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Submit Loading
                  </Button>
                </div>
                
                {/* Submission Info */}
                {!areAllLotsFinished() && (
                  <div className="mt-2 text-xs text-purple-700">
                    <p>Please finish loading all rolls for all lots before submitting.</p>
                  </div>
                )}
              </div>
            )}

            {/* Info Section */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-md p-3">
              <h3 className="text-xs font-semibold text-gray-800 mb-2">Instructions</h3>
              <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                <li>First enter and validate the dispatch order ID</li>
                <li>Review lot details and follow the sequence order</li>
                <li>Add rolls for the active lot only (highlighted in yellow)</li>
                <li>Each added roll represents one roll - quantity is automatically managed</li>
                <li>Move to next lot when current lot is finished</li>
                <li>Submit loading only when all lots are completed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadCapture;