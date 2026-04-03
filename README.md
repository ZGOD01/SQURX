# Squrx - React + Vite + TailwindCSS Project

A clean, minimal, and pre-configured React application template utilizing modern frontend tooling and design best practices.

## Included Technologies

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: TailwindCSS 4 (Integration by `@tailwindcss/vite`) + `clsx` + `tailwind-merge`
- **Routing**: React Router DOM (v7)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod + Hookform Resolvers
- **Animations**: Framer Motion
- **Scroll Reveal**: React Intersection Observer
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Utilities**: Date-fns
- **Typography**: Inter (Google Fonts)

## Architecture & Folder Structure

```
src/
  app/         # Router, guards, and layouts
  components/  # Shared components
    ui/        # Base UI elements
    sections/  # Larger layout sections
    motion/    # Reusable animation wrapers
  features/    # Domain-specific modules
    landing/
    auth/
    student/
    recruiter/
    admin/
  lib/         # Library and utility configuration
    validators/# Zod schema validation
    utils/     # Helper functions (e.g. cn for tailwind classes)
    mockDb/    # Local storage mock database
  styles/      # Global CSS files and Tailwind setup
```

## Running the Application

This project uses localStorage and mock-db; no backend is required.

**1. Install Dependencies**

```bash
npm install
```

**2. Start the Development Server**

```bash
npm run dev
```

Visit the displayed local URL (typically `http://localhost:5173/`) in your browser to view the application.

## Build for Production

```bash
npm run build
```
