import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import EditorView from './pages/EditorView';

function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
