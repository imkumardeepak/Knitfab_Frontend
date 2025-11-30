import React, { useState } from 'react';
import { useSignalR } from '@/hooks';
import { NotificationService } from '@/services/notificationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const SignalRExample: React.FC = () => {
  const { notifications, messages, connectionStatus, sendMessage, unreadNotificationCount } =
    useSignalR();

  const [messageInput, setMessageInput] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput, recipientId || undefined);
      setMessageInput('');
    }
  };

  const handleSendNotification = async () => {
    if (notificationMessage.trim()) {
      try {
        await NotificationService.sendNotificationToAll(notificationMessage);
        setNotificationMessage('');
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">SignalR Implementation Example</h2>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium">Notifications Hub:</p>
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
              <p className="font-medium">Chat Hub:</p>
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
        </CardContent>
      </Card>

      {/* Send Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Enter notification message"
              rows={3}
            />
            <Button onClick={handleSendNotification} disabled={!notificationMessage.trim()}>
              Send Notification to All Users
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Send Chat Message */}
      <Card>
        <CardHeader>
          <CardTitle>Send Chat Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Recipient ID (optional for private message)"
            />
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Enter chat message"
              rows={3}
            />
            <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
              Send Chat Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm">
              {unreadNotificationCount} unread notifications
            </span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications received</p>
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

      {/* Chat Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Chat Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500">No chat messages received</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="p-3 bg-white rounded border">
                  <div className="flex justify-between">
                    <span className="font-medium">{message.senderId}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1">{message.message}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignalRExample;
