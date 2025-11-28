# Project Instructions

## Project Description
<!-- Add a detailed description of your project here. What does it do? Who is it for? -->
Vintage Story server manager that will help you to easily manage and configure your Vintage Story game server.
Should just be able to clone this project, run a single command to start the server manager and have it up and running.
Should run the server, provice a web interface to manage it, and allow configuration of server settings.
- server console output
- run commands on the server
- configure server settings via web interface
- start/stop/restart the server
- backup/restore server data
- install/manage mods and plugins
- update game server version
- update server manager software
- build for ubuntu/debian based linux distributions
- realtime updates on server status via web interface
- realtime server console output via web interface
- multi-server instance management (create, delete, switch between servers)
- mobile-friendly responsive UI

## Tech Stack
<!-- List the languages, frameworks, and tools used in this project. -->
- Language: TypeScript (Node.js)
- Framework: Express.js (Backend), React (Frontend)
- Tools: Socket.io (Real-time console), TailwindCSS (Styling), Vite (Build tool), SQLite (Database), React Router (Navigation)

## Coding Style & Conventions
<!-- Define your preferred coding style, naming conventions, and patterns. -->
- Indentation: 2 spaces
- Naming: camelCase for variables/functions, PascalCase for classes/components
- Error Handling: Use try/catch blocks with typed error handling. Always log errors to console/file.
- Make sure that any routes that should be protected are protected with JWT authentication.
- Use environment variables for configuration (e.g., server port, database connection strings).
- UI should be responsive and mobile-first where possible.

## Specific Instructions for Copilot
<!-- Add any specific behaviors you want Copilot to follow. -->
- Always add comments to complex logic.
- Prefer functional programming patterns.
- Write unit tests for all new features using Jest/Vitest.
- Ensure code is modular and reusable.
- Follow best practices for security and performance.
- Use async/await for asynchronous operations.
- Ensure strict type checking in TypeScript.
- When implementing server switching, ensure the previous server is gracefully stopped.
- Allow server creation with any version, auto-installing it if necessary upon start.
