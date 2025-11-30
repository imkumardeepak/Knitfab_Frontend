import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="h-screen bg-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      {/* Main Content */}
      <div className="relative h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 h-full flex items-center justify-center">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
