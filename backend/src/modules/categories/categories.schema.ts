import { z } from 'zod';
import { AttributeType } from '@prisma/client';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required').optional(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createAttributeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  key: z
    .string()
    .min(2, 'Key is required')
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase letters, numbers, and underscores'),
  displayLabel: z.string().min(2, 'Display label must be at least 2 characters').optional(),
  type: z.nativeEnum(AttributeType),
  options: z.array(z.string()).optional(),
  validationRules: z.record(z.any()).optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(true),
  unit: z.string().optional(),
  displayOrder: z.number().int().default(0),
});

export const updateAttributeSchema = createAttributeSchema.partial();
