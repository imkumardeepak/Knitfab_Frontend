import apiClient from '@/lib/api-client';
import type {
  SalesOrderWebResponseDto,
  CreateSalesOrderWebRequestDto,
  UpdateSalesOrderWebRequestDto
} from '@/types/api-types';

export class SalesOrderWebService {
  // GET /api/SalesOrderWeb/next-serial-number - Get next serial number
  static async getNextSerialNumber(): Promise<string> {
    try {
      const response = await apiClient.get<string>('/SalesOrderWeb/next-serial-number');
      return response.data;
    } catch (error) {
      console.error('Error fetching next serial number:', error);
      throw error;
    }
  }

  // GET /api/SalesOrderWeb/voucher-numbers - Get all voucher numbers
  static async getVoucherNumbers(): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>('/SalesOrderWeb/voucher-numbers');
      return response.data;
    } catch (error) {
      console.error('Error fetching voucher numbers:', error);
      throw error;
    }
  }

  // GET /api/SalesOrderWeb/{id} - Get sales order web by ID
  static async getSalesOrderWebById(id: number): Promise<SalesOrderWebResponseDto> {
    try {
      const response = await apiClient.get<SalesOrderWebResponseDto>(`/SalesOrderWeb/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales order web by ID:', error);
      throw error;
    }
  }

  // GET /api/SalesOrderWeb - Get all sales orders web
  static async getAllSalesOrdersWeb(): Promise<SalesOrderWebResponseDto[]> {
    try {
      const response = await apiClient.get<SalesOrderWebResponseDto[]>('/SalesOrderWeb');
      return response.data;
    } catch (error) {
      console.error('Error fetching all sales orders web:', error);
      throw error;
    }
  }

  // POST /api/SalesOrderWeb - Create a new sales order web
  static async createSalesOrderWeb(createDto: CreateSalesOrderWebRequestDto): Promise<SalesOrderWebResponseDto> {
    try {
      const response = await apiClient.post<SalesOrderWebResponseDto>('/SalesOrderWeb', createDto);
      return response.data;
    } catch (error) {
      console.error('Error creating sales order web:', error);
      throw error;
    }
  }

  // PUT /api/SalesOrderWeb/{id} - Update a sales order web
  static async updateSalesOrderWeb(id: number, updateDto: UpdateSalesOrderWebRequestDto): Promise<SalesOrderWebResponseDto> {
    try {
      const response = await apiClient.put<SalesOrderWebResponseDto>(`/SalesOrderWeb/${id}`, updateDto);
      console.log(response);
      return response.data;
    } catch (error) {
      console.error('Error updating sales order web:', error);
      throw error;
    }
  }

  // DELETE /api/SalesOrderWeb/{id} - Delete a sales order web
  static async deleteSalesOrderWeb(id: number): Promise<void> {
    try {
      await apiClient.delete(`/SalesOrderWeb/${id}`);
    } catch (error) {
      console.error('Error deleting sales order web:', error);
      throw error;
    }
  }

  // PUT /api/SalesOrderWeb/{salesOrderWebId}/items/{salesOrderItemWebId}/process - Mark a sales order web item as processed
  static async markSalesOrderItemWebAsProcessed(salesOrderWebId: number, salesOrderItemWebId: number): Promise<SalesOrderWebResponseDto> {
    try {
      const response = await apiClient.put<SalesOrderWebResponseDto>(`/SalesOrderWeb/${salesOrderWebId}/items/${salesOrderItemWebId}/process`);
      return response.data;
    } catch (error) {
      console.error('Error marking sales order web item as processed:', error);
      throw error;
    }
  }
}