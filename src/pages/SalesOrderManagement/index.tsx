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
import { formatDate } from '@/lib/utils';
import { Edit, Eye, Plus, RefreshCw, Settings } from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import type { SalesOrderWebResponseDto, SalesOrderItemWebResponseDto } from '@/types/api-types';
import { vouchersApi } from '@/lib/api-client';
import { ProductionAllotmentService } from '@/services/productionAllotmentService';

type SalesOrderCellProps = { row: Row<SalesOrderWebResponseDto> };

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
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderWebResponseDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'processed'>('all');

  // State to store lot IDs for each sales order
  const [lotIdsMap, setLotIdsMap] = useState<Record<number, string[]>>({});
  const [loadingLots, setLoadingLots] = useState<Record<number, boolean>>({});

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

  // Function to fetch lot IDs for sales orders
  const fetchLotIdsForOrders = async (salesOrders: SalesOrderWebResponseDto[]) => {
    const ordersToFetch = salesOrders.filter(order => 
      lotIdsMap[order.id] === undefined && !loadingLots[order.id]
    );
    
    for (const order of ordersToFetch) {
      setLoadingLots(prev => ({ ...prev, [order.id]: true }));
      try {
        const lots = await ProductionAllotmentService.getLotsForSalesOrder(order.id);
        const lotIds = lots.map(lot => lot.allotmentId).filter(id => id) as string[];
        setLotIdsMap(prev => ({ ...prev, [order.id]: lotIds }));
      } catch (error) {
        console.error(`Error fetching lots for order ${order.id}:`, error);
        setLotIdsMap(prev => ({ ...prev, [order.id]: [] })); // Set empty array on error
      } finally {
        setLoadingLots(prev => {
          const newState = { ...prev };
          delete newState[order.id]; // Remove the loading flag
          return newState;
        });
      }
    }
  };

  // Fetch lot IDs for all displayed orders
  useEffect(() => {
    fetchLotIdsForOrders(filteredSalesOrders);
  }, [filteredSalesOrders]); // Only fetch when filteredSalesOrders changes

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Call getAllVouchers API
      await vouchersApi.getAllVouchers();
      // Refetch sales orders
      await Promise.all([refetchUnprocessed(), refetchProcessed()]);
      // Reset lot IDs map since we're getting fresh data
      setLotIdsMap({});
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
  const isLoading = isUnprocessedLoading || isProcessedLoading;

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
        return <div className="font-medium text-primary">{order.voucherNumber}</div>;
      },
    },
    {
      accessorKey: 'buyerName',
      header: 'Party Name',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <div>{order.buyerName}</div>;
      },
    },
    {
      accessorKey: 'orderDate',
      header: 'Sales Date',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <div>{formatDate(new Date(order.orderDate))}</div>;
      },
    },
    {
      accessorKey: 'orderNo',
      header: 'Order NO.',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return (
          <div>
          
           
                {order.orderNo}
         
          </div>
        );
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return (
          <div>
            {order.totalQuantity}
          </div>
        );
      },
    },
    {
      accessorKey: 'items',
      header: 'Items Count',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return <div>{order.items.length}</div>;
      },
    },
    {
      accessorKey: 'lots',
      header: 'Lot IDs',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        const lotIds = lotIdsMap[order.id] || [];
        const isLoading = loadingLots[order.id];

        if (isLoading) {
          return <div className="text-muted-foreground">Loading...</div>;
        }

        if (lotIds.length === 0) {
          return <div className="text-muted-foreground">-</div>;
        }

        // Show first 2 lot IDs and indicate if there are more
        const displayLots = lotIds.slice(0, 2);
        const remainingCount = lotIds.length - displayLots.length;

        return (
          <div className="space-y-1">
            {displayLots.map((lotId, index) => (
              <div key={index} className="text-sm font-mono bg-muted p-1 rounded px-2">
                {lotId}
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-xs text-muted-foreground">+{remainingCount} more</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: SalesOrderCellProps) => {
        const order = row.original;
        return (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleViewItems(order)}>
              <Eye className="h-4 w-4 mr-1" />
              
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/sales-orders/${order.id}/edit`)}>
              <Edit className="h-4 w-4 mr-1" />
           
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Sales Order Management</h1>
          <p className="text-muted-foreground">Manage sales orders (Unprocessed and Processed)</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleCreateSalesOrder}>
            <Plus className="h-4 w-4 mr-2" />
            Create Sales Order
          </Button>
         
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex space-x-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All Orders
        </Button>
        <Button
          variant={filter === 'unprocessed' ? 'default' : 'outline'}
          onClick={() => setFilter('unprocessed')}
        >
          Unprocessed
        </Button>
        <Button
          variant={filter === 'processed' ? 'default' : 'outline'}
          onClick={() => setFilter('processed')}
        >
          Processed
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' && 'All Sales Orders'}
            {filter === 'unprocessed' && 'Unprocessed Sales Orders'}
            {filter === 'processed' && 'Processed Sales Orders'}
          </CardTitle>
          <span className="text-sm font-normal text-muted-foreground">
            ({filteredSalesOrders.length} orders)
          </span>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredSalesOrders}
            searchKey="voucherNumber"
            searchPlaceholder="Search by voucher number..."
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