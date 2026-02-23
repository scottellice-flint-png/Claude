import { create } from 'zustand';
import { Market, Order, Position, User, Trade, OrderBook, Comment, MarketRules } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data - Australian-focused markets
const mockMarkets: Market[] = [
  // Politics
  {
    id: '1',
    title: 'Who will win the next Australian Federal Election?',
    description: 'This market resolves to Yes if the Australian Labor Party wins the next Federal Election. Resolves No if the Liberal-National Coalition wins.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-05-25T12:00:00+10:00',
    yesPrice: 52,
    noPrice: 48,
    volume: 0,
    liquidity: 890000,
    createdAt: '2025-01-15T10:00:00+10:00',
    icon: '🗳️',
    isFeatured: true,
    outcomes: [
      { id: '1-labor', name: 'Labor', probability: 52, yesPrice: 52, noPrice: 48 },
      { id: '1-coalition', name: 'Coalition', probability: 41, yesPrice: 41, noPrice: 59 },
      { id: '1-other', name: 'Other', probability: 7, yesPrice: 7, noPrice: 93 },
    ],
  },
  {
    id: '2',
    title: 'Will a Federal Election be called before September 2026?',
    description: 'Resolves Yes if the Governor-General dissolves the House of Representatives and issues writs for a federal election before September 1, 2026.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-08-31T23:59:00+10:00',
    settlementDate: '2026-09-02T12:00:00+10:00',
    yesPrice: 78,
    noPrice: 22,
    volume: 0,
    liquidity: 178000,
    createdAt: '2025-02-01T14:30:00+10:00',
    icon: '📅',
  },
  {
    id: '3',
    title: 'Will the Federal Government amend Stage 3 tax cuts before the 2026 Budget?',
    description: 'Resolves Yes if the Australian Federal Government passes legislation amending the Stage 3 tax cuts before the 2026-27 Federal Budget is handed down.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-01T23:59:00+10:00',
    settlementDate: '2026-05-15T12:00:00+10:00',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 58000,
    createdAt: '2025-01-20T09:00:00+10:00',
    icon: '💰',
  },
  // Sports - Tennis
  {
    id: '4',
    title: "Men's Australian Open Winner",
    description: "Resolves Yes if Novak Djokovic wins the Australian Open 2026 Men's Singles Final against Jannik Sinner. Resolves No if Sinner wins.",
    category: 'sports',
    sport: 'tennis',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-01-26T19:00:00+11:00',
    settlementDate: '2026-01-27T12:00:00+11:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 0,
    liquidity: 345000,
    createdAt: '2025-01-10T08:00:00+11:00',
    icon: '🎾',
    outcomes: [
      { id: '4-sinner', name: 'Jannik Sinner', probability: 53, yesPrice: 53, noPrice: 47 },
      { id: '4-djokovic', name: 'Novak Djokovic', probability: 42, yesPrice: 42, noPrice: 58 },
    ],
  },
  {
    id: 'tennis-2',
    title: 'Will the Australian Open Final go to 5 sets?',
    description: "Resolves Yes if the Men's Australian Open Final goes to a fifth set.",
    category: 'sports',
    sport: 'tennis',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-01-26T19:00:00+11:00',
    settlementDate: '2026-01-27T12:00:00+11:00',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 15800,
    createdAt: '2025-01-15T10:00:00+11:00',
    icon: '🎾',
  },
  {
    id: 'tennis-3',
    title: 'Will Carlos Alcaraz win his next match?',
    description: 'Resolves Yes if Carlos Alcaraz wins his next ATP Tour match.',
    category: 'sports',
    sport: 'tennis',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-02-10T18:00:00+11:00',
    settlementDate: '2026-02-11T12:00:00+11:00',
    yesPrice: 78,
    noPrice: 22,
    volume: 0,
    liquidity: 6800,
    createdAt: '2025-02-01T10:00:00+11:00',
    icon: '🎾',
  },
  // Sports - Australian Rules
  {
    id: '5',
    title: "Will Tasmania get AFL's 19th licence by 2027?",
    description: 'Resolves Yes if the AFL officially announces Tasmania as the 19th AFL team before January 1, 2027.',
    category: 'sports',
    sport: 'australian-rules',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+11:00',
    settlementDate: '2027-01-05T12:00:00+11:00',
    yesPrice: 89,
    noPrice: 11,
    volume: 0,
    liquidity: 45000,
    createdAt: '2025-02-15T10:00:00+11:00',
    icon: '🏉',
  },
  {
    id: 'afl-2',
    title: 'Who will win the 2026 AFL Premiership?',
    description: 'Resolves based on the winner of the 2026 AFL Grand Final.',
    category: 'sports',
    sport: 'australian-rules',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-09-26T17:00:00+10:00',
    settlementDate: '2026-09-27T12:00:00+10:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 465000,
    createdAt: '2025-01-20T10:00:00+11:00',
    icon: '🏉',
    outcomes: [
      { id: 'afl-2-collingwood', name: 'Collingwood', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'afl-2-brisbane', name: 'Brisbane Lions', probability: 15, yesPrice: 15, noPrice: 85 },
      { id: 'afl-2-carlton', name: 'Carlton', probability: 12, yesPrice: 12, noPrice: 88 },
    ],
  },
  {
    id: 'afl-3',
    title: 'Will Collingwood win this weekend?',
    description: 'Resolves Yes if Collingwood wins their Round 5 match.',
    category: 'sports',
    sport: 'australian-rules',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-04-18T19:30:00+10:00',
    settlementDate: '2026-04-19T12:00:00+10:00',
    yesPrice: 62,
    noPrice: 38,
    volume: 0,
    liquidity: 12800,
    createdAt: '2025-04-10T10:00:00+10:00',
    icon: '🏉',
  },
  {
    id: 'afl-4',
    title: 'Who will win the 2026 Brownlow Medal?',
    description: 'Resolves based on the winner of the 2026 Brownlow Medal.',
    category: 'sports',
    sport: 'australian-rules',
    sportSubcategory: 'awards',
    status: 'open',
    closeDate: '2026-09-20T19:00:00+10:00',
    settlementDate: '2026-09-21T12:00:00+10:00',
    yesPrice: 22,
    noPrice: 78,
    volume: 0,
    liquidity: 142000,
    createdAt: '2025-03-01T10:00:00+11:00',
    icon: '🏆',
    outcomes: [
      { id: 'afl-4-bontempelli', name: 'Marcus Bontempelli', probability: 22, yesPrice: 22, noPrice: 78 },
      { id: 'afl-4-miller', name: 'Touk Miller', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'afl-4-wines', name: 'Ollie Wines', probability: 14, yesPrice: 14, noPrice: 86 },
    ],
  },
  // Sports - Rugby League
  {
    id: '6',
    title: 'NRL Grand Final outside Sydney 2026?',
    description: 'Resolves Yes if the 2026 NRL Grand Final is held at a venue outside of Sydney. Accredited Stadium (Sydney) resolves No.',
    category: 'sports',
    sport: 'rugby-league',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-10-01T23:59:00+10:00',
    settlementDate: '2026-10-05T12:00:00+10:00',
    yesPrice: 15,
    noPrice: 85,
    volume: 0,
    liquidity: 24500,
    createdAt: '2025-03-10T15:00:00+11:00',
    icon: '🏈',
  },
  {
    id: 'nrl-2',
    title: 'Who will win the 2026 NRL Premiership?',
    description: 'Resolves based on the winner of the 2026 NRL Grand Final.',
    category: 'sports',
    sport: 'rugby-league',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-10-04T19:30:00+10:00',
    settlementDate: '2026-10-05T12:00:00+10:00',
    yesPrice: 24,
    noPrice: 76,
    volume: 0,
    liquidity: 285000,
    createdAt: '2025-02-01T10:00:00+11:00',
    icon: '🏈',
    outcomes: [
      { id: 'nrl-2-panthers', name: 'Penrith Panthers', probability: 24, yesPrice: 24, noPrice: 76 },
      { id: 'nrl-2-storm', name: 'Melbourne Storm', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'nrl-2-roosters', name: 'Sydney Roosters', probability: 14, yesPrice: 14, noPrice: 86 },
    ],
  },
  {
    id: 'nrl-3',
    title: 'Will the Penrith Panthers win this weekend?',
    description: 'Resolves Yes if the Penrith Panthers win their Round 8 NRL match.',
    category: 'sports',
    sport: 'rugby-league',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-05-02T19:55:00+10:00',
    settlementDate: '2026-05-03T12:00:00+10:00',
    yesPrice: 72,
    noPrice: 28,
    volume: 0,
    liquidity: 10400,
    createdAt: '2025-04-28T10:00:00+10:00',
    icon: '🏈',
  },
  {
    id: 'nrl-4',
    title: 'Will there be a sin bin in the NRL Grand Final?',
    description: 'Resolves Yes if any player is sent to the sin bin during the 2026 NRL Grand Final.',
    category: 'sports',
    sport: 'rugby-league',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-10-04T19:30:00+10:00',
    settlementDate: '2026-10-05T12:00:00+10:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 0,
    liquidity: 5800,
    createdAt: '2025-03-15T10:00:00+11:00',
    icon: '🏈',
  },
  // Sports - American Football
  {
    id: 'nfl-1',
    title: 'Who will win the next Super Bowl?',
    description: 'Resolves based on the winner of Super Bowl LXI.',
    category: 'sports',
    sport: 'american-football',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2027-02-14T18:30:00-05:00',
    settlementDate: '2027-02-15T12:00:00-05:00',
    yesPrice: 15,
    noPrice: 85,
    volume: 0,
    liquidity: 89000,
    createdAt: '2025-02-10T10:00:00Z',
    icon: '🏈',
    outcomes: [
      { id: 'nfl-1-chiefs', name: 'Kansas City Chiefs', probability: 15, yesPrice: 15, noPrice: 85 },
      { id: 'nfl-1-eagles', name: 'Philadelphia Eagles', probability: 12, yesPrice: 12, noPrice: 88 },
      { id: 'nfl-1-bills', name: 'Buffalo Bills', probability: 10, yesPrice: 10, noPrice: 90 },
    ],
  },
  {
    id: 'nfl-2',
    title: 'Will the Kansas City Chiefs win their next game?',
    description: 'Resolves Yes if the Kansas City Chiefs win their next regular season game.',
    category: 'sports',
    sport: 'american-football',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-09-13T13:00:00-05:00',
    settlementDate: '2026-09-14T12:00:00-05:00',
    yesPrice: 68,
    noPrice: 32,
    volume: 0,
    liquidity: 11800,
    createdAt: '2025-09-01T10:00:00Z',
    icon: '🏈',
  },
  {
    id: 'nfl-3',
    title: 'Will there be a defensive touchdown in the Super Bowl?',
    description: 'Resolves Yes if any team scores a defensive or special teams touchdown in Super Bowl LXI.',
    category: 'sports',
    sport: 'american-football',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2027-02-14T18:30:00-05:00',
    settlementDate: '2027-02-15T12:00:00-05:00',
    yesPrice: 28,
    noPrice: 72,
    volume: 0,
    liquidity: 6800,
    createdAt: '2025-02-01T10:00:00Z',
    icon: '🏈',
  },
  // Sports - Basketball
  {
    id: 'nba-1',
    title: 'Who will win the next NBA Championship?',
    description: 'Resolves based on the winner of the 2026 NBA Finals.',
    category: 'sports',
    sport: 'basketball',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-06-20T21:00:00-04:00',
    settlementDate: '2026-06-21T12:00:00-04:00',
    yesPrice: 22,
    noPrice: 78,
    volume: 0,
    liquidity: 68000,
    createdAt: '2025-01-15T10:00:00Z',
    icon: '🏀',
    outcomes: [
      { id: 'nba-1-celtics', name: 'Boston Celtics', probability: 22, yesPrice: 22, noPrice: 78 },
      { id: 'nba-1-nuggets', name: 'Denver Nuggets', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'nba-1-thunder', name: 'OKC Thunder', probability: 15, yesPrice: 15, noPrice: 85 },
    ],
  },
  {
    id: 'nba-2',
    title: 'Will the Boston Celtics win their next game?',
    description: 'Resolves Yes if the Boston Celtics win their next regular season game.',
    category: 'sports',
    sport: 'basketball',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-02-15T19:30:00-05:00',
    settlementDate: '2026-02-16T12:00:00-05:00',
    yesPrice: 75,
    noPrice: 25,
    volume: 0,
    liquidity: 9000,
    createdAt: '2025-02-10T10:00:00Z',
    icon: '🏀',
  },
  {
    id: 'nba-3',
    title: 'Who will win NBA MVP this season?',
    description: 'Resolves based on the winner of the 2025-26 NBA MVP award.',
    category: 'sports',
    sport: 'basketball',
    sportSubcategory: 'awards',
    status: 'open',
    closeDate: '2026-06-01T12:00:00-04:00',
    settlementDate: '2026-06-02T12:00:00-04:00',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 28500,
    createdAt: '2025-01-20T10:00:00Z',
    icon: '🏆',
    outcomes: [
      { id: 'nba-3-jokic', name: 'Nikola Jokic', probability: 35, yesPrice: 35, noPrice: 65 },
      { id: 'nba-3-sga', name: 'Shai Gilgeous-Alexander', probability: 28, yesPrice: 28, noPrice: 72 },
      { id: 'nba-3-luka', name: 'Luka Doncic', probability: 18, yesPrice: 18, noPrice: 82 },
    ],
  },
  // Sports - Baseball
  {
    id: 'mlb-1',
    title: 'Who will win the next World Series?',
    description: 'Resolves based on the winner of the 2026 MLB World Series.',
    category: 'sports',
    sport: 'baseball',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-11-01T20:00:00-04:00',
    settlementDate: '2026-11-02T12:00:00-04:00',
    yesPrice: 12,
    noPrice: 88,
    volume: 0,
    liquidity: 35000,
    createdAt: '2025-03-01T10:00:00Z',
    icon: '⚾',
    outcomes: [
      { id: 'mlb-1-dodgers', name: 'LA Dodgers', probability: 12, yesPrice: 12, noPrice: 88 },
      { id: 'mlb-1-yankees', name: 'NY Yankees', probability: 10, yesPrice: 10, noPrice: 90 },
      { id: 'mlb-1-braves', name: 'Atlanta Braves', probability: 8, yesPrice: 8, noPrice: 92 },
    ],
  },
  {
    id: 'mlb-2',
    title: 'Will the New York Yankees win their next game?',
    description: 'Resolves Yes if the New York Yankees win their next regular season game.',
    category: 'sports',
    sport: 'baseball',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-04-15T19:05:00-04:00',
    settlementDate: '2026-04-16T12:00:00-04:00',
    yesPrice: 58,
    noPrice: 42,
    volume: 0,
    liquidity: 4600,
    createdAt: '2025-04-10T10:00:00Z',
    icon: '⚾',
  },
  {
    id: 'mlb-3',
    title: 'Will there be a grand slam in the World Series?',
    description: 'Resolves Yes if any player hits a grand slam during the 2026 World Series.',
    category: 'sports',
    sport: 'baseball',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-11-01T20:00:00-04:00',
    settlementDate: '2026-11-02T12:00:00-04:00',
    yesPrice: 45,
    noPrice: 55,
    volume: 0,
    liquidity: 3100,
    createdAt: '2025-03-15T10:00:00Z',
    icon: '⚾',
  },
  // Sports - Cricket
  {
    id: 'cricket-1',
    title: 'Will Australia win the next Test match?',
    description: 'Resolves Yes if Australia wins the next Test match in the current series.',
    category: 'sports',
    sport: 'cricket',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-01-10T10:00:00+11:00',
    settlementDate: '2026-01-15T12:00:00+11:00',
    yesPrice: 58,
    noPrice: 42,
    volume: 0,
    liquidity: 53000,
    createdAt: '2025-01-01T10:00:00+11:00',
    icon: '🏏',
  },
  {
    id: 'cricket-2',
    title: 'Who will win the next ICC Cricket World Cup?',
    description: 'Resolves based on the winner of the next ICC Cricket World Cup.',
    category: 'sports',
    sport: 'cricket',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2027-11-20T18:00:00+05:30',
    settlementDate: '2027-11-21T12:00:00+05:30',
    yesPrice: 25,
    noPrice: 75,
    volume: 0,
    liquidity: 156000,
    createdAt: '2025-01-15T10:00:00+11:00',
    icon: '🏏',
    outcomes: [
      { id: 'cricket-2-india', name: 'India', probability: 25, yesPrice: 25, noPrice: 75 },
      { id: 'cricket-2-australia', name: 'Australia', probability: 20, yesPrice: 20, noPrice: 80 },
      { id: 'cricket-2-england', name: 'England', probability: 15, yesPrice: 15, noPrice: 85 },
    ],
  },
  {
    id: 'cricket-3',
    title: 'Will the top scorer in the Test be Australian?',
    description: 'Resolves Yes if the highest individual scorer in the next Test match is an Australian player.',
    category: 'sports',
    sport: 'cricket',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-01-10T10:00:00+11:00',
    settlementDate: '2026-01-15T12:00:00+11:00',
    yesPrice: 52,
    noPrice: 48,
    volume: 0,
    liquidity: 10400,
    createdAt: '2025-01-05T10:00:00+11:00',
    icon: '🏏',
  },
  // Sports - Soccer
  {
    id: 'soccer-1',
    title: 'Who will win the next UEFA Champions League?',
    description: 'Resolves based on the winner of the 2025-26 UEFA Champions League.',
    category: 'sports',
    sport: 'soccer',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-05-30T21:00:00+02:00',
    settlementDate: '2026-05-31T12:00:00+02:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 104000,
    createdAt: '2025-02-01T10:00:00Z',
    icon: '⚽',
    outcomes: [
      { id: 'soccer-1-city', name: 'Manchester City', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'soccer-1-real', name: 'Real Madrid', probability: 15, yesPrice: 15, noPrice: 85 },
      { id: 'soccer-1-arsenal', name: 'Arsenal', probability: 12, yesPrice: 12, noPrice: 88 },
    ],
  },
  {
    id: 'soccer-2',
    title: 'Will Manchester City win their next match?',
    description: 'Resolves Yes if Manchester City wins their next Premier League match.',
    category: 'sports',
    sport: 'soccer',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-02-22T15:00:00Z',
    settlementDate: '2026-02-22T18:00:00Z',
    yesPrice: 72,
    noPrice: 28,
    volume: 0,
    liquidity: 16500,
    createdAt: '2025-02-15T10:00:00Z',
    icon: '⚽',
  },
  {
    id: 'soccer-3',
    title: 'Will there be a red card in the Champions League Final?',
    description: 'Resolves Yes if any player receives a red card in the 2026 UEFA Champions League Final.',
    category: 'sports',
    sport: 'soccer',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-05-30T21:00:00+02:00',
    settlementDate: '2026-05-31T12:00:00+02:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 6800,
    createdAt: '2025-02-10T10:00:00Z',
    icon: '⚽',
  },
  // Sports - Golf
  {
    id: 'golf-1',
    title: 'Who will win the next Masters Tournament?',
    description: 'Resolves based on the winner of the 2026 Masters Tournament at Augusta National.',
    category: 'sports',
    sport: 'golf',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-04-12T18:00:00-04:00',
    settlementDate: '2026-04-13T12:00:00-04:00',
    yesPrice: 8,
    noPrice: 92,
    volume: 0,
    liquidity: 35000,
    createdAt: '2025-01-20T10:00:00Z',
    icon: '⛳',
    outcomes: [
      { id: 'golf-1-scheffler', name: 'Scottie Scheffler', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'golf-1-mcilroy', name: 'Rory McIlroy', probability: 12, yesPrice: 12, noPrice: 88 },
      { id: 'golf-1-rahm', name: 'Jon Rahm', probability: 8, yesPrice: 8, noPrice: 92 },
    ],
  },
  {
    id: 'golf-2',
    title: 'Will Scottie Scheffler finish Top 10 at the Masters?',
    description: 'Resolves Yes if Scottie Scheffler finishes in the Top 10 at the 2026 Masters.',
    category: 'sports',
    sport: 'golf',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-04-12T18:00:00-04:00',
    settlementDate: '2026-04-13T12:00:00-04:00',
    yesPrice: 65,
    noPrice: 35,
    volume: 0,
    liquidity: 9000,
    createdAt: '2025-03-01T10:00:00Z',
    icon: '⛳',
  },
  {
    id: 'golf-3',
    title: 'Will the Masters winning score be under -10?',
    description: 'Resolves Yes if the winning score at the 2026 Masters is -11 or better.',
    category: 'sports',
    sport: 'golf',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-04-12T18:00:00-04:00',
    settlementDate: '2026-04-13T12:00:00-04:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 0,
    liquidity: 4600,
    createdAt: '2025-03-15T10:00:00Z',
    icon: '⛳',
  },
  // Sports - Rugby Union
  {
    id: 'rugby-union-1',
    title: 'Will the Wallabies win their next match?',
    description: 'Resolves Yes if the Australian Wallabies win their next Test match.',
    category: 'sports',
    sport: 'rugby-union',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-07-04T20:00:00+10:00',
    settlementDate: '2026-07-05T12:00:00+10:00',
    yesPrice: 45,
    noPrice: 55,
    volume: 0,
    liquidity: 25000,
    createdAt: '2025-06-15T10:00:00+10:00',
    icon: '🏉',
  },
  {
    id: 'rugby-union-2',
    title: 'Who will win the next Rugby World Cup?',
    description: 'Resolves based on the winner of the 2027 Rugby World Cup in Australia.',
    category: 'sports',
    sport: 'rugby-union',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2027-11-13T20:00:00+11:00',
    settlementDate: '2027-11-14T12:00:00+11:00',
    yesPrice: 22,
    noPrice: 78,
    volume: 0,
    liquidity: 250000,
    createdAt: '2025-01-10T10:00:00+11:00',
    icon: '🏉',
    outcomes: [
      { id: 'rugby-union-2-nz', name: 'New Zealand', probability: 22, yesPrice: 22, noPrice: 78 },
      { id: 'rugby-union-2-sa', name: 'South Africa', probability: 20, yesPrice: 20, noPrice: 80 },
      { id: 'rugby-union-2-ire', name: 'Ireland', probability: 18, yesPrice: 18, noPrice: 82 },
    ],
  },
  {
    id: 'rugby-union-3',
    title: 'Will either team score 3+ tries in the Wallabies match?',
    description: 'Resolves Yes if either team scores 3 or more tries in the next Wallabies Test.',
    category: 'sports',
    sport: 'rugby-union',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-07-04T20:00:00+10:00',
    settlementDate: '2026-07-05T12:00:00+10:00',
    yesPrice: 68,
    noPrice: 32,
    volume: 0,
    liquidity: 6800,
    createdAt: '2025-06-20T10:00:00+10:00',
    icon: '🏉',
  },
  // Sports - Boxing
  {
    id: 'boxing-1',
    title: 'Will Oleksandr Usyk defeat Tyson Fury in the rematch?',
    description: 'Resolves Yes if Oleksandr Usyk wins the rematch against Tyson Fury.',
    category: 'sports',
    sport: 'boxing',
    sportSubcategory: 'games',
    status: 'open',
    closeDate: '2026-03-15T22:00:00Z',
    settlementDate: '2026-03-16T12:00:00Z',
    yesPrice: 55,
    noPrice: 45,
    volume: 0,
    liquidity: 68000,
    createdAt: '2025-01-20T10:00:00Z',
    icon: '🥊',
  },
  {
    id: 'boxing-2',
    title: 'Will the Usyk vs Fury rematch go to decision?',
    description: 'Resolves Yes if the fight ends via judges decision (not KO/TKO/DQ).',
    category: 'sports',
    sport: 'boxing',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-03-15T22:00:00Z',
    settlementDate: '2026-03-16T12:00:00Z',
    yesPrice: 48,
    noPrice: 52,
    volume: 0,
    liquidity: 25000,
    createdAt: '2025-02-01T10:00:00Z',
    icon: '🥊',
  },
  {
    id: 'boxing-3',
    title: 'Will there be a new undisputed heavyweight champion in 2026?',
    description: 'Resolves Yes if someone other than the current champion holds all major belts by end of 2026.',
    category: 'sports',
    sport: 'boxing',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-02T12:00:00Z',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 15500,
    createdAt: '2025-01-15T10:00:00Z',
    icon: '🥊',
  },
  // Racing
  {
    id: 'racing-1',
    title: 'Who will win the 2026 Melbourne Cup?',
    description: 'Resolves to the winner of the 2026 Melbourne Cup at Flemington Racecourse.',
    category: 'sports',
    sport: 'racing',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-11-03T14:00:00+11:00',
    settlementDate: '2026-11-03T16:00:00+11:00',
    yesPrice: 15,
    noPrice: 85,
    volume: 0,
    liquidity: 680000,
    createdAt: '2025-01-10T10:00:00Z',
    icon: '🏇',
    outcomes: [
      { id: 'racing-1-field', name: 'Field (other)', probability: 55, yesPrice: 55, noPrice: 45 },
      { id: 'racing-1-without', name: 'Without A Fight', probability: 15, yesPrice: 15, noPrice: 85 },
      { id: 'racing-1-vauban', name: 'Vauban', probability: 12, yesPrice: 12, noPrice: 88 },
      { id: 'racing-1-buckaroo', name: 'Buckaroo', probability: 10, yesPrice: 10, noPrice: 90 },
      { id: 'racing-1-land', name: 'Land Legend', probability: 8, yesPrice: 8, noPrice: 92 },
    ],
  },
  {
    id: 'racing-2',
    title: 'Who will win the 2026 Cox Plate?',
    description: 'Resolves to the winner of the 2026 Cox Plate at Moonee Valley.',
    category: 'sports',
    sport: 'racing',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-10-24T15:00:00+11:00',
    settlementDate: '2026-10-24T17:00:00+11:00',
    yesPrice: 22,
    noPrice: 78,
    volume: 0,
    liquidity: 212000,
    createdAt: '2025-02-01T10:00:00Z',
    icon: '🏇',
    outcomes: [
      { id: 'racing-2-field', name: 'Field (other)', probability: 45, yesPrice: 45, noPrice: 55 },
      { id: 'racing-2-pride', name: 'Pride Of Jenni', probability: 22, yesPrice: 22, noPrice: 78 },
      { id: 'racing-2-mr', name: 'Mr Brightside', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'racing-2-romantic', name: 'Romantic Warrior', probability: 15, yesPrice: 15, noPrice: 85 },
    ],
  },
  {
    id: 'racing-3',
    title: 'Will an Australian-trained horse win The Everest 2026?',
    description: 'Resolves Yes if an Australian-trained horse wins The Everest at Royal Randwick.',
    category: 'sports',
    sport: 'racing',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-10-17T16:00:00+11:00',
    settlementDate: '2026-10-17T18:00:00+11:00',
    yesPrice: 78,
    noPrice: 22,
    volume: 0,
    liquidity: 156000,
    createdAt: '2025-01-20T10:00:00Z',
    icon: '🏇',
  },
  {
    id: 'racing-4',
    title: 'Will a mare win the 2026 Melbourne Cup?',
    description: 'Resolves Yes if a female horse (mare or filly) wins the 2026 Melbourne Cup.',
    category: 'sports',
    sport: 'racing',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-11-03T14:00:00+11:00',
    settlementDate: '2026-11-03T16:00:00+11:00',
    yesPrice: 28,
    noPrice: 72,
    volume: 0,
    liquidity: 68000,
    createdAt: '2025-02-05T10:00:00Z',
    icon: '🏇',
  },
  {
    id: 'racing-5',
    title: 'Golden Slipper 2026 winner?',
    description: 'Resolves to the winner of the 2026 Golden Slipper Stakes at Rosehill.',
    category: 'sports',
    sport: 'racing',
    sportSubcategory: 'futures',
    status: 'open',
    closeDate: '2026-03-21T15:00:00+11:00',
    settlementDate: '2026-03-21T17:00:00+11:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 126000,
    createdAt: '2025-01-25T10:00:00Z',
    icon: '🏇',
    outcomes: [
      { id: 'racing-5-field', name: 'Field (other)', probability: 60, yesPrice: 60, noPrice: 40 },
      { id: 'racing-5-storm', name: 'Storm Boy', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: 'racing-5-lady', name: 'Lady Of Camelot', probability: 14, yesPrice: 14, noPrice: 86 },
      { id: 'racing-5-blue', name: 'Blue Soldier', probability: 8, yesPrice: 8, noPrice: 92 },
    ],
  },
  {
    id: 'racing-6',
    title: 'Will the Melbourne Cup winning time be under 3:20?',
    description: 'Resolves Yes if the 2026 Melbourne Cup winning time is under 3 minutes 20 seconds.',
    category: 'sports',
    sport: 'racing',
    sportSubcategory: 'props',
    status: 'open',
    closeDate: '2026-11-03T14:00:00+11:00',
    settlementDate: '2026-11-03T16:00:00+11:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 0,
    liquidity: 16500,
    createdAt: '2025-02-10T10:00:00Z',
    icon: '🏇',
  },
  // Culture
  {
    id: '7',
    title: 'Who will be the next James Bond?',
    description: 'Resolves Yes if Aaron Taylor-Johnson is announced as the next James Bond. Resolves No for any other actor.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-10T12:00:00Z',
    yesPrice: 62,
    noPrice: 38,
    volume: 0,
    liquidity: 104000,
    createdAt: '2025-01-05T12:00:00Z',
    icon: '🎬',
    outcomes: [
      { id: '7-atj', name: 'Aaron Taylor-Johnson', probability: 62, yesPrice: 62, noPrice: 38 },
      { id: '7-regepage', name: 'Regé-Jean Page', probability: 21, yesPrice: 21, noPrice: 79 },
      { id: '7-other', name: 'Other', probability: 17, yesPrice: 17, noPrice: 83 },
    ],
  },
  {
    id: '8',
    title: 'Australian film to win Oscar 2026?',
    description: 'Resolves Yes if any film primarily produced in Australia wins at least one Academy Award at the 2026 Oscars ceremony.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-03-01T23:59:00-08:00',
    settlementDate: '2026-03-05T12:00:00-08:00',
    yesPrice: 28,
    noPrice: 72,
    volume: 0,
    liquidity: 28500,
    createdAt: '2025-02-20T12:00:00+11:00',
    icon: '🏆',
  },
  {
    id: '9',
    title: 'Australia top 5 Eurovision 2026?',
    description: "Resolves Yes if Australia's entry finishes in the top 5 of the Eurovision Song Contest 2026 Grand Final.",
    category: 'culture',
    status: 'open',
    closeDate: '2026-05-16T23:59:00+02:00',
    settlementDate: '2026-05-18T12:00:00+02:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 19000,
    createdAt: '2025-03-01T10:00:00+11:00',
    icon: '🎤',
  },
  // Economics
  {
    id: '10',
    title: 'RBA rate decision Feb 2026?',
    description: 'Resolves Yes if the Reserve Bank of Australia announces a cash rate increase at the February 2026 monetary policy meeting.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-02-17T14:30:00+11:00',
    settlementDate: '2026-02-18T12:00:00+11:00',
    yesPrice: 8,
    noPrice: 92,
    volume: 0,
    liquidity: 178000,
    createdAt: '2025-01-08T09:00:00+11:00',
    icon: '🏦',
    outcomes: [
      { id: '10-hold', name: 'Hold', probability: 72, yesPrice: 72, noPrice: 28 },
      { id: '10-cut', name: 'Cut 25bps', probability: 20, yesPrice: 20, noPrice: 80 },
      { id: '10-raise', name: 'Raise', probability: 8, yesPrice: 8, noPrice: 92 },
    ],
  },
  {
    id: '11',
    title: "Australia's CPI below 3.0%?",
    description: 'Resolves Yes if the Australian Bureau of Statistics reports annual CPI below 3.0% in the next quarterly release.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-04-28T11:30:00+10:00',
    settlementDate: '2026-04-29T12:00:00+10:00',
    yesPrice: 67,
    noPrice: 33,
    volume: 0,
    liquidity: 104000,
    createdAt: '2025-02-10T10:00:00+11:00',
    icon: '📊',
  },
  {
    id: '12',
    title: "Perth median dwelling >$850k by Dec 2026?",
    description: "Resolves Yes if CoreLogic reports Perth's median dwelling value exceeds $850,000 AUD at any point before December 31, 2026.",
    category: 'economics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+08:00',
    settlementDate: '2027-01-05T12:00:00+08:00',
    yesPrice: 71,
    noPrice: 29,
    volume: 0,
    liquidity: 46000,
    createdAt: '2025-01-25T14:00:00+08:00',
    icon: '🏠',
  },
  // Climate
  {
    id: '13',
    title: 'La Nina declared by Oct 2026?',
    description: 'Resolves Yes if the Australian Bureau of Meteorology officially declares La Nina conditions before November 1, 2026.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-10-31T23:59:00+11:00',
    settlementDate: '2026-11-05T12:00:00+11:00',
    yesPrice: 45,
    noPrice: 55,
    volume: 0,
    liquidity: 25000,
    createdAt: '2025-03-01T11:00:00+11:00',
    icon: '🌧️',
  },
  {
    id: '14',
    title: 'Warragamba Dam <60% in 2026?',
    description: 'Resolves Yes if Warragamba Dam storage falls below 60% capacity at any point during 2026, as reported by WaterNSW.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+11:00',
    settlementDate: '2027-01-03T12:00:00+11:00',
    yesPrice: 32,
    noPrice: 68,
    volume: 0,
    liquidity: 11800,
    createdAt: '2025-02-15T09:00:00+11:00',
    icon: '💧',
  },
  {
    id: '15',
    title: 'Hottest year on record 2026?',
    description: "Resolves Yes if the Bureau of Meteorology declares 2026 as Australia's hottest year on record in their annual climate statement.",
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+11:00',
    settlementDate: '2027-01-15T12:00:00+11:00',
    yesPrice: 38,
    noPrice: 62,
    volume: 0,
    liquidity: 31000,
    createdAt: '2025-01-12T10:00:00+11:00',
    icon: '🌡️',
  },
  // World
  {
    id: '16',
    title: 'Who will win the 2028 US Presidential Election?',
    description: 'Resolves based on the winner of the 2028 United States Presidential Election as certified by Congress.',
    category: 'world',
    status: 'open',
    closeDate: '2028-11-05T23:59:00-05:00',
    settlementDate: '2028-11-10T12:00:00-05:00',
    yesPrice: 48,
    noPrice: 52,
    volume: 0,
    liquidity: 1170000,
    createdAt: '2025-01-01T10:00:00Z',
    icon: '🇺🇸',
    outcomes: [
      { id: '16-dem', name: 'Democratic', probability: 48, yesPrice: 48, noPrice: 52 },
      { id: '16-rep', name: 'Republican', probability: 45, yesPrice: 45, noPrice: 55 },
      { id: '16-other', name: 'Other', probability: 7, yesPrice: 7, noPrice: 93 },
    ],
  },
  {
    id: '17',
    title: 'Will the US Federal Reserve cut rates at its next meeting?',
    description: 'Resolves Yes if the Federal Reserve announces a federal funds rate cut at the next FOMC meeting.',
    category: 'world',
    status: 'open',
    closeDate: '2026-03-18T18:00:00-04:00',
    settlementDate: '2026-03-19T12:00:00-04:00',
    yesPrice: 65,
    noPrice: 35,
    volume: 0,
    liquidity: 156000,
    createdAt: '2025-02-01T10:00:00Z',
    icon: '🏛️',
    outcomes: [
      { id: '17-cut', name: 'Cut 25bps', probability: 65, yesPrice: 65, noPrice: 35 },
      { id: '17-hold', name: 'Hold', probability: 30, yesPrice: 30, noPrice: 70 },
      { id: '17-raise', name: 'Raise', probability: 5, yesPrice: 5, noPrice: 95 },
    ],
  },
  {
    id: '18',
    title: 'Will Bitcoin hit a new all-time high in 2026?',
    description: 'Resolves Yes if Bitcoin (BTC) reaches a new all-time high price in USD at any point during 2026, based on CoinGecko data.',
    category: 'world',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-02T12:00:00Z',
    yesPrice: 72,
    noPrice: 28,
    volume: 0,
    liquidity: 141000,
    createdAt: '2025-01-15T10:00:00Z',
    icon: '₿',
  },
  {
    id: '19',
    title: 'Who will win the 2026 FIFA World Cup?',
    description: 'Resolves based on the winner of the 2026 FIFA World Cup held in USA, Canada, and Mexico.',
    category: 'world',
    status: 'open',
    closeDate: '2026-07-19T20:00:00-04:00',
    settlementDate: '2026-07-20T12:00:00-04:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 770000,
    createdAt: '2025-01-10T10:00:00Z',
    icon: '⚽',
    outcomes: [
      { id: '19-brazil', name: 'Brazil', probability: 18, yesPrice: 18, noPrice: 82 },
      { id: '19-france', name: 'France', probability: 15, yesPrice: 15, noPrice: 85 },
      { id: '19-argentina', name: 'Argentina', probability: 14, yesPrice: 14, noPrice: 86 },
    ],
  },
  // ==========================================
  // 🏛️ POLITICS - Elections & Governance
  // ==========================================
  {
    id: 'pol-election-june',
    title: 'Will a Federal Election be called before 30 June 2026?',
    description: 'Resolves Yes if the Governor-General dissolves the House of Representatives and issues writs for a federal election before 30 June 2026. Resolution source: AEC.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-06-29T23:59:00+10:00',
    settlementDate: '2026-07-01T12:00:00+10:00',
    yesPrice: 85,
    noPrice: 15,
    volume: 0,
    liquidity: 141000,
    createdAt: '2025-01-15T10:00:00+10:00',
    icon: '🗳️',
  },
  {
    id: 'pol-labor-govt',
    title: 'Will Labor form government after the next Federal Election?',
    description: 'Resolves Yes if the Australian Labor Party forms government (majority or minority) following the next Federal Election. Resolution source: Parliament of Australia.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-06-01T12:00:00+10:00',
    yesPrice: 54,
    noPrice: 46,
    volume: 0,
    liquidity: 178000,
    createdAt: '2025-01-10T10:00:00+10:00',
    icon: '🏛️',
  },
  {
    id: 'pol-coalition-seats',
    title: 'Will the Coalition win more than 72 seats at the next election?',
    description: 'Resolves Yes if the Liberal-National Coalition wins more than 72 seats in the House of Representatives. Resolution source: AEC official results.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-06-01T12:00:00+10:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 0,
    liquidity: 89000,
    createdAt: '2025-02-01T10:00:00+10:00',
    icon: '🏛️',
  },
  {
    id: 'pol-turnout',
    title: 'Will voter turnout exceed 90% at the next Federal Election?',
    description: 'Resolves Yes if official voter turnout exceeds 90% of enrolled voters. Resolution source: AEC.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-06-15T12:00:00+10:00',
    yesPrice: 72,
    noPrice: 28,
    volume: 0,
    liquidity: 35000,
    createdAt: '2025-02-15T10:00:00+10:00',
    icon: '🗳️',
  },
  {
    id: 'pol-one-nation',
    title: 'Will One Nation win more primary votes than the Liberal Party?',
    description: 'Resolves Yes if One Nation receives more primary votes than the Liberal Party (excluding LNP Queensland) at the next Federal Election. Resolution source: AEC.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-06-15T12:00:00+10:00',
    yesPrice: 8,
    noPrice: 92,
    volume: 0,
    liquidity: 19000,
    createdAt: '2025-03-01T10:00:00+10:00',
    icon: '🏛️',
  },
  // Politics - Legislation & Policy
  {
    id: 'pol-stage3-amend',
    title: 'Will Stage 3 tax cuts be amended before 30 June 2026?',
    description: 'Resolves Yes if Parliament passes legislation amending the Stage 3 tax cuts before 30 June 2026. Resolution source: Parliament of Australia.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-06-29T23:59:00+10:00',
    settlementDate: '2026-07-05T12:00:00+10:00',
    yesPrice: 25,
    noPrice: 75,
    volume: 0,
    liquidity: 68000,
    createdAt: '2025-01-20T10:00:00+10:00',
    icon: '💰',
  },
  {
    id: 'pol-housing-target',
    title: 'Will Australia introduce a national housing supply target in 2026?',
    description: 'Resolves Yes if the Federal Government announces a binding national housing supply target in 2026. Resolution source: PMO releases, official legislation.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-05T12:00:00+10:00',
    yesPrice: 62,
    noPrice: 38,
    volume: 0,
    liquidity: 46000,
    createdAt: '2025-02-10T10:00:00+10:00',
    icon: '🏠',
  },
  {
    id: 'pol-safeguard',
    title: 'Will the Safeguard Mechanism thresholds be tightened again in 2026?',
    description: 'Resolves Yes if the Safeguard Mechanism emissions thresholds are reduced via legislation or regulation in 2026. Resolution source: Clean Energy Regulator.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-05T12:00:00+10:00',
    yesPrice: 45,
    noPrice: 55,
    volume: 0,
    liquidity: 25000,
    createdAt: '2025-03-05T10:00:00+10:00',
    icon: '🏭',
  },
  // Politics - Leadership
  {
    id: 'pol-albo-pm',
    title: 'Will Anthony Albanese remain Prime Minister on 1 Jan 2027?',
    description: 'Resolves Yes if Anthony Albanese is Prime Minister of Australia on 1 January 2027. Resolution source: PMO.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-02T12:00:00+10:00',
    yesPrice: 58,
    noPrice: 42,
    volume: 0,
    liquidity: 104000,
    createdAt: '2025-01-05T10:00:00+10:00',
    icon: '👔',
  },
  {
    id: 'pol-cabinet-reshuffle',
    title: 'Will there be a Cabinet reshuffle before 31 Dec 2026?',
    description: 'Resolves Yes if there is a formal Cabinet reshuffle (3+ portfolio changes) before 31 December 2026. Resolution source: PMO releases.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-12-30T23:59:00+10:00',
    settlementDate: '2027-01-02T12:00:00+10:00',
    yesPrice: 68,
    noPrice: 32,
    volume: 0,
    liquidity: 28500,
    createdAt: '2025-02-20T10:00:00+10:00',
    icon: '🏛️',
  },
  // ==========================================
  // 🎭 CULTURE - Film & TV
  // ==========================================
  {
    id: 'culture-aus-bestpic',
    title: 'Will an Australian film be nominated for Best Picture at the 2027 Oscars?',
    description: 'Resolves Yes if any film primarily produced in Australia receives a Best Picture nomination at the 2027 Academy Awards. Resolution source: AMPAS.',
    category: 'culture',
    status: 'open',
    closeDate: '2027-01-20T23:59:00-08:00',
    settlementDate: '2027-01-25T12:00:00-08:00',
    yesPrice: 18,
    noPrice: 82,
    volume: 0,
    liquidity: 19000,
    createdAt: '2025-03-01T10:00:00+10:00',
    icon: '🎬',
  },
  {
    id: 'culture-aus-actor-oscar',
    title: 'Will an Australian actor win an Oscar in 2027?',
    description: 'Resolves Yes if an Australian citizen wins any acting Oscar at the 2027 Academy Awards. Resolution source: AMPAS.',
    category: 'culture',
    status: 'open',
    closeDate: '2027-03-01T23:59:00-08:00',
    settlementDate: '2027-03-05T12:00:00-08:00',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 28500,
    createdAt: '2025-02-15T10:00:00+10:00',
    icon: '🏆',
  },
  {
    id: 'culture-aus-film-50m',
    title: 'Will the highest-grossing Australian film of 2026 exceed $50m AUD?',
    description: 'Resolves Yes if any Australian-produced film exceeds $50m AUD at the Australian box office in 2026. Resolution source: Screen Australia.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-15T12:00:00+10:00',
    yesPrice: 28,
    noPrice: 72,
    volume: 0,
    liquidity: 16500,
    createdAt: '2025-01-25T10:00:00+10:00',
    icon: '🎬',
  },
  // Culture - Music & Entertainment
  {
    id: 'culture-eurovision-top10',
    title: 'Will Australia finish Top 10 at Eurovision 2026?',
    description: "Resolves Yes if Australia's entry finishes in the top 10 of the Eurovision Song Contest 2026 Grand Final. Resolution source: Eurovision.",
    category: 'culture',
    status: 'open',
    closeDate: '2026-05-16T23:59:00+02:00',
    settlementDate: '2026-05-18T12:00:00+02:00',
    yesPrice: 32,
    noPrice: 68,
    volume: 0,
    liquidity: 35000,
    createdAt: '2025-02-01T10:00:00+10:00',
    icon: '🎤',
  },
  {
    id: 'culture-coachella-aus',
    title: 'Will an Australian artist headline Coachella 2026?',
    description: 'Resolves Yes if an Australian artist is announced as a headliner for Coachella Valley Music and Arts Festival 2026. Resolution source: Coachella official announcements.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-04-10T23:59:00-07:00',
    settlementDate: '2026-04-15T12:00:00-07:00',
    yesPrice: 15,
    noPrice: 85,
    volume: 0,
    liquidity: 11800,
    createdAt: '2025-01-20T10:00:00+10:00',
    icon: '🎵',
  },
  // Culture - Public Events
  {
    id: 'culture-vivid-attendance',
    title: 'Will attendance at Vivid Sydney 2026 exceed 2.5 million?',
    description: 'Resolves Yes if Vivid Sydney 2026 official attendance exceeds 2.5 million visitors. Resolution source: Destination NSW.',
    category: 'culture',
    status: 'open',
    closeDate: '2026-06-15T23:59:00+10:00',
    settlementDate: '2026-07-01T12:00:00+10:00',
    yesPrice: 72,
    noPrice: 28,
    volume: 0,
    liquidity: 21000,
    createdAt: '2025-03-10T10:00:00+10:00',
    icon: '🌃',
  },
  {
    id: 'culture-splendour-return',
    title: 'Will Splendour in the Grass return in 2027?',
    description: 'Resolves Yes if Splendour in the Grass music festival is officially announced for 2027. Resolution source: Event organisers.',
    category: 'culture',
    status: 'open',
    closeDate: '2027-03-01T23:59:00+10:00',
    settlementDate: '2027-03-05T12:00:00+10:00',
    yesPrice: 65,
    noPrice: 35,
    volume: 0,
    liquidity: 10400,
    createdAt: '2025-02-25T10:00:00+10:00',
    icon: '🎪',
  },
  // ==========================================
  // 📊 ECONOMICS - Monetary Policy
  // ==========================================
  {
    id: 'econ-rba-may-cut',
    title: 'Will the RBA cut rates at its May 2026 meeting?',
    description: 'Resolves Yes if the Reserve Bank of Australia announces a cash rate reduction at the May 2026 monetary policy meeting. Resolution source: RBA.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-05-05T14:30:00+10:00',
    settlementDate: '2026-05-06T12:00:00+10:00',
    yesPrice: 45,
    noPrice: 55,
    volume: 0,
    liquidity: 156000,
    createdAt: '2025-01-15T10:00:00+10:00',
    icon: '🏦',
  },
  {
    id: 'econ-rate-below-4',
    title: 'Will the cash rate be below 4.00% by 31 Dec 2026?',
    description: 'Resolves Yes if the RBA cash rate target is below 4.00% on 31 December 2026. Resolution source: RBA.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-02T12:00:00+10:00',
    yesPrice: 78,
    noPrice: 22,
    volume: 0,
    liquidity: 126000,
    createdAt: '2025-01-08T10:00:00+10:00',
    icon: '📉',
  },
  // Economics - Inflation & Growth
  {
    id: 'econ-cpi-q4',
    title: 'Will CPI fall below 3.0% by Q4 2026?',
    description: 'Resolves Yes if the Q4 2026 annual CPI is below 3.0%. Resolution source: ABS.',
    category: 'economics',
    status: 'open',
    closeDate: '2027-01-28T11:30:00+10:00',
    settlementDate: '2027-01-29T12:00:00+10:00',
    yesPrice: 58,
    noPrice: 42,
    volume: 0,
    liquidity: 104000,
    createdAt: '2025-02-01T10:00:00+10:00',
    icon: '📊',
  },
  {
    id: 'econ-negative-gdp',
    title: 'Will Australia record negative GDP growth in any quarter of 2026?',
    description: 'Resolves Yes if Australia records negative quarter-on-quarter GDP growth in any quarter of 2026. Resolution source: ABS.',
    category: 'economics',
    status: 'open',
    closeDate: '2027-03-01T11:30:00+10:00',
    settlementDate: '2027-03-05T12:00:00+10:00',
    yesPrice: 22,
    noPrice: 78,
    volume: 0,
    liquidity: 53000,
    createdAt: '2025-01-20T10:00:00+10:00',
    icon: '📉',
  },
  // Economics - Housing
  {
    id: 'econ-sydney-rise-q3',
    title: 'Will the CoreLogic Sydney Home Value Index rise in Q3 2026?',
    description: 'Resolves Yes if the CoreLogic Sydney dwelling values increase quarter-on-quarter in Q3 2026. Resolution source: CoreLogic.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-09-30T23:59:00+10:00',
    settlementDate: '2026-10-05T12:00:00+10:00',
    yesPrice: 62,
    noPrice: 38,
    volume: 0,
    liquidity: 46000,
    createdAt: '2025-02-15T10:00:00+10:00',
    icon: '🏠',
  },
  {
    id: 'econ-perth-900k',
    title: 'Will Perth median dwelling prices exceed $900k before 2027?',
    description: "Resolves Yes if CoreLogic reports Perth's median dwelling value exceeds $900,000 AUD at any point before 1 January 2027. Resolution source: CoreLogic.",
    category: 'economics',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+08:00',
    settlementDate: '2027-01-05T12:00:00+08:00',
    yesPrice: 55,
    noPrice: 45,
    volume: 0,
    liquidity: 68000,
    createdAt: '2025-01-25T10:00:00+08:00',
    icon: '🏠',
  },
  {
    id: 'econ-dwelling-approvals',
    title: 'Will national dwelling approvals exceed 200,000 in 2026?',
    description: 'Resolves Yes if total dwelling approvals in Australia exceed 200,000 for calendar year 2026. Resolution source: ABS.',
    category: 'economics',
    status: 'open',
    closeDate: '2027-02-01T11:30:00+10:00',
    settlementDate: '2027-02-05T12:00:00+10:00',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 35000,
    createdAt: '2025-03-01T10:00:00+10:00',
    icon: '🏗️',
  },
  // ==========================================
  // 🌦️ CLIMATE - Weather & Climate Indicators
  // ==========================================
  {
    id: 'climate-top3-hottest',
    title: "Will 2026 be among Australia's top 3 hottest years on record?",
    description: "Resolves Yes if the BOM declares 2026 as one of Australia's three hottest years on record. Resolution source: BOM Annual Climate Statement.",
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-20T12:00:00+10:00',
    yesPrice: 52,
    noPrice: 48,
    volume: 0,
    liquidity: 31000,
    createdAt: '2025-01-15T10:00:00+10:00',
    icon: '🌡️',
  },
  {
    id: 'climate-la-nina-2026',
    title: 'Will a La Niña event be declared by the BOM in 2026?',
    description: 'Resolves Yes if the Bureau of Meteorology officially declares La Niña conditions at any point in 2026. Resolution source: BOM.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-05T12:00:00+10:00',
    yesPrice: 42,
    noPrice: 58,
    volume: 0,
    liquidity: 25000,
    createdAt: '2025-02-01T10:00:00+10:00',
    icon: '🌧️',
  },
  {
    id: 'climate-sydney-rainfall',
    title: 'Will total rainfall in Sydney exceed the long-term average in 2026?',
    description: 'Resolves Yes if Sydney Observatory Hill records above-average annual rainfall for 2026 (long-term average ~1,213mm). Resolution source: BOM.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-10T12:00:00+10:00',
    yesPrice: 48,
    noPrice: 52,
    volume: 0,
    liquidity: 15500,
    createdAt: '2025-02-20T10:00:00+10:00',
    icon: '🌧️',
  },
  // Climate - Environmental Outcomes
  {
    id: 'climate-warragamba-60',
    title: 'Will Warragamba Dam fall below 60% capacity in 2026?',
    description: 'Resolves Yes if Warragamba Dam storage falls below 60% capacity at any point during 2026. Resolution source: WaterNSW.',
    category: 'climate',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+10:00',
    settlementDate: '2027-01-03T12:00:00+10:00',
    yesPrice: 28,
    noPrice: 72,
    volume: 0,
    liquidity: 21000,
    createdAt: '2025-01-25T10:00:00+10:00',
    icon: '💧',
  },
  {
    id: 'climate-renewable-35',
    title: 'Will Australia exceed 35% renewable electricity generation in 2026?',
    description: 'Resolves Yes if renewable sources exceed 35% of total electricity generation for calendar year 2026. Resolution source: AEMO.',
    category: 'climate',
    status: 'open',
    closeDate: '2027-02-01T23:59:00+10:00',
    settlementDate: '2027-02-10T12:00:00+10:00',
    yesPrice: 72,
    noPrice: 28,
    volume: 0,
    liquidity: 38500,
    createdAt: '2025-03-05T10:00:00+10:00',
    icon: '⚡',
  },
  // ==========================================
  // 🌍 WORLD - Global Politics
  // ==========================================
  {
    id: 'world-2028-us-party',
    title: 'Which party wins the 2028 US Presidential Election?',
    description: 'Resolves based on which party wins the 2028 US Presidential Election as certified by Congress.',
    category: 'world',
    status: 'open',
    closeDate: '2028-11-05T23:59:00-05:00',
    settlementDate: '2028-11-15T12:00:00-05:00',
    yesPrice: 48,
    noPrice: 52,
    volume: 0,
    liquidity: 1260000,
    createdAt: '2025-01-01T10:00:00Z',
    icon: '🇺🇸',
    outcomes: [
      { id: 'world-2028-dem', name: 'Democratic', probability: 48, yesPrice: 48, noPrice: 52 },
      { id: 'world-2028-rep', name: 'Republican', probability: 46, yesPrice: 46, noPrice: 54 },
      { id: 'world-2028-other', name: 'Other', probability: 6, yesPrice: 6, noPrice: 94 },
    ],
  },
  {
    id: 'world-uk-election-2026',
    title: 'Will the UK hold a general election before 31 Dec 2026?',
    description: 'Resolves Yes if a UK general election is held before 31 December 2026. Resolution source: UK Electoral Commission.',
    category: 'world',
    status: 'open',
    closeDate: '2026-12-30T23:59:00Z',
    settlementDate: '2027-01-02T12:00:00Z',
    yesPrice: 12,
    noPrice: 88,
    volume: 0,
    liquidity: 60500,
    createdAt: '2025-02-01T10:00:00Z',
    icon: '🇬🇧',
  },
  // World - Global Economics
  {
    id: 'world-fed-next-cut',
    title: 'Will the US Federal Reserve cut rates at its next meeting?',
    description: 'Resolves Yes if the Federal Reserve announces a federal funds rate cut at the next FOMC meeting. Resolution source: Federal Reserve.',
    category: 'world',
    status: 'open',
    closeDate: '2026-03-18T18:00:00-04:00',
    settlementDate: '2026-03-19T12:00:00-04:00',
    yesPrice: 62,
    noPrice: 38,
    volume: 0,
    liquidity: 178000,
    createdAt: '2025-02-15T10:00:00Z',
    icon: '🏛️',
  },
  {
    id: 'world-eurozone-inflation',
    title: 'Will Eurozone inflation fall below 2.0% in 2026?',
    description: 'Resolves Yes if Eurozone annual inflation falls below 2.0% in any month of 2026. Resolution source: Eurostat.',
    category: 'world',
    status: 'open',
    closeDate: '2026-12-31T23:59:00+01:00',
    settlementDate: '2027-01-15T12:00:00+01:00',
    yesPrice: 55,
    noPrice: 45,
    volume: 0,
    liquidity: 89000,
    createdAt: '2025-01-20T10:00:00Z',
    icon: '🇪🇺',
  },
  // World - Macro & Markets
  {
    id: 'world-btc-ath-2026',
    title: 'Will Bitcoin reach a new all-time high in 2026?',
    description: 'Resolves Yes if Bitcoin (BTC) reaches a new all-time high price in USD at any point during 2026. Resolution source: CoinGecko.',
    category: 'world',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-02T12:00:00Z',
    yesPrice: 68,
    noPrice: 32,
    volume: 0,
    liquidity: 178000,
    createdAt: '2025-01-10T10:00:00Z',
    icon: '₿',
  },
  {
    id: 'world-brent-90',
    title: 'Will Brent crude average above US$90 in 2026?',
    description: 'Resolves Yes if the annual average price of Brent crude oil exceeds US$90/barrel for 2026. Resolution source: EIA.',
    category: 'world',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-10T12:00:00Z',
    yesPrice: 35,
    noPrice: 65,
    volume: 0,
    liquidity: 104000,
    createdAt: '2025-02-05T10:00:00Z',
    icon: '🛢️',
  },
];

const mockUser: User = {
  id: 'user-1',
  username: 'trader123',
  email: 'trader@example.com',
  balance: 10000_00, // $10,000 in cents
  createdAt: '2024-01-01T00:00:00Z',
};

const mockPositions: Position[] = [
  {
    id: 'pos-1',
    userId: 'user-1',
    marketId: '1', // Federal Election
    side: 'yes',
    quantity: 100,
    avgPrice: 48,
    currentValue: 5200,
    profit: 400,
  },
  {
    id: 'pos-2',
    userId: 'user-1',
    marketId: '5', // Tasmania AFL
    side: 'yes',
    quantity: 50,
    avgPrice: 85,
    currentValue: 4450,
    profit: 200,
  },
  {
    id: 'pos-3',
    userId: 'user-1',
    marketId: '10', // RBA rate
    side: 'no',
    quantity: 75,
    avgPrice: 88,
    currentValue: 6900,
    profit: 300,
  },
];

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    userId: 'user-2',
    username: 'PunterPete',
    marketId: '1',
    content: 'Labor looking strong in the polls. This feels like easy money.',
    position: { side: 'yes', marketTitle: 'Federal Election' },
    likes: 12,
    replies: [
      {
        id: 'comment-1-1',
        userId: 'user-3',
        username: 'SkepticalSam',
        marketId: '1',
        content: 'Polls were wrong last time. Coalition could surprise us again.',
        likes: 5,
        replies: [],
        createdAt: '2026-01-28T14:30:00+10:00',
      },
    ],
    createdAt: '2026-01-28T10:15:00+10:00',
  },
  {
    id: 'comment-2',
    userId: 'user-4',
    username: 'PoliticoAU',
    marketId: '1',
    content: 'The economy is the key issue. Watch the cost of living debate closely.',
    position: { side: 'no', marketTitle: 'Federal Election' },
    likes: 8,
    replies: [],
    createdAt: '2026-01-27T16:45:00+10:00',
  },
  {
    id: 'comment-3',
    userId: 'user-5',
    username: 'SportsGuru',
    marketId: '4',
    content: 'Djokovic has never lost to Sinner in a Grand Slam final. History favours the GOAT.',
    position: { side: 'yes', marketTitle: 'Australian Open Final' },
    likes: 24,
    replies: [],
    createdAt: '2026-01-26T08:00:00+11:00',
  },
  {
    id: 'comment-4',
    userId: 'user-6',
    username: 'TennisFan99',
    marketId: '4',
    content: 'Sinner has been in incredible form. His backhand is unstoppable right now.',
    position: { side: 'no', marketTitle: 'Australian Open Final' },
    likes: 18,
    replies: [],
    createdAt: '2026-01-25T19:30:00+11:00',
  },
];

