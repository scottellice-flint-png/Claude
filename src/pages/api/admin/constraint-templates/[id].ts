// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/services/auditService';
import { validateBody, updateConstraintTemplateSchema } from '@/lib/validation';
import { ZodError } from 'zod';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  if (req.method === 'GET') {
    const template = await prisma.constraintTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.status(200).json({
      ...template,
      constraints: JSON.parse(template.constraints),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const input = validateBody(updateConstraintTemplateSchema, req.body);

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await prisma.constraintTemplate.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.constraints !== undefined) updateData.constraints = JSON.stringify(input.constraints);
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

      const template = await prisma.constraintTemplate.update({
        where: { id },
        data: updateData,
      });

      await createAuditLog({
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        entityType: 'constraint_template',
        entityId: id,
        action: 'update',
        newData: template as unknown as Record<string, unknown>,
      });

      return res.status(200).json({
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

  if (req.method === 'DELETE') {
    const template = await prisma.constraintTemplate.findUnique({ where: { id } });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.constraintTemplate.delete({ where: { id } });

    await createAuditLog({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      entityType: 'constraint_template',
      entityId: id,
      action: 'delete',
      previousData: template as unknown as Record<string, unknown>,
    });

    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAdminAuth(handler, 'market:read');
