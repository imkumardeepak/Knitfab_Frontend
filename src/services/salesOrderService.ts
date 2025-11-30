import apiClient from '@/lib/api-client';
import { salesOrderApi } from '@/lib/api-client';
import type { SalesOrderDto } from '@/types/api-types';

export class SalesOrderService {
  // GET /api/SalesOrder/{id} - Get sales order by ID
  static async getSalesOrderById(id: number): Promise<SalesOrderDto> {
    try {
      const response = await apiClient.get(`/SalesOrder/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales order by ID:', error);
      throw error;
    }
  }

  // GET /api/SalesOrder - Get all sales orders
  static async getAllSalesOrders(): Promise<SalesOrderDto[]> {
    try {
      const response = await salesOrderApi.getAllSalesOrders();
      return response.data;
    } catch (error) {
      console.error('Error fetching all sales orders:', error);
      throw error;
    }
  }

  // PUT /api/salesorder/{salesOrderId}/items/{salesOrderItemId}/process - Mark a sales order item as processed
  static async markSalesOrderItemAsProcessed(salesOrderId: number, salesOrderItemId: number): Promise<void> {
    try {
      await apiClient.put(`/salesorder/${salesOrderId}/items/${salesOrderItemId}/process`);
    } catch (error) {
      console.error('Error marking sales order item as processed:', error);
      throw error;
    }
  }
}