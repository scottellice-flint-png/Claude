import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Use direct URL for seeding to avoid PgBouncer prepared statement issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

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
  const economicsCategory = categories.find(c => c.slug === 'economics');
  const climateCategory = categories.find(c => c.slug === 'climate');
  const cultureCategory = categories.find(c => c.slug === 'culture');
  const worldCategory = categories.find(c => c.slug === 'world');

  const sampleMarkets = [
    // ==========================================
    // POLITICS - Elections & Governance
    // ==========================================
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
      initialYesPrice: 72,
      currentYesPrice: 72,
      currentNoPrice: 28,
      volume: 485000,
      liquidity: 178000,
      rulesText: 'Resolves Yes if writs are issued before September 1, 2026 AEST.',
    },
    {
      slug: 'labor-form-government',
      title: 'Will Labor form government after the next Federal Election?',
      shortDescription: 'Labor government formation prediction',
      description: 'Resolves Yes if the Australian Labor Party forms government (majority or minority) following the next Federal Election.',
      status: 'published',
      categoryId: politicsCategory?.id || categories[0].id,
      marketType: 'binary',
      icon: '🏛️',
      closesAt: new Date('2026-05-21T18:00:00+10:00'),
      resolvesBy: new Date('2026-06-01T12:00:00+10:00'),
      settlesBy: new Date('2026-06-05T12:00:00+10:00'),
      initialYesPrice: 57,
      currentYesPrice: 57,
      currentNoPrice: 43,
      volume: 485000,
      liquidity: 178000,
      rulesText: 'Resolution source: Parliament of Australia.',
    },
    {
      slug: 'stage-3-tax-cuts-amended',
      title: 'Will the Federal Government amend Stage 3 tax cuts before the 2026 Budget?',
      shortDescription: 'Stage 3 tax cuts amendment prediction',
      description: 'Resolves Yes if the Australian Federal Government passes legislation amending the Stage 3 tax cuts before the 2026-27 Federal Budget is handed down.',
      status: 'published',
      categoryId: politicsCategory?.id || categories[0].id,
      marketType: 'binary',
      icon: '💰',
      closesAt: new Date('2026-05-01T23:59:00+10:00'),
      resolvesBy: new Date('2026-05-15T12:00:00+10:00'),
      settlesBy: new Date('2026-05-20T12:00:00+10:00'),
      initialYesPrice: 35,
      currentYesPrice: 35,
      currentNoPrice: 65,
      volume: 156000,
      liquidity: 58000,
      rulesText: 'Resolution based on Parliament of Australia records.',
    },
    // ==========================================
    // SPORTS - Tennis
    // ==========================================
    {
      slug: 'australian-open-mens-winner-2026',
      title: "Men's Australian Open Winner",
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
      ],
    },
    // ==========================================
    // SPORTS - Australian Rules
    // ==========================================
    {
      slug: 'tasmania-afl-19th-licence',
      title: "Will Tasmania get AFL's 19th licence by 2027?",
      shortDescription: 'Tasmania AFL team prediction',
      description: 'Resolves Yes if the AFL officially announces Tasmania as the 19th AFL team before January 1, 2027.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'binary',
      icon: '🏉',
      closesAt: new Date('2026-12-31T23:59:00+11:00'),
      resolvesBy: new Date('2027-01-05T12:00:00+11:00'),
      settlesBy: new Date('2027-01-10T12:00:00+11:00'),
      initialYesPrice: 89,
      currentYesPrice: 89,
      currentNoPrice: 11,
      volume: 124000,
      liquidity: 45000,
      rulesText: 'Resolution based on AFL official announcement.',
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
      volume: 1300000,
      liquidity: 465000,
      rulesText: 'Resolves to the winner of the 2026 AFL Grand Final.',
      outcomes: [
        { label: 'Collingwood', position: 0, initialPrice: 18, currentPrice: 18, color: '#000000' },
        { label: 'Brisbane Lions', position: 1, initialPrice: 15, currentPrice: 15, color: '#A61F3D' },
      ],
    },
    // ==========================================
    // SPORTS - Rugby League (NRL)
    // ==========================================
    {
      slug: 'nrl-premiership-2026',
      title: 'Who will win the 2026 NRL Premiership?',
      shortDescription: '2026 NRL Grand Final winner',
      description: 'Resolves based on the winner of the 2026 NRL Grand Final.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🏈',
      isFeatured: true,
      closesAt: new Date('2026-10-04T19:30:00+10:00'),
      resolvesBy: new Date('2026-10-05T12:00:00+10:00'),
      settlesBy: new Date('2026-10-10T12:00:00+10:00'),
      initialYesPrice: 24,
      currentYesPrice: 24,
      currentNoPrice: 76,
      volume: 780000,
      liquidity: 285000,
      rulesText: 'Resolves to the winner of the 2026 NRL Grand Final.',
      outcomes: [
        { label: 'Penrith Panthers', position: 0, initialPrice: 24, currentPrice: 24, color: '#2D2D2D' },
        { label: 'Melbourne Storm', position: 1, initialPrice: 18, currentPrice: 18, color: '#6A2C91' },
      ],
    },
    // ==========================================
    // SPORTS - Racing
    // ==========================================
    {
      slug: 'melbourne-cup-2026',
      title: 'Who will win the 2026 Melbourne Cup?',
      shortDescription: '2026 Melbourne Cup winner',
      description: 'Resolves to the winner of the 2026 Melbourne Cup at Flemington Racecourse.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🏇',
      isFeatured: true,
      closesAt: new Date('2026-11-03T14:00:00+11:00'),
      resolvesBy: new Date('2026-11-03T16:00:00+11:00'),
      settlesBy: new Date('2026-11-08T12:00:00+11:00'),
      initialYesPrice: 55,
      currentYesPrice: 55,
      currentNoPrice: 45,
      volume: 1900000,
      liquidity: 680000,
      rulesText: 'Resolves to the official winner of the 2026 Melbourne Cup.',
      outcomes: [
        { label: 'Field (other)', position: 0, initialPrice: 55, currentPrice: 55, color: '#6B7280' },
        { label: 'Without A Fight', position: 1, initialPrice: 15, currentPrice: 15, color: '#10B981' },
      ],
    },
    {
      slug: 'cox-plate-2026',
      title: 'Who will win the 2026 Cox Plate?',
      shortDescription: '2026 Cox Plate winner',
      description: 'Resolves to the winner of the 2026 Cox Plate at Moonee Valley.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🏇',
      closesAt: new Date('2026-10-24T15:00:00+11:00'),
      resolvesBy: new Date('2026-10-24T17:00:00+11:00'),
      settlesBy: new Date('2026-10-29T12:00:00+11:00'),
      initialYesPrice: 45,
      currentYesPrice: 45,
      currentNoPrice: 55,
      volume: 580000,
      liquidity: 212000,
      rulesText: 'Resolves to the official winner of the 2026 Cox Plate.',
      outcomes: [
        { label: 'Field (other)', position: 0, initialPrice: 45, currentPrice: 45, color: '#6B7280' },
        { label: 'Pride Of Jenni', position: 1, initialPrice: 22, currentPrice: 22, color: '#EC4899' },
      ],
    },
    // ==========================================
    // SPORTS - Rugby Union
    // ==========================================
    {
      slug: 'rugby-world-cup-2027',
      title: 'Who will win the next Rugby World Cup?',
      shortDescription: '2027 Rugby World Cup winner',
      description: 'Resolves based on the winner of the 2027 Rugby World Cup in Australia.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🏉',
      isFeatured: true,
      closesAt: new Date('2027-11-13T20:00:00+11:00'),
      resolvesBy: new Date('2027-11-14T12:00:00+11:00'),
      settlesBy: new Date('2027-11-19T12:00:00+11:00'),
      initialYesPrice: 22,
      currentYesPrice: 22,
      currentNoPrice: 78,
      volume: 685000,
      liquidity: 250000,
      rulesText: 'Resolves to the winner of the 2027 Rugby World Cup Final.',
      outcomes: [
        { label: 'New Zealand', position: 0, initialPrice: 22, currentPrice: 22, color: '#000000' },
        { label: 'South Africa', position: 1, initialPrice: 20, currentPrice: 20, color: '#007A33' },
      ],
    },
    // ==========================================
    // SPORTS - Cricket
    // ==========================================
    {
      slug: 'icc-cricket-world-cup',
      title: 'Who will win the next ICC Cricket World Cup?',
      shortDescription: 'ICC Cricket World Cup winner',
      description: 'Resolves based on the winner of the next ICC Cricket World Cup.',
      status: 'published',
      categoryId: sportsCategory?.id || categories[2].id,
      marketType: 'multi_outcome',
      icon: '🏏',
      closesAt: new Date('2027-11-20T18:00:00+05:30'),
      resolvesBy: new Date('2027-11-21T12:00:00+05:30'),
      settlesBy: new Date('2027-11-26T12:00:00+05:30'),
      initialYesPrice: 25,
      currentYesPrice: 25,
      currentNoPrice: 75,
      volume: 425000,
      liquidity: 156000,
      rulesText: 'Resolves to the winner of the ICC Cricket World Cup Final.',
      outcomes: [
        { label: 'India', position: 0, initialPrice: 25, currentPrice: 25, color: '#0066CC' },
        { label: 'Australia', position: 1, initialPrice: 20, currentPrice: 20, color: '#FFD700' },
      ],
    },
    // ==========================================
    // ECONOMICS - Monetary Policy
    // ==========================================
    {
      slug: 'rba-rate-decision-feb-2026',
      title: 'RBA rate decision Feb 2026?',
      shortDescription: 'RBA interest rate decision prediction',
      description: 'Resolves based on the Reserve Bank of Australia cash rate decision at the February 2026 monetary policy meeting.',
      status: 'published',
      categoryId: economicsCategory?.id || categories[1].id,
      marketType: 'multi_outcome',
      icon: '🏦',
      isFeatured: true,
      closesAt: new Date('2026-02-17T14:30:00+11:00'),
      resolvesBy: new Date('2026-02-18T12:00:00+11:00'),
      settlesBy: new Date('2026-02-23T12:00:00+11:00'),
      initialYesPrice: 72,
      currentYesPrice: 72,
      currentNoPrice: 28,
      volume: 485000,
      liquidity: 178000,
      rulesText: 'Resolves based on RBA official announcement.',
      outcomes: [
        { label: 'Hold', position: 0, initialPrice: 72, currentPrice: 72, color: '#6B7280' },
        { label: 'Cut 25bps', position: 1, initialPrice: 20, currentPrice: 20, color: '#10B981' },
      ],
    },
    {
      slug: 'australia-cpi-below-3',
      title: "Australia's CPI below 3.0%?",
      shortDescription: 'CPI inflation prediction',
      description: 'Resolves Yes if the Australian Bureau of Statistics reports annual CPI below 3.0% in the next quarterly release.',
      status: 'published',
      categoryId: economicsCategory?.id || categories[1].id,
      marketType: 'binary',
      icon: '📊',
      closesAt: new Date('2026-04-28T11:30:00+10:00'),
      resolvesBy: new Date('2026-04-29T12:00:00+10:00'),
      settlesBy: new Date('2026-05-04T12:00:00+10:00'),
      initialYesPrice: 67,
      currentYesPrice: 67,
      currentNoPrice: 33,
      volume: 285000,
      liquidity: 104000,
      rulesText: 'Resolution source: ABS.',
    },
    {
      slug: 'perth-median-dwelling-850k',
      title: "Perth median dwelling >$850k by Dec 2026?",
      shortDescription: 'Perth property price prediction',
      description: "Resolves Yes if CoreLogic reports Perth's median dwelling value exceeds $850,000 AUD at any point before December 31, 2026.",
      status: 'published',
      categoryId: economicsCategory?.id || categories[1].id,
      marketType: 'binary',
      icon: '🏠',
      closesAt: new Date('2026-12-31T23:59:00+08:00'),
      resolvesBy: new Date('2027-01-05T12:00:00+08:00'),
      settlesBy: new Date('2027-01-10T12:00:00+08:00'),
      initialYesPrice: 71,
      currentYesPrice: 71,
      currentNoPrice: 29,
      volume: 125000,
      liquidity: 46000,
      rulesText: 'Resolution source: CoreLogic.',
    },
    // ==========================================
    // CLIMATE
    // ==========================================
    {
      slug: 'la-nina-declared-oct-2026',
      title: 'La Nina declared by Oct 2026?',
      shortDescription: 'La Nina weather prediction',
      description: 'Resolves Yes if the Australian Bureau of Meteorology officially declares La Nina conditions before November 1, 2026.',
      status: 'published',
      categoryId: climateCategory?.id || categories[3].id,
      marketType: 'binary',
      icon: '🌧️',
      closesAt: new Date('2026-10-31T23:59:00+11:00'),
      resolvesBy: new Date('2026-11-05T12:00:00+11:00'),
      settlesBy: new Date('2026-11-10T12:00:00+11:00'),
      initialYesPrice: 45,
      currentYesPrice: 45,
      currentNoPrice: 55,
      volume: 68000,
      liquidity: 25000,
      rulesText: 'Resolution source: BOM.',
    },
    {
      slug: 'hottest-year-2026',
      title: 'Will 2026 be the hottest year on record globally?',
      shortDescription: 'Global temperature record prediction',
      description: 'Resolves Yes if 2026 is confirmed as the hottest year on record by NASA or NOAA.',
      status: 'published',
      categoryId: climateCategory?.id || categories[3].id,
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
    // ==========================================
    // CULTURE
    // ==========================================
    {
      slug: 'next-james-bond',
      title: 'Who will be the next James Bond?',
      shortDescription: 'Next James Bond actor prediction',
      description: 'Resolves based on the actor officially announced as the next James Bond.',
      status: 'published',
      categoryId: cultureCategory?.id || categories[4].id,
      marketType: 'multi_outcome',
      icon: '🎬',
      closesAt: new Date('2026-12-31T23:59:00Z'),
      resolvesBy: new Date('2027-01-10T12:00:00Z'),
      settlesBy: new Date('2027-01-15T12:00:00Z'),
      initialYesPrice: 62,
      currentYesPrice: 62,
      currentNoPrice: 38,
      volume: 285000,
      liquidity: 104000,
      rulesText: 'Resolution based on official EON Productions announcement.',
      outcomes: [
        { label: 'Aaron Taylor-Johnson', position: 0, initialPrice: 62, currentPrice: 62, color: '#1F2937' },
        { label: 'Regé-Jean Page', position: 1, initialPrice: 21, currentPrice: 21, color: '#7C3AED' },
      ],
    },
    {
      slug: 'australian-film-oscar-2026',
      title: 'Australian film to win Oscar 2026?',
      shortDescription: 'Australian Oscar winner prediction',
      description: 'Resolves Yes if any film primarily produced in Australia wins at least one Academy Award at the 2026 Oscars ceremony.',
      status: 'published',
      categoryId: cultureCategory?.id || categories[4].id,
      marketType: 'binary',
      icon: '🏆',
      closesAt: new Date('2026-03-01T23:59:00-08:00'),
      resolvesBy: new Date('2026-03-05T12:00:00-08:00'),
      settlesBy: new Date('2026-03-10T12:00:00-08:00'),
      initialYesPrice: 28,
      currentYesPrice: 28,
      currentNoPrice: 72,
      volume: 78000,
      liquidity: 28500,
      rulesText: 'Resolution source: AMPAS.',
    },
    {
      slug: 'australia-eurovision-top5-2026',
      title: 'Australia top 5 Eurovision 2026?',
      shortDescription: 'Eurovision performance prediction',
      description: "Resolves Yes if Australia's entry finishes in the top 5 of the Eurovision Song Contest 2026 Grand Final.",
      status: 'published',
      categoryId: cultureCategory?.id || categories[4].id,
      marketType: 'binary',
      icon: '🎤',
      closesAt: new Date('2026-05-16T23:59:00+02:00'),
      resolvesBy: new Date('2026-05-18T12:00:00+02:00'),
      settlesBy: new Date('2026-05-23T12:00:00+02:00'),
      initialYesPrice: 18,
      currentYesPrice: 18,
      currentNoPrice: 82,
      volume: 52000,
      liquidity: 19000,
      rulesText: 'Resolution source: Eurovision.',
    },
    // ==========================================
    // WORLD
    // ==========================================
    {
      slug: '2028-us-presidential-election',
      title: 'Who will win the 2028 US Presidential Election?',
      shortDescription: '2028 US Presidential Election winner',
      description: 'Resolves based on the winner of the 2028 United States Presidential Election as certified by Congress.',
      status: 'published',
      categoryId: worldCategory?.id || categories[5].id,
      marketType: 'multi_outcome',
      icon: '🇺🇸',
      isFeatured: true,
      closesAt: new Date('2028-11-05T23:59:00-05:00'),
      resolvesBy: new Date('2028-11-10T12:00:00-05:00'),
      settlesBy: new Date('2028-11-15T12:00:00-05:00'),
      initialYesPrice: 48,
      currentYesPrice: 48,
      currentNoPrice: 52,
      volume: 3200000,
      liquidity: 1170000,
      rulesText: 'Resolution based on Congress certification.',
      outcomes: [
        { label: 'Democratic', position: 0, initialPrice: 48, currentPrice: 48, color: '#2563EB' },
        { label: 'Republican', position: 1, initialPrice: 45, currentPrice: 45, color: '#DC2626' },
      ],
    },
    {
      slug: '2028-us-presidential-party',
      title: 'Which party wins the 2028 US Presidential Election?',
      shortDescription: '2028 US Presidential party prediction',
      description: 'Resolves based on which party wins the 2028 US Presidential Election as certified by Congress.',
      status: 'published',
      categoryId: worldCategory?.id || categories[5].id,
      marketType: 'multi_outcome',
      icon: '🇺🇸',
      closesAt: new Date('2028-11-05T23:59:00-05:00'),
      resolvesBy: new Date('2028-11-15T12:00:00-05:00'),
      settlesBy: new Date('2028-11-20T12:00:00-05:00'),
      initialYesPrice: 48,
      currentYesPrice: 48,
      currentNoPrice: 52,
      volume: 3450000,
      liquidity: 1260000,
      rulesText: 'Resolution based on Congress certification.',
      outcomes: [
        { label: 'Democratic', position: 0, initialPrice: 48, currentPrice: 48, color: '#2563EB' },
        { label: 'Republican', position: 1, initialPrice: 46, currentPrice: 46, color: '#DC2626' },
      ],
    },
    {
      slug: 'us-federal-reserve-rate-cut',
      title: 'Will the US Federal Reserve cut rates at its next meeting?',
      shortDescription: 'Fed rate cut prediction',
      description: 'Resolves Yes if the Federal Reserve announces a federal funds rate cut at the next FOMC meeting.',
      status: 'published',
      categoryId: worldCategory?.id || categories[5].id,
      marketType: 'binary',
      icon: '🏛️',
      closesAt: new Date('2026-03-18T18:00:00-04:00'),
      resolvesBy: new Date('2026-03-19T12:00:00-04:00'),
      settlesBy: new Date('2026-03-24T12:00:00-04:00'),
      initialYesPrice: 64,
      currentYesPrice: 64,
      currentNoPrice: 36,
      volume: 485000,
      liquidity: 156000,
      rulesText: 'Resolution source: Federal Reserve.',
    },
    {
      slug: 'bitcoin-all-time-high-2026',
      title: 'Will Bitcoin reach a new all-time high in 2026?',
      shortDescription: 'Bitcoin ATH prediction',
      description: 'Resolves Yes if Bitcoin (BTC) reaches a new all-time high price in USD at any point during 2026, based on CoinGecko data.',
      status: 'published',
      categoryId: worldCategory?.id || categories[5].id,
      marketType: 'binary',
      icon: '₿',
      closesAt: new Date('2026-12-31T23:59:00Z'),
      resolvesBy: new Date('2027-01-02T12:00:00Z'),
      settlesBy: new Date('2027-01-07T12:00:00Z'),
      initialYesPrice: 71,
      currentYesPrice: 71,
      currentNoPrice: 29,
      volume: 485000,
      liquidity: 178000,
      rulesText: 'Resolution source: CoinGecko.',
    },
    {
      slug: 'fifa-world-cup-2026',
      title: 'Who will win the 2026 FIFA World Cup?',
      shortDescription: '2026 FIFA World Cup winner',
      description: 'Resolves based on the winner of the 2026 FIFA World Cup held in USA, Canada, and Mexico.',
      status: 'published',
      categoryId: worldCategory?.id || categories[5].id,
      marketType: 'multi_outcome',
      icon: '⚽',
      isFeatured: true,
      closesAt: new Date('2026-07-19T20:00:00-04:00'),
      resolvesBy: new Date('2026-07-20T12:00:00-04:00'),
      settlesBy: new Date('2026-07-25T12:00:00-04:00'),
      initialYesPrice: 18,
      currentYesPrice: 18,
      currentNoPrice: 82,
      volume: 2100000,
      liquidity: 770000,
      rulesText: 'Resolution based on FIFA official results.',
      outcomes: [
        { label: 'Brazil', position: 0, initialPrice: 18, currentPrice: 18, color: '#009739' },
        { label: 'France', position: 1, initialPrice: 15, currentPrice: 15, color: '#0055A4' },
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
