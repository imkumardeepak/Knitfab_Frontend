import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingBar from 'react-top-loading-bar';
import { useLoadingBar } from '../hooks/useLoadingBar';
import Layout from '../components/Layout';
import AuthLayout from '../components/AuthLayout';
import { ProtectedRoute, PublicRoute } from '../components/ProtectedRoute';
import { Loader } from '../components/loader';
import QualityChecking from '@/pages/QualityChecking';
import Chat from '@/pages/Chat';
import Notifications from '@/pages/Notifications';
import ProductionReports from '../pages/ProductionReport';

// Lazy-loaded pages
const Home = lazy(() => import('../pages/Home'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const PasswordReset = lazy(() => import('../pages/PasswordReset'));
const Invoice = lazy(() => import('../pages/Invoice'));
const ExcelUpload = lazy(() => import('../pages/ExcelUpload'));

// User Management Pages
const UserManagement = lazy(() => import('../pages/UserManagement'));
const UserForm = lazy(() => import('../pages/UserManagement/UserForm'));
const UserDetails = lazy(() => import('../pages/UserManagement/UserDetails'));

// User Profile Pages
const UserProfile = lazy(() => import('../pages/UserProfile'));
const ChangePassword = lazy(() => import('../pages/UserProfile/ChangePassword'));

// Role Management Pages
const RoleManagement = lazy(() => import('../pages/RoleManagement'));
const RoleForm = lazy(() => import('../pages/RoleManagement/RoleForm'));
const RolePermissions = lazy(() => import('../pages/RoleManagement/RolePermissions'));

// Machine Management Pages
const MachineManagement = lazy(() => import('../pages/MachineManagement'));
const MachineForm = lazy(() => import('../pages/MachineManagement/MachineForm'));

// Fabric Structure Management Pages
const FabricStructureManagement = lazy(() => import('../pages/FabricStructureManagement'));
const FabricStructureForm = lazy(
  () => import('../pages/FabricStructureManagement/FabricStructureForm')
);

// Location Management Pages
const LocationManagement = lazy(() => import('../pages/LocationManagement'));
const LocationForm = lazy(() => import('../pages/LocationManagement/LocationForm'));

// Yarn Type Management Pages
const YarnTypeManagement = lazy(() => import('../pages/YarnTypeManagement'));
const YarnTypeForm = lazy(() => import('../pages/YarnTypeManagement/YarnTypeForm'));

// Tape Color Management Pages
const TapeColorManagement = lazy(() => import('../pages/TapeColorManagement'));
const TapeColorForm = lazy(() => import('../pages/TapeColorManagement/TapeColorForm'));

// Shift Management Pages
const ShiftManagement = lazy(() => import('../pages/ShiftManagement'));
const ShiftForm = lazy(() => import('../pages/ShiftManagement/ShiftForm'));

// Sales Order Management Pages
const SalesOrderManagement = lazy(() => import('../pages/SalesOrderManagement'));
const CreateSalesOrder = lazy(() => import('../pages/SalesOrderManagement/CreateSalesOrder'));
const SalesOrderItemProcessing = lazy(
  () => import('../pages/SalesOrderManagement/SalesOrderItemProcessing')
);

// Production Allotment Page
const ProductionAllotment = lazy(() => import('../pages/ProductionAllotment'));

// Production Confirmation Page
const ProductionConfirmation = lazy(() => import('../pages/ProductionConfirmation'));
const RollInspection = lazy(() => import('../pages/RollInspection'));
const StorageCapture = lazy(() => import('../pages/StorageCapture'));
const FGStickerConfirmation = lazy(() => import('../pages/FGStickerConfirmation'));
const FGStickerReprint = lazy(() => import('../pages/FGStickerReprint'));
const PickRollCapture = lazy(() => import('../pages/PickRollCapture'));
const LoadCapture = lazy(() => import('../pages/LoadCapture'));
const PickingAndLoading = lazy(() => import('../pages/PickingAndLoading'));
const DispatchPlanning = lazy(() => import('../pages/DispatchPlanning'));
const DispatchDetails = lazy(() => import('../pages/DispatchDetails'));
const LoadingSheet = lazy(() => import('../pages/LoadingSheet'));


// Transport Management Pages
const TransportManagement = lazy(() => import('../pages/TransportManagement'));
const TransportForm = lazy(() => import('../pages/TransportManagement/TransportForm'));

// Courier Management Pages
const CourierManagement = lazy(() => import('../pages/CourierManagement'));
const CourierForm = lazy(() => import('../pages/CourierManagement/CourierForm'));

// Slit Line Management Pages
const SlitLineManagement = lazy(() => import('../pages/SlitLineManagement'));
const SlitLineForm = lazy(() => import('../pages/SlitLineManagement/SlitLineForm'));

// Reports Page
const Reports = lazy(() => import('../pages/ProductionReport'));
const FabricStockReport = lazy(() => import('../pages/FabricStockReport'));
const FabricPlanReport = lazy(() => import('../pages/FabricPlanReport'));

const Router = () => {
  const { ref, handleStart, handleComplete } = useLoadingBar();

  return (
    <>
      <LoadingBar color="#3b82f6" ref={ref} />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route
              path="login"
              element={
                <PublicRoute>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Login />
                  </LazyRoute>
                </PublicRoute>
              }
            />
          </Route>

          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Login />
                </LazyRoute>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Register />
                </LazyRoute>
              </PublicRoute>
            }
          />
          <Route
            path="/password-reset"
            element={
              <PublicRoute>
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <PasswordReset />
                </LazyRoute>
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Dashboard />
                </LazyRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Dashboard />
                </LazyRoute>
              }
            />
            <Route
              path="home"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Home />
                </LazyRoute>
              }
            />

            <Route
              path="roles"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <RoleManagement />
                </LazyRoute>
              }
            />
            <Route
              path="roles/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <RoleForm />
                </LazyRoute>
              }
            />
            <Route
              path="roles/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <RoleForm />
                </LazyRoute>
              }
            />
            <Route
              path="roles/:id/permissions"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <RolePermissions />
                </LazyRoute>
              }
            />

            {/* Machine Management Routes */}
            <Route
              path="machines"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <MachineManagement />
                </LazyRoute>
              }
            />
            <Route
              path="machines/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <MachineForm />
                </LazyRoute>
              }
            />
            <Route
              path="machines/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <MachineForm />
                </LazyRoute>
              }
            />

            {/* Fabric Structure Management Routes */}
            <Route
              path="fabric-structures"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FabricStructureManagement />
                </LazyRoute>
              }
            />
            <Route
              path="fabric-structures/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FabricStructureForm />
                </LazyRoute>
              }
            />
            <Route
              path="fabric-structures/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FabricStructureForm />
                </LazyRoute>
              }
            />

            {/* Location Management Routes */}
            <Route
              path="locations"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <LocationManagement />
                </LazyRoute>
              }
            />
            <Route
              path="locations/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <LocationForm />
                </LazyRoute>
              }
            />
            <Route
              path="locations/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <LocationForm />
                </LazyRoute>
              }
            />

            {/* Yarn Type Management Routes */}
            <Route
              path="yarn-types"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <YarnTypeManagement />
                </LazyRoute>
              }
            />
            <Route
              path="yarn-types/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <YarnTypeForm />
                </LazyRoute>
              }
            />
            <Route
              path="yarn-types/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <YarnTypeForm />
                </LazyRoute>
              }
            />

            {/* Tape Color Management Routes */}
            <Route
              path="tape-colors"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <TapeColorManagement />
                </LazyRoute>
              }
            />
            <Route
              path="tape-colors/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <TapeColorForm />
                </LazyRoute>
              }
            />
            <Route
              path="tape-colors/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <TapeColorForm />
                </LazyRoute>
              }
            />

            {/* Shift Management Routes */}
            <Route
              path="shifts"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ShiftManagement />
                </LazyRoute>
              }
            />
            <Route
              path="shifts/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ShiftForm />
                </LazyRoute>
              }
            />
            <Route
              path="shifts/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ShiftForm />
                </LazyRoute>
              }
            />

            {/* Slit Line Management Routes */}
            <Route
              path="slit-lines"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <SlitLineManagement />
                </LazyRoute>
              }
            />
            <Route
              path="slit-lines/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <SlitLineForm />
                </LazyRoute>
              }
            />
            <Route
              path="slit-lines/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <SlitLineForm />
                </LazyRoute>
              }
            />

            {/* Sales Order Management Routes */}
            <Route
              path="sales-orders"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <SalesOrderManagement />
                </LazyRoute>
              }
            />
            <Route
              path="sales-orders/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <CreateSalesOrder />
                </LazyRoute>
              }
            />
            <Route
              path="sales-orders/:orderId/process-item/:itemId"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <SalesOrderItemProcessing />
                </LazyRoute>
              }
            />
            <Route
              path="sales-orders/:orderId/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <CreateSalesOrder />
                </LazyRoute>
              }
            />

            {/* User Management Routes */}
            <Route
              path="users"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <UserManagement />
                </LazyRoute>
              }
            />
            <Route
              path="users/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <UserForm />
                </LazyRoute>
              }
            />
            <Route
              path="users/:id"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <UserDetails />
                </LazyRoute>
              }
            />
            <Route
              path="users/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <UserForm />
                </LazyRoute>
              }
            />

            {/* User Profile Routes */}
            <Route
              path="profile"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <UserProfile />
                </LazyRoute>
              }
            />
            <Route
              path="profile/change-password"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ChangePassword />
                </LazyRoute>
              }
            />

            {/* Chat Routes */}
            <Route
              path="chat"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Chat />
                </LazyRoute>
              }
            />

            {/* Notifications Routes */}
            <Route
              path="notifications"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Notifications />
                </LazyRoute>
              }
            />

            {
              // Production Allotment Routes
              <Route
                path="production-allotment"
                element={
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ProductionAllotment />
                  </LazyRoute>
                }
              />
              /* Production Allotment Routes - Removed as it's no longer needed */
            }

            {/* Production Confirmation Route */}
            <Route
              path="confirmation"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ProductionConfirmation />
                </LazyRoute>
              }
            />

            {/* Roll Inspection Route */}
            <Route
              path="rollInspection"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <RollInspection />
                </LazyRoute>
              }
            />

            {/* Storage Capture Route */}
            <Route
              path="storage-capture"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <StorageCapture />
                </LazyRoute>
              }
            />

            {/* FG Sticker Confirmation Route */}
            <Route
              path="fg-sticker-confirmation"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FGStickerConfirmation />
                </LazyRoute>
              }
            />

            {/* FG Sticker Reprint Route */}
            <Route
              path="fg-sticker-reprint"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FGStickerReprint />
                </LazyRoute>
              }
            />
            
            {/* Pick Roll Capture Route */}
            <Route
              path="pick-roll-capture"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <PickRollCapture />
                </LazyRoute>
              }
            />
            
            {/* Load Capture Route */}
            <Route
              path="load-capture"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <LoadCapture />
                </LazyRoute>
              }
            />
            
            {/* Picking and Loading Route */}
            <Route
              path="picking-loading"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <PickingAndLoading />
                </LazyRoute>
              }
            />

            {/* Quality Checking Route */}
            {/* Dispatch Planning Route */}
            <Route
              path="dispatch-planning"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <DispatchPlanning />
                </LazyRoute>
              }
            />
            
            {/* Dispatch Details Route */}
            <Route
              path="dispatch-details"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <DispatchDetails />
                </LazyRoute>
              }
            />
            
            {/* Loading Sheet Route */}
            <Route
              path="loading-sheets"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <LoadingSheet />
                </LazyRoute>
              }
            />
            
            <Route
              path="quality-checking"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <QualityChecking />
                </LazyRoute>
              }
            />

            {/* Transport Management Routes */}
            <Route
              path="transports"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <TransportManagement />
                </LazyRoute>
              }
            />
            <Route
              path="transports/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <TransportForm />
                </LazyRoute>
              }
            />
            <Route
              path="transports/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <TransportForm />
                </LazyRoute>
              }
            />

            {/* Courier Management Routes */}
            <Route
              path="couriers"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <CourierManagement />
                </LazyRoute>
              }
            />
            <Route
              path="couriers/create"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <CourierForm />
                </LazyRoute>
              }
            />
            <Route
              path="couriers/:id/edit"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <CourierForm />
                </LazyRoute>
              }
            />

            {/* Reports Route */}
            <Route
              path="productionreport"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ProductionReports />
                </LazyRoute>
              }
            />
            
            {/* Fabric Stock Report Route */}
            <Route
              path="fabric-stock-report"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FabricStockReport />
                </LazyRoute>
              }
            />

            {/* Fabric Plan Report Route */}
            <Route
              path="fabric-plan-report"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <FabricPlanReport />
                </LazyRoute>
              }
            />

            {/* Invoice Route */}
            <Route
              path="invoice"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <Invoice />
                </LazyRoute>
              }
            />

            {/* Gate Pass Route - REMOVED as functionality is now integrated into Invoice page */}
            {/* <Route
              path="gate-pass"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <GatePass />
                </LazyRoute>
              }
            /> */}
           {/* Excel Upload Route */}
            <Route
              path="excel-upload"
              element={
                <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                  <ExcelUpload />
                </LazyRoute>
              }
            />
          </Route>
             
        </Routes>
      </Suspense>
    </>
  );
};

// Helper component for loading bar integration
const LazyRoute = ({
  children,
  onLoadStart,
  onLoadComplete,
}: {
  children: React.ReactNode;
  onLoadStart: () => void;
  onLoadComplete: () => void;
}) => {
  useEffect(() => {
    onLoadStart();
    const timer = setTimeout(() => onLoadComplete(), 500);
    return () => clearTimeout(timer);
  }, [onLoadStart, onLoadComplete]);

  return <>{children}</>;
};

export default Router;