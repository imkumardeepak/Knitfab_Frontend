import { productionAllotmentApi } from '@/lib/api-client';
import type { AxiosResponse } from 'axios';

export class FGStickerService {
  // POST /api/productionallotment/fgsticker/{id} - Print FG Roll sticker
  static async printFGRollSticker(id: number): Promise<{ message: string; success: boolean }> {
    try {
      const response: AxiosResponse<{ message: string }> = await productionAllotmentApi.printFGRollSticker(id);
      
      // Check if the response is successful
      if (response.status >= 200 && response.status < 300) {
        return {
          message: response.data.message || 'FG Roll sticker printed successfully',
          success: true
        };
      } else {
        return {
          message: response.data.message || 'Failed to print FG Roll sticker',
          success: false
        };
      }
    } catch (error: any) {
      console.error('Error printing FG Roll sticker:', error);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        return {
          message: error.response.data?.message || `Server error: ${error.response.status}`,
          success: false
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          message: 'Network error: Unable to connect to server',
          success: false
        };
      } else {
        // Something else happened
        return {
          message: error.message || 'Unknown error occurred while printing FG Roll sticker',
          success: false
        };
      }
    }
  }
}