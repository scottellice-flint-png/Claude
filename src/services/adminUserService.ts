import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from './auditService';
import type {
  AdminUser,
  AdminRole,
  CreateAdminUserInput,
  UpdateAdminUserInput,
  PaginatedResponse,
} from '@/types/admin';

interface AdminContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAdminUser(
  input: CreateAdminUserInput,
  ctx: AdminContext
): Promise<AdminUser> {
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.adminUser.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'admin_user',
    entityId: user.id,
    action: 'create',
    newData: { ...formatUser(user), password: '[REDACTED]' },
  });

  return formatUser(user);
}

export async function getAdminUser(id: string): Promise<AdminUser | null> {
  const user = await prisma.adminUser.findUnique({
    where: { id },
  });

  if (!user) return null;
  return formatUser(user);
}

export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user) return null;
  return formatUser(user);
}

export async function getAdminUsers(
  page: number = 1,
  pageSize: number = 20,
  includeInactive: boolean = false
): Promise<PaginatedResponse<AdminUser>> {
  const where = includeInactive ? {} : { isActive: true };

  const [users, total] = await Promise.all([
    prisma.adminUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminUser.count({ where }),
  ]);

  return {
    data: users.map(formatUser),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function updateAdminUser(
  id: string,
  input: UpdateAdminUserInput,
  ctx: AdminContext
): Promise<AdminUser> {
  const previous = await prisma.adminUser.findUnique({ where: { id } });

  const updateData: Record<string, unknown> = {};

  if (input.email !== undefined) updateData.email = input.email;
  if (input.firstName !== undefined) updateData.firstName = input.firstName;
  if (input.lastName !== undefined) updateData.lastName = input.lastName;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  if (input.password) {
    updateData.passwordHash = await hashPassword(input.password);
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: updateData,
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'admin_user',
    entityId: id,
    action: 'update',
    previousData: formatUser(previous!) as unknown as Record<string, unknown>,
    newData: {
      ...formatUser(user),
      passwordChanged: !!input.password,
    },
  });

  return formatUser(user);
}

export async function deactivateAdminUser(id: string, ctx: AdminContext): Promise<AdminUser> {
  // Prevent deactivating yourself
  if (id === ctx.userId) {
    throw new Error('Cannot deactivate your own account');
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'admin_user',
    entityId: id,
    action: 'update',
    metadata: { deactivated: true },
  });

  return formatUser(user);
}

export async function reactivateAdminUser(id: string, ctx: AdminContext): Promise<AdminUser> {
  const user = await prisma.adminUser.update({
    where: { id },
    data: { isActive: true },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'admin_user',
    entityId: id,
    action: 'update',
    metadata: { reactivated: true },
  });

  return formatUser(user);
}

export async function changePassword(
  id: string,
  newPassword: string,
  ctx: AdminContext
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);

  await prisma.adminUser.update({
    where: { id },
    data: { passwordHash },
  });

  await createAuditLog({
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    entityType: 'admin_user',
    entityId: id,
    action: 'update',
    metadata: { passwordChanged: true },
  });
}

// Create initial admin user if none exists
export async function ensureInitialAdmin(): Promise<void> {
  const adminCount = await prisma.adminUser.count();

  if (adminCount === 0) {
    const email = process.env.ADMIN_INITIAL_EMAIL || 'admin@foremark.com';
    const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

    const passwordHash = await hashPassword(password);

    await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'super_admin',
      },
    });

    console.log(`Initial admin user created: ${email}`);
  }
}

function formatUser(user: Record<string, unknown>): AdminUser {
  return {
    id: user.id as string,
    email: user.email as string,
    firstName: user.firstName as string,
    lastName: user.lastName as string,
    role: user.role as AdminRole,
    isActive: user.isActive as boolean,
    lastLoginAt: user.lastLoginAt ? (user.lastLoginAt as Date).toISOString() : undefined,
    createdAt: (user.createdAt as Date).toISOString(),
    updatedAt: (user.updatedAt as Date).toISOString(),
  };
}