const mockMarketRules: Record<string, MarketRules> = {
  '1': {
    summary: 'This market resolves to Yes if the Australian Labor Party wins the majority of seats in the House of Representatives at the next Federal Election. The market resolves to No if the Liberal-National Coalition wins.',
    resolutionSource: 'Australian Electoral Commission (AEC)',
    resolutionDetails: 'Resolution will be based on the official results published by the AEC. If neither major party wins a majority, resolution will be based on which party forms government.',
    timeline: {
      tradingCloses: 'When polls close on election day',
      resolutionExpected: 'Within 7 days of election day',
    },
    prohibitions: [
      'Members of Parliament and their immediate staff',
      'AEC officials and contractors',
      'Persons with non-public information about election outcomes',
    ],
  },
  '4': {
    summary: 'This market resolves to Yes if Novak Djokovic wins the Australian Open 2026 Men\'s Singles Final. Resolves to No if Jannik Sinner wins.',
    resolutionSource: 'Tennis Australia / ATP Official Results',
    resolutionDetails: 'Resolution based on the official match result. If the match is not completed, the player who advances will be considered the winner.',
    timeline: {
      tradingCloses: 'At the start of the final match',
      resolutionExpected: 'Within 24 hours of match completion',
    },
    prohibitions: [
      'Players, coaches, and team members involved in the tournament',
      'Tournament officials and referees',
      'Persons with material non-public information',
    ],
  },
};

