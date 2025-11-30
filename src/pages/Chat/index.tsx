import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, MessageSquare, Users } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';

const Chat = () => {
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const { messages, sendGlobalMessage, joinGlobalChat, leaveGlobalChat, isConnected } = useChat();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Join global chat on component mount
  useEffect(() => {
    joinGlobalChat();

    return () => {
      leaveGlobalChat();
    };
  }, [joinGlobalChat, leaveGlobalChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && isConnected) {
      sendGlobalMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Chat</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Global Chat
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Chat</CardTitle>
            {!isConnected && (
              <div className="text-sm text-muted-foreground">Connecting to chat service...</div>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex h-[calc(100vh-250px)] flex-col">
              <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === String(user?.id) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 ${
                          msg.senderId === String(user?.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {msg.senderId === String(user?.id) ? 'You' : `User ${msg.senderId}`}
                          </span>
                          <span className="text-xs opacity-70">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!isConnected || !message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
