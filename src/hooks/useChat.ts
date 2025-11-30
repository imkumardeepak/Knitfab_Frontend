import { useCallback } from 'react';
import { useSignalR } from './useSignalR';
import type { ChatMessageDto } from '@/types/api-types';

export const useChat = () => {
  const {
    messages,
    connectionStatus,
    sendMessage,
    joinGroup,
    leaveGroup,
    sendMessageToGroup
  } = useSignalR();

  // Send a message to a specific user
  const sendPrivateMessage = useCallback((message: string, receiverId: string) => {
    sendMessage(message, receiverId);
  }, [sendMessage]);

  // Send a message to the global chat group
  const sendGlobalMessage = useCallback((message: string) => {
    sendMessageToGroup('GlobalChat', message);
  }, [sendMessageToGroup]);

  // Join the global chat group
  const joinGlobalChat = useCallback(() => {
    joinGroup('GlobalChat');
  }, [joinGroup]);

  // Leave the global chat group
  const leaveGlobalChat = useCallback(() => {
    leaveGroup('GlobalChat');
  }, [leaveGroup]);

  return {
    messages,
    connectionStatus: connectionStatus.chat,
    sendPrivateMessage,
    sendGlobalMessage,
    joinGlobalChat,
    leaveGlobalChat,
    isConnected: connectionStatus.chat === 'connected'
  };
};