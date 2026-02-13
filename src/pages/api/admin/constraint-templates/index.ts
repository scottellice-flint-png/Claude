// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/services/auditService';
import { validateBody, createConstraintTemplateSchema } from '@/lib/validation';
import { ZodError } from 'zod';
import type { ConstraintTemplate } from '@/types/admin';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method === 'GET') {
    const templates = await prisma.constraintTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const formatted = templates.map((t) => ({
      ...t,
      constraints: JSON.parse(t.constraints),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return res.status(200).json(formatted);
  }

  if (req.method === 'POST') {
    try {
      const input = validateBody(createConstraintTemplateSchema, req.body);

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await prisma.constraintTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const template = await prisma.constraintTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          constraints: JSON.stringify(input.constraints),
          isDefault: input.isDefault || false,
        },
      });

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        entityType: 'constraint_template',
        entityId: template.id,
        action: 'create',
        newData: template as unknown as Record<string, unknown>,
      });

      return res.status(201).json({
        ...template,
        constraints: JSON.parse(template.constraints),
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.issues });
      }
      throw error;
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'market:read');
