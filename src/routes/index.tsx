import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingBar from 'react-top-loading-bar';
import { useLoadingBar } from '../hooks/useLoadingBar';
import Layout from '../components/Layout';
import AuthLayout from '../components/AuthLayout';
import { ProtectedRoute, PublicRoute, PermissionRoute } from '../components/ProtectedRoute';
import { PAGE_NAMES } from '../constants/pages';
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
const MachineLoadDistributionEdit = lazy(() => import('../pages/ProductionAllotment/MachineLoadDistributionEdit'));

// Production Confirmation Page
const ProductionConfirmation = lazy(() => import('../pages/ProductionConfirmation'));
const RollInspection = lazy(() => import('../pages/RollInspection'));
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
const FinalFabricReport = lazy(() => import('../pages/Reports/FinalFabricReport'));

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
                <PermissionRoute pageName={PAGE_NAMES.DASHBOARD}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Dashboard />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <PermissionRoute pageName={PAGE_NAMES.DASHBOARD}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Dashboard />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="home"
              element={
                <PermissionRoute pageName={PAGE_NAMES.DASHBOARD}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Home />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            <Route
              path="roles"
              element={
                <PermissionRoute pageName={PAGE_NAMES.ROLE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <RoleManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="roles/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.ROLE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <RoleForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="roles/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.ROLE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <RoleForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="roles/:id/permissions"
              element={
                <PermissionRoute pageName={PAGE_NAMES.ROLE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <RolePermissions />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Machine Management Routes */}
            <Route
              path="machines"
              element={
                <PermissionRoute pageName={PAGE_NAMES.MACHINE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <MachineManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="machines/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.MACHINE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <MachineForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="machines/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.MACHINE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <MachineForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Fabric Structure Management Routes */}
            <Route
              path="fabric-structures"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FABRIC_STRUCTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FabricStructureManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="fabric-structures/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FABRIC_STRUCTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FabricStructureForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="fabric-structures/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FABRIC_STRUCTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FabricStructureForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Location Management Routes */}
            <Route
              path="locations"
              element={
                <PermissionRoute pageName={PAGE_NAMES.LOCATION_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <LocationManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="locations/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.LOCATION_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <LocationForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="locations/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.LOCATION_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <LocationForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Yarn Type Management Routes */}
            <Route
              path="yarn-types"
              element={
                <PermissionRoute pageName={PAGE_NAMES.YARNTYPE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <YarnTypeManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="yarn-types/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.YARNTYPE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <YarnTypeForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="yarn-types/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.YARNTYPE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <YarnTypeForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Tape Color Management Routes */}
            <Route
              path="tape-colors"
              element={
                <PermissionRoute pageName={PAGE_NAMES.TAPE_COLOR_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <TapeColorManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="tape-colors/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.TAPE_COLOR_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <TapeColorForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="tape-colors/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.TAPE_COLOR_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <TapeColorForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Shift Management Routes */}
            <Route
              path="shifts"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SHIFT_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ShiftManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="shifts/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SHIFT_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ShiftForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="shifts/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SHIFT_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ShiftForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Slit Line Management Routes */}
            <Route
              path="slit-lines"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SLIT_LINE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <SlitLineManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="slit-lines/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SLIT_LINE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <SlitLineForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="slit-lines/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SLIT_LINE_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <SlitLineForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Sales Order Management Routes */}
            <Route
              path="sales-orders"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SALES_ORDERS}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <SalesOrderManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="sales-orders/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SALES_ORDERS}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <CreateSalesOrder />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="sales-orders/:orderId/process-item/:itemId"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SALES_ORDERS}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <SalesOrderItemProcessing />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="sales-orders/:orderId/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.SALES_ORDERS}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <CreateSalesOrder />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* User Management Routes */}
            <Route
              path="users"
              element={
                <PermissionRoute pageName={PAGE_NAMES.USER_MANAGEMENT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <UserManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="users/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.USER_MANAGEMENT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <UserForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="users/:id"
              element={
                <PermissionRoute pageName={PAGE_NAMES.USER_MANAGEMENT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <UserDetails />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="users/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.USER_MANAGEMENT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <UserForm />
                  </LazyRoute>
                </PermissionRoute>
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
                <PermissionRoute pageName={PAGE_NAMES.CHAT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Chat />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Notifications Routes */}
            <Route
              path="notifications"
              element={
                <PermissionRoute pageName={PAGE_NAMES.NOTIFICATIONS}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Notifications />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {
              // Production Allotment Routes
              <Route
                path="production-allotment"
                element={
                  <PermissionRoute pageName={PAGE_NAMES.PRODUCTION_ALLOTMENT}>
                    <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                      <ProductionAllotment />
                    </LazyRoute>
                  </PermissionRoute>
                }
              />
            }
            <Route
              path="production-allotment/:allotmentId/edit-load"
              element={
                <PermissionRoute pageName={PAGE_NAMES.PRODUCTION_ALLOTMENT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <MachineLoadDistributionEdit />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Production Confirmation Route */}
            <Route
              path="confirmation"
              element={
                <PermissionRoute pageName={PAGE_NAMES.ROLL_CAPTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ProductionConfirmation />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Roll Inspection Route */}
            <Route
              path="rollInspection"
              element={
                <PermissionRoute pageName={PAGE_NAMES.ROLL_INSPECTION}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <RollInspection />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* FG Sticker Confirmation Route */}
            <Route
              path="fg-sticker-confirmation"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FG_ROLL_CAPTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FGStickerConfirmation />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* FG Sticker Reprint Route */}
            <Route
              path="fg-sticker-reprint"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FG_STICKER_REPRINT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FGStickerReprint />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Pick Roll Capture Route */}
            <Route
              path="pick-roll-capture"
              element={
                <PermissionRoute pageName={PAGE_NAMES.PICK_ROLL_CAPTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <PickRollCapture />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Load Capture Route */}
            <Route
              path="load-capture"
              element={
                <PermissionRoute pageName={PAGE_NAMES.LOAD_CAPTURE}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <LoadCapture />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Picking and Loading Route */}
            <Route
              path="picking-loading"
              element={
                <PermissionRoute pageName={PAGE_NAMES.PICKING_AND_LOADING}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <PickingAndLoading />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Quality Checking Route */}
            {/* Dispatch Planning Route */}
            <Route
              path="dispatch-planning"
              element={
                <PermissionRoute pageName={PAGE_NAMES.DISPATCH_PLANNING}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <DispatchPlanning />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Dispatch Details Route */}
            <Route
              path="dispatch-details"
              element={
                <PermissionRoute pageName={PAGE_NAMES.DISPATCH_PLANNING}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <DispatchDetails />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Loading Sheet Route */}
            <Route
              path="loading-sheets"
              element={
                <PermissionRoute pageName={PAGE_NAMES.DISPATCH_PLANNING}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <LoadingSheet />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            <Route
              path="quality-checking"
              element={
                <PermissionRoute pageName={PAGE_NAMES.QUALITY_CHECKING}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <QualityChecking />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Transport Management Routes */}
            <Route
              path="transports"
              element={
                <PermissionRoute pageName={PAGE_NAMES.TRANSPORT_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <TransportManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="transports/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.TRANSPORT_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <TransportForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="transports/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.TRANSPORT_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <TransportForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Courier Management Routes */}
            <Route
              path="couriers"
              element={
                <PermissionRoute pageName={PAGE_NAMES.COURIER_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <CourierManagement />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="couriers/create"
              element={
                <PermissionRoute pageName={PAGE_NAMES.COURIER_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <CourierForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />
            <Route
              path="couriers/:id/edit"
              element={
                <PermissionRoute pageName={PAGE_NAMES.COURIER_MASTER}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <CourierForm />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Reports Route */}
            <Route
              path="productionreport"
              element={
                <PermissionRoute pageName={PAGE_NAMES.PRODUCTION_REPORT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ProductionReports />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Fabric Stock Report Route */}
            <Route
              path="fabric-stock-report"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FABRIC_STOCK_REPORT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FabricStockReport />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Final Fabric Report Route */}
            <Route
              path="final-fabric-report"
              element={
                <PermissionRoute pageName={PAGE_NAMES.FINAL_FABRIC_REPORT}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <FinalFabricReport />
                  </LazyRoute>
                </PermissionRoute>
              }
            />

            {/* Invoice Route */}
            <Route
              path="invoice"
              element={
                <PermissionRoute pageName={PAGE_NAMES.INVOICE_GENERATION}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <Invoice />
                  </LazyRoute>
                </PermissionRoute>
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
                <PermissionRoute pageName={PAGE_NAMES.EXCEL_UPLOAD}>
                  <LazyRoute onLoadStart={handleStart} onLoadComplete={handleComplete}>
                    <ExcelUpload />
                  </LazyRoute>
                </PermissionRoute>
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