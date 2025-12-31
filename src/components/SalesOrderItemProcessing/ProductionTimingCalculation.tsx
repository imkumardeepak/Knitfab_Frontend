import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator } from 'lucide-react';
import type { MachineResponseDto, SalesOrderItemWebResponseDto } from '@/types/api-types';

interface ProductionCalculation {
  needle: number;
  feeder: number;
  rpm: number;
  constant: number;
  stichLength: number;
  count: number;
  efficiency: number;
  productionPerDay: number;
  productionPerHour: number;
  productionPerMinute: number;
}

interface MachineSelection {
  selectedMachine: MachineResponseDto | null;
}

interface ProductionTimingCalculationProps {
  machines: MachineResponseDto[] | undefined;
  isLoadingMachines: boolean;
  selectedItem: SalesOrderItemWebResponseDto;
  parsedDescriptionValues: {
    stitchLength: number;
    count: number;
    weightPerRoll: number;
    numberOfRolls: number;
    diameter: number;
    gauge: number;
    composition: string;
  };
  extractFabricTypeFromDescription: (description: string) => string;
  fabricStructures: Array<{
    fabricstr: string;
    standardeffencny: number;
  }>;
  productionCalc: ProductionCalculation;
  machineSelection: MachineSelection;
  onMachineChange: (machineId: string) => void;
  onProductionValueChange: (field: keyof ProductionCalculation, value: number) => void;
  onRefreshFromDescription: () => void;
  // New props for new lot creation
  isCreatingNewLot?: boolean;
  newYarnCount?: string;
  newStitchLength?: string;
}

export function ProductionTimingCalculation({
  machines,
  isLoadingMachines,
  selectedItem,
  parsedDescriptionValues,
 
  fabricStructures,
  productionCalc,
  machineSelection,
  onMachineChange,
  onProductionValueChange,
  onRefreshFromDescription,
  isCreatingNewLot = false,
  newYarnCount,
  newStitchLength,
}: ProductionTimingCalculationProps) {
  // Get fabric efficiency when fabric structures are loaded
  useEffect(() => {
    if (fabricStructures && selectedItem && fabricStructures.length > 0) {
      // Try to match fabric type from sales order item with fabric structure
      // Updated to prioritize the dedicated fabricType field
      let itemFabricType = '';

      // First priority: Use the dedicated fabricType field
      if (selectedItem.fabricType) {
        itemFabricType = selectedItem.fabricType;
      }
      // Fallback to item name if no fabric type found
      else if (selectedItem.itemName) {
        itemFabricType = selectedItem.itemName.toLowerCase();
      }

      const matchingFabric = fabricStructures.find(
        (f) =>
          itemFabricType.toLowerCase().includes(f.fabricstr.toLowerCase()) ||
          f.fabricstr.toLowerCase().includes(itemFabricType.toLowerCase().split(' ')[0])
      );

      if (matchingFabric) {
        // We'll let the parent component handle this update
        onProductionValueChange('efficiency', matchingFabric.standardeffencny);
      } else {
        // Default efficiency if no match found
        onProductionValueChange('efficiency', 85); // Default 85% efficiency
      }
    }
  }, [fabricStructures, selectedItem]);

useEffect(() => {
  if (isCreatingNewLot && newStitchLength) {
    // When creating a new lot, use the new stitch length
    const match = newStitchLength.toString().match(/(\d+(?:\.\d+)?)/);
    const firstValue = match ? parseFloat(match[1]) : null;
    
    if (
      firstValue !== null &&
      !isNaN(firstValue) &&
      productionCalc.stichLength !== firstValue
    ) {
      onProductionValueChange('stichLength', firstValue);
    }
  } else if (!isCreatingNewLot && selectedItem?.stitchLength) {
    // When not creating a new lot, use the original logic
    const match = selectedItem.stitchLength.toString().match(/(\d+(?:\.\d+)?)/);
    const firstValue = match ? parseFloat(match[1]) : null;
    
    if (
      firstValue !== null &&
      !isNaN(firstValue) &&
      productionCalc.stichLength !== firstValue
    ) {
      onProductionValueChange('stichLength', firstValue);
    }
  }
}, [selectedItem?.stitchLength, isCreatingNewLot, newStitchLength]);



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          Production Timing Calculation
          {isCreatingNewLot && (
            <span className="ml-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
              New Lot Mode
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Machine Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Machine Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="machine-select">Select Machine</Label>
                {isLoadingMachines ? (
                  <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <Select
                    value={machineSelection.selectedMachine?.id.toString() || ''}
                    onValueChange={onMachineChange}
                  >
                    <SelectTrigger id="machine-select">
                      <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines?.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id.toString()}>
                          {machine.machineName} (Dia: {machine.dia}", GG: {machine.gg})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Machine Details</Label>
                {machineSelection.selectedMachine ? (
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <p>
                      <strong>Name:</strong> {machineSelection.selectedMachine.machineName}
                    </p>
                    <p>
                      <strong>Diameter:</strong> {machineSelection.selectedMachine.dia}"
                    </p>
                    <p>
                      <strong>Gauge:</strong> {machineSelection.selectedMachine.gg}
                    </p>
                    <p>
                      <strong>Efficiency:</strong> {machineSelection.selectedMachine.efficiency}%
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded text-sm text-gray-500">
                    Select a machine to view details
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Machine Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Machine Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="needle">No. of Needles</Label>
                <Input
                  id="needle"
                  type="number"
                  value={productionCalc.needle || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('needle', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feeder">Feeders</Label>
                <Input
                  id="feeder"
                  type="number"
                  value={productionCalc.feeder || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('feeder', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rpm">RPM</Label>
                <Input
                  id="rpm"
                  type="number"
                  value={productionCalc.rpm || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('rpm', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="constant">Constant</Label>
                <Input
                  id="constant"
                  type="number"
                  step="0.00001"
                  value={productionCalc.constant || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('constant', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
            </div>
          </div>

          {/* Stitch Length and Count */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Stitch Length & Count</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshFromDescription}
                className="text-xs"
              >
                <Calculator className="h-3 w-3 mr-1" />
                Refresh from Description
              </Button>
            </div>
            {isCreatingNewLot && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <p><strong>Note:</strong> In New Lot Creation mode, these values can be modified.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stitch-length">
                  Stitch Length (mm)
                  <span className="text-muted-foreground text-xs ml-2">
                    (From description: {parsedDescriptionValues.stitchLength || 'N/A'})
                  </span>
                </Label>
                <Input
                  id="stitch-length"
                  type="number"
                  step="0.1"
                  value={productionCalc.stichLength || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('stichLength', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">
                  Count
                  <span className="text-muted-foreground text-xs ml-2">
                    (From description: {parsedDescriptionValues.count || 'N/A'})
                  </span>
                </Label>
                <Input
                  id="count"
                  type="number"
                  value={productionCalc.count || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('count', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
            </div>
          </div>

          {/* Efficiency */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Efficiency</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="efficiency">Efficiency (%)</Label>
                <Input
                  id="efficiency"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={productionCalc.efficiency || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? NaN : Number(e.target.value);
                    onProductionValueChange('efficiency', isNaN(value) ? 0 : value);
                  }}
                  className="text-center font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Efficiency Info</Label>
                <div className="p-3 bg-blue-50 rounded text-sm">
                  <p className="text-blue-800">
                    Efficiency is automatically set based on fabric type from master data
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Production Calculation Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Production Calculation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {productionCalc.productionPerMinute.toFixed(4)}
                </div>
                <div className="text-sm text-green-600">Kg/Minute</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {productionCalc.productionPerHour.toFixed(2)}
                </div>
                <div className="text-sm text-blue-600">Kg/Hour</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {productionCalc.productionPerDay.toFixed(2)}
                </div>
                <div className="text-sm text-purple-600">Kg/Day</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>
                Formula: (Needle × Feeder × RPM × Stitch Length × Constant × Efficiency%) ÷ Count ÷
                1000
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}