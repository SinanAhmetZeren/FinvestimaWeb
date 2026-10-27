import React from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthPage from "./pages/AuthPage";
import Dcf from "./pages/Dcf";
import Valuator from "./pages/Valuator";
import ValuatorPro from "./pages/ValuatorPro";
import ValuatorProAdmin from "./pages/ValuatorProAdmin";
import Tekduzen from "./pages/Tekduzen";
import Landing from "./pages/Landing";
import Motor from "./pages/Motor";
import TopBar from "./components/TopBar";

function PrivateRoute({ children }) {
  const isLoggedIn = useSelector((state) => state.users.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const isLoggedIn = useSelector((state) => state.users.isLoggedIn);
  const isAdmin = useSelector((state) => state.users.isAdmin);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/valuator-pro" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-center" autoClose={4000} />
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Landing />} />
        <Route
          path="/engine"
          element={
            <PrivateRoute>
              <Motor />
            </PrivateRoute>
          }
        />
        <Route
          path="/dcf"
          element={
            <PrivateRoute>
              <Dcf />
            </PrivateRoute>
          }
        />
        <Route
          path="/valuator"
          element={
            <PrivateRoute>
              <Valuator />
            </PrivateRoute>
          }
        />
        <Route
          path="/valuator-pro"
          element={
            <PrivateRoute>
              <ValuatorPro />
            </PrivateRoute>
          }
        />
        <Route
          path="/valuator-pro-admin"
          element={
            <AdminRoute>
              <ValuatorProAdmin />
            </AdminRoute>
          }
        />
        <Route
          path="/tekduzen"
          element={
            <PrivateRoute>
              <Tekduzen />
            </PrivateRoute>
          }
        />
      </Routes>
      </div>
      </div>
    </BrowserRouter>
  );
}
