import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SalesOrderWebResponseDto } from '@/types/api-types';
import { useEffect } from 'react';

interface AdditionalFields {
  yarnLotNo: string;
  counter: string;
  colourCode: string;
  reqGreyGsm: number | null;
  reqGreyWidth: number | null;
  reqFinishGsm: number | null;
  reqFinishWidth: number | null;
  yarnPartyName: string; // New field for yarn party name
}

interface AdditionalInformationProps {
  additionalFields: AdditionalFields;
  selectedOrder: SalesOrderWebResponseDto | null;
  onAdditionalFieldChange: (
    field: keyof AdditionalFields,
    value: string | number | null
  ) => void;
  // Add props for counter calculation
  count: number;
  rollPerKg: number;
  needle: number;
  feeder: number;
  stichLength: number;
  // New props for new lot creation
  isCreatingNewLot?: boolean;
  newYarnCount?: string;
  newStitchLength?: string;
  setNewYarnCount?: (value: string) => void;
  setNewStitchLength?: (value: string) => void;
  // Roll confirmation summary for new lot creation
  rollConfirmationSummary?: {
    TotalLots: number;
    TotalRollConfirmations: number;
    TotalNetWeight: number;
  } | null;
  isLoadingRollSummary?: boolean;
}

export function AdditionalInformation({
  additionalFields,
  selectedOrder,
  onAdditionalFieldChange,
  count,
  rollPerKg,
  needle,
  feeder,
  stichLength,
  isCreatingNewLot = false,
  newYarnCount,
  newStitchLength,
  setNewYarnCount,
  setNewStitchLength,
  rollConfirmationSummary,
  isLoadingRollSummary = false,
}: AdditionalInformationProps) {
  // Calculate counter value using the formula: counter = 169300 * count * rollPerKg / needle / feeder / stichLength
  // If in new lot creation mode, use the new yarn count and stitch length
  const yarnCountForCalculation = isCreatingNewLot && newYarnCount ? parseFloat(newYarnCount) || count : count;
  const stitchLengthForCalculation = isCreatingNewLot && newStitchLength ? parseFloat(newStitchLength) || stichLength : stichLength;
  
  const calculatedCounter = needle && feeder && stitchLengthForCalculation ? 
    (1696300 * yarnCountForCalculation * rollPerKg / needle / feeder / stitchLengthForCalculation).toFixed(2) : 
    '0.00';

  // Automatically update the counter field in additionalFields when it's calculated
  useEffect(() => {
    if (calculatedCounter !== additionalFields.counter) {
      onAdditionalFieldChange('counter', calculatedCounter);
    }
  }, [calculatedCounter, additionalFields.counter, onAdditionalFieldChange, isCreatingNewLot, newYarnCount, newStitchLength]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Additional Information</CardTitle>
          {isCreatingNewLot && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
              New Lot Mode
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Yarn Count - Only editable when creating new lot */}
          {isCreatingNewLot && setNewYarnCount && (
            <div className="space-y-2">
              <Label htmlFor="yarn-count">Yarn Count</Label>
              <Input
                id="yarn-count"
                value={newYarnCount || ''}
                onChange={(e) => setNewYarnCount(e.target.value)}
                placeholder="Enter yarn count"
              />
            </div>
          )}

          {/* Stitch Length - Only editable when creating new lot */}
          {isCreatingNewLot && setNewStitchLength && (
            <div className="space-y-2">
              <Label htmlFor="stitch-length">Stitch Length</Label>
              <Input
                id="stitch-length"
                value={newStitchLength || ''}
                onChange={(e) => setNewStitchLength(e.target.value)}
                placeholder="Enter stitch length"
              />
            </div>
          )}

          {isCreatingNewLot && (
            <div className="col-span-full mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> In New Lot Creation mode, only Yarn Count and Stitch Length can be modified.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="yarn-lot-no">Yarn Lot No.</Label>
            <Input
              id="yarn-lot-no"
              value={additionalFields.yarnLotNo}
              onChange={(e) => onAdditionalFieldChange('yarnLotNo', e.target.value)}
              placeholder="Enter yarn lot number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="counter">Counter</Label>
            <Input
              id="counter"
              value={additionalFields.counter}
              onChange={(e) => onAdditionalFieldChange('counter', e.target.value)}
              placeholder="Enter counter"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Calculated: {calculatedCounter}</p>
             <p className="text-xs text-muted-foreground italic">
               Formula: (1696300 × {isCreatingNewLot && newYarnCount ? newYarnCount : count} × {rollPerKg}) ÷ ({needle} × {feeder} × {isCreatingNewLot && newStitchLength ? newStitchLength : stichLength})
              </p> 
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="colour-code">Cone Tip</Label>
            <Input
              id="colour-code"
              value={additionalFields.colourCode}
              onChange={(e) => onAdditionalFieldChange('colourCode', e.target.value)}
              placeholder="Enter colour code"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="party-name">Party Name</Label>
            <Input
              id="party-name"
              value={selectedOrder?.buyerName || ''}
              disabled
              placeholder="Party name from sales order"
            />
          </div>

          {/* New Yarn Party Name Field */}
          <div className="space-y-2">
            <Label htmlFor="yarn-party-name">Yarn Party Name</Label>
            <Input
              id="yarn-party-name"
              value={additionalFields.yarnPartyName || ''}
              onChange={(e) => onAdditionalFieldChange('yarnPartyName', e.target.value)}
              placeholder="Enter yarn party name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-grey-gsm">Req. Grey GSM</Label>
            <Input
              id="req-grey-gsm"
              type="number"
              value={additionalFields.reqGreyGsm || ''}
              onChange={(e) =>
                onAdditionalFieldChange(
                  'reqGreyGsm',
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="Enter required grey GSM"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-grey-width">Req. Grey Width</Label>
            <Input
              id="req-grey-width"
              type="number"
              value={additionalFields.reqGreyWidth || ''}
              onChange={(e) =>
                onAdditionalFieldChange(
                  'reqGreyWidth',
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="Enter required grey width"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-finish-gsm">Req. Finish GSM</Label>
            <Input
              id="req-finish-gsm"
              type="number"
              value={additionalFields.reqFinishGsm || ''}
              onChange={(e) =>
                onAdditionalFieldChange(
                  'reqFinishGsm',
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="Enter required finish GSM"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="req-finish-width">Req. Finish Width</Label>
            <Input
              id="req-finish-width"
              type="number"
              value={additionalFields.reqFinishWidth || ''}
              onChange={(e) =>
                onAdditionalFieldChange(
                  'reqFinishWidth',
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="Enter required finish width"
            />
          </div>
        </div>
        
        {/* Roll Confirmation Summary - Only shown in new lot creation mode */}
        {isCreatingNewLot && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Existing Roll Confirmation Summary</h3>
            
            {isLoadingRollSummary ? (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                <span>Loading roll confirmation summary...</span>
              </div>
            ) : rollConfirmationSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600">Total Lots</div>
                  <div className="text-2xl font-bold text-blue-800">{rollConfirmationSummary.TotalLots}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600">Total Roll Confirmations</div>
                  <div className="text-2xl font-bold text-green-800">{rollConfirmationSummary.TotalRollConfirmations}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-600">Total Net Weight</div>
                  <div className="text-2xl font-bold text-purple-800">{(rollConfirmationSummary.TotalNetWeight || 0).toFixed(2)} kg</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">No roll confirmations found for this sales order item.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}