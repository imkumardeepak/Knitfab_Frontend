import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const TokenRefreshTest: React.FC = () => {
  const { refreshToken, token } = useAuth();

  const handleRefresh = async () => {
    try {
      const success = await refreshToken();
      if (success) {
        console.log('Token refreshed successfully');
      } else {
        console.log('Token refresh failed');
      }
    } catch (error) {
      console.error('Error during token refresh:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Token Refresh Test</h3>
      <p className="mb-2">Current token: {token ? 'Available' : 'Not available'}</p>
      <button
        onClick={handleRefresh}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Refresh Token
      </button>
    </div>
  );
};

export default TokenRefreshTest;
