import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import type { SalesOrderItemWebResponseDto, SalesOrderWebResponseDto } from '@/types/api-types';

interface ProcessingActionsProps {
  selectedItem: SalesOrderItemWebResponseDto | null;
  selectedOrder: SalesOrderWebResponseDto | null;
  isProcessing: boolean;
  isItemProcessing: boolean;
  onProcessItem: () => void;
  isCreatingNewLot?: boolean;
}

export function ProcessingActions({
  selectedItem,
  selectedOrder,
  isProcessing,
  isItemProcessing,
  onProcessItem,
  isCreatingNewLot = false,
}: ProcessingActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
            <div>
              <h3 className="font-semibold text-green-800">{isCreatingNewLot ? 'Ready to Create New Lot' : 'Ready to Process Item'}</h3>
              <p className="text-sm text-green-600">
                {isCreatingNewLot 
                  ? `Create new lot for "${selectedItem?.itemName}" from order ${selectedOrder?.voucherNumber}`
                  : `Process "${selectedItem?.itemName}" from order ${selectedOrder?.voucherNumber}`
                }
              </p>
            </div>
            <Button
              onClick={onProcessItem}
              className="bg-green-600 hover:bg-green-700"
              disabled={isProcessing || isItemProcessing}
            >
              {isProcessing || isItemProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isCreatingNewLot ? 'Creating...' : 'Processing...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isCreatingNewLot ? 'Create New Lot' : 'Process Now'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}