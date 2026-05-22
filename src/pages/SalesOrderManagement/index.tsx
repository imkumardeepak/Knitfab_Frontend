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

const ItemsStatusCell = ({ items }: { items: SalesOrderItemWebResponseDto[] }) => {
  const total = items.length;
  const processed = items.filter((i) => i.isProcess).length;
  const pending = total - processed;
  const allDone = processed === total && total > 0;

  if (total === 0) {
    return <span className="text-[11px] text-gray-400">0 Items</span>;
  }

  if (allDone) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 w-max">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {total} Processed
      </div>
    );
  }

  if (processed === 0) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 w-max">
        <Clock className="h-3.5 w-3.5" />
        {total} Pending
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold w-max">
      <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200" title={`${processed} Processed`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {processed}
      </div>
      <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200" title={`${pending} Pending`}>
        <Clock className="h-3.5 w-3.5" />
        {pending}
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
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'processed' | 'completed'>('all');
  
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

  // Categorize sales orders dynamically
  const { categorizedOrders, counts } = useMemo(() => {
    const allOrdersMap = new Map<number, SalesOrderWebResponseDto>();
    [...unprocessedSalesOrders, ...processedSalesOrders].forEach(order => {
      allOrdersMap.set(order.id, order);
    });
    
    const all = Array.from(allOrdersMap.values());
    
    const completed: SalesOrderWebResponseDto[] = [];
    const unprocessed: SalesOrderWebResponseDto[] = [];
    const processed: SalesOrderWebResponseDto[] = [];
    const active: SalesOrderWebResponseDto[] = []; // all active (non-completed)
    
    all.forEach(order => {
      const orderLots = lotMapping[order.id] || [];
      const totalItems = order.items.length;
      const processedItemsCount = order.items.filter(i => i.isProcess).length;
      const isAllItemsProcessed = processedItemsCount === totalItems && totalItems > 0;
      const hasLots = orderLots.length > 0;
      const isAllLotsCompleted = hasLots && orderLots.every(l => l.isSuspended || l.productionStatus === 2);
      
      const isCompleted = isAllItemsProcessed && isAllLotsCompleted;
      
      if (isCompleted) {
        completed.push(order);
      } else {
        active.push(order);
        // Categorize active ones into unprocessed or processed (in-progress)
        const isAnyProcessed = order.items.some(i => i.isProcess);
        if (isAnyProcessed) {
          processed.push(order);
        } else {
          unprocessed.push(order);
        }
      }
    });
    
    return {
      categorizedOrders: {
        all: active,
        unprocessed,
        processed,
        completed
      },
      counts: {
        all: active.length,
        unprocessed: unprocessed.length,
        processed: processed.length,
        completed: completed.length
      }
    };
  }, [unprocessedSalesOrders, processedSalesOrders, lotMapping]);

  const filteredSalesOrders = useMemo(() => {
    return categorizedOrders[filter] || [];
  }, [categorizedOrders, filter]);

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

      {/* Filter Tabs */}
      <div className="flex space-x-2 bg-gray-100/60 p-1 rounded-lg border w-max">
        <Button 
          size="sm" 
          variant={filter === 'all' ? 'default' : 'ghost'} 
          onClick={() => setFilter('all')}
          className="text-xs font-semibold px-3 py-1.5 h-8"
        >
          Active ({counts.all})
        </Button>
        <Button
          size="sm"
          variant={filter === 'unprocessed' ? 'default' : 'ghost'}
          onClick={() => setFilter('unprocessed')}
          className="text-xs font-semibold px-3 py-1.5 h-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
        >
          Unprocessed ({counts.unprocessed})
        </Button>
        <Button
          size="sm"
          variant={filter === 'processed' ? 'default' : 'ghost'}
          onClick={() => setFilter('processed')}
          className="text-xs font-semibold px-3 py-1.5 h-8 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
        >
          In Progress ({counts.processed})
        </Button>
        <Button
          size="sm"
          variant={filter === 'completed' ? 'default' : 'ghost'}
          onClick={() => setFilter('completed')}
          className={`text-xs font-semibold px-3 py-1.5 h-8 ${
            filter === 'completed' 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold' 
              : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          Completed ({counts.completed})
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filter === 'all' && 'Active Sales Orders'}
              {filter === 'unprocessed' && 'Unprocessed Sales Orders'}
              {filter === 'processed' && 'In Progress Sales Orders'}
              {filter === 'completed' && 'Completed Sales Orders'}
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
                  <Card className="shadow-sm border-gray-200 mb-4">
                    <CardHeader className="py-2 bg-gray-50/50 border-b">
                      <CardTitle className="text-sm font-semibold text-gray-700">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-3 text-[11px]">
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Voucher Number</div>
                          <div className="font-semibold text-primary truncate" title={selectedOrder.voucherNumber}>{selectedOrder.voucherNumber}</div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Party Name</div>
                          <div className="font-medium text-gray-800 truncate" title={selectedOrder.buyerName}>{selectedOrder.buyerName}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Sales Date</div>
                          <div className="font-medium text-gray-800">{formatDate(new Date(selectedOrder.orderDate))}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Total Quantity</div>
                          <div className="font-bold text-gray-800">{selectedOrder.totalQuantity}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Total Amount</div>
                          <div className="font-bold text-emerald-600">₹{selectedOrder.totalAmount}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Voucher Type</div>
                          <div className="font-medium text-gray-800">{selectedOrder.voucherType || '-'}</div>
                        </div>
                        
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Order No</div>
                          <div className="font-medium text-gray-800 truncate" title={selectedOrder.orderNo}>{selectedOrder.orderNo || '-'}</div>
                        </div>
                        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Company Name</div>
                          <div className="font-medium text-gray-800 truncate" title={selectedOrder.companyName}>{selectedOrder.companyName || '-'}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">GSTIN / State</div>
                          <div className="font-medium text-gray-800 truncate" title={`${selectedOrder.companyGSTIN || '-'} / ${selectedOrder.companyState || '-'}`}>
                            {selectedOrder.companyGSTIN || '-'} / {selectedOrder.companyState || '-'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Payment Terms</div>
                          <div className="font-medium text-gray-800 truncate" title={selectedOrder.termsOfPayment}>{selectedOrder.termsOfPayment || '-'}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Job Work</div>
                          <div className="font-medium text-gray-800">{selectedOrder.isJobWork ? 'Yes' : 'No'}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-semibold text-[9px] uppercase tracking-wider mb-0.5">Created By</div>
                          <div className="font-medium text-gray-800 truncate" title={selectedOrder.createdBy}>{selectedOrder.createdBy || '-'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-[15px] font-semibold mb-2 text-gray-800">
                      Items ({selectedOrder.items.length})
                    </h3>
                    <div className="flex flex-col gap-2">
                      {selectedOrder.items.map((item: SalesOrderItemWebResponseDto) => (
                        <Card key={item.id} className={`shadow-sm border transition-colors ${item.isProcess ? 'border-gray-200 bg-gray-50/50' : 'border-blue-100 bg-white hover:border-blue-300'}`}>
                          <CardContent className="p-2 md:p-2.5">
                            {/* Header: Item Name & Price/Qty/Action */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm text-gray-800 line-clamp-1 leading-tight" title={item.itemName}>
                                  {item.itemName}
                                </h4>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col items-end">
                                  <span className="font-bold text-emerald-600 text-[13px] tracking-tight leading-tight">₹{item.amount.toLocaleString()}</span>
                                  <span className="text-[9px] text-gray-500 font-bold uppercase">{item.qty} {item.unit || 'Kg'}</span>
                                </div>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => !item.isProcess && handleProcessOrderItem(item, selectedOrder)}
                                  className={`h-7 text-[11px] px-3 shadow-sm transition-all ${item.isProcess ? 'bg-gray-100 text-gray-400 hover:bg-gray-100 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white font-medium hover:shadow-md'}`}
                                  disabled={item.isProcess}
                                >
                                  {item.isProcess ? 'Processed' : 'Process Item'}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Details Grid (Row Wise) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-2 gap-y-1 text-[10px] bg-blue-50/30 p-1.5 rounded border border-blue-50/50">
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Dia x GG</div>
                                <div className="text-gray-700 font-medium">{item.dia || '-'} x {item.gg || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Fabric Type</div>
                                <div className="text-gray-700 font-medium truncate" title={item.fabricType}>{item.fabricType || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Stitch Length</div>
                                <div className="text-gray-700 font-medium">{item.stitchLength || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Slitline</div>
                                <div className="text-gray-700 font-medium truncate" title={item.slitLine}>{item.slitLine || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Composition</div>
                                <div className="text-gray-700 font-medium truncate" title={item.composition}>{item.composition || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Roll Per Kg</div>
                                <div className="text-gray-700 font-medium">{item.wtPerRoll ? `${item.wtPerRoll} Kg` : '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">No. of Rolls</div>
                                <div className="text-gray-700 font-medium">{item.noOfRolls || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 font-semibold text-[8px] uppercase tracking-wider mb-0.5">Yarn Count</div>
                                <div className="text-gray-700 font-medium truncate" title={item.yarnCount}>{item.yarnCount || '-'}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {selectedOrder.remarks && (
                    <Card className="shadow-sm border-gray-200">
                      <CardHeader className="py-2 bg-gray-50/50 border-b">
                        <CardTitle className="text-sm font-semibold text-gray-700">Remarks</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <p className="text-[11px] text-gray-600 leading-relaxed">{selectedOrder.remarks}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedOrder.buyerAddress && (
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="py-2 bg-gray-50/50 border-b">
                          <CardTitle className="text-sm font-semibold text-gray-700">Buyer Address</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          <p className="text-[11px] text-gray-600 leading-relaxed">{selectedOrder.buyerAddress}</p>
                        </CardContent>
                      </Card>
                    )}
                    {selectedOrder.consigneeAddress && (
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="py-2 bg-gray-50/50 border-b">
                          <CardTitle className="text-sm font-semibold text-gray-700">Consignee Address</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          <p className="text-[11px] text-gray-600 leading-relaxed">{selectedOrder.consigneeAddress}</p>
                        </CardContent>
                      </Card>
                    )}
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