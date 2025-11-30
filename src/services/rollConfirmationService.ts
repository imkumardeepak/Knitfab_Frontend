import { rollConfirmationApi } from '@/lib/api-client';
import type { 
  RollConfirmationRequestDto,
  RollConfirmationResponseDto,
  RollConfirmationUpdateDto,
  WeightDataRequestDto,
  WeightDataResponseDto
} from '@/types/api-types';

export class RollConfirmationService {
  // POST /api/rollconfirmation - Create a new roll confirmation
  static async createRollConfirmation(data: RollConfirmationRequestDto): Promise<RollConfirmationResponseDto> {
    try {
      const response = await rollConfirmationApi.createRollConfirmation(data);
      return response.data;
    } catch (error) {
      console.error('Error creating roll confirmation:', error);
      throw error;
    }
  }

  // GET /api/rollconfirmation/{id} - Get roll confirmation by ID
  static async getRollConfirmationById(id: number): Promise<RollConfirmationResponseDto> {
    try {
      const response = await rollConfirmationApi.getRollConfirmation(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching roll confirmation by ID:', error);
      throw error;
    }
  }

  // GET /api/rollconfirmation/by-allot-id/{allotId} - Get roll confirmations by AllotId
  static async getRollConfirmationsByAllotId(allotId: string): Promise<RollConfirmationResponseDto[]> {
    try {
      const response = await rollConfirmationApi.getRollConfirmationsByAllotId(allotId);
      return response.data;
    } catch (error) {
      console.error('Error fetching roll confirmations by AllotId:', error);
      throw error;
    }
  }

  // PUT /api/rollconfirmation/{id} - Update roll confirmation with weight data
  static async updateRollConfirmation(id: number, data: RollConfirmationUpdateDto): Promise<RollConfirmationResponseDto> {
    try {
      const response = await rollConfirmationApi.updateRollConfirmation(id, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating roll confirmation:', error);
      
      // Handle conflict error (409) specifically for FG sticker already generated
      if (error.response && error.response.status === 409) {
        throw new Error(error.response.data || 'FG Sticker has already been generated for this roll. Please scan next roll.');
      }
      
      throw error;
    }
  }

  // GET /api/rollconfirmation/weight-data - Get weight data from TCP client
  static async getWeightData(params: WeightDataRequestDto): Promise<WeightDataResponseDto> {
    try {
      const response = await rollConfirmationApi.getWeightData(params);
      return response.data;
    } catch (error) {
      console.error('Error fetching weight data:', error);
      throw error;
    }
  }
}