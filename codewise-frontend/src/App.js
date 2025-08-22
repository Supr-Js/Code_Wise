import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import EditorView from "./pages/EditorView";

function RequireAuth({ children }) {
  const token = localStorage.getItem("token");
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

function OAuthRedirect() {
  // /oauth2/redirect?token=... 를 처리
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem("token", token);
    return <Navigate to="/editor" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/oauth2/redirect" element={<OAuthRedirect />} />
      <Route
        path="/editor"
        element={
          <RequireAuth>
            <EditorView />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
