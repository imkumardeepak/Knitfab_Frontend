import { useCallback } from 'react';
import { useSignalR } from './useSignalR';
import type { NotificationDto } from '@/types/api-types';

export const useNotifications = () => {
  const {
    notifications,
    connectionStatus,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationCount
  } = useSignalR();

  // Mark a notification as read by ID
  const markAsRead = useCallback((id: string) => {
    markNotificationAsRead(id);
  }, [markNotificationAsRead]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    markAllNotificationsAsRead();
  }, [markAllNotificationsAsRead]);

  // Delete a notification (in a real app, this would make an API call)
  const deleteNotification = useCallback((id: string) => {
    // In a real implementation, you would call an API to delete the notification
    console.log(`Deleting notification ${id}`);
    // For now, we'll just filter it out locally
    // This would be replaced with actual API integration
  }, []);

  // Get unread notifications count
  const getUnreadCount = useCallback(() => {
    return unreadNotificationCount;
  }, [unreadNotificationCount]);

  return {
    notifications,
    connectionStatus: connectionStatus.notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount: unreadNotificationCount
  };
};