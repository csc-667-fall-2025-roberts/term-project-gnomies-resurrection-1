#!/usr/bin/env node
/**
 * Safe migration script that skips gracefully if database is unavailable
 * Used in production deployments where database might not be immediately available
 */

import { execSync } from 'child_process';

const isDev = process.env.NODE_ENV !== 'production';

try {
  console.log('Running database migrations...');
  execSync('node-pg-migrate up', { 
    env: { 
      ...process.env,
      NODE_OPTIONS: '--import tsx'
    },
    stdio: 'inherit' 
  });
  console.log('✓ Migrations completed successfully');
} catch (error) {
  if (isDev) {
    console.error('❌ Migration failed in development');
    process.exit(1);
  } else {
    console.warn('⚠️  Migration failed in production - database may not be ready yet');
    console.warn('Continuing startup anyway. You may need to manually run migrations.');
    process.exit(0); // Exit gracefully
  }
}
