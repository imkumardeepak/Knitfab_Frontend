import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';
import { productionAllotmentApi, machineApi, rollAssignmentApi } from '@/lib/api-client';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import type { ProductionAllotmentResponseDto, MachineResponseDto, MachineAllocationRequest, RollAssignmentResponseDto, SalesOrderWebResponseDto, SalesOrderItemWebResponseDto } from '@/types/api-types';
import { Loader } from '@/components/loader';
import { ArrowLeft, Save, X, Plus, Minus } from 'lucide-react';

interface MachineLoadDistribution {
  id?: number;
  machineId: number;
  machineName: string;
  allocatedRolls: number;
  allocatedWeight: number;
  estimatedProductionTime?: number;
  isEditing?: boolean;
  customParameters?: {
    needle: number;
    feeder: number;
    rpm: number;
    efficiency: number;
    constant: number;
  };
  generatedStickers?: number; // Track how many stickers have been generated
  generatedRolls?: number; // Track how many rolls have been generated
}

const MachineLoadDistributionEdit: React.FC = () => {
  const { allotmentId } = useParams<{ allotmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch production allotment data
  const { data: productionAllotment, isLoading, error, refetch } = useQuery({
    queryKey: ['productionAllotment', allotmentId],
    queryFn: async () => {
      if (!allotmentId) throw new Error('Allotment ID is required');
      const response = await productionAllotmentApi.getProductionAllotmentByAllotId(allotmentId);
      return response.data;
    },
    enabled: !!allotmentId,
  });

  // Fetch all machines
  const { data: machines = [], isLoading: isLoadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const response = await machineApi.getAllMachines();
      return response.data;
    },
  });

  // Fetch sales order web data
  const { data: salesOrderWeb } = useQuery({
    queryKey: ['salesOrderWeb', productionAllotment?.salesOrderId],
    queryFn: async () => {
      if (!productionAllotment?.salesOrderId) return null;
      const response = await SalesOrderWebService.getSalesOrderWebById(productionAllotment.salesOrderId);
      return response;
    },
    enabled: !!productionAllotment?.salesOrderId,
  });

  const [selectedMachines, setSelectedMachines] = useState<MachineLoadDistribution[]>([]);
  const [availableMachines, setAvailableMachines] = useState<MachineResponseDto[]>([]);
  const [showMachineSelection, setShowMachineSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [machineAssignments, setMachineAssignments] = useState<Record<number, RollAssignmentResponseDto[]>>({});

  // Initialize selected machines from production allotment
  useEffect(() => {
    if (productionAllotment?.machineAllocations) {
      const initializedMachines = productionAllotment.machineAllocations.map(allocation => ({
        id: allocation.id,
        machineId: allocation.machineId,
        machineName: allocation.machineName,
        allocatedRolls: allocation.totalRolls,
        allocatedWeight: allocation.totalLoadWeight,
        estimatedProductionTime: allocation.estimatedProductionTime,
        customParameters: {
          needle: allocation.numberOfNeedles,
          feeder: allocation.feeders,
          rpm: allocation.rpm,
          efficiency: 0, // Will be updated from machine data
          constant: 0.00085, // Default constant
        },
        generatedStickers: 0, // Would need to fetch this from backend
        generatedRolls: 0, // Would need to fetch this from backend
      }));
      
      setSelectedMachines(initializedMachines);
    }
  }, [productionAllotment]);

  // Fetch roll assignments for each machine allocation
  useEffect(() => {
    if (productionAllotment?.machineAllocations) {
      const fetchAssignments = async () => {
        const assignments: Record<number, RollAssignmentResponseDto[]> = {};
        
        for (const allocation of productionAllotment.machineAllocations) {
          try {
            const response = await rollAssignmentApi.getRollAssignmentsByMachineAllocationId(allocation.id);
            assignments[allocation.id] = response.data;
          } catch (error) {
            console.error(`Error fetching assignments for machine allocation ${allocation.id}:`, error);
            assignments[allocation.id] = [];
          }
        }
        
        setMachineAssignments(assignments);
      };
      
      fetchAssignments();
    }
  }, [productionAllotment]);

  // Filter available machines (not already selected)
  useEffect(() => {
    if (machines.length > 0 && productionAllotment) {
      const selectedMachineIds = selectedMachines.map(m => m.machineId);
      const filteredMachines = machines.filter(
        machine => !selectedMachineIds.includes(machine.id) && 
                  machine.dia === productionAllotment.diameter && 
                  machine.gg === productionAllotment.gauge
      );
      setAvailableMachines(filteredMachines);
    }
  }, [machines, selectedMachines, productionAllotment]);

  // Calculate estimated production time
  const calculateEstimatedProductionTime = (
    allocatedWeight: number,
    params: {
      needle: number;
      feeder: number;
      rpm: number;
      efficiency: number;
      constant: number;
    },
    stitchLength?: number,
    count?: number
  ): number => {
    if (
      allocatedWeight <= 0 ||
      !stitchLength ||
      stitchLength <= 0 ||
      !count ||
      count <= 0 ||
      params.needle <= 0 ||
      params.feeder <= 0 ||
      params.rpm <= 0
    ) {
      return 0;
    }

    try {
      const efficiencyDecimal = params.efficiency / 100;
      const productionGramsPerMinute =
        (params.needle *
          params.feeder *
          params.rpm *
          stitchLength *
          params.constant *
          efficiencyDecimal) /
        count;
      
      const productionKgPerHour = (productionGramsPerMinute / 1000) * 60;
      
      if (productionKgPerHour > 0) {
        const hours = allocatedWeight / productionKgPerHour;
        return hours / 24;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating estimated production time:', error);
      return 0;
    }
  };

  // Add a machine to distribution
  const handleAddMachine = (machine: MachineResponseDto) => {
    const newMachine: MachineLoadDistribution = {
      machineId: machine.id,
      machineName: machine.machineName,
      allocatedRolls: 0,
      allocatedWeight: 0,
      customParameters: {
        needle: machine.needle,
        feeder: machine.feeder,
        rpm: machine.rpm,
        efficiency: machine.efficiency,
        constant: machine.constat || 0.00085,
      },
    };
    
    setSelectedMachines(prev => [...prev, newMachine]);
    setShowMachineSelection(false);
  };

  // Remove a machine from distribution
  const handleRemoveMachine = (machineId: number) => {
    setSelectedMachines(prev => prev.filter(m => m.machineId !== machineId));
  };

  // Update machine allocation based on rolls (NOT kg) - WITH STEP BY 1
  const handleUpdateMachineAllocationByRolls = (machineId: number, allocatedRolls: number) => {
    setSelectedMachines(prev => 
      prev.map(machine => {
        if (machine.machineId === machineId) {
          // Calculate weight based on rolls and rollPerKg from allotment
          const rollPerKg = productionAllotment?.machineAllocations.find(
            ma => ma.machineId === machineId
          )?.rollPerKg || 1;
          
          const allocatedWeight = allocatedRolls * rollPerKg;
          
          return {
            ...machine,
            allocatedRolls: Math.max(0, allocatedRolls), // Ensure non-negative
            allocatedWeight,
          };
        }
        return machine;
      })
    );
  };

  // Increment roll allocation by 1
  const incrementRolls = (machineId: number) => {
    setSelectedMachines(prev => 
      prev.map(machine => {
        if (machine.machineId === machineId) {
          const newRolls = (machine.allocatedRolls || 0) + 1;
          return {
            ...machine,
            allocatedRolls: newRolls,
          };
        }
        return machine;
      })
    );
    // Recalculate weight after increment
    const machine = selectedMachines.find(m => m.machineId === machineId);
    if (machine) {
      const rollPerKg = productionAllotment?.machineAllocations.find(
        ma => ma.machineId === machineId
      )?.rollPerKg || 1;
      const newWeight = ((machine.allocatedRolls || 0) + 1) * rollPerKg;
      handleUpdateMachineAllocationByRolls(machineId, (machine.allocatedRolls || 0) + 1);
    }
  };

  // Decrement roll allocation by 1
  const decrementRolls = (machineId: number) => {
    setSelectedMachines(prev => 
      prev.map(machine => {
        if (machine.machineId === machineId) {
          const newRolls = Math.max(0, (machine.allocatedRolls || 0) - 1);
          return {
            ...machine,
            allocatedRolls: newRolls,
          };
        }
        return machine;
      })
    );
    // Recalculate weight after decrement
    const machine = selectedMachines.find(m => m.machineId === machineId);
    if (machine) {
      const rollPerKg = productionAllotment?.machineAllocations.find(
        ma => ma.machineId === machineId
      )?.rollPerKg || 1;
      const newWeight = Math.max(0, (machine.allocatedRolls || 0) - 1) * rollPerKg;
      handleUpdateMachineAllocationByRolls(machineId, Math.max(0, (machine.allocatedRolls || 0) - 1));
    }
  };

  // Calculate generated rolls for a machine allocation
  const calculateGeneratedRolls = (machineAllocationId: number): number => {
    const assignments = machineAssignments[machineAllocationId] || [];
    return assignments.reduce((sum, assignment) => sum + assignment.generatedStickers, 0);
  };

  // Get actual roll quantity from sales order item
  const getActualRollQuantity = (): number => {
    if (!salesOrderWeb || !productionAllotment) return 0;
    
    const salesOrderItem = salesOrderWeb.items.find(
      item => item.id === productionAllotment.salesOrderItemId
    );
    
    return salesOrderItem ? salesOrderItem.noOfRolls : 0;
  };

  // Validate allocations before saving - NOW BASED ON ROLLS
  const validateAllocations = (): boolean => {
    if (!productionAllotment) return false;

    // Check if total allocated rolls matches actual roll quantity from sales order
    const totalAllocatedRolls = selectedMachines.reduce(
      (sum, m) => sum + m.allocatedRolls,
      0
    );
    
    const actualRollQuantity = getActualRollQuantity();
    
    if (Math.abs(totalAllocatedRolls - actualRollQuantity) > 0.01) {
      toast.error(
        `Total allocated rolls (${totalAllocatedRolls.toFixed(2)}) must exactly match actual roll quantity (${actualRollQuantity.toFixed(2)})`
      );
      return false;
    }

    // Check if any machine has reduced rolls below generated stickers
    for (const machine of selectedMachines) {
      const originalAllocation = productionAllotment.machineAllocations.find(
        ma => ma.machineId === machine.machineId
      );
      
      if (originalAllocation) {
        const generatedRolls = calculateGeneratedRolls(originalAllocation.id);
        if (machine.allocatedRolls < generatedRolls) {
          toast.error(
            `Cannot reduce rolls for machine ${machine.machineName} below already generated rolls (${generatedRolls})`
          );
          return false;
        }
      }
    }

    return true;
  };

  // Save machine load distribution
  const handleSave = async () => {
    if (!productionAllotment || !validateAllocations() || !allotmentId) return;

    setIsSaving(true);
    
    try {
      // Prepare the machine allocations for the API request
      const machineAllocations: (MachineAllocationRequest & { id?: number })[] = selectedMachines.map(machine => {
        const machineData = machines.find(m => m.id === machine.machineId);
        const rollPerKg = productionAllotment.machineAllocations.find(
          ma => ma.machineId === machine.machineId
        )?.rollPerKg || 1;
        
        return {
          id: machine.id,
          machineName: machine.machineName,
          machineId: machine.machineId,
          numberOfNeedles: machine.customParameters?.needle || machineData?.needle || 0,
          feeders: machine.customParameters?.feeder || machineData?.feeder || 0,
          rpm: machine.customParameters?.rpm || machineData?.rpm || 0,
          rollPerKg: rollPerKg,
          totalLoadWeight: machine.allocatedWeight,
          totalRolls: machine.allocatedRolls,
          rollBreakdown: {
            wholeRolls: [],
            fractionalRoll: {
              quantity: 0,
              weightPerRoll: 0,
              totalWeight: 0
            }
          },
          estimatedProductionTime: calculateEstimatedProductionTime(
            machine.allocatedWeight,
            machine.customParameters || {
              needle: machineData?.needle || 0,
              feeder: machineData?.feeder || 0,
              rpm: machineData?.rpm || 0,
              efficiency: machineData?.efficiency || 0,
              constant: machineData?.constat || 0.00085,
            },
            productionAllotment.stitchLength,
            parseFloat(productionAllotment.yarnCount)
          )
        };
      });

      // Call the API to update machine allocations
      const request = {
        machineAllocations
      };
      
      const response = await productionAllotmentApi.updateMachineAllocations(allotmentId, request);
      
      if (response.data) {
        toast.success('Machine load distribution updated successfully');
        
        // Invalidate and refetch production allotment data
        queryClient.invalidateQueries({ queryKey: ['productionAllotment', allotmentId] });
        
        // Navigate back to production allotment list
        navigate('/production-allotment');
      }
    } catch (error: any) {
      console.error('Error saving machine load distribution:', error);
      toast.error(`Failed to update machine load distribution: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading production allotment: {(error as Error).message}
            <button onClick={() => refetch()} className="ml-4 text-sm underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!productionAllotment) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Production allotment not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get actual roll quantity from sales order
  const actualRollQuantity = getActualRollQuantity();
  // Calculate total allocated rolls
  const totalAllocatedRolls = selectedMachines.reduce((sum, m) => sum + m.allocatedRolls, 0);
  // Calculate difference
  const rollDifference = Math.abs(totalAllocatedRolls - actualRollQuantity);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/production-allotment')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Edit Machine Load</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Lotment Info</CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <Label className="text-xs font-medium">Lot ID</Label>
              <p className="text-xs truncate">{productionAllotment.allotmentId}</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Item</Label>
              <p className="text-xs truncate">{productionAllotment.itemName}</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Actual Qty</Label>
              <p className="text-xs">{productionAllotment.actualQuantity} kg</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Actual Rolls</Label>
              <p className="text-xs">{actualRollQuantity} rolls</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Machine Load Distribution</CardTitle>
            <Button 
              onClick={() => setShowMachineSelection(true)}
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              Add Machine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <div className="space-y-3">
            {selectedMachines.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No machines selected. Click "Add Machine" to select machines.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedMachines.map((machine) => {
                  const machineData = machines.find(m => m.id === machine.machineId);
                  const params = machine.customParameters || {
                    needle: machineData?.needle || 0,
                    feeder: machineData?.feeder || 0,
                    rpm: machineData?.rpm || 0,
                    efficiency: machineData?.efficiency || 0,
                    constant: machineData?.constat || 0.00085,
                  };
                  
                  // Get rollPerKg for this machine
                  const rollPerKg = productionAllotment.machineAllocations.find(
                    ma => ma.machineId === machine.machineId
                  )?.rollPerKg || 1;
                  
                  // Get original allocation to show actual roll quantity
                  const originalAllocation = productionAllotment.machineAllocations.find(
                    ma => ma.machineId === machine.machineId
                  );
                  
                  // Calculate generated rolls
                  const generatedRolls = originalAllocation ? calculateGeneratedRolls(originalAllocation.id) : 0;

                  return (
                    <div 
                      key={machine.machineId} 
                      className="border rounded p-3 bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{machine.machineName}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {machineData?.dia}" | {machineData?.gg}GG | 
                            N:{params.needle} F:{params.feeder} R:{params.rpm}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleRemoveMachine(machine.machineId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Actual Rolls</Label>
                            <div className="mt-1 p-1.5 bg-muted rounded text-xs">
                              {actualRollQuantity.toFixed(0)}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Generated</Label>
                            <div className="mt-1 p-1.5 bg-muted rounded text-xs">
                              {generatedRolls.toFixed(0)}
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Allocated</Label>
                            <div className="flex mt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => decrementRolls(machine.machineId)}
                                disabled={machine.allocatedRolls <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={Math.round(machine.allocatedRolls) || 0}
                                onChange={(e) => {
                                  const rolls = parseInt(e.target.value) || 0;
                                  handleUpdateMachineAllocationByRolls(machine.machineId, rolls);
                                }}
                                className="h-7 text-center mx-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => incrementRolls(machine.machineId)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Weight (kg)</Label>
                          <div className="mt-1 p-1.5 bg-muted rounded text-xs">
                            {machine.allocatedWeight.toFixed(2)} kg
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Prod. Time</Label>
                          <div className="mt-1 p-1.5 bg-muted rounded text-xs">
                            {calculateEstimatedProductionTime(
                              machine.allocatedWeight,
                              params,
                              productionAllotment.stitchLength,
                              parseFloat(productionAllotment.yarnCount)
                            ).toFixed(2)} days
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-3 mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs font-medium">Total Allocated</Label>
                      <p className="text-sm font-semibold">
                        {totalAllocatedRolls.toFixed(0)} rolls
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Actual Rolls</Label>
                      <p className="text-sm font-semibold">
                        {actualRollQuantity.toFixed(0)} rolls
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Difference</Label>
                      <p className={`text-sm font-semibold ${
                        rollDifference < 0.01 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {rollDifference.toFixed(0)} rolls
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Machine Selection Dialog */}
      {showMachineSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold">Select Machine</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowMachineSelection(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dia {productionAllotment.diameter}" | Gauge {productionAllotment.gauge} GG
              </p>
            </div>
            
            <div className="overflow-y-auto flex-grow p-3">
              {isLoadingMachines ? (
                <div className="flex justify-center items-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : availableMachines.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No available machines match the required Diameter and Gauge
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableMachines.map((machine) => (
                    <div
                      key={machine.id}
                      className="border rounded p-3 cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleAddMachine(machine)}
                    >
                      <h4 className="font-medium text-sm">{machine.machineName}</h4>
                      <div className="text-xs text-muted-foreground mt-1">
                        <p>{machine.dia}" | {machine.gg}GG</p>
                        <p>N:{machine.needle} | F:{machine.feeder}</p>
                        <p>RPM:{machine.rpm} | Eff:{machine.efficiency}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 border-t bg-muted">
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowMachineSelection(false)}
                  className="h-7"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineLoadDistributionEdit;