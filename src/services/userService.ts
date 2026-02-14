import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  balance: number;
  totalProfit: number;
  totalTrades: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface AuthResult {
  success: boolean;
  user?: PublicUser;
  error?: string;
}

/**
 * Create a new user account
 */
export async function createUser(input: CreateUserInput): Promise<AuthResult> {
  // Check if email already exists
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingEmail) {
    return { success: false, error: 'Email already registered' };
  }

  // Check if username already exists
  const existingUsername = await prisma.user.findUnique({
    where: { username: input.username.toLowerCase() },
  });

  if (existingUsername) {
    return { success: false, error: 'Username already taken' };
  }

  // Validate password strength
  if (input.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      username: input.username.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.username,
    },
  });

  return { success: true, user: formatUser(user) };
}

/**
 * Authenticate a user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (!user.isActive) {
    return { success: false, error: 'Account is deactivated' };
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { success: true, user: formatUser(user) };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) return null;
  return formatUser(user);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) return null;
  return formatUser(user);
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!user) return null;
  return formatUser(user);
}

/**
 * Update user profile
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<PublicUser> {
  const updateData: Record<string, unknown> = {};

  if (input.firstName !== undefined) updateData.firstName = input.firstName;
  if (input.lastName !== undefined) updateData.lastName = input.lastName;
  if (input.displayName !== undefined) updateData.displayName = input.displayName;
  if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return formatUser(user);
}

/**
 * Change user password
 */
export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { success: true };
}

/**
 * Deactivate user account
 */
export async function deactivateUser(id: string): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return formatUser(user);
}

/**
 * Format user data for API response (excludes sensitive fields)
 */
function formatUser(user: Record<string, unknown>): PublicUser {
  return {
    id: user.id as string,
    email: user.email as string,
    username: user.username as string,
    firstName: user.firstName as string | undefined,
    lastName: user.lastName as string | undefined,
    displayName: user.displayName as string | undefined,
    avatarUrl: user.avatarUrl as string | undefined,
    isActive: user.isActive as boolean,
    isVerified: user.isVerified as boolean,
    balance: user.balance as number,
    totalProfit: user.totalProfit as number,
    totalTrades: user.totalTrades as number,
    lastLoginAt: user.lastLoginAt ? (user.lastLoginAt as Date).toISOString() : undefined,
    createdAt: (user.createdAt as Date).toISOString(),
    updatedAt: (user.updatedAt as Date).toISOString(),
  };
}
