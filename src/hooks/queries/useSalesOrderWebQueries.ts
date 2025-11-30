import { useQuery } from '@tanstack/react-query';
import { SalesOrderWebService } from '@/services/salesOrderWebService';
import type { SalesOrderWebResponseDto } from '@/types/api-types';

// Sales Order Web Query Keys
export const salesOrderWebKeys = {
  all: ['salesOrdersWeb'] as const,
  lists: () => [...salesOrderWebKeys.all, 'list'] as const,
  unprocessed: () => [...salesOrderWebKeys.lists(), 'unprocessed'] as const,
};

// Sales Order Web Queries
export const useSalesOrdersWeb = () => {
  return useQuery({
    queryKey: salesOrderWebKeys.lists(),
    queryFn: async () => {
      const response = await SalesOrderWebService.getAllSalesOrdersWeb();
      return response;
    },
  });
};

// Since SalesOrderWeb doesn't have separate unprocessed/processed flags,
// we'll need to filter the data based on some criteria
// For now, we'll just return all data for both hooks to maintain compatibility
export const useUnprocessedSalesOrdersWeb = () => {
  return useQuery({
    queryKey: salesOrderWebKeys.unprocessed(),
    queryFn: async () => {
      const response = await SalesOrderWebService.getAllSalesOrdersWeb();
      // Filter logic would go here if needed
      // For now, returning all orders as unprocessed
      return response;
    },
  });
};

export const useProcessedSalesOrdersWeb = () => {
  return useQuery({
    queryKey: [...salesOrderWebKeys.lists(), 'processed'],
    queryFn: async () => {
      const response = await SalesOrderWebService.getAllSalesOrdersWeb();
      // Filter logic would go here if needed
      // For now, returning empty array as processed (to be implemented based on business logic)
      return [];
    },
  });
};