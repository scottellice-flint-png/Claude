import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  // Create sample markets
  const adminUserId = admin.id;

  const sampleMarkets = [
    {
      slug: 'australian-federal-election-2026',
      title: 'Who will win the next Australian Federal Election?',
      shortDescription: 'Labor vs Coalition for the 2026 Federal Election',
      description: 'This market resolves to the party that wins the next Australian Federal Election. Resolves based on which party forms government.',
      status: 'published',
      categoryId: politicsCategory?.id || categories[0].id,
      marketType: 'multi_outcome',
      icon: '🗳️',
      isFeatured: true,
      closesAt: new Date('2026-05-21T18:00:00+10:00'),
      resolvesBy: new Date('2026-05-25T12:00:00+10:00'),
      settlesBy: new Date('2026-05-30T12:00:00+10:00'),
      initialYesPrice: 52,
      currentYesPrice: 52,
      currentNoPrice: 48,
      volume: 2450000,
      liquidity: 890000,
      rulesText: 'Resolves to the party that forms government after the 2026 Federal Election.',
      outcomes: [
        { label: 'Labor', position: 0, initialPrice: 52, currentPrice: 52, color: '#DC2626' },
        { label: 'Coalition', position: 1, initialPrice: 41, currentPrice: 41, color: '#2563EB' },
        { label: 'Other', position: 2, initialPrice: 7, currentPrice: 7, color: '#6B7280' },
      ],
    },
    {
      slug: 'federal-election-before-september-2026',
      title: 'Will a Federal Election be called before September 2026?',
      shortDescription: 'Early election call prediction',
      description: 'Resolves Yes if the Governor-General dissolves the House of Representatives and issues writs for a federal election before September 1, 2026.',
      status: 'published',
      categoryId: politicsCategory?.id || categories[0].id,
      marketType: 'binary',
      icon: '📅',
      closesAt: new Date('2026-08-31T23:59:00+10:00'),
      resolvesBy: new Date('2026-09-02T12:00:00+10:00'),
      settlesBy: new Date('2026-09-07T12:00:00+10:00'),
      initialYesPrice: 78,
      currentYesPrice: 78,
      currentNoPrice: 22,
      volume: 485000,
      liquidity: 178000,
      rulesText: 'Resolves Yes if writs are issued before September 1, 2026 AEST.',
    },
    {
      slug: 'rba-rate-raise-feb-2026',
      title: 'Will the RBA raise the cash rate at the Feb 2026 meeting?',
      shortDescription: 'RBA interest rate decision prediction',
      description: 'Resolves Yes if the Reserve Bank of Australia announces a cash rate increase at the February 2026 monetary policy meeting.',
      status: 'published',
      categoryId: categories.find(c => c.slug === 'economics')?.id || categories[1].id,
      marketType: 'binary',
      icon: '🏦',
      closesAt: new Date('2026-02-17T14:30:00+11:00'),
      resolvesBy: new Date('2026-02-18T12:00:00+11:00'),
      settlesBy: new Date('2026-02-23T12:00:00+11:00'),
      initialYesPrice: 8,
      currentYesPrice: 8,
      currentNoPrice: 92,
      volume: 485000,
      liquidity: 178000,
      rulesText: 'Resolves based on RBA official announcement.',
    },
    {
      slug: 'australian-open-mens-winner-2026',
      title: "Men's Australian Open Winner 2026",
      shortDescription: 'Who will win the Australian Open 2026',
      description: "Resolves based on the winner of the Men's Singles at the 2026 Australian Open.",
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🎾',
      isFeatured: true,
      closesAt: new Date('2026-01-26T19:00:00+11:00'),
      resolvesBy: new Date('2026-01-27T12:00:00+11:00'),
      settlesBy: new Date('2026-02-01T12:00:00+11:00'),
      initialYesPrice: 53,
      currentYesPrice: 53,
      currentNoPrice: 47,
      volume: 890000,
      liquidity: 345000,
      rulesText: 'Resolves to the winner of the Australian Open 2026 Men\'s Singles Final.',
      outcomes: [
        { label: 'Jannik Sinner', position: 0, initialPrice: 53, currentPrice: 53, color: '#0EA5E9' },
        { label: 'Novak Djokovic', position: 1, initialPrice: 42, currentPrice: 42, color: '#EF4444' },
        { label: 'Carlos Alcaraz', position: 2, initialPrice: 5, currentPrice: 5, color: '#F59E0B' },
      ],
    },
    {
      slug: 'afl-premiership-2026',
      title: 'Who will win the 2026 AFL Premiership?',
      shortDescription: '2026 AFL Grand Final winner',
      description: 'Resolves based on the winner of the 2026 AFL Grand Final.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🏉',
      isFeatured: true,
      closesAt: new Date('2026-09-26T17:00:00+10:00'),
      resolvesBy: new Date('2026-09-27T12:00:00+10:00'),
      settlesBy: new Date('2026-10-02T12:00:00+10:00'),
      initialYesPrice: 18,
      currentYesPrice: 18,
      currentNoPrice: 82,
      volume: 1250000,
      liquidity: 465000,
      rulesText: 'Resolves to the winner of the 2026 AFL Grand Final.',
      outcomes: [
        { label: 'Collingwood', position: 0, initialPrice: 18, currentPrice: 18, color: '#000000' },
        { label: 'Brisbane Lions', position: 1, initialPrice: 15, currentPrice: 15, color: '#A61F3D' },
        { label: 'Carlton', position: 2, initialPrice: 12, currentPrice: 12, color: '#0E1E5B' },
        { label: 'Sydney', position: 3, initialPrice: 10, currentPrice: 10, color: '#ED1B24' },
      ],
    },
    {
      slug: 'hottest-year-2026',
      title: 'Will 2026 be the hottest year on record globally?',
      shortDescription: 'Global temperature record prediction',
      description: 'Resolves Yes if 2026 is confirmed as the hottest year on record by NASA or NOAA.',
      status: 'published',
      categoryId: categories.find(c => c.slug === 'climate')?.id || categories[3].id,
      marketType: 'binary',
      icon: '🌡️',
      closesAt: new Date('2026-12-31T23:59:00+11:00'),
      resolvesBy: new Date('2027-01-31T12:00:00+11:00'),
      settlesBy: new Date('2027-02-07T12:00:00+11:00'),
      initialYesPrice: 65,
      currentYesPrice: 65,
      currentNoPrice: 35,
      volume: 320000,
      liquidity: 118000,
      rulesText: 'Resolves based on official NASA or NOAA annual temperature data.',
    },
    {
      slug: 'oscars-best-picture-2026',
      title: 'Best Picture Oscar Winner 2026',
      shortDescription: 'Academy Awards Best Picture prediction',
      description: 'Resolves based on the winner of Best Picture at the 2026 Academy Awards.',
      status: 'published',
      categoryId: categories.find(c => c.slug === 'culture')?.id || categories[4].id,
      marketType: 'multi_outcome',
      icon: '🎬',
      closesAt: new Date('2026-03-01T17:00:00+11:00'),
      resolvesBy: new Date('2026-03-02T12:00:00+11:00'),
      settlesBy: new Date('2026-03-07T12:00:00+11:00'),
      initialYesPrice: 25,
      currentYesPrice: 25,
      currentNoPrice: 75,
      volume: 180000,
      liquidity: 67000,
      rulesText: 'Resolves to the winner of Best Picture at the 98th Academy Awards.',
      outcomes: [
        { label: 'The Brutalist', position: 0, initialPrice: 25, currentPrice: 25, color: '#6B7280' },
        { label: 'Anora', position: 1, initialPrice: 22, currentPrice: 22, color: '#EC4899' },
        { label: 'Emilia Pérez', position: 2, initialPrice: 18, currentPrice: 18, color: '#F59E0B' },
      ],
    },
  ];

  for (const marketData of sampleMarkets) {
    const { outcomes, ...market } = marketData;

    const existingMarket = await prisma.market.findUnique({
      where: { slug: market.slug },
    });

    if (!existingMarket) {
      const createdMarket = await prisma.market.create({
        data: {
          ...market,
          constraints: JSON.stringify({}),
          rulesStructured: JSON.stringify({}),
          createdById: adminUserId,
        },
      });

      // Create outcomes
      if (outcomes && outcomes.length > 0) {
        await prisma.marketOutcome.createMany({
          data: outcomes.map((o) => ({
            marketId: createdMarket.id,
            label: o.label,
            position: o.position,
            initialPrice: o.initialPrice,
            currentPrice: o.currentPrice,
            color: o.color,
          })),
        });
      } else {
        // Binary market - create Yes/No outcomes
        await prisma.marketOutcome.createMany({
          data: [
            {
              marketId: createdMarket.id,
              label: 'Yes',
              position: 0,
              initialPrice: market.initialYesPrice,
              currentPrice: market.currentYesPrice,
              color: '#22C55E',
            },
            {
              marketId: createdMarket.id,
              label: 'No',
              position: 1,
              initialPrice: market.currentNoPrice,
              currentPrice: market.currentNoPrice,
              color: '#EF4444',
            },
          ],
        });
      }

      console.log('Created market:', market.title);
    } else {
      console.log('Market already exists:', market.slug);
    }
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
