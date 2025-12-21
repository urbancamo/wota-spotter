# Development Scripts

This project includes bash scripts to easily start and stop all development services.

## Prerequisites

- Node.js and npm installed
- ngrok installed ([download here](https://ngrok.com/download))
- All npm dependencies installed (`npm install`)

## Building the Application

Before running the development environment for the first time, or after making changes to the Prisma schema, you need to build the application:

```bash
# Generate Prisma client from schema
npx prisma generate

# Install dependencies (if not already done)
npm install
```

The `prisma generate` command creates the Prisma client based on your database schema defined in `prisma/schema.prisma`. This step is required whenever you:
- Clone the repository for the first time
- Make changes to the Prisma schema
- Update Prisma dependencies

## Starting Development Environment

To start all services (API server, frontend, and ngrok):

```bash
./start-dev.sh
```

This will:
1. Start the API server on port 3001
2. Start the frontend dev server on port 5173
3. Start ngrok tunnel to the frontend
4. Display the ngrok public URL

All services run in the background and logs are written to:
- `api.log` - API server logs
- `frontend.log` - Frontend dev server logs
- `ngrok.log` - ngrok logs

The script will also tail all logs in the terminal. Press `Ctrl+C` to stop all services.

## Stopping Development Environment

To stop all running services:

```bash
./stop-dev.sh
```

This will gracefully shut down:
- API server
- Frontend dev server
- ngrok tunnel

## URLs

When running:
- **Local Frontend**: http://localhost:5173
- **Local API**: http://localhost:3001
- **ngrok Public URL**: Displayed in terminal when starting, or check http://localhost:4040
- **ngrok Inspector**: http://localhost:4040 (web interface for ngrok)

## How It Works

The frontend (Vite) proxies all `/api` requests to the backend API server on port 3001 (configured in `vite.config.ts`).

ngrok creates a public tunnel to the frontend on port 5173, which allows external access to your development environment.

## Troubleshooting

### ngrok not found
Install ngrok from https://ngrok.com/download

### Port already in use
Stop any existing processes using ports 3001 or 5173:
```bash
# Find process using port
lsof -i :3001
lsof -i :5173

# Kill process by PID
kill <PID>
```

Or use the stop script:
```bash
./stop-dev.sh
```

### Services not stopping
Manually remove PID files:
```bash
rm .api.pid .frontend.pid .ngrok.pid
```