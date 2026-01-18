# Design Refactor Summary

This document summarizes the UI refactor to match Figma designs.

## Files Created

### Design System
- `src/styles/tokens.css` - Design tokens (colors, spacing, typography, shadows, radius)

### Components
- `src/components/TopNav.tsx` & `.css` - Reusable navigation component
- `src/components/Footer.tsx` & `.css` - Reusable footer component
- `src/components/Button.tsx` & `.css` - Reusable button component with variants
- `src/components/GoogleLogin.tsx` & `.css` - Updated Google login button styling

### Pages
- `src/pages/Login.tsx` & `.css` - Login page matching Figma (desktop split layout, mobile centered)
- `src/pages/Landing.tsx` & `.css` - Landing page matching Figma (hero, features, security sections)
- `src/pages/Dashboard.tsx` & `.css` - Dashboard with table layout matching Figma
- `src/pages/FAQ.tsx` & `.css` - FAQ page matching Figma

## Files Modified

- `index.html` - Added Inter font from Google Fonts
- `src/index.css` - Imported tokens, reset styles
- `src/App.tsx` - Added routes for Login and FAQ pages

## Design Tokens Location

All design tokens are defined in `src/styles/tokens.css`:
- Colors (bg, surface, text, accent, border)
- Typography (font family, sizes, weights)
- Spacing (--space-1 through --space-20)
- Border radius (--radius-sm through --radius-full)
- Shadows (--shadow-sm through --shadow-xl)

## Page Styles Location

Each page has its own CSS file:
- `src/pages/Login.css` - Login page styles
- `src/pages/Landing.css` - Landing page styles
- `src/pages/Dashboard.css` - Dashboard table styles
- `src/pages/FAQ.css` - FAQ page styles

## Figma Screenshots Matched

1. **Mobile Login Screen** - `src/pages/Login.tsx` (responsive, centered card)
2. **Desktop Login Screen** - `src/pages/Login.tsx` (split layout with coral semi-circle graphic)
3. **Desktop Dashboard** - `src/pages/Dashboard.tsx` (table with Company Name | First Seen | Opt-Out columns)
4. **Landing Page Mobile** - `src/pages/Landing.tsx` (stacked sections, gradient banner)
5. **Landing Page Desktop** - `src/pages/Landing.tsx` (hero split, features grid)
6. **FAQ Page Desktop** - `src/pages/FAQ.tsx` (numbered questions and answers)

## Key Features

- **Typography**: Inter font family with consistent weights and sizes
- **Colors**: Coral accent (#ff6b6b), purple (#9b59b6), orange (#ff8c42) for buttons
- **Layout**: Responsive grid layouts matching Figma breakpoints
- **Components**: Reusable TopNav, Footer, and Button components
- **Table Design**: Dashboard uses proper table element with light blue header background
- **Button Variants**: Primary (black), Secondary (outlined), Pill (coral/purple/orange)

## Responsive Breakpoints

- Mobile: < 768px (stacked layouts, centered content)
- Desktop: >= 1024px (split layouts, side-by-side content)
- Max width: 1280px (matches Figma desktop width)
