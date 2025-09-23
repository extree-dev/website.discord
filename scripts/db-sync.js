#!/usr/bin/env node
import { execSync } from 'child_process';
import { format } from 'date-fns';

const migrationName = process.env.npm_config_name || `migration_${format(new Date(), 'yyyyMMddHHmmss')}`;

try {
  execSync(`npx prisma migrate dev --name ${migrationName}`, { stdio: 'inherit' });
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Database synchronized and Prisma Client generated successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}