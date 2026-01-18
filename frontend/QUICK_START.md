# Quick Start Guide

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. For demo mode (no backend required), set in `.env`:
   ```
   VITE_MOCK=true
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Demo Mode

With `VITE_MOCK=true`, you can:
- View the landing page
- Click "Run Scan (Demo)" to see mock results
- Test all UI features without backend

## Real Backend Mode

With `VITE_MOCK=false`:
- Ensure backend is running on `http://localhost:8000`
- Backend must implement:
  - `GET /me` - Returns user info
  - `GET /gmail/connect` - Redirects to Gmail OAuth
  - `GET /gmail/scan` - Returns `ScanResult[]`

## Environment Variables

- `VITE_API_BASE` - Backend API URL (default: `http://localhost:8000`)
- `VITE_MOCK` - Enable mock mode (`true`/`false`)
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID for login
