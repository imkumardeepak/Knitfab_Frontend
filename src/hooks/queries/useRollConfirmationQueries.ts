import { useQuery } from '@tanstack/react-query';
import { rollConfirmationApi, apiUtils } from '@/lib/api-client';
import type { RollConfirmationResponseDto } from '@/types/api-types';

// Roll Confirmation Query Keys
export const rollConfirmationKeys = {
  all: ['rollConfirmations'] as const,
  lists: () => [...rollConfirmationKeys.all, 'list'] as const,
};

// Roll Confirmation Queries
export const useRollConfirmations = () => {
  return useQuery({
    queryKey: rollConfirmationKeys.lists(),
    queryFn: async () => {
      const response = await rollConfirmationApi.getAllRollConfirmations();
      return apiUtils.extractData(response) as RollConfirmationResponseDto[];
    },
  });
};
