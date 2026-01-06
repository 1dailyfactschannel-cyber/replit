# TeamSync - Project Management System

## Overview

TeamSync is a comprehensive project management and team collaboration platform built with React and Express. It provides features for managing projects, tasks, team members, calendars, chat, video calls, and an internal shop system. The application follows a modern design philosophy with support for light/dark themes and a polished UI using shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS v4 with CSS variables for theming, plus tw-animate-css for animations
- **UI Components**: shadcn/ui component library (New York style) built on Radix UI primitives
- **Rich Text**: TipTap editor for rich text editing capabilities
- **Theming**: next-themes for system/light/dark mode support
- **Fonts**: Plus Jakarta Sans (headings) and Inter (body text)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build**: esbuild for server bundling, Vite for client
- **API Pattern**: RESTful API with `/api` prefix for all routes
- **Static Serving**: Express static middleware serves the built client in production

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - shared between client and server
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Current State**: Basic user schema defined; storage interface uses in-memory Map by default with PostgreSQL ready for integration
- **Migrations**: Drizzle Kit for database migrations (`drizzle-kit push`)

### Project Structure
```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/   # UI components (layout, call, kanban, ui)
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data storage interface
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
└── migrations/       # Database migrations
```

### Key Design Decisions

1. **Monorepo Structure**: Client and server share TypeScript configuration and schema definitions, enabling type safety across the stack

2. **Storage Abstraction**: The `IStorage` interface in `server/storage.ts` abstracts data operations, allowing easy switching between in-memory and PostgreSQL storage

3. **Component Architecture**: Heavy use of shadcn/ui provides consistent, accessible components with customizable styling through CSS variables

4. **Path Aliases**: `@/` maps to client src, `@shared/` to shared directory, simplifying imports

5. **Russian Localization**: The UI is primarily in Russian, indicating the target audience

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via DATABASE_URL environment variable)
- **connect-pg-simple**: Session storage for PostgreSQL

### UI/UX Libraries
- **Radix UI**: Full suite of accessible primitive components
- **Lucide React**: Icon library
- **Recharts**: Chart and data visualization
- **embla-carousel-react**: Carousel component
- **vaul**: Drawer component
- **sonner**: Toast notifications

### Development Tools
- **Vite Plugins**: 
  - @replit/vite-plugin-runtime-error-modal - Error overlay
  - @replit/vite-plugin-cartographer - Dev tooling
  - @replit/vite-plugin-dev-banner - Development banner
  - Custom meta-images plugin for OpenGraph image handling

### Potential Integrations (dependencies present)
- **OpenAI/Google Generative AI**: AI service clients available
- **Stripe**: Payment processing
- **Nodemailer**: Email sending
- **Passport**: Authentication (passport-local strategy)
- **Multer**: File upload handling
- **xlsx**: Excel file processing
- **WebSocket (ws)**: Real-time communication