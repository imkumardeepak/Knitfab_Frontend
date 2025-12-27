import apiClient from '@/lib/api-client';
import { productionAllotmentApi } from '@/lib/api-client';
import type { 
  CreateProductionAllotmentRequest,
  ProductionAllotmentResponseDto
} from '@/types/api-types';
import type { AxiosError } from 'axios';

export class ProductionAllotmentService {
  // GET /api/productionallotment - Get all production allotments
  static async getAllProductionAllotments(): Promise<ProductionAllotmentResponseDto[]> {
    try {
      const response = await productionAllotmentApi.getAllProductionAllotments();
      return response.data;
    } catch (error) {
      console.error('Error fetching production allotments:', error);
      throw error;
    }
  }

  // GET /api/productionallotment/next-serial-number - Get next serial number
  static async getNextSerialNumber(): Promise<string> {
    try {
      const response = await apiClient.get('/productionallotment/next-serial-number');
      return response.data;
    } catch (error) {
      console.error('Error fetching next serial number:', error);
      throw error;
    }
  }

  // GET /api/productionallotment/by-allot-id/{allotId} - Get production allotment by AllotmentId
  static async getProductionAllotmentByAllotId(allotId: string): Promise<ProductionAllotmentResponseDto> {
    try {
      const response = await productionAllotmentApi.getProductionAllotmentByAllotId(allotId);
      // Check if response has data property before accessing it
      if (response && response.data) {
        return response.data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error fetching production allotment by AllotmentId:', error);
      // Handle different types of errors
      if (error instanceof Error) {
        // Check if it's an Axios error with response
        const axiosError = error as AxiosError;
        if (axiosError.isAxiosError) {
          if (axiosError.response) {
            // Server responded with error status
            if (axiosError.response.status === 404) {
              throw new Error(`Production allotment with ID ${allotId} not found`);
            } else {
              throw new Error(`Server error: ${axiosError.response.status} - ${axiosError.response.statusText}`);
            }
          } else if (axiosError.request) {
            // Request was made but no response received
            throw new Error('Network error: Unable to reach server');
          } else {
            // Something else happened
            throw new Error(`Error: ${axiosError.message}`);
          }
        } else {
          // Regular Error object
          throw new Error(`Error: ${error.message}`);
        }
      } else {
        // Unknown error type
        throw new Error('Unknown error occurred');
      }
    }
  }

  // POST /api/productionallotment - Create a new production allotment
  static async createProductionAllotment(data: CreateProductionAllotmentRequest): Promise<{ success: boolean; allotmentId: string; productionAllotmentId: number }> {
    try {
      const response = await apiClient.post('/productionallotment', data);
      return response.data;
    } catch (error) {
      console.error('Error creating production allotment:', error);
      throw error;
    }
  }

  // PUT /api/productionallotment/{id}/hold - Toggle hold status
  static async toggleHold(id: number): Promise<ProductionAllotmentResponseDto> {
    try {
      const response = await productionAllotmentApi.toggleHold(id);
      return response.data;
    } catch (error) {
      console.error('Error toggling hold status:', error);
      throw error;
    }
  }

  // PUT /api/productionallotment/{id}/suspend - Suspend production planning
  static async suspendPlanning(id: number): Promise<ProductionAllotmentResponseDto> {
    try {
      const response = await productionAllotmentApi.suspendPlanning(id);
      return response.data;
    } catch (error) {
      console.error('Error suspending production planning:', error);
      throw error;
    }
  }

  // GET /api/productionallotment/{allotmentId}/status - Check if stickers have been generated or roll confirmations exist
  static async checkAllotmentStatus(allotmentId: string): Promise<{ hasRollConfirmation: boolean; hasStickersGenerated: boolean; hasRollAssignment: boolean }> {
    try {
      const response = await productionAllotmentApi.checkAllotmentStatus(allotmentId);
      return response.data;
    } catch (error) {
      console.error('Error checking allotment status:', error);
      throw error;
    }
  }
}