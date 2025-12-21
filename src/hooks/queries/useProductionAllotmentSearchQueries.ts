import { useQuery } from '@tanstack/react-query';
import { productionAllotmentApi, apiUtils } from '@/lib/api-client';
import type { ProductionAllotmentResponseDto, ProductionAllotmentSearchRequestDto } from '@/types/api-types';

// Production Allotment Search Query Keys
export const productionAllotmentSearchKeys = {
  all: ['productionAllotments'] as const,
  search: () => [...productionAllotmentSearchKeys.all, 'search'] as const,
  searchWithParams: (params: ProductionAllotmentSearchRequestDto) => [...productionAllotmentSearchKeys.search(), params] as const,
};

// Production Allotment Search Queries
export const useSearchProductionAllotments = (params?: ProductionAllotmentSearchRequestDto) => {
  return useQuery({
    queryKey: productionAllotmentSearchKeys.searchWithParams(params || {}),
    queryFn: async () => {
      const response = await productionAllotmentApi.searchProductionAllotments(params);
      return apiUtils.extractData(response) as ProductionAllotmentResponseDto[];
    },
    enabled: !!params, // Only run the query if params are provided
  });
};