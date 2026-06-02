import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import Staff from "./pages/admin/Staff";
import MenuPage from "./pages/admin/Menu";
import AdminWarehousePage from "./pages/admin/Warehouse";
import KitchenOrdersPage from "./pages/kitchen/Orders";
import KitchenMenuPage from "./pages/kitchen/Menu";
import KitchenWarehousePage from "./pages/kitchen/Warehouse";
import ReportsPage from "./pages/admin/Report";
import TablesPage from "./pages/staff/Tables";
import TableOrder from "./pages/staff/TableOrder";
import TablePayment from "./pages/staff/TablePayment";
import StaffReservationsPage from "./pages/staff/Reservations";
import AdminTablesPage from "./pages/admin/Tables";
import SettingsPage from "./pages/admin/Settings";
import Layout from "./components/Layout";
import useAuth from "./hooks/useAuth";
import StaffCustomersPage from"./pages/staff/StaffCustomersPage";
import StaffSalesPage from "./pages/staff/StaffSalesPage";
import { canAccess, ROLES } from "./utils/permissions";
import AdminCustomersPage from "./pages/admin/Customers";

function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user, defaultPath } = useAuth();

  // Bỏ qua đăng nhập tuyệt đối nếu là chế độ QR tự phục vụ
  const isQR = window.location.search.includes("mode=qr") || window.location.pathname.includes("/orders/qr/");
  if (isQR) return children;

  if (!isAuthenticated) {
    sessionStorage.setItem("redirectAfterLogin", window.location.pathname + window.location.search);
    return <Navigate to="/login" />;
  }
  if (roles && !canAccess(user, roles)) return <Navigate to={defaultPath} />;

  return children;
}

function DefaultRedirect() {
  const { defaultPath } = useAuth();
  return <Navigate to={defaultPath} />;
}

function StaffOrderRedirect() {
  const { tableId } = useParams();
  return <Navigate to={`/staff/orders/${tableId}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Staff */}
        <Route path="/staff/tables" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><TablesPage /></Layout></PrivateRoute>} />
        <Route path="/staff/reservations" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><StaffReservationsPage /></Layout></PrivateRoute>} />
        <Route path="/staff/orders/:tableId" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><TableOrder /></Layout></PrivateRoute>} />
        <Route path="/staff/orders/qr/:token" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><TableOrder /></Layout></PrivateRoute>} />
        <Route path="/staff/payments/:tableId" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><TablePayment /></Layout></PrivateRoute>} />
        <Route path="/staff/tables/:tableId/order" element={<PrivateRoute roles={[ROLES.STAFF]}><StaffOrderRedirect /></PrivateRoute>} />
        <Route path="/staff/customers" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><StaffCustomersPage /></Layout></PrivateRoute>} />
        <Route path="/staff/sales" element={<PrivateRoute roles={[ROLES.STAFF]}><Layout><StaffSalesPage /></Layout></PrivateRoute>} />


        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute roles={[ROLES.ADMIN]}><Navigate to="/admin/dashboard" /></PrivateRoute>} />
        <Route path="/admin/dashboard" element={<PrivateRoute roles={[ROLES.ADMIN]}><Dashboard /></PrivateRoute>} />
        <Route path="/admin/staff" element={<PrivateRoute roles={[ROLES.ADMIN]}><Staff /></PrivateRoute>} />
        <Route path="/admin/menu" element={<PrivateRoute roles={[ROLES.ADMIN]}><MenuPage /></PrivateRoute>} />
        <Route path="/admin/warehouse" element={<PrivateRoute roles={[ROLES.ADMIN]}><AdminWarehousePage /></PrivateRoute>} />
        <Route path="/admin/tables" element={<PrivateRoute roles={[ROLES.ADMIN]}><AdminTablesPage /></PrivateRoute>} />
        <Route path="/admin/reports" element={<PrivateRoute roles={[ROLES.ADMIN]}><ReportsPage /></PrivateRoute>} />
        <Route path="/admin/settings" element={<PrivateRoute roles={[ROLES.ADMIN]}><SettingsPage /></PrivateRoute>} />
        <Route path="/admin/setting" element={<PrivateRoute roles={[ROLES.ADMIN]}><SettingsPage /></PrivateRoute>} />
        <Route path="/admin/kitchen" element={<PrivateRoute roles={[ROLES.ADMIN]}><Navigate to="/admin/warehouse" /></PrivateRoute>} />
        <Route path="/admin/customers" element={<PrivateRoute roles={[ROLES.ADMIN]}><AdminCustomersPage /></PrivateRoute>} />

        {/* Kitchen */}
        <Route path="/kitchen" element={<PrivateRoute roles={[ROLES.KITCHEN]}><Navigate to="/kitchen/orders" /></PrivateRoute>} />
        <Route path="/kitchen/orders" element={<PrivateRoute roles={[ROLES.KITCHEN]}><Layout><KitchenOrdersPage /></Layout></PrivateRoute>} />
        <Route path="/kitchen/menu" element={<PrivateRoute roles={[ROLES.KITCHEN]}><KitchenMenuPage /></PrivateRoute>} />
        <Route path="/kitchen/warehouse" element={<PrivateRoute roles={[ROLES.KITCHEN]}><KitchenWarehousePage /></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<PrivateRoute><DefaultRedirect /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
