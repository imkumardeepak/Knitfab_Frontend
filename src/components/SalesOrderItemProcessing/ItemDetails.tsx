import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import type { SalesOrderWebResponseDto, SalesOrderItemWebResponseDto } from '@/types/api-types';

interface ItemDetailsProps {
  selectedItem: SalesOrderItemWebResponseDto;
  selectedOrder: SalesOrderWebResponseDto;
}

export function ItemDetails({ selectedItem, selectedOrder }: ItemDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Item Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Product Information</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Item Name:</span>
                <p className="font-semibold">{selectedItem.itemName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Description:</span>
                <p className="text-sm">
                  {selectedItem.itemDescription || 'No description available'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Information</h3>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Order Number:</span>
                <p className="font-semibold">{selectedOrder.voucherNumber}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Voucher Number:</span>
                <p>{selectedOrder.voucherNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}