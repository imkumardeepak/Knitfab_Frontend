import { inspectionApi } from '@/lib/api-client';
import type { 
  InspectionRequestDto,
  InspectionResponseDto
} from '@/types/api-types';

export class InspectionService {
  // POST /api/inspection - Create a new inspection
  static async createInspection(data: InspectionRequestDto): Promise<InspectionResponseDto> {
    try {
      const response = await inspectionApi.createInspection(data);
      return response.data;
    } catch (error) {
      console.error('Error creating inspection:', error);
      throw error;
    }
  }

  // GET /api/inspection/{id} - Get inspection by ID
  static async getInspectionById(id: number): Promise<InspectionResponseDto> {
    try {
      const response = await inspectionApi.getInspection(id);
      return response.data;
    } catch (error) {
      console.error('Error fetching inspection by ID:', error);
      throw error;
    }
  }

  // GET /api/inspection/by-allot-id/{allotId} - Get inspections by AllotId
  static async getInspectionsByAllotId(allotId: string): Promise<InspectionResponseDto[]> {
    try {
      const response = await inspectionApi.getInspectionsByAllotId(allotId);
      return response.data;
    } catch (error) {
      console.error('Error fetching inspections by AllotId:', error);
      throw error;
    }
  }
}