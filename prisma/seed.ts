import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL environment variable is required');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seed...');

  // Create initial admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_INITIAL_PASSWORD || 'admin123', 12);

  const admin = await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_INITIAL_EMAIL || 'admin@foremark.com' },
    update: {},
    create: {
      email: process.env.ADMIN_INITIAL_EMAIL || 'admin@foremark.com',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'politics' },
      update: {},
      create: {
        slug: 'politics',
        name: 'Politics',
        description: 'Australian and global political events',
        icon: '🏛️',
        displayOrder: 0,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'economics' },
      update: {},
      create: {
        slug: 'economics',
        name: 'Economics',
        description: 'Economic indicators and market predictions',
        icon: '💰',
        displayOrder: 1,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'sports' },
      update: {},
      create: {
        slug: 'sports',
        name: 'Sports',
        description: 'Sports events and outcomes',
        icon: '⚽',
        displayOrder: 2,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'climate' },
      update: {},
      create: {
        slug: 'climate',
        name: 'Climate',
        description: 'Weather and climate-related predictions',
        icon: '🌍',
        displayOrder: 3,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'culture' },
      update: {},
      create: {
        slug: 'culture',
        name: 'Culture',
        description: 'Entertainment, media, and cultural events',
        icon: '🎭',
        displayOrder: 4,
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'world' },
      update: {},
      create: {
        slug: 'world',
        name: 'World',
        description: 'Global news and international affairs',
        icon: '🌏',
        displayOrder: 5,
        isActive: true,
      },
    }),
  ]);
  console.log('Created categories:', categories.map(c => c.name).join(', '));

  // Create subcategories for Politics
  const politicsCategory = categories.find(c => c.slug === 'politics');
  if (politicsCategory) {
    await Promise.all([
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: politicsCategory.id, slug: 'federal' } },
        update: {},
        create: {
          categoryId: politicsCategory.id,
          slug: 'federal',
          name: 'Federal',
          description: 'Federal government and elections',
          displayOrder: 0,
        },
      }),
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: politicsCategory.id, slug: 'state' } },
        update: {},
        create: {
          categoryId: politicsCategory.id,
          slug: 'state',
          name: 'State',
          description: 'State government and elections',
          displayOrder: 1,
        },
      }),
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: politicsCategory.id, slug: 'international' } },
        update: {},
        create: {
          categoryId: politicsCategory.id,
          slug: 'international',
          name: 'International',
          description: 'International politics',
          displayOrder: 2,
        },
      }),
    ]);
    console.log('Created politics subcategories');
  }

  // Create subcategories for Sports
  const sportsCategory = categories.find(c => c.slug === 'sports');
  if (sportsCategory) {
    await Promise.all([
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: sportsCategory.id, slug: 'afl' } },
        update: {},
        create: {
          categoryId: sportsCategory.id,
          slug: 'afl',
          name: 'AFL',
          description: 'Australian Football League',
          displayOrder: 0,
        },
      }),
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: sportsCategory.id, slug: 'nrl' } },
        update: {},
        create: {
          categoryId: sportsCategory.id,
          slug: 'nrl',
          name: 'NRL',
          description: 'National Rugby League',
          displayOrder: 1,
        },
      }),
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: sportsCategory.id, slug: 'cricket' } },
        update: {},
        create: {
          categoryId: sportsCategory.id,
          slug: 'cricket',
          name: 'Cricket',
          description: 'Cricket matches and tournaments',
          displayOrder: 2,
        },
      }),
      prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: sportsCategory.id, slug: 'tennis' } },
        update: {},
        create: {
          categoryId: sportsCategory.id,
          slug: 'tennis',
          name: 'Tennis',
          description: 'Tennis tournaments',
          displayOrder: 3,
        },
      }),
    ]);
    console.log('Created sports subcategories');
  }

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'trending' },
      update: {},
      create: { slug: 'trending', name: 'Trending', color: '#EF4444' },
    }),
    prisma.tag.upsert({
      where: { slug: 'new' },
      update: {},
      create: { slug: 'new', name: 'New', color: '#3B82F6' },
    }),
    prisma.tag.upsert({
      where: { slug: 'closing-soon' },
      update: {},
      create: { slug: 'closing-soon', name: 'Closing Soon', color: '#F59E0B' },
    }),
    prisma.tag.upsert({
      where: { slug: 'high-volume' },
      update: {},
      create: { slug: 'high-volume', name: 'High Volume', color: '#10B981' },
    }),
    prisma.tag.upsert({
      where: { slug: 'election' },
      update: {},
      create: { slug: 'election', name: 'Election', color: '#8B5CF6' },
    }),
    prisma.tag.upsert({
      where: { slug: 'breaking' },
      update: {},
      create: { slug: 'breaking', name: 'Breaking News', color: '#EC4899' },
    }),
  ]);
  console.log('Created tags:', tags.map(t => t.name).join(', '));

  // Create default constraint templates
  await Promise.all([
    prisma.constraintTemplate.upsert({
      where: { id: 'default-standard' },
      update: {},
      create: {
        id: 'default-standard',
        name: 'Standard Constraints',
        description: 'Default constraints for most markets',
        isDefault: true,
        constraints: JSON.stringify({
          minTradeAmount: 100,
          maxTradeAmount: 100000,
          maxPositionSize: 10000,
          maxNotionalExposure: 1000000,
          kycRequired: true,
          kycLevel: 'basic',
          jurisdictionEligibility: ['AU'],
          feeStructure: 'standard',
        }),
      },
    }),
    prisma.constraintTemplate.upsert({
      where: { id: 'default-high-value' },
      update: {},
      create: {
        id: 'default-high-value',
        name: 'High Value Market',
        description: 'For markets with higher stakes and liquidity',
        isDefault: false,
        constraints: JSON.stringify({
          minTradeAmount: 1000,
          maxTradeAmount: 500000,
          maxPositionSize: 50000,
          maxNotionalExposure: 5000000,
          kycRequired: true,
          kycLevel: 'enhanced',
          jurisdictionEligibility: ['AU'],
          feeStructure: 'premium',
        }),
      },
    }),
    prisma.constraintTemplate.upsert({
      where: { id: 'default-novelty' },
      update: {},
      create: {
        id: 'default-novelty',
        name: 'Novelty Market',
        description: 'For entertainment and novelty predictions',
        isDefault: false,
        constraints: JSON.stringify({
          minTradeAmount: 50,
          maxTradeAmount: 10000,
          maxPositionSize: 1000,
          maxNotionalExposure: 100000,
          kycRequired: true,
          kycLevel: 'basic',
          noveltyCapEnabled: true,
          noveltyCapAmount: 50000,
          jurisdictionEligibility: ['AU'],
          feeStructure: 'reduced',
        }),
      },
    }),
  ]);
  console.log('Created constraint templates');

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
