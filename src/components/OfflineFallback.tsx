import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineFallback: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-muted">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl">You're Offline</CardTitle>
            <CardDescription className="mt-2">
              It looks like you've lost your internet connection. Some features may not be available.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Don't worry! You can still:</p>
            <ul className="mt-2 space-y-1 text-left">
              <li>• View previously loaded content</li>
              <li>• Access cached data</li>
              <li>• Use basic app features</li>
            </ul>
          </div>
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
