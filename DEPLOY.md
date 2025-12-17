# Deployment Guide - Render.com

## Quick Deploy Setup

This project includes an automated deploy script that handles database connectivity checks, migrations, and server startup.

### Render Configuration

In your Render dashboard settings, use these commands:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run deploy
```

### Environment Variables

Set these in your Render dashboard under Environment:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://user:password@host:port/dbname` | Get from your Render Postgres database |
| `SESSION_SECRET` | Random string (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) | For session encryption |
| `NODE_ENV` | `production` | Ensures production optimizations |
| `PORT` | (leave blank) | Render will set this automatically |

### What the Deploy Script Does

1. **Checks Database Connectivity** - Verifies the database is accessible before proceeding
2. **Runs Migrations** - Automatically applies pending database migrations
3. **Starts Server** - Launches your Express application
4. **Error Handling** - Gracefully handles database unavailability with appropriate logging

### First-Time Deployment

1. Create a PostgreSQL database in Render (PostgreSQL service)
2. Copy the connection string to `DATABASE_URL` in environment variables
3. Create the `SESSION_SECRET` environment variable
4. Deploy - the script will:
   - Compile your code
   - Connect to the database
   - Run all migrations
   - Start your server

### Manual Migration (if needed)

If migrations need to be run manually after deployment:

```bash
npm run migrate:up
```

Run in Render's bash console (Services → Your App → Connect → bash)

### Logs

Deploy logs are available in Render's dashboard:
- **Build logs** - Shows npm install, compilation, vite bundling
- **Deploy logs** - Shows migration status and server startup
- **Runtime logs** - Shows server errors and application logs

### Troubleshooting

**"could not connect to postgres"**
- Ensure `DATABASE_URL` is set correctly in environment variables
- Database might not be ready yet - wait a few minutes and redeploy

**"Migration failed"**
- Check database credentials
- Ensure the database user has proper permissions
- Run migrations manually from Render bash console

**Server exits immediately**
- Check Render runtime logs for specific errors
- Verify all environment variables are set
- Ensure build completed successfully

### Local Testing

Test the deploy script locally:

```bash
# Make sure .env is set up with valid DATABASE_URL
npm run build
npm run deploy
```

This will run the same deployment flow as Render.
