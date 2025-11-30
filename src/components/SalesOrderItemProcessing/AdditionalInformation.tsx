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
}: AdditionalInformationProps) {
  // Calculate counter value using the formula: counter = 169300 * count * rollPerKg / needle / feeder / stichLength
  const calculatedCounter = needle && feeder && stichLength ? 
    (169300 * count * rollPerKg / needle / feeder / stichLength).toFixed(2) : 
    '0.00';

  // Automatically update the counter field in additionalFields when it's calculated
  useEffect(() => {
    if (calculatedCounter !== additionalFields.counter) {
      onAdditionalFieldChange('counter', calculatedCounter);
    }
  }, [calculatedCounter, additionalFields.counter, onAdditionalFieldChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              value={calculatedCounter}
              onChange={(e) => onAdditionalFieldChange('counter', e.target.value)}
              placeholder="Enter counter"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Calculated: {calculatedCounter}</p>
             <p className="text-xs text-muted-foreground italic">
               Formula: (169300 × {count} × {rollPerKg}) ÷ ({needle} × {feeder} × {stichLength})
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
      </CardContent>
    </Card>
  );
}