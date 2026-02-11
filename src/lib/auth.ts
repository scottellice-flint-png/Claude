import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import type { AdminRole } from '@/types/admin';

// Extend the default session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AdminRole;
      firstName: string;
      lastName: string;
    };
  }

  interface User {
    id: string;
    email: string;
    role: AdminRole;
    firstName: string;
    lastName: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: AdminRole;
    firstName: string;
    lastName: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@foremark.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        // Update last login
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role as AdminRole,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email || '',
          name: `${token.firstName} ${token.lastName}`,
          role: token.role,
          firstName: token.firstName,
          lastName: token.lastName,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
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
