import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),

  migrate: {
    async resolveUrl() {
      // Use DIRECT_URL for migrations if available (bypasses connection pooling)
      // Otherwise fall back to DATABASE_URL
      return process.env.DIRECT_URL || process.env.DATABASE_URL || '';
    },
  },
});
