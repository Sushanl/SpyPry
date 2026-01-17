# React Router Setup Guide

## What is Routing?

Routing allows your React app to show different components based on the URL. For example:
- `http://localhost:5173/` → Shows the Landing page
- `http://localhost:5173/dashboard` → Shows the Dashboard page

## How It Works

### 1. **BrowserRouter** (in `main.tsx`)
Wraps your entire app to enable routing functionality.

```tsx
<BrowserRouter>
  <App />
</BrowserRouter>
```

### 2. **Routes & Route** (in `App.tsx`)
Defines which component to show for each URL path.

```tsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/dashboard" element={<Dashboard />} />
</Routes>
```

- `path="/"` → URL path (the part after the domain)
- `element={<Landing />}` → Component to render for that path

### 3. **Navigation**

#### Using `useNavigate` Hook (Programmatic Navigation)
Navigate when something happens (like after login):

```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/dashboard'); // Go to dashboard
  };
  
  return <button onClick={handleClick}>Go to Dashboard</button>;
}
```

#### Using `<Link>` Component (Declarative Navigation)
Create clickable links:

```tsx
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/dashboard">Dashboard</Link>
    </nav>
  );
}
```

## Your Current Setup

### File Structure:
```
src/
├── main.tsx          → Wraps app with BrowserRouter
├── App.tsx           → Defines all routes
├── pages/
│   ├── Landing.tsx   → Landing page (path: "/")
│   └── Dashboard.tsx → Dashboard page (path: "/dashboard")
└── components/
    └── GoogleLogin.tsx → Uses navigate() to go to dashboard
```

### Current Routes:
- **`/`** → Landing page with login button
- **`/dashboard`** → Dashboard (after login)

## Common Patterns

### Adding a New Route

1. Create a new component in `src/pages/`:
```tsx
// src/pages/About.tsx
export default function About() {
  return <div>About Page</div>;
}
```

2. Add route in `App.tsx`:
```tsx
import About from './pages/About';

<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/about" element={<About />} />  {/* New route */}
</Routes>
```

### Protected Routes (Require Login)

You can create a wrapper component to protect routes:

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const isLoggedIn = checkIfUserIsLoggedIn(); // Your auth check
  
  if (!isLoggedIn) {
    return <Navigate to="/" replace />; // Redirect to home
  }
  
  return <>{children}</>;
}
```

Then use it:
```tsx
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

### URL Parameters

Access dynamic URL segments:

```tsx
// Route definition
<Route path="/user/:userId" element={<UserProfile />} />

// In component
import { useParams } from 'react-router-dom';

function UserProfile() {
  const { userId } = useParams();
  return <div>User ID: {userId}</div>;
}
```

### Query Parameters

Access query strings like `?name=John`:

```tsx
import { useSearchParams } from 'react-router-dom';

function Search() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name');
  return <div>Searching for: {name}</div>;
}
```

## Tips

1. **Always wrap with BrowserRouter** at the top level (in `main.tsx`)
2. **Use `useNavigate()`** for programmatic navigation (buttons, form submissions)
3. **Use `<Link>`** for navigation links (like in a navbar)
4. **Keep routes organized** - put page components in `pages/` folder
5. **Use `replace` prop** in Navigate to replace history instead of adding to it

## Your Current Flow

1. User visits `/` → Sees Landing page
2. User clicks Google Login → Authenticates
3. After successful login → `navigate('/dashboard')` is called
4. User is redirected to `/dashboard` → Sees Dashboard

That's it! You now have routing set up! 🎉
