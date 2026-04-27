import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiUtils } from '@/lib/api-client';
import {
  useUnprocessedSalesOrdersWeb,
  useProcessedSalesOrdersWeb,
} from '@/hooks/queries/useSalesOrderWebQueries';
import { useProductionAllotments } from '@/hooks/queries/useProductionAllotmentQueries';
import { formatDate } from '@/lib/utils';
import {
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Settings,
  CheckCircle2,
  Clock,
  Package,
  Loader2,
} from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import type {
  SalesOrderWebResponseDto,
  SalesOrderItemWebResponseDto,
  ProductionAllotmentResponseDto,
} from '@/types/api-types';
import { vouchersApi } from '@/lib/api-client';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';

type SalesOrderCellProps = { row: Row<SalesOrderWebResponseDto> };

// ─── Items Status Cell ───────────────────────────────────────────────
// Shows processed vs total items with a mini progress bar
const ItemsStatusCell = ({ items }: { items: SalesOrderItemWebResponseDto[] }) => {
  const total = items.length;
  const processed = items.filter((i) => i.isProcess).length;
  const pending = total - processed;
  const allDone = processed === total;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="space-y-1 min-w-[110px]">
      {/* Badge row */}
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-[12px]">{total}</span>
        <span className="text-[10px] text-muted-foreground">items</span>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Labels */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="flex items-center gap-0.5 text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          {processed}
        </span>
        {pending > 0 && (
          <span className="flex items-center gap-0.5 text-amber-600">
            <Clock className="h-3 w-3" />
            {pending}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Lot Info Cell ───────────────────────────────────────────────────
const LotInfoCell = ({ lots }: { lots: ProductionAllotmentResponseDto[] }) => {
  if (!lots || lots.length === 0) {
    return <div className="text-muted-foreground text-[11px]">No lots</div>;
  }

  return (
    <div className="space-y-1 min-w-[220px]">
      {lots.map((lot) => {
        const planned = Number(lot.actualQuantity) || 0;
        const statusLabel = lot.isSuspended
          ? 'Done'
          : lot.isOnHold
            ? 'Hold'
            : 'Active';
        const statusColor = lot.isSuspended
          ? 'bg-gray-100 text-gray-600 border-gray-300'
          : lot.isOnHold
            ? 'bg-amber-50 text-amber-700 border-amber-300'
            : 'bg-emerald-50 text-emerald-700 border-emerald-300';

        return (
          <div
            key={lot.id}
            className="flex items-center gap-1.5 bg-muted/60 rounded px-2 py-1 border border-border/50"
          >
            <span className="font-mono text-[10px] font-semibold text-primary truncate max-w-[140px]" title={lot.allotmentId}>
              {lot.allotmentId}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {planned.toFixed(0)}kg
            </span>
            <span
              className={`text-[9px] px-1 py-0.5 rounded border font-medium whitespace-nowrap ${statusColor}`}
            >
              {statusLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const SalesOrderManagement = () => {
  const navigate = useNavigate();
  const {
    data: unprocessedSalesOrders = [],
    isLoading: isUnprocessedLoading,
    error: unprocessedError,
    refetch: refetchUnprocessed,
  } = useUnprocessedSalesOrdersWeb();
  const {
    data: processedSalesOrders = [],
    isLoading: isProcessedLoading,
    error: processedError,
    refetch: refetchProcessed,
  } = useProcessedSalesOrdersWeb();
  
  const { 
    data: allLots = [], 
    isLoading: isLotsLoading 
  } = useProductionAllotments();

  const [selectedOrder, setSelectedOrder] = useState<SalesOrderWebResponseDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'processed'>('all');

  // Create a mapping of salesOrderId -> production allotments
  const lotMapping = useMemo(() => {
    const mapping: Record<number, ProductionAllotmentResponseDto[]> = {};
    allLots.forEach(lot => {
      if (!mapping[lot.salesOrderId]) {
        mapping[lot.salesOrderId] = [];
      }
      mapping[lot.salesOrderId].push(lot);
    });
    return mapping;
  }, [allLots]);

  // Combine and filter sales orders based on selected filter
  const filteredSalesOrders = useMemo(() => {
    switch (filter) {
      case 'unprocessed':
        return unprocessedSalesOrders;
      case 'processed':
        return processedSalesOrders;
      default: // 'all'
        {
          const allOrdersMap = new Map();
          [...unprocessedSalesOrders, ...processedSalesOrders].forEach(order => {
            allOrdersMap.set(order.id, order);
          });
          return Array.from(allOrdersMap.values());
        }
    }
  }, [unprocessedSalesOrders, processedSalesOrders, filter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Call getAllVouchers API
      await vouchersApi.getAllVouchers();
      // Refetch sales orders
      await Promise.all([refetchUnprocessed(), refetchProcessed()]);
    } catch (error) {
      console.error('Error refreshing sales orders:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateSalesOrder = () => {
    // Navigate to the create sales order page
    navigate('/sales-orders/create');
  };

  const handleViewItems = (order: SalesOrderWebResponseDto) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleProcessOrderItem = (item: SalesOrderItemWebResponseDto, order: SalesOrderWebResponseDto) => {
    // Navigate to the processing page with specific item data
    navigate(`/sales-orders/${order.id}/process-item/${item.id}`, {
      state: {
        orderData: order,
        selectedItem: item,
      },
    });
  };

  // Check if any data is loading
  const isLoading = isUnprocessedLoading || isProcessedLoading || isLotsLoading;

  // Check if there are any errors
  const error = unprocessedError || processedError;

  // Debug logging
  useEffect(() => {
  }, [unprocessedSalesOrders, processedSalesOrders, filter, filteredSalesOrders]);

  const columns = [
    {
      accessorKey: 'voucherNumber',
      header: 'Voucher Number',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <div className="font-medium text-primary whitespace-nowrap">{order.voucherNumber}</div>;
      },
    },
    {
      accessorKey: 'buyerName',
      header: 'Party Name',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return (
          <div className="max-w-[200px] truncate" title={order.buyerName}>
            {order.buyerName}
          </div>
        );
      },
    },
    {
      accessorKey: 'orderDate',
      header: 'Sales Date',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <div className="whitespace-nowrap">{formatDate(new Date(order.orderDate))}</div>;
      },
    },
    {
      accessorKey: 'orderNo',
      header: 'Order No.',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <div className="whitespace-nowrap">{order.orderNo}</div>;
      },
    },
    {
      accessorKey: 'totalQuantity',
      header: 'Quantity',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return (
          <div className="font-semibold whitespace-nowrap">
            {Number(order.totalQuantity).toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'items',
      header: 'Items / Status',
      accessorFn: (row: SalesOrderWebResponseDto) => row.items.length,
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <ItemsStatusCell items={order.items} />;
      },
    },
    {
      accessorKey: 'lots',
      header: 'Lot Details',
      accessorFn: (row: SalesOrderWebResponseDto) => {
        const orderLots = lotMapping[row.id] || [];
        return orderLots.map(l => l.allotmentId).join(' ');
      },
      cell: ({ row }: { row: Row<SalesOrderWebResponseDto> }) => {
        const orderLots = lotMapping[row.original.id] || [];
        return <LotInfoCell lots={orderLots} />;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;

        const handleReorder = () => {
          navigate('/sales-orders/create', { state: { reorderData: order } });
        };

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewItems(order)}
              title="View Items"
              className="h-7 w-7 p-0"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
              title="Edit Order"
              className="h-7 w-7 p-0"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReorder}
              className="h-7 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              title="Reorder"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reorder
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    const errorMessage = apiUtils.handleError(error);
    return (
      <div className="text-center text-red-500 p-4">Error loading sales orders: {errorMessage}</div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-display">Sales Order Management</h1>
          <p className="text-sm text-muted-foreground">Manage sales orders (Unprocessed and Processed)</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleCreateSalesOrder} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create Sales Order
          </Button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All Orders
        </Button>
        <Button
          size="sm"
          variant={filter === 'unprocessed' ? 'default' : 'outline'}
          onClick={() => setFilter('unprocessed')}
        >
          Unprocessed
        </Button>
        <Button
          size="sm"
          variant={filter === 'processed' ? 'default' : 'outline'}
          onClick={() => setFilter('processed')}
        >
          Processed
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filter === 'all' && 'All Sales Orders'}
              {filter === 'unprocessed' && 'Unprocessed Sales Orders'}
              {filter === 'processed' && 'Processed Sales Orders'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredSalesOrders.length} orders)
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3">
          <DataTable
            columns={columns}
            data={filteredSalesOrders}
            searchKey="voucherNumber"
            searchPlaceholder="Search orders (Voucher, Party, Lot ID...)"
            initialSorting={[{ id: 'voucherNumber', desc: true }]}
          />
        </CardContent>
      </Card>

      {/* Sales Order Items Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Sales Order Items
              {selectedOrder && (
                <div className="text-sm font-normal mt-2">
                  Voucher:{' '}
                  <span className="text-primary font-medium">{selectedOrder.voucherNumber}</span> |
                  Party: {selectedOrder.buyerName}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-grow w-full rounded-md h-[calc(90vh-8rem)]">
            <div className="p-4">
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Order Details</h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Voucher Number:</span>{' '}
                          <span className="text-primary font-medium">
                            {selectedOrder.voucherNumber}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Party Name:</span> {selectedOrder.buyerName}
                        </p>
                        <p>
                          <span className="font-medium">Sales Date:</span>{' '}
                          {formatDate(new Date(selectedOrder.orderDate))}
                        </p>
                        <p>
                          <span className="font-medium">Terms of Payment:</span>{' '}
                          {selectedOrder.termsOfPayment}
                        </p>
                        <p>
                          <span className="font-medium">Company Name:</span>{' '}
                          {selectedOrder.companyName}
                        </p>
                        <p>
                          <span className="font-medium">Company GSTIN:</span>{' '}
                          {selectedOrder.companyGSTIN}
                        </p>
                        <p>
                          <span className="font-medium">Company State:</span>{' '}
                          {selectedOrder.companyState}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Additional Information</h3>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Voucher Type:</span> {selectedOrder.voucherType}
                        </p>
                        <p>
                          <span className="font-medium">Job Work:</span>{' '}
                          {selectedOrder.isJobWork ? 'Yes' : 'No'}
                        </p>
                        <p>
                          <span className="font-medium">Order No:</span> {selectedOrder.orderNo || '-'}
                        </p>
                        <p>
                          <span className="font-medium">Total Quantity:</span>{' '}
                          {selectedOrder.totalQuantity}
                        </p>
                        <p>
                          <span className="font-medium">Total Amount:</span> ₹{selectedOrder.totalAmount}
                        </p>
                        <p>
                          <span className="font-medium">Created At:</span>{' '}
                          {formatDate(new Date(selectedOrder.createdAt))}
                        </p>
                        <p>
                          <span className="font-medium">Created By:</span> {selectedOrder.createdBy}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Items ({selectedOrder.items.length})
                    </h3>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted z-10">
                          <tr>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[200px]">
                              Item Name
                            </th>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[120px]">
                              Quantity
                            </th>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[120px]">
                              HSN Code
                            </th>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[150px]">
                              Fabric Type
                            </th>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[120px]">
                              Rate
                            </th>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[120px]">
                              Amount
                            </th>
                            <th className="text-left p-3 sticky top-0 bg-muted z-10 min-w-[120px]">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item: SalesOrderItemWebResponseDto) => (
                            <tr key={item.id} className="border-t hover:bg-muted/50">
                              <td className="p-3 whitespace-normal break-words">{item.itemName}</td>
                              <td className="p-3">{item.qty}</td>
                              <td className="p-3 whitespace-normal break-words">
                                {item.hsncode || '-'}
                              </td>
                              <td className="p-3">{item.fabricType}</td>
                              <td className="p-3">₹{item.rate}</td>
                              <td className="p-3">₹{item.amount}</td>
                              <td className="p-3">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => !item.isProcess && handleProcessOrderItem(item, selectedOrder)}
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={item.isProcess}
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  {item.isProcess ? 'Processed' : 'Process'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selectedOrder.remarks && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Remarks</h3>
                      <div className="border rounded-lg p-3 bg-muted">
                        <p className="text-sm">{selectedOrder.remarks}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Buyer Address</h3>
                      <div className="border rounded-lg p-3 bg-muted">
                        <p className="text-sm">{selectedOrder.buyerAddress}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Consignee Address</h3>
                      <div className="border rounded-lg p-3 bg-muted">
                        <p className="text-sm">{selectedOrder.consigneeAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="shrink-0 border-t pt-4">
            <div className="flex space-x-2 w-full">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrderManagement;