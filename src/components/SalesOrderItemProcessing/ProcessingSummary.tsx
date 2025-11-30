import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SalesOrderItemWebResponseDto } from '@/types/api-types';

interface ProcessingSummaryProps {
  selectedItem: SalesOrderItemWebResponseDto;
}

export function ProcessingSummary({ selectedItem }: ProcessingSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <div className="text-sm text-blue-600">Item Selected</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600 font-mono">
              ₹{selectedItem.amount}
            </div>
            <div className="text-sm text-yellow-600">Item Value</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {selectedItem.qty}
            </div>
            <div className="text-sm text-green-600">Quantity (kg)</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">Ready</div>
            <div className="text-sm text-purple-600">Status</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}