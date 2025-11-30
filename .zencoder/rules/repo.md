---
description: Repository Information Overview
alwaysApply: true
---

# Avyaan Knitfab Frontend Information

## Summary
A modern React-based frontend application for Avyaan Knitfab, a knitwear and fabrics business. The application is built as a Progressive Web App (PWA) with offline capabilities, responsive design, and modern UI components.

## Structure
- **src/**: Main source code directory
  - **assets/**: Static assets like images and icons
  - **components/**: Reusable UI components including shadcn/ui components
  - **contexts/**: React context providers (Auth, Theme)
  - **hooks/**: Custom React hooks
  - **lib/**: Utility libraries and API client setup
  - **pages/**: Main application pages
  - **routes/**: Application routing configuration
  - **schemas/**: Form validation schemas
  - **services/**: API service functions
  - **styles/**: Global CSS and styling utilities
  - **utils/**: Helper functions and utilities
- **public/**: Static files served directly
- **dist/**: Production build output

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: TypeScript ~5.8.3
**Build System**: Vite 7.1.2
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- React 19.1.1 with React Router 7.8.0
- TanStack React Query 5.85.1 for data fetching
- Axios 1.11.0 for API requests
- Radix UI components for accessible UI
- Tailwind CSS 3.4.17 for styling
- Zod 4.0.17 and Yup 1.7.0 for schema validation
- React Hook Form 7.62.0 for form handling
- DND Kit for drag and drop functionality

**Development Dependencies**:
- ESLint 9.33.0 for code linting
- Prettier 3.6.2 for code formatting
- Vite Plugin PWA 1.0.2 for PWA support
- TypeScript ESLint plugins for type checking

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Clean production build
npm run build:clean

# Preview production build
npm run preview
```

## PWA Configuration
**Plugin**: vite-plugin-pwa
**Features**:
- Offline support with workbox
- Installable application
- Asset caching
- Auto-update functionality

## Application Structure
**Main Entry Point**: src/main.tsx
**Routing**: React Router v7 with lazy-loaded routes
**State Management**: React Context API and TanStack Query
**UI Components**: Combination of custom components and Radix UI primitives
**Authentication**: Custom auth provider with protected routes
**Theming**: Dark/light mode support with CSS variables

## API Integration
**Client**: Axios with base configuration
**Caching**: TanStack Query with 5-minute stale time
**Base URL**: Configurable via environment variables