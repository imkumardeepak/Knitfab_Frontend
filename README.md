# Avyaan Knitfab Frontend

This is the frontend application for the Avyaan Knitfab system, built with React, TypeScript, and Vite.

## Features

- User authentication and role-based access control
- Real-time notifications via SignalR
- Real-time chat functionality via SignalR
- Dashboard with analytics
- User and role management
- Machine management

## SignalR Implementation

This application implements real-time communication using SignalR for both notifications and chat functionality.

### Available Hooks

1. `useSignalR` - Combined hook for both notifications and chat

### Usage Examples

#### Using the SignalR Hook

```tsx
import { useSignalR } from '@/hooks';

const MyComponent = () => {
  const { 
    notifications, 
    messages, 
    connectionStatus, 
    sendMessage, 
    markNotificationAsRead,
    unreadNotificationCount
  } = useSignalR();
  
  return (
    <div>
      <p>Unread notifications: {unreadNotificationCount}</p>
      <div>
        {notifications.map(notification => (
          <div key={notification.id}>
            <h3>{notification.title}</h3>
            <p>{notification.message}</p>
            <button onClick={() => markNotificationAsRead(notification.id)}>
              Mark as read
            </button>
          </div>
        ))}
      </div>
      <div>
        {messages.map(message => (
          <div key={message.id}>
            <p>{message.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Environment Configuration

To use SignalR functionality, configure the following environment variables in your `.env.local` file:

```env
# API Configuration
VITE_API_URL=https://your-domain.com/api
```

The SignalR connections will be established to:
- Notification Hub: `https://your-domain.com/notificationhub`
- Chat Hub: `https://your-domain.com/chathub`

If `VITE_API_URL` is not set, the application will default to `http://localhost:5000`.

## Development

### Prerequisites

- Node.js (version compatible with package.json)
- npm or yarn

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Linting

```bash
# Check for linting issues
npm run lint:check

# Fix linting issues
npm run lint
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and API clients
├── pages/          # Page components
├── routes/         # Routing configuration
├── schemas/        # Form validation schemas
├── styles/         # CSS styles
├── types/          # TypeScript types
└── App.tsx         # Main application component
```

## Technology Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API, React Query
- **Routing**: React Router DOM
- **UI Library**: Radix UI, Tailwind CSS
- **Form Handling**: React Hook Form, Zod
- **HTTP Client**: Axios
- **Real-time Communication**: SignalR