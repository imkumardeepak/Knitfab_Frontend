import { useQuery } from '@tanstack/react-query';
import { SalesOrderWebService } from '@/services/salesOrderWebService';

// Sales Order Web Query Keys
export const salesOrderWebKeys = {
  all: ['salesOrdersWeb'] as const,
  lists: () => [...salesOrderWebKeys.all, 'list'] as const,
  unprocessed: () => [...salesOrderWebKeys.all, 'unprocessed'] as const,
  processed: () => [...salesOrderWebKeys.all, 'processed'] as const,
};

// Sales Order Web Queries
export const useSalesOrdersWeb = () => {
  return useQuery({
    queryKey: salesOrderWebKeys.lists(),
    queryFn: async () => {
      const response = await SalesOrderWebService.getAllSalesOrdersWeb();
      console.log('All sales orders:', response);
      return response;
    },
  });
};

// Filter sales orders based on the isProcess flag
// Unprocessed orders have isProcess = false
// Processed orders have isProcess = true
// Using separate query keys to ensure proper caching
export const useUnprocessedSalesOrdersWeb = () => {
  return useQuery({
    queryKey: salesOrderWebKeys.unprocessed(),
    queryFn: async () => {
      const response = await SalesOrderWebService.getAllSalesOrdersWeb();
      // Filter to return only unprocessed orders (where isProcess is false)
      const filtered = response.filter(order => !order.isProcess);
      console.log('Unprocessed orders:', filtered);
      return filtered;
    },
  });
};

export const useProcessedSalesOrdersWeb = () => {
  return useQuery({
    queryKey: salesOrderWebKeys.processed(),
    queryFn: async () => {
      const response = await SalesOrderWebService.getAllSalesOrdersWeb();
      // Filter to return only processed orders (where isProcess is true)
      const filtered = response.filter(order => order.isProcess);
      console.log('Processed orders:', filtered);
      return filtered;
    },
  });
};