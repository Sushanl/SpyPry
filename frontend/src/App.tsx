import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

/**
 * Main App Component with Routing
 * 
 * This component sets up all the routes for your application.
 * 
 * Routes:
 * - "/" - Landing page (home page)
 * - "/dashboard" - Dashboard page (protected, requires login)
 */
function App() {
  return (
    <Routes>
      {/* Route for the landing/home page */}
      <Route path="/" element={<Landing />} />
      
      {/* Route for the dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App
