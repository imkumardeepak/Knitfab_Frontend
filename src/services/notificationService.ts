import apiClient from '@/lib/api-client';

export class NotificationService {
  // Send notification to all users
  static async sendNotificationToAll(message: string): Promise<void> {
    try {
      await apiClient.post('/notification', { message });
    } catch (error) {
      console.error('Error sending notification to all users:', error);
      throw error;
    }
  }

  // Send notification to specific user
  static async sendNotificationToUser(userId: string, message: string): Promise<void> {
    try {
      await apiClient.post(`/notification/user/${userId}`, { message });
    } catch (error) {
      console.error(`Error sending notification to user ${userId}:`, error);
      throw error;
    }
  }
}