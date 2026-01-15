---
description: How to run the Ramboo Engineering development environment
---
# Running the Ramboo Engineering Development Environment

This workflow explains how to start the complete GWMS (Garage & Workshop Management System) development environment.

## Prerequisites
- Node.js 18+ installed
- npm installed

## Steps

// turbo-all

1. **Start the Backend Server**
   Open a terminal and run:
   ```bash
   cd /Volumes/Backup/Development/ramboo/backend && npm run dev
   ```
   The backend API will be available at `http://localhost:3001`

2. **Start the Frontend Dev Server**
   Open a new terminal and run:
   ```bash
   cd /Volumes/Backup/Development/ramboo/frontend && npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## Default Login Credentials
- **Email**: admin@ramboo.com
- **Password**: admin123

## API Endpoints
- Backend API: `http://localhost:3001/api`
- Frontend: `http://localhost:5173`

## Database
- SQLite database is located at `/Volumes/Backup/Development/ramboo/backend/prisma/dev.db`
- Use `npm run db:studio` in the backend folder to open Prisma Studio for database inspection

## Available Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database and reseed

## Available Frontend Scripts
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