interface AppState {
  // Data
  markets: Market[];
  marketsLoaded: boolean;
  marketsLoading: boolean;
  user: User | null;
  orders: Order[];
  positions: Position[];
  trades: Trade[];
  comments: Comment[];

  // Actions
  fetchMarkets: () => Promise<void>;
  setMarkets: (markets: Market[]) => void;
  getMarket: (id: string) => Market | undefined;
  getMarketsByCategory: (category: string) => Market[];
  getRelatedMarkets: (marketId: string, limit?: number) => Market[];
  getOrderBook: (marketId: string) => OrderBook;
  getUserPositions: () => Position[];
  getUserOrders: () => Order[];
  getMarketComments: (marketId: string) => Comment[];
  getMarketRules: (marketId: string) => MarketRules | undefined;
  addComment: (marketId: string, content: string, username?: string) => Comment;

  // Trading actions
  placeOrder: (
    marketId: string,
    side: 'yes' | 'no',
    type: 'limit' | 'market',
    price: number,
    quantity: number
  ) => { success: boolean; order?: Order; error?: string };
  cancelOrder: (orderId: string) => boolean;

  // User actions
  updateBalance: (amount: number) => void;

  // Market updates (for real-time simulation)
  updateMarketPrice: (marketId: string, yesPrice: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  markets: mockMarkets,
  marketsLoaded: false,
  marketsLoading: false,
  user: null,
  orders: [],
  positions: mockPositions,
  trades: [],
  comments: mockComments,

  fetchMarkets: async () => {
    // Prevent concurrent fetches
    if (get().marketsLoading) return;

    set({ marketsLoading: true });
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          set({ markets: data, marketsLoaded: true, marketsLoading: false });
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch markets from API, using fallback data:', err);
    }
    // If API returns empty or fails, keep mock data as fallback
    set({ marketsLoaded: true, marketsLoading: false });
  },

  setMarkets: (markets: Market[]) => {
    set({ markets });
  },

  getMarket: (id: string) => {
    return get().markets.find(m => m.id === id);
  },

  getMarketsByCategory: (category: string) => {
    if (category === 'all') return get().markets;
    return get().markets.filter(m => m.category === category);
  },

  getRelatedMarkets: (marketId: string, limit = 3) => {
    const market = get().getMarket(marketId);
    if (!market) return [];
    return get().markets
      .filter(m => m.id !== marketId && m.category === market.category)
      .slice(0, limit);
  },

  getMarketComments: (marketId: string) => {
    return get().comments.filter(c => c.marketId === marketId);
  },

  getMarketRules: (marketId: string) => {
    return mockMarketRules[marketId] || {
      summary: 'Resolution rules for this market will be determined based on official sources.',
      resolutionSource: 'Official Government/Organization Sources',
      resolutionDetails: 'The market will resolve based on publicly verifiable information from authoritative sources.',
      timeline: {
        tradingCloses: 'At the event deadline',
        resolutionExpected: 'Within 7 days of the event',
      },
      prohibitions: [
        'Persons with material non-public information',
        'Government officials directly involved in the outcome',
      ],
    };
  },

  addComment: (marketId: string, content: string, username?: string) => {
    const user = get().user;
    const position = get().positions.find(p => p.marketId === marketId && p.userId === user?.id);
    const market = get().getMarket(marketId);

    const newComment: Comment = {
      id: uuidv4(),
      userId: user?.id || 'anonymous',
      username: username || user?.username || 'Anonymous',
      marketId,
      content,
      position: position ? { side: position.side, marketTitle: market?.title } : undefined,
      likes: 0,
      replies: [],
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      comments: [newComment, ...state.comments],
    }));

    return newComment;
  },

  getOrderBook: (marketId: string) => {
    const orders = get().orders.filter(o => o.marketId === marketId && o.status === 'open');
    const market = get().getMarket(marketId);

    // Generate mock order book based on current price
    const yesPrice = market?.yesPrice || 50;

    const generateOrders = (basePrice: number, isBid: boolean): { price: number; quantity: number; orderCount: number }[] => {
      const result = [];
      for (let i = 0; i < 5; i++) {
        const priceOffset = isBid ? -i * 2 : i * 2;
        const price = Math.max(1, Math.min(99, basePrice + priceOffset));
        result.push({
          price,
          quantity: Math.floor(Math.random() * 500) + 100,
          orderCount: Math.floor(Math.random() * 10) + 1,
        });
      }
      return result;
    };

    return {
      yes: {
        bids: generateOrders(yesPrice - 1, true),
        asks: generateOrders(yesPrice + 1, false),
      },
      no: {
        bids: generateOrders(100 - yesPrice - 1, true),
        asks: generateOrders(100 - yesPrice + 1, false),
      },
    };
  },

  getUserPositions: () => {
    const user = get().user;
    if (!user) return [];
    return get().positions.filter(p => p.userId === user.id);
  },

  getUserOrders: () => {
    const user = get().user;
    if (!user) return [];
    return get().orders.filter(o => o.userId === user.id);
  },

  placeOrder: (marketId, side, type, price, quantity) => {
    const user = get().user;
    if (!user) {
      return { success: false, error: 'Not logged in' };
    }

    const cost = price * quantity;
    if (cost > user.balance) {
      return { success: false, error: 'Insufficient balance' };
    }

    const order: Order = {
      id: uuidv4(),
      marketId,
      userId: user.id,
      side,
      type,
      price,
      quantity,
      filledQuantity: 0,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate instant fill for market orders
    if (type === 'market') {
      order.filledQuantity = quantity;
      order.status = 'filled';

      // Update balance
      set(state => ({
        user: state.user ? { ...state.user, balance: state.user.balance - cost } : null,
      }));

      // Add or update position
      const existingPosition = get().positions.find(
        p => p.marketId === marketId && p.side === side && p.userId === user.id
      );

      if (existingPosition) {
        set(state => ({
          positions: state.positions.map(p =>
            p.id === existingPosition.id
              ? {
                  ...p,
                  quantity: p.quantity + quantity,
                  avgPrice: Math.round((p.avgPrice * p.quantity + price * quantity) / (p.quantity + quantity)),
                  currentValue: (p.quantity + quantity) * price,
                }
              : p
          ),
        }));
      } else {
        const newPosition: Position = {
          id: uuidv4(),
          userId: user.id,
          marketId,
          side,
          quantity,
          avgPrice: price,
          currentValue: quantity * price,
          profit: 0,
        };
        set(state => ({
          positions: [...state.positions, newPosition],
        }));
      }

      // Create trade record
      const trade: Trade = {
        id: uuidv4(),
        marketId,
        buyOrderId: order.id,
        sellOrderId: 'market-maker',
        price,
        quantity,
        timestamp: new Date().toISOString(),
      };

      set(state => ({
        trades: [...state.trades, trade],
      }));
    }

    set(state => ({
      orders: [...state.orders, order],
    }));

    return { success: true, order };
  },

  cancelOrder: (orderId: string) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order || order.status !== 'open') {
      return false;
    }

    set(state => ({
      orders: state.orders.map(o =>
        o.id === orderId ? { ...o, status: 'cancelled' as const, updatedAt: new Date().toISOString() } : o
      ),
    }));

    return true;
  },

  updateBalance: (amount: number) => {
    set(state => ({
      user: state.user ? { ...state.user, balance: state.user.balance + amount } : null,
    }));
  },

  updateMarketPrice: (marketId: string, yesPrice: number) => {
    set(state => ({
      markets: state.markets.map(m =>
        m.id === marketId
          ? { ...m, yesPrice, noPrice: 100 - yesPrice }
          : m
      ),
    }));

    // Update positions for this market
    set(state => ({
      positions: state.positions.map(p => {
        if (p.marketId !== marketId) return p;
        const currentPrice = p.side === 'yes' ? yesPrice : 100 - yesPrice;
        const currentValue = p.quantity * currentPrice;
        const profit = currentValue - (p.quantity * p.avgPrice);
        return { ...p, currentValue, profit };
      }),
    }));
  },
}));
