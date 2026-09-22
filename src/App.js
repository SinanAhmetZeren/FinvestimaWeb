import React from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthPage from "./pages/AuthPage";
import Dcf from "./pages/Dcf";
import Extract from "./pages/Extract";
import Valuator from "./pages/Valuator";
import Landing from "./pages/Landing";
import Motor from "./pages/Motor";

function PrivateRoute({ children }) {
  const isLoggedIn = useSelector((state) => state.users.isLoggedIn);
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-center" autoClose={4000} />
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
          path="/extract"
          element={
            <PrivateRoute>
              <Extract />
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
      </Routes>
    </BrowserRouter>
  );
}
