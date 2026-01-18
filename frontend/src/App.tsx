import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FAQ from './pages/FAQ'
import LearnMore from './pages/LearnMore'

/**
 * Main App Component with Routing
 * 
 * This component sets up all the routes for your application.
 * 
 * Routes:
 * - "/" - Landing page (home page)
 * - "/login" - Login page
 * - "/dashboard" - Dashboard page (protected, requires login)
 * - "/faq" - FAQ page
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/learn-more" element={<LearnMore />} />

    </Routes>
  )
}

export default App
