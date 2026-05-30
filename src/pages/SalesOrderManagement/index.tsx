import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiUtils, dispatchPlanningApi, vouchersApi, productionAllotmentApi } from '@/lib/api-client';
import {
  useUnprocessedSalesOrdersWeb,
  useProcessedSalesOrdersWeb,
} from '@/hooks/queries/useSalesOrderWebQueries';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import { useProductionAllotments } from '@/hooks/queries/useProductionAllotmentQueries';
import { formatDate } from '@/lib/utils';
import {
  Edit,
  Eye,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Package,
  Search,
  Truck,
  PauseCircle,
  PlayCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  SalesOrderWebResponseDto,
  SalesOrderItemWebResponseDto,
  ProductionAllotmentResponseDto,
  DispatchPlanningDto,
} from '@/types/api-types';

// ─── Types ───────────────────────────────────────────────────────────
type OrderStatus = 'pending' | 'running' | 'hold' | 'completed';

interface FlatRowData {
  order: SalesOrderWebResponseDto;
  item: SalesOrderItemWebResponseDto | null;
  itemLots: ProductionAllotmentResponseDto[];
  orderStatus: OrderStatus;
  rowKey: string;
}

// ─── Helper: compute order status ────────────────────────────────────
function computeOrderStatus(
  order: SalesOrderWebResponseDto,
  orderLots: ProductionAllotmentResponseDto[],
  dispatchByLot: Record<string, DispatchPlanningDto[]>
): OrderStatus {
  const hasLots = orderLots.length > 0;

  if (!hasLots) {
    return 'pending';
  }

  const allItemsProcessed = order.items.length > 0 && order.items.every(i => i.isProcess);
  const allLotsCompleted = orderLots.every(l => l.isSuspended || l.productionStatus === 2);
  const allLotsFullyDispatched = orderLots.every(l => {
    const dispatches = dispatchByLot[l.allotmentId] || [];
    return dispatches.length > 0 && dispatches.every(d => d.isFullyDispatched);
  });

  if (allItemsProcessed && allLotsCompleted) {
    return 'completed';
  }

  const allLotsOnHold = orderLots.every(l => l.isOnHold && !l.isSuspended);
  if (allLotsOnHold) {
    return 'hold';
  }

  return 'running';
}

// ─── Status Badge Component ─────────────────────────────────────────
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const config: Record<OrderStatus, { label: string; icon: React.ReactNode; className: string }> = {
    pending: {
      label: 'Pending',
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    running: {
      label: 'Running',
      icon: <PlayCircle className="h-3 w-3" />,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    hold: {
      label: 'Hold',
      icon: <PauseCircle className="h-3 w-3" />,
      className: 'bg-orange-50 text-orange-700 border-orange-200',
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  };
  const c = config[status];
  return (
    <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded border w-max ${c.className}`}>
      {c.icon}
      {c.label}
    </div>
  );
};

// ─── Lot Info Cell (enhanced with dispatch) ─────────────────────────
const LotInfoCell = ({
  lots,
  dispatchByLot,
  onCompleteLot,
  isCompletingLotId,
  itemQty,
  totalItemDispatch,
  onHoldLot,
  isHoldingLotId,
  itemId,
}: {
  lots: ProductionAllotmentResponseDto[];
  dispatchByLot: Record<string, DispatchPlanningDto[]>;
  onCompleteLot?: (lotId: number) => void;
  isCompletingLotId?: number | null;
  itemQty?: number;
  totalItemDispatch?: number;
  onHoldLot?: (lotId: number) => void;
  isHoldingLotId?: number | null;
  itemId?: number;
}) => {
  if (!lots || lots.length === 0) {
    return <div className="text-muted-foreground text-[11px]">No lots</div>;
  }

  return (
    <div className="space-y-1.5 min-w-[260px]">
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

        // Dispatch info for this lot
        let dispatches = dispatchByLot[lot.allotmentId] || [];
        if (itemId !== undefined) {
          dispatches = dispatches.filter(d => d.salesOrderItemId === itemId);
        }
        const totalDispatchedWeight = dispatches.reduce((sum, d) => sum + (d.totalNetWeight || 0), 0);
        
        // Show Complete button if either:
        // 1. The lot's dispatched quantity is between -5% and +10% of its planned quantity
        const isLotComplete = totalDispatchedWeight >= (planned * 0.95) && totalDispatchedWeight <= (planned * 1.10);
        
        // 2. The whole item's dispatched quantity is between -5% and +10% of order item quantity
        const isItemComplete = itemQty !== undefined && totalItemDispatch !== undefined 
          ? (totalItemDispatch >= (itemQty * 0.95) && totalItemDispatch <= (itemQty * 1.10))
          : false;
          
        const canComplete = isLotComplete || isItemComplete;
        
        return (
          <div
            key={lot.id}
            className="flex flex-col gap-1 bg-muted/30 rounded-md px-2 py-1.5 border border-border/50"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-semibold text-primary" title={lot.allotmentId}>
                {lot.allotmentId}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {planned.toFixed(0)} kg
              </span>
              <span
                className={`text-[9px] px-1 py-0.5 rounded border font-medium whitespace-nowrap ${statusColor}`}
              >
                {statusLabel}
              </span>
              <div className="ml-auto flex items-center gap-1">
                {!lot.isSuspended && onHoldLot && (
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="h-5 text-[9px] px-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                     onClick={(e) => { e.stopPropagation(); onHoldLot(lot.id); }}
                     disabled={isHoldingLotId === lot.id}
                     title={lot.isOnHold ? "Unhold Lot" : "Hold Lot"}
                   >
                     {lot.isOnHold ? <PlayCircle className="h-2.5 w-2.5 mr-1" /> : <PauseCircle className="h-2.5 w-2.5 mr-1" />}
                     {isHoldingLotId === lot.id ? '...' : lot.isOnHold ? 'Unhold' : 'Hold'}
                   </Button>
                )}
                {!lot.isSuspended && onCompleteLot && canComplete && (
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="h-5 text-[9px] px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                     onClick={(e) => { e.stopPropagation(); onCompleteLot(lot.id); }}
                     disabled={isCompletingLotId === lot.id}
                     title="Mark Lot as Complete"
                   >
                     <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                     {isCompletingLotId === lot.id ? '...' : 'Complete'}
                   </Button>
                )}
              </div>
            </div>
            {dispatches.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50/50 border border-indigo-100 px-1.5 py-0.5 rounded font-medium w-max">
                <Truck className="h-3 w-3" />
                Dispatch Qty: {totalDispatchedWeight.toFixed(2)} / {planned.toFixed(2)} kg
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
const SalesOrderManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [completingLotId, setCompletingLotId] = useState<number | null>(null);
  const [holdingLotId, setHoldingLotId] = useState<number | null>(null);

  const toggleHoldMutation = useMutation({
    mutationFn: async (lotId: number) => {
      await productionAllotmentApi.toggleHold(lotId);
    },
    onMutate: (id) => {
      setHoldingLotId(id);
    },
    onSettled: () => {
      setHoldingLotId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionAllotments'] });
    },
    onError: (error) => {
      console.error('Failed to toggle lot hold status:', error);
    }
  });

  const completeLotMutation = useMutation({
    mutationFn: async (lotId: number) => {
      await productionAllotmentApi.completeLot(lotId);
    },
    onMutate: (id) => {
      setCompletingLotId(id);
    },
    onSettled: () => {
      setCompletingLotId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionAllotments'] });
    },
    onError: (error) => {
      console.error('Failed to complete lot:', error);
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await SalesOrderWebService.deleteSalesOrderWeb(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrdersWeb'] });
      refetchUnprocessed();
      refetchProcessed();
    },
    onError: (error) => {
      console.error('Failed to delete order:', error);
    }
  });

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

  // Fetch dispatch planning data
  const {
    data: allDispatchPlannings = [],
    isLoading: isDispatchLoading,
  } = useQuery({
    queryKey: ['dispatchPlannings', 'all'],
    queryFn: async () => {
      const response = await dispatchPlanningApi.getAllDispatchPlannings();
      return apiUtils.extractData(response) as DispatchPlanningDto[];
    },
  });

  const [selectedOrder, setSelectedOrder] = useState<SalesOrderWebResponseDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'running' | 'hold' | 'completed'>('all');
  const [globalSearch, setGlobalSearch] = useState('');
  
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

  // Create a mapping of lotNo (allotmentId) -> DispatchPlanningDto[]
  const dispatchByLot = useMemo(() => {
    const mapping: Record<string, DispatchPlanningDto[]> = {};
    allDispatchPlannings.forEach(dp => {
      if (!mapping[dp.lotNo]) {
        mapping[dp.lotNo] = [];
      }
      mapping[dp.lotNo].push(dp);
    });
    return mapping;
  }, [allDispatchPlannings]);

  // Compute status for each order
  const orderStatusMap = useMemo(() => {
    const map = new Map<number, OrderStatus>();
    const allOrdersMap = new Map<number, SalesOrderWebResponseDto>();
    [...unprocessedSalesOrders, ...processedSalesOrders].forEach(order => {
      allOrdersMap.set(order.id, order);
    });
    allOrdersMap.forEach((order) => {
      const orderLots = lotMapping[order.id] || [];
      const status = computeOrderStatus(order, orderLots, dispatchByLot);
      map.set(order.id, status);
    });
    return map;
  }, [unprocessedSalesOrders, processedSalesOrders, lotMapping, dispatchByLot]);

  // Categorize sales orders dynamically
  const { categorizedOrders, counts } = useMemo(() => {
    const allOrdersMap = new Map<number, SalesOrderWebResponseDto>();
    [...unprocessedSalesOrders, ...processedSalesOrders].forEach(order => {
      allOrdersMap.set(order.id, order);
    });
    
    const all = Array.from(allOrdersMap.values());
    
    const completed: SalesOrderWebResponseDto[] = [];
    const pending: SalesOrderWebResponseDto[] = [];
    const running: SalesOrderWebResponseDto[] = [];
    const hold: SalesOrderWebResponseDto[] = [];
    const active: SalesOrderWebResponseDto[] = []; // all active (non-completed)
    
    all.forEach(order => {
      const status = orderStatusMap.get(order.id) || 'pending';
      
      if (status === 'completed') {
        completed.push(order);
      } else {
        active.push(order);
        if (status === 'pending') pending.push(order);
        else if (status === 'running') running.push(order);
        else if (status === 'hold') hold.push(order);
      }
    });
    
    return {
      categorizedOrders: {
        all: all,
        active: active,
        pending,
        running,
        hold,
        completed
      },
      counts: {
        all: all.length,
        active: active.length,
        pending: pending.length,
        running: running.length,
        hold: hold.length,
        completed: completed.length
      }
    };
  }, [unprocessedSalesOrders, processedSalesOrders, orderStatusMap]);

  // Filter, Search, Paginate, and Flatten rows
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [filter, globalSearch]);

  const { filteredAndSortedOrders, flatRows } = useMemo(() => {
    let orders = categorizedOrders[filter] || [];
    if (globalSearch.trim()) {
      const search = globalSearch.toLowerCase().trim();
      orders = orders.filter(order => {
        const orderLots = lotMapping[order.id] || [];
        return (
          order.voucherNumber?.toLowerCase().includes(search) ||
          order.buyerName?.toLowerCase().includes(search) ||
          order.orderNo?.toLowerCase().includes(search) ||
          orderLots.some(l => l.allotmentId?.toLowerCase().includes(search)) ||
          order.items.some(i => i.itemName?.toLowerCase().includes(search))
        );
      });
    }
    // Sort by voucherNumber descending
    const sortedOrders = [...orders].sort((a, b) => (b.voucherNumber || '').localeCompare(a.voucherNumber || ''));

    const paginatedOrders = sortedOrders.slice((page - 1) * pageSize, page * pageSize);

    const rows: FlatRowData[] = [];
    paginatedOrders.forEach(order => {
      const status = orderStatusMap.get(order.id) || 'pending';
      const orderLots = lotMapping[order.id] || [];

      if (order.items.length === 0) {
        rows.push({
          order,
          item: null,
          itemLots: orderLots,
          orderStatus: status,
          rowKey: `order-${order.id}-no-items`,
        });
      } else {
        const assignedLotIds = new Set<number>();
        order.items.forEach(item => {
          const itemLots = orderLots.filter(l => l.salesOrderItemId === item.id);
          itemLots.forEach(l => assignedLotIds.add(l.id));
          rows.push({
            order,
            item,
            itemLots,
            orderStatus: status,
            rowKey: `item-${item.id}`,
          });
        });

        // Any orphaned lots (created before salesOrderItemId was mandatory, etc.)
        const unassignedLots = orderLots.filter(l => !assignedLotIds.has(l.id));
        if (unassignedLots.length > 0) {
          rows.push({
            order,
            item: null,
            itemLots: unassignedLots,
            orderStatus: status,
            rowKey: `order-${order.id}-unassigned-lots`,
          });
        }
      }
    });

    return { filteredAndSortedOrders: sortedOrders, flatRows: rows };
  }, [categorizedOrders, filter, globalSearch, lotMapping, orderStatusMap, page, pageSize]);

  const totalOrders = filteredAndSortedOrders.length;
  const totalPages = Math.ceil(totalOrders / pageSize) || 1;

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
  const isLoading = isUnprocessedLoading || isProcessedLoading || isLotsLoading || isDispatchLoading;
  const error = unprocessedError || processedError;

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
          <p className="text-sm text-muted-foreground">Manage sales orders with items, lots, and dispatch tracking</p>
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
          All Orders ({counts.all})
        </Button>
        <Button 
          size="sm" 
          variant={filter === 'active' ? 'default' : 'ghost'} 
          onClick={() => setFilter('active')}
          className="text-xs font-semibold px-3 py-1.5 h-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
        >
          Active ({counts.active})
        </Button>
        <Button
          size="sm"
          variant={filter === 'pending' ? 'default' : 'ghost'}
          onClick={() => setFilter('pending')}
          className={`text-xs font-semibold px-3 py-1.5 h-8 ${filter === 'pending' ? '' : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'}`}
        >
          Pending ({counts.pending})
        </Button>
        <Button
          size="sm"
          variant={filter === 'running' ? 'default' : 'ghost'}
          onClick={() => setFilter('running')}
          className={`text-xs font-semibold px-3 py-1.5 h-8 ${filter === 'running' ? '' : 'text-blue-700 hover:text-blue-800 hover:bg-blue-50'}`}
        >
          Running ({counts.running})
        </Button>
        <Button
          size="sm"
          variant={filter === 'hold' ? 'default' : 'ghost'}
          onClick={() => setFilter('hold')}
          className={`text-xs font-semibold px-3 py-1.5 h-8 ${filter === 'hold' ? '' : 'text-orange-700 hover:text-orange-800 hover:bg-orange-50'}`}
        >
          Hold ({counts.hold})
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
              {filter === 'all' && 'All Sales Orders'}
              {filter === 'active' && 'Active Sales Orders'}
              {filter === 'pending' && 'Pending Sales Orders'}
              {filter === 'running' && 'Running Sales Orders'}
              {filter === 'hold' && 'On Hold Sales Orders'}
              {filter === 'completed' && 'Completed Sales Orders'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalOrders} orders)
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3">
          {/* Search Bar */}
          <div className="flex items-center mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders (Voucher, Party, Item, Lot...)"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Flattened Item Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-3 w-[140px]">Voucher No.</TableHead>
                  <TableHead className="px-3 py-3 w-[180px]">Party / Date</TableHead>
                  <TableHead className="px-3 py-3">Item Details</TableHead>
                  <TableHead className="px-3 py-3 w-[120px]">Quantity</TableHead>
                  <TableHead className="px-3 py-3 w-[120px]">Item Status</TableHead>
                  <TableHead className="px-3 py-3 min-w-[280px]">Lots & Dispatch</TableHead>
                  <TableHead className="px-3 py-3 w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatRows.length > 0 ? (
                  flatRows.map((row, index) => {
                    const { order, item, itemLots, orderStatus, rowKey } = row;
                    
                    // Display borders between different orders
                    const isNewOrder = index === 0 || flatRows[index - 1].order.id !== order.id;
                    const borderClass = isNewOrder ? 'border-t-2 border-t-slate-200' : 'border-t border-t-slate-100';

                    const orderRowsCount = flatRows.filter(r => r.order.id === order.id).length;

                    return (
                      <TableRow key={rowKey} className={`hover:bg-slate-50/50 ${borderClass}`}>
                        {/* Voucher Info */}
                        {isNewOrder && (
                          <TableCell className="px-3 py-3 align-top border-r border-slate-100" rowSpan={orderRowsCount}>
                            <div className="font-semibold text-primary">{order.voucherNumber}</div>
                            <div className="mt-1.5">
                              <StatusBadge status={orderStatus} />
                            </div>
                          </TableCell>
                        )}
                        
                        {/* Party & Date */}
                        {isNewOrder && (
                          <TableCell className="px-3 py-3 align-top border-r border-slate-100" rowSpan={orderRowsCount}>
                            <div className="font-medium text-slate-800 line-clamp-2" title={order.buyerName}>
                              {order.buyerName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(new Date(order.orderDate))}
                            </div>
                            {order.orderNo && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Ref: {order.orderNo}
                              </div>
                            )}
                          </TableCell>
                        )}
                        
                        {/* Item Details */}
                        <TableCell className="px-3 py-3 align-top">
                          {item ? (
                            <div>
                              <div className="font-semibold text-sm text-slate-800 flex items-start gap-2">
                                <Package className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                <span className="line-clamp-2" title={item.itemName}>{item.itemName}</span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                                <div><span className="text-slate-400">Type:</span> {item.fabricType || '-'}</div>
                                <div><span className="text-slate-400">Dia/GG:</span> {item.dia || '-'}/{item.gg || '-'}</div>
                                <div className="col-span-2 truncate"><span className="text-slate-400">Yarn:</span> {item.yarnCount || '-'}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">No specific item</div>
                          )}
                        </TableCell>
                        
                        {/* Quantity */}
                        <TableCell className="px-3 py-3 align-top">
                          {item ? (
                            <div className="font-bold text-slate-800">
                              {item.qty} <span className="text-xs font-medium text-slate-500">{item.unit || 'Kg'}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">-</div>
                          )}
                        </TableCell>

                        {/* Item Status / Actions */}
                        <TableCell className="px-3 py-3 align-top">
                          {item ? (
                            <div className="flex flex-col items-start gap-2">
                              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border w-max ${item.isProcess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {item.isProcess ? '✓ Processed' : '○ Pending'}
                              </div>
                              {!item.isProcess && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleProcessOrderItem(item, order)}
                                  className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm w-full"
                                >
                                  Process Item
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400">-</div>
                          )}
                        </TableCell>

                        {/* Lots and Dispatch */}
                        <TableCell className="px-3 py-3 align-top">
                          {(() => {
                            const iQty = item ? item.qty : 0;
                            const tDispatch = itemLots.reduce((acc, l) => {
                              let dps = dispatchByLot[l.allotmentId] || [];
                              if (item) {
                                dps = dps.filter(d => d.salesOrderItemId === item.id);
                              }
                              return acc + dps.reduce((sum, d) => sum + (d.totalNetWeight || 0), 0);
                            }, 0);
                            
                            return (
                              <LotInfoCell 
                                lots={itemLots} 
                                dispatchByLot={dispatchByLot} 
                                onCompleteLot={(id) => completeLotMutation.mutate(id)}
                                isCompletingLotId={completingLotId}
                                itemQty={iQty}
                                totalItemDispatch={tDispatch}
                                onHoldLot={(id) => toggleHoldMutation.mutate(id)}
                                isHoldingLotId={holdingLotId}
                                itemId={item?.id}
                              />
                            );
                          })()}
                        </TableCell>

                        {/* Order Actions */}
                        {isNewOrder && (
                          <TableCell className="px-3 py-3 align-top border-l border-slate-100" rowSpan={orderRowsCount}>
                            <div className="flex flex-col gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewItems(order)}
                                title="View Full Order"
                                className="h-7 text-[11px] justify-start px-2"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/sales-orders/${order.id}/edit`)}
                                title="Edit Order"
                                className="h-7 text-[11px] justify-start px-2"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/sales-orders/create', { state: { reorderData: order } })}
                                className="h-7 text-[11px] justify-start px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                title="Reorder"
                              >
                                <RefreshCw className="h-3 w-3 mr-1.5" />
                                Reorder
                              </Button>
                              {(order.items.length === 0 || order.items.every(i => !i.isProcess)) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this sales order?')) {
                                      deleteOrderMutation.mutate(order.id);
                                    }
                                  }}
                                  className="h-7 text-[11px] justify-start px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  title="Delete Order"
                                  disabled={deleteOrderMutation.isPending && deleteOrderMutation.variables === order.id}
                                >
                                  <Trash2 className="h-3 w-3 mr-1.5" />
                                  {deleteOrderMutation.isPending && deleteOrderMutation.variables === order.id ? 'Deleting...' : 'Delete'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalOrders > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalOrders)} of {totalOrders} orders
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Order Items Modal (Kept for Full Order Details View) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              Sales Order Details
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