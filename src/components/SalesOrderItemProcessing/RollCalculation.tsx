import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator } from 'lucide-react';
import type { SalesOrderItemWebResponseDto } from '@/types/api-types';
import { useEffect } from 'react';

interface RollInput {
  actualQuantity: number;
  rollPerKg: number;
}

interface RollCalculationProps {
  rollInput: RollInput;
  rollCalculation: {
    actualQuantity: number;
    rollPerKg: number;
    numberOfRolls: number;
    totalWholeRolls: number;
    fractionalRoll: number;
    fractionalWeight: number;
  };
  selectedItem: SalesOrderItemWebResponseDto;
  // Removed parsedDescriptionValues as we're using dedicated fields now
  onRollInputChange: (field: keyof RollInput, value: number) => void;
  // New props for new lot creation
  isCreatingNewLot?: boolean;
  rollConfirmationSummary?: {
    TotalLots: number;
    TotalRollConfirmations: number;
    TotalNetWeight: number;
  } | null;
}

export function RollCalculation({
  rollInput,
  rollCalculation,
  selectedItem,
  // Removed parsedDescriptionValues as we're using dedicated fields now
  onRollInputChange,
  isCreatingNewLot = false,
  rollConfirmationSummary,
}: RollCalculationProps) {
  // Automatically populate rollPerKg from wtPerRoll when available and rollPerKg is not set
  useEffect(() => {
    if (selectedItem?.wtPerRoll > 0 && !rollInput.rollPerKg) {
      onRollInputChange('rollPerKg', selectedItem.wtPerRoll);
    }
  }, [selectedItem?.wtPerRoll, rollInput.rollPerKg, onRollInputChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          Roll Calculation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actual-quantity">Actual Quantity (kg)</Label>
              <Input
                id="actual-quantity"
                type="number"
                step="0.01"
                value={rollInput.actualQuantity || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
                  onRollInputChange('actualQuantity', isNaN(value) ? 0 : value);
                }}
                className="text-center font-mono"
                // Disable input in new lot creation mode when roll confirmation summary is available
                disabled={isCreatingNewLot && !!rollConfirmationSummary}
              />
              <div className="text-xs text-muted-foreground">
                {isCreatingNewLot && rollConfirmationSummary ? (
                  <>
                    From Sales Order: {selectedItem.qty || 0} kg | 
                    Roll Confirmations: {rollConfirmationSummary.TotalNetWeight.toFixed(2)} kg | 
                    <span className="font-semibold">
                      Remaining: {(selectedItem.qty - rollConfirmationSummary.TotalNetWeight).toFixed(2)} kg
                    </span>
                  </>
                ) : (
                  `From Sales Order: ${selectedItem.qty || 0} kg`
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll-per-kg">Roll per Kg (kg/roll)</Label>
              <Input
                id="roll-per-kg"
                type="number"
                step="0.01"
                value={rollInput.rollPerKg || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? NaN : parseFloat(e.target.value);
                  onRollInputChange('rollPerKg', isNaN(value) ? 0 : value);
                }}
                className="text-center font-mono"
              />
              <div className="text-xs text-muted-foreground">
                {selectedItem.wtPerRoll > 0 ? (
                  <span className="text-green-600">
                    ✓ From Sales Order: {selectedItem.wtPerRoll} kg/roll
                  </span>
                ) : selectedItem.noOfRolls > 0 ? (
                  <span className="text-green-600">
                    ✓ Calculated from {selectedItem.noOfRolls} rolls in Sales Order
                  </span>
                ) : (
                  <span className="text-orange-600">
                    ⚠ Enter manually (not found in sales order)
                  </span>
                )}
              </div>
            </div>
          </div>

          {rollCalculation.numberOfRolls > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Roll Calculation Results</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Total Rolls:</span>
                  <p className="font-bold text-blue-800">
                    {rollCalculation.numberOfRolls.toFixed(2)} rolls
                  </p>
                </div>
                <div>
                  <span className="text-blue-600">Whole Rolls:</span>
                  <p className="font-bold text-blue-800">
                    {rollCalculation.totalWholeRolls} × {rollInput.rollPerKg}kg
                  </p>
                </div>
                {rollCalculation.fractionalRoll > 0 && (
                  <>
                    <div>
                      <span className="text-blue-600">Fractional Roll:</span>
                      <p className="font-bold text-blue-800">
                        {rollCalculation.fractionalRoll.toFixed(2)} rolls
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-600">Fractional Weight:</span>
                      <p className="font-bold text-blue-800">
                        {rollCalculation.fractionalWeight.toFixed(2)} kg
                      </p>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <span className="text-blue-600">Breakdown:</span>
                  <p className="font-bold text-blue-800">
                    {rollCalculation.totalWholeRolls > 0 &&
                      `${rollCalculation.totalWholeRolls} roll${rollCalculation.totalWholeRolls !== 1 ? 's' : ''} × ${rollInput.rollPerKg}kg`}
                    {rollCalculation.fractionalRoll > 0 &&
                      ` + 1 roll × ${rollCalculation.fractionalWeight.toFixed(2)}kg`}
                    {rollCalculation.totalWholeRolls === 0 &&
                      rollCalculation.fractionalRoll > 0 &&
                      `1 roll × ${rollCalculation.fractionalWeight.toFixed(2)}kg`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}