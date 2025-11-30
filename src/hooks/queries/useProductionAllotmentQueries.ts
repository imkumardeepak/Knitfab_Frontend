import { useQuery } from '@tanstack/react-query';
import { productionAllotmentApi, apiUtils } from '@/lib/api-client';
import type { ProductionAllotmentResponseDto } from '@/types/api-types';

// Production Allotment Query Keys
export const productionAllotmentKeys = {
  all: ['productionAllotments'] as const,
  lists: () => [...productionAllotmentKeys.all, 'list'] as const,
};

// Production Allotment Queries
export const useProductionAllotments = () => {
  return useQuery({
    queryKey: productionAllotmentKeys.lists(),
    queryFn: async () => {
      const response = await productionAllotmentApi.getAllProductionAllotments();
      return apiUtils.extractData(response) as ProductionAllotmentResponseDto[];
    },
  });
};