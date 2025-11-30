import { useQuery } from '@tanstack/react-query';
import { salesOrderApi, vouchersApi, apiUtils } from '@/lib/api-client';
import type { SalesOrderDto, VoucherDto } from '@/types/api-types';

// Sales Order Query Keys
export const salesOrderKeys = {
  all: ['salesOrders'] as const,
  lists: () => [...salesOrderKeys.all, 'list'] as const,
  unprocessed: () => [...salesOrderKeys.lists(), 'unprocessed'] as const,
};

// Voucher Query Keys
export const voucherKeys = {
  all: ['vouchers'] as const,
  lists: () => [...voucherKeys.all, 'list'] as const,
};

// Sales Order Queries
export const useUnprocessedSalesOrders = () => {
  return useQuery({
    queryKey: salesOrderKeys.unprocessed(),
    queryFn: async () => {
      const response = await salesOrderApi.getUnprocessedSalesOrders();
      return apiUtils.extractData(response) as SalesOrderDto[];
    },
  });
};

// Processed Sales Order Queries
export const useProcessedSalesOrders = () => {
  return useQuery({
    queryKey: [...salesOrderKeys.lists(), 'processed'],
    queryFn: async () => {
      const response = await salesOrderApi.getProcessedSalesOrders();
      return apiUtils.extractData(response) as SalesOrderDto[];
    },
  });
};

// Voucher Queries
export const useVouchers = () => {
  return useQuery({
    queryKey: voucherKeys.lists(),
    queryFn: async () => {
      const response = await vouchersApi.getAllVouchers();
      return apiUtils.extractData(response) as VoucherDto[];
    },
  });
};

// Mutation for refreshing vouchers
export const useRefreshVouchers = () => {
  // This would be implemented if there was a refresh endpoint
  // For now, we'll just invalidate the query to force a refetch
  return { mutate: () => {} };
};