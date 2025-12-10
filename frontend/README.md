# Productivity App Frontend

React-based frontend for the Productivity App, built with Vite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```
Edit `.env` and set `VITE_API_BASE_URL` to your API Gateway URL from Terraform outputs.

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable React components
│   ├── contexts/       # React Context providers (ThemeContext)
│   ├── pages/          # Page components
│   ├── services/       # API client services
│   │   ├── api.js              # Base axios configuration
│   │   ├── authService.js      # Authentication API
│   │   ├── taskService.js      # Task management API
│   │   ├── categoryService.js  # Category management API
│   │   └── insightService.js   # AI insights API
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Root component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles with theme CSS
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies
```

## Features Implemented

### Theme System
- Three theme options: Dark/Green, Pink/White, Blue/White
- Theme persistence in localStorage
- ThemeContext for global theme management
- CSS custom properties for theme colors

### API Services
- **authService**: User registration, login, token verification
- **taskService**: CRUD operations for tasks, toggle completion
- **categoryService**: CRUD operations for categories
- **insightService**: Generate and retrieve AI insights

All services include:
- Automatic JWT token handling
- Error handling
- Response interceptors for 401 redirects

## Technologies

- **React 18** - UI framework
- **Vite 5** - Build tool and dev server
- **React Router 6** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS 3** - Utility-first CSS framework

## Next Steps

Implement the following pages and components:
- LoginPage (authentication UI)
- DashboardPage (today's tasks overview)
- TasksPage (task list with filters)
- CalendarPage (weekly/monthly calendar view)
- InsightsPage (AI insights display)
- SettingsPage (theme and preferences)
- TaskModal (create/edit task form)
- CategorySelector (category dropdown)
