import React from "react";
import { useSelector } from "react-redux";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthPage from "./pages/AuthPage";
import Dcf from "./pages/Dcf";

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
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dcf />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
