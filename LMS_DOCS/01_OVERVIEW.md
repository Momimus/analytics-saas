# LMS Overview

## What This System Is
- A role-based Learning Management System (LMS) for:
  - `STUDENT` learning
  - `INSTRUCTOR` course authoring and approvals
  - `ADMIN` moderation and operations
- Built as a monorepo with separate frontend and backend workspaces.

## Tech Stack Summary
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express 5, TypeScript, Prisma ORM
- Database: PostgreSQL
- Quality: ESLint, TypeScript strict mode, Vitest

## Major Features
- Student:
  - browse catalog
  - request course access
  - track lesson progress
- Instructor:
  - create/edit/publish courses
  - manage lessons
  - approve/revoke requests
  - request course deletion
- Admin:
  - manage users, courses, enrollments
  - handle deletion requests
  - view audit logs

## High-Level System Diagram (Text)
```txt
Browser (React SPA)
  -> API (Express routes + middleware)
    -> Services (business rules)
      -> Prisma ORM
        -> PostgreSQL
  <- JSON responses
```
