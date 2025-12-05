import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import type { ReactElement } from "react";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useAuth } from "../hooks/useAuth";
import "../styles/global.css";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";
import { HelmetProvider } from "react-helmet-async";

const Dashboard = lazy(() => import("../routes/Dashboard"));
const Outlets = lazy(() => import("../routes/Outlets"));
const AdminUsers = lazy(() => import("../routes/AdminUsers"));
const Bookings = lazy(() => import("../routes/Bookings"));
const Override = lazy(() => import("../routes/Override"));
const Login = lazy(() => import("../routes/Login"));
const SystemConfig = lazy(() => import("../routes/SystemConfig"));
const Landing = lazy(() => import("../routes/Landing"));
const TentangKami = lazy(() => import("../routes/TentangKami"));
const SyaratKetentuan = lazy(() => import("../routes/SyaratKetentuan"));
const Pricing = lazy(() => import("../routes/Pricing"));
const Transactions = lazy(() => import("../routes/Transactions"));
const TermsEditor = lazy(() => import("../routes/TermsEditor"));
const TermsVersions = lazy(() => import("../routes/TermsVersions"));
const Register = lazy(() => import("../routes/Register"));
const ForgotPassword = lazy(() => import("../routes/ForgotPassword"));
const VerifyEmail = lazy(() => import("../routes/VerifyEmail"));

function InnerApp() {
  useAuth(); // ensure signals ready
  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Memuat...</div>}>
        <Routes>
          <Route element={(<PublicLayout />) as unknown as ReactElement}>
            <Route
              path="/"
              element={(<Landing />) as unknown as ReactElement}
            />
            <Route
              path="/tentang-kami"
              element={(<TentangKami />) as unknown as ReactElement}
            />
            <Route
              path="/syarat-dan-ketentuan"
              element={(<SyaratKetentuan />) as unknown as ReactElement}
            />
          </Route>
          <Route element={(<AuthLayout />) as unknown as ReactElement}>
            <Route
              path="/login"
              element={(<Login />) as unknown as ReactElement}
            />
            <Route
              path="/register"
              element={(<Register />) as unknown as ReactElement}
            />
            <Route
              path="/forgot-password"
              element={(<ForgotPassword />) as unknown as ReactElement}
            />
            <Route
              path="/verify-email"
              element={(<VerifyEmail />) as unknown as ReactElement}
            />
          </Route>
          <Route
            element={
              (
                <ProtectedRoute>{<AdminLayout />}</ProtectedRoute>
              ) as unknown as ReactElement
            }
          >
            <Route
              path="/dashboard"
              element={(<Dashboard />) as unknown as ReactElement}
            />
            <Route
              path="/pricing"
              element={(<Pricing />) as unknown as ReactElement}
            />
            <Route
              path="/transactions"
              element={
                (
                  <ProtectedRoute roles={["user"]}>
                    {<Transactions />}
                  </ProtectedRoute>
                ) as unknown as ReactElement
              }
            />
            <Route
              path="/admin/terms"
              element={
                (
                  <ProtectedRoute roles={["admin", "super_admin"]}>
                    {<TermsEditor />}
                  </ProtectedRoute>
                ) as unknown as ReactElement
              }
            />
            <Route
              path="/admin/terms/versions"
              element={
                (
                  <ProtectedRoute roles={["admin", "super_admin"]}>
                    {<TermsVersions />}
                  </ProtectedRoute>
                ) as unknown as ReactElement
              }
            />
            <Route
              path="/outlets"
              element={(<Outlets />) as unknown as ReactElement}
            />
            <Route
              path="/admins"
              element={(<AdminUsers />) as unknown as ReactElement}
            />
            <Route
              path="/bookings"
              element={(<Bookings />) as unknown as ReactElement}
            />
            <Route
              path="/override"
              element={(<Override />) as unknown as ReactElement}
            />
            <Route
              path="/system-config"
              element={(<SystemConfig />) as unknown as ReactElement}
            />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <InnerApp />
      </BrowserRouter>
    </HelmetProvider>
  );
}

export { App as default };
