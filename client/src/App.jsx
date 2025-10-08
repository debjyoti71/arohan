import React from 'react'
import Login from './pages/Login';
import Dashboard from './pages/dashboard';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
function App() {
  const router = createBrowserRouter([
    { path: "/", element: <Login /> },
    { path: "/dashboard", element: <Dashboard /> },
  ])
  return (
    <RouterProvider router={router} />
  )
}

export default App