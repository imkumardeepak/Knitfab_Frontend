import { useState, useEffect, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../contexts/AuthContext';
import type { NotificationDto, ChatMessageDto } from '../types/api-types';

// Get base URL from environment variables
const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://localhost:7009';
  // Remove /api suffix if present
  return apiUrl.replace(/\/api$/, '');
};

export const useSignalR = () => {
  const [notificationConnection, setNotificationConnection] = useState<signalR.HubConnection | null>(null);
  const [chatConnection, setChatConnection] = useState<signalR.HubConnection | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    notifications: 'connecting' | 'connected' | 'disconnected' | 'error';
    chat: 'connecting' | 'connected' | 'disconnected' | 'error';
  }>({
    notifications: 'disconnected',
    chat: 'disconnected'
  });
  const { user, token } = useAuth();

  // Add a new notification
  const addNotification = useCallback((notification: NotificationDto) => {
    setNotifications(prev => [notification, ...prev]);
  }, []);

  // Add a new chat message
  const addMessage = useCallback((message: ChatMessageDto) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Send a chat message
  const sendMessage = useCallback((message: string, receiverId?: string) => {
    if (!chatConnection) {
      console.warn('Chat connection not established');
      return;
    }

    try {
      // Create a chat message object
      const chatMessage = {
        message,
        receiverId: receiverId || null,
        timestamp: new Date().toISOString()
      };

      // Send through SignalR
      chatConnection.invoke('SendMessage', JSON.stringify(chatMessage));
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }, [chatConnection]);

  // Join a group chat
  const joinGroup = useCallback((groupName: string) => {
    if (!chatConnection) {
      console.warn('Chat connection not established');
      return;
    }

    try {
      chatConnection.invoke('JoinGroup', groupName);
    } catch (error) {
      console.error('Error joining group:', error);
    }
  }, [chatConnection]);

  // Leave a group chat
  const leaveGroup = useCallback((groupName: string) => {
    if (!chatConnection) {
      console.warn('Chat connection not established');
      return;
    }

    try {
      chatConnection.invoke('LeaveGroup', groupName);
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  }, [chatConnection]);

  // Send message to a group
  const sendMessageToGroup = useCallback((groupName: string, message: string) => {
    if (!chatConnection) {
      console.warn('Chat connection not established');
      return;
    }

    try {
      chatConnection.invoke('SendMessageToGroup', groupName, message);
    } catch (error) {
      console.error('Error sending group message:', error);
    }
  }, [chatConnection]);

  // Mark a notification as read
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true } 
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []);

  // Get unread notification count
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  // Initialize SignalR connections
  useEffect(() => {
    if (!user?.id || !token) {
      return;
    }

    // Create notification hub connection
    const createNotificationConnection = async () => {
      try {
        setConnectionStatus(prev => ({ ...prev, notifications: 'connecting' }));
        
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${getBaseUrl()}/notificationhub`, {
            accessTokenFactory: () => token
          })
          .build();

        connection.on('ReceiveNotification', (message: string) => {
          try {
            // Parse the message as a notification
            const notification: NotificationDto = JSON.parse(message);
            addNotification(notification);
          } catch (error) {
            console.error('Error parsing notification message:', error);
            // Create a basic notification if parsing fails
            const basicNotification: NotificationDto = {
              id: Date.now().toString(),
              userId: user.id.toString(),
              title: 'Notification',
              message: message,
              type: 'info',
              timestamp: new Date().toISOString(),
              isRead: false
            };
            addNotification(basicNotification);
          }
        });

        connection.onclose((error?: Error) => {
          console.log('Notification hub disconnected:', error);
          setConnectionStatus(prev => ({ ...prev, notifications: 'disconnected' }));
        });

        setNotificationConnection(connection);
        await connection.start();
        setConnectionStatus(prev => ({ ...prev, notifications: 'connected' }));
        console.log('Notification hub connected');
      } catch (error) {
        console.error('Error connecting to notification hub:', error);
        setConnectionStatus(prev => ({ ...prev, notifications: 'error' }));
      }
    };

    // Create chat hub connection
    const createChatConnection = async () => {
      try {
        setConnectionStatus(prev => ({ ...prev, chat: 'connecting' }));
        
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${getBaseUrl()}/chathub`, {
            accessTokenFactory: () => token
          })
          .build();

        connection.on('ReceiveMessage', (message: string) => {
          try {
            // Parse the message as a chat message
            const chatMessage: ChatMessageDto = JSON.parse(message);
            addMessage(chatMessage);
          } catch (error) {
            console.error('Error parsing chat message:', error);
            // Create a basic message if parsing fails
            const basicMessage: ChatMessageDto = {
              id: Date.now().toString(),
              senderId: 'system',
              receiverId: 'global',
              message: message,
              timestamp: new Date().toISOString(),
              isRead: false
            };
            addMessage(basicMessage);
          }
        });

        connection.on('UserJoined', (userId: string, groupName: string) => {
          console.log(`User ${userId} joined group ${groupName}`);
        });

        connection.on('UserLeft', (userId: string, groupName: string) => {
          console.log(`User ${userId} left group ${groupName}`);
        });

        connection.on('ErrorMessage', (message: string) => {
          console.error('Chat hub error:', message);
        });

        connection.onclose((error?: Error) => {
          console.log('Chat hub disconnected:', error);
          setConnectionStatus(prev => ({ ...prev, chat: 'disconnected' }));
        });

        setChatConnection(connection);
        await connection.start();
        setConnectionStatus(prev => ({ ...prev, chat: 'connected' }));
        console.log('Chat hub connected');
      } catch (error) {
        console.error('Error connecting to chat hub:', error);
        setConnectionStatus(prev => ({ ...prev, chat: 'error' }));
      }
    };

    // Initialize connections
    createNotificationConnection();
    createChatConnection();

    // Clean up connections on unmount
    return () => {
      notificationConnection?.stop();
      chatConnection?.stop();
    };
  }, [user?.id, token, addNotification, addMessage]);

  return {
    notifications,
    messages,
    connectionStatus,
    sendMessage,
    joinGroup,
    leaveGroup,
    sendMessageToGroup,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationCount
  };
};