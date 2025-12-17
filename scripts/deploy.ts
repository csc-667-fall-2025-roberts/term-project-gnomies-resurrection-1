#!/usr/bin/env node
/**
 * Deploy Script for Render.com
 * Handles database connectivity, migrations, and server startup with proper logging
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import pg from 'pg';

// Only load .env in development to prevent overriding production env vars
if (process.env.NODE_ENV !== 'production') {
  const { configDotenv } = await import('dotenv');
  configDotenv();
}

const isDev = process.env.NODE_ENV !== 'production';
const databaseUrl = process.env.DATABASE_URL;
const logFile = '/tmp/deploy.log';

// Logging utility
function log(level: string, message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (e) {
    // Ignore file write errors
  }
}

// Check database connectivity
async function checkDatabase(): Promise<boolean> {
  if (!databaseUrl) {
    log('WARN', 'DATABASE_URL not set - skipping database check');
    return false;
  }

  try {
    log('INFO', 'Checking database connectivity...');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query('SELECT NOW()');
    await client.end();
    log('INFO', '✓ Database is accessible');
    return true;
  } catch (error) {
    log('WARN', `Database not accessible: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Run migrations
async function runMigrations(): Promise<boolean> {
  return new Promise((resolve) => {
    log('INFO', 'Running database migrations...');

    const migrationProcess = spawn('node-pg-migrate', ['up'], {
      env: {
        ...process.env,
        NODE_OPTIONS: '--import tsx',
      },
      stdio: 'inherit',
    });

    migrationProcess.on('close', (code) => {
      if (code === 0) {
        log('INFO', '✓ Migrations completed successfully');
        resolve(true);
      } else {
        log('ERROR', `Migrations failed with exit code ${code}`);
        resolve(false);
      }
    });

    migrationProcess.on('error', (error) => {
      log('ERROR', `Failed to run migrations: ${error.message}`);
      resolve(false);
    });
  });
}

// Start the server
function startServer() {
  log('INFO', 'Starting application server...');

  const serverProcess = spawn('node', ['dist/backend/server.js'], {
    env: process.env,
    stdio: 'inherit',
  });

  serverProcess.on('error', (error) => {
    log('ERROR', `Failed to start server: ${error.message}`);
    process.exit(1);
  });

  serverProcess.on('close', (code) => {
    log('INFO', `Server exited with code ${code}`);
    process.exit(code || 0);
  });
}

// Main deployment flow
async function deploy() {
  log('INFO', '🚀 Starting Render deployment...');
  log('INFO', `Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Check if database is available
    const dbAvailable = await checkDatabase();

    if (dbAvailable) {
      // Run migrations if database is available
      const migrationSuccess = await runMigrations();
      if (!migrationSuccess && isDev) {
        log('ERROR', 'Migrations failed in development mode - exiting');
        process.exit(1);
      }
      // In production, continue even if migrations fail (database might need manual setup)
    } else {
      if (isDev) {
        log('ERROR', 'Database not available in development mode - exiting');
        process.exit(1);
      } else {
        log('WARN', 'Database not available - skipping migrations');
        log('WARN', 'You may need to manually run migrations after database is provisioned');
        log('INFO', 'Run: npm run migrate:up');
      }
    }

    // Start the server
    startServer();
  } catch (error) {
    log('ERROR', `Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run deployment
deploy().catch((error) => {
  log('ERROR', `Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
