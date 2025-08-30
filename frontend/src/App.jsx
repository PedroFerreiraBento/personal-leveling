import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

// Components
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Activities from "./components/Activities";
import Categories from "./components/Categories";
import Tasks from "./components/Tasks";
import Notes from "./components/Notes";
import { Layout } from "./components/layout";

// Context
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route
              path="/login"
              element={
                <Layout
                  showHeader={false}
                  showSidebar={false}
                  showFooter={false}
                  fullBleed
                  centered
                >
                  <Login />
                </Layout>
              }
            />

            {/* Rota pai com Layout padrão + proteção */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/categories" element={<Categories />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Catch-all: redirect unknown paths to main page */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

export default App;
