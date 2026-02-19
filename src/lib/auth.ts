import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import type { AdminRole } from '@/types/admin';
import { writeAuditEvent } from '@/services/auditEventService';

// User type for public users vs admin users
export type UserType = 'user' | 'admin';

// Extend the default session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AdminRole | 'user';
      userType: UserType;
      firstName?: string;
      lastName?: string;
      username?: string;
      balance?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    role: AdminRole | 'user';
    userType: UserType;
    firstName?: string;
    lastName?: string;
    username?: string;
    balance?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: AdminRole | 'user';
    userType: UserType;
    firstName?: string;
    lastName?: string;
    username?: string;
    balance?: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Admin credentials provider
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@foremark.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        if (!prisma) {
          throw new Error('Database not available');
        }

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        });

        // Extract request context for audit logging
        const ipAddress = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
        const userAgent = req?.headers?.['user-agent'] as string;

        if (!user) {
          // Log failed login attempt
          await writeAuditEvent({
            eventType: 'ADMIN_LOGIN_FAIL',
            actorType: 'admin',
            ipAddress,
            userAgent,
            metadata: { email: credentials.email, reason: 'user_not_found' },
          }).catch(console.error);
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          // Log failed login attempt for deactivated account
          await writeAuditEvent({
            eventType: 'ADMIN_LOGIN_FAIL',
            actorType: 'admin',
            actorId: user.id,
            ipAddress,
            userAgent,
            metadata: { email: credentials.email, reason: 'account_deactivated' },
          }).catch(console.error);
          throw new Error('Account is deactivated');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          // Log failed login attempt for invalid password
          await writeAuditEvent({
            eventType: 'ADMIN_LOGIN_FAIL',
            actorType: 'admin',
            actorId: user.id,
            ipAddress,
            userAgent,
            metadata: { email: credentials.email, reason: 'invalid_password' },
          }).catch(console.error);
          throw new Error('Invalid email or password');
        }

        // Update last login
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Log successful login
        await writeAuditEvent({
          eventType: 'ADMIN_LOGIN_SUCCESS',
          actorType: 'admin',
          actorId: user.id,
          ipAddress,
          userAgent,
          afterState: {
            email: user.email,
            role: user.role,
            lastLoginAt: new Date().toISOString(),
          },
        }).catch(console.error);

        return {
          id: user.id,
          email: user.email,
          role: user.role as AdminRole,
          userType: 'admin' as UserType,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
    // Public user credentials provider
    CredentialsProvider({
      id: 'user-credentials',
      name: 'User Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        if (!prisma) {
          throw new Error('Database not available');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        // Extract request context for audit logging
        const ipAddress = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
        const userAgent = req?.headers?.['user-agent'] as string;

        if (!user) {
          // Log failed login attempt
          await writeAuditEvent({
            eventType: 'USER_LOGIN_FAIL',
            actorType: 'user',
            ipAddress,
            userAgent,
            metadata: { email: credentials.email.toLowerCase(), reason: 'user_not_found' },
          }).catch(console.error);
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          // Log failed login attempt for deactivated account
          await writeAuditEvent({
            eventType: 'USER_LOGIN_FAIL',
            actorType: 'user',
            actorId: user.id,
            ipAddress,
            userAgent,
            metadata: { email: credentials.email.toLowerCase(), reason: 'account_deactivated' },
          }).catch(console.error);
          throw new Error('Account is deactivated');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          // Log failed login attempt for invalid password
          await writeAuditEvent({
            eventType: 'USER_LOGIN_FAIL',
            actorType: 'user',
            actorId: user.id,
            ipAddress,
            userAgent,
            metadata: { email: credentials.email.toLowerCase(), reason: 'invalid_password' },
          }).catch(console.error);
          throw new Error('Invalid email or password');
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Log successful login
        await writeAuditEvent({
          eventType: 'USER_LOGIN_SUCCESS',
          actorType: 'user',
          actorId: user.id,
          ipAddress,
          userAgent,
          afterState: {
            email: user.email,
            username: user.username,
            lastLoginAt: new Date().toISOString(),
          },
        }).catch(console.error);

        return {
          id: user.id,
          email: user.email,
          role: 'user' as const,
          userType: 'user' as UserType,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          username: user.username,
          balance: user.balance,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.userType = user.userType;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.username = user.username;
        token.balance = user.balance;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const name = token.userType === 'admin'
          ? `${token.firstName || ''} ${token.lastName || ''}`.trim()
          : token.username || token.email || '';

        session.user = {
          id: token.id,
          email: token.email || '',
          name: name || 'User',
          role: token.role,
          userType: token.userType,
          firstName: token.firstName,
          lastName: token.lastName,
          username: token.username,
          balance: token.balance,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper to verify passwords
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
