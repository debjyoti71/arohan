import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Classes from './pages/Classes';
import Users from './pages/Users';
import Fees from './pages/Fees';
import Finance from './pages/Finance';
import StudentProfile from './pages/StudentProfile';
import FeeCollection from './pages/FeeCollection';
import Configuration from './pages/Configuration';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  const router = createBrowserRouter([
    { 
      path: "/", 
      element: (
        <PublicRoute>
          <Login />
        </PublicRoute>
      ) 
    },
    { 
      path: "/dashboard", 
      element: (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/students", 
      element: (
        <ProtectedRoute>
          <Students />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/students/:id", 
      element: (
        <ProtectedRoute>
          <StudentProfile />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/staff", 
      element: (
        <ProtectedRoute>
          <Staff />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/classes", 
      element: (
        <ProtectedRoute>
          <Classes />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/users", 
      element: (
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/fees", 
      element: (
        <ProtectedRoute>
          <Fees />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/finance", 
      element: (
        <ProtectedRoute>
          <Finance />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/fee-collection", 
      element: (
        <ProtectedRoute>
          <FeeCollection />
        </ProtectedRoute>
      ) 
    },
    { 
      path: "/configuration", 
      element: (
        <ProtectedRoute>
          <Configuration />
        </ProtectedRoute>
      ) 
    },
  ])
  
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  )
}

export default App