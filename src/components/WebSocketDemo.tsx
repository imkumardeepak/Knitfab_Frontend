import React, { useState } from 'react';
import { useSignalR } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const WebSocketDemo: React.FC = () => {
  const {
    notifications,
    messages,
    connectionStatus,
    sendMessage,
    markNotificationAsRead,
    unreadNotificationCount,
  } = useSignalR();

  const [messageInput, setMessageInput] = useState('');
  const [recipientId, setRecipientId] = useState('');

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput, recipientId || undefined);
      setMessageInput('');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">SignalR Demo</h2>

      {/* Connection Status */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Notifications:</p>
            <span
              className={`px-2 py-1 rounded ${
                connectionStatus.notifications === 'connected'
                  ? 'bg-green-200'
                  : connectionStatus.notifications === 'connecting'
                    ? 'bg-yellow-200'
                    : connectionStatus.notifications === 'error'
                      ? 'bg-red-200'
                      : 'bg-gray-200'
              }`}
            >
              {connectionStatus.notifications}
            </span>
          </div>
          <div>
            <p className="font-medium">Chat:</p>
            <span
              className={`px-2 py-1 rounded ${
                connectionStatus.chat === 'connected'
                  ? 'bg-green-200'
                  : connectionStatus.chat === 'connecting'
                    ? 'bg-yellow-200'
                    : connectionStatus.chat === 'error'
                      ? 'bg-red-200'
                      : 'bg-gray-200'
              }`}
            >
              {connectionStatus.chat}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm">
              {unreadNotificationCount} unread
            </span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded border ${
                    notification.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    {!notification.isRead && (
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Message Input */}
          <div className="flex space-x-2 mb-4">
            <Input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Recipient ID (optional)"
            />
            <Input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage}>Send</Button>
          </div>

          {/* Messages */}
          <ScrollArea className="space-y-2 max-h-60">
            {messages.length === 0 ? (
              <p className="text-gray-500">No messages</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="p-3 bg-white rounded border mb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {message.senderId === 'me' ? 'You' : `User ${message.senderId}`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1">{message.message}</p>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSocketDemo;
