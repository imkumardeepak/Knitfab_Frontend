import type { 
  FinalFabricReportDto,
  SalesOrderItemReportDto, 
  ProductionAllotmentReportDto 
} from '../../types/api-types';
import { reportApi } from '../../lib/api-client';

export class FinalFabricReportService {
  // GET /api/report/final-fabric-report - Get all final fabric reports
  static async getAllFinalFabricReports(): Promise<FinalFabricReportDto[]> {
    try {
      const response = await reportApi.getFinalFabricReport();
      // Axios response has data property containing the actual response
      return response.data;
    } catch (error) {
      console.error('Error fetching all final fabric reports:', error);
      throw error;
    }
  }

  // GET /api/report/final-fabric-report/{salesOrderId} - Get final fabric report by sales order ID
  static async getFinalFabricReportBySalesOrder(salesOrderId: number): Promise<FinalFabricReportDto> {
    try {
      const response = await reportApi.getFinalFabricReportBySalesOrder(salesOrderId);
      // Axios response has data property containing the actual response
      return response.data;
    } catch (error) {
      console.error(`Error fetching final fabric report for sales order ${salesOrderId}:`, error);
      throw error;
    }
  }
}