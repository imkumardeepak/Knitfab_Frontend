import { BrowserRouter } from 'react-router-dom';
import Router from './routes';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import ErrorBoundary from './components/ErrorBoundary';
import DevHelper from './components/DevHelper';

function App() {
  return (
    <ErrorBoundary>
      <DevHelper />
      <BrowserRouter>
        <Router />
        <PWAInstallPrompt />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
