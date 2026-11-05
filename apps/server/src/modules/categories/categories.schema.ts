import { z } from 'zod';
import { AttributeType } from '@prisma/client';

export const createCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Category name must be at least 2 characters')
      .max(100, 'Category name cannot exceed 100 characters'),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. "used-cars")')
      .max(120)
      .optional(),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
    parentId: z.string().uuid('Invalid parent category UUID format').nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).default(0),
    displayOrder: z.coerce.number().int().min(0).optional(), // Backward-compatible alias
    imageMediaId: z.string().uuid('Invalid media UUID format').nullable().optional(),
    iconUrl: z.string().url('Invalid URL').max(500).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .transform((data) => ({
    ...data,
    sortOrder: data.sortOrder ?? data.displayOrder ?? 0,
  }));

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
      .max(120)
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    parentId: z.string().uuid().nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    imageMediaId: z.string().uuid().nullable().optional(),
    iconUrl: z.string().url().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    sortOrder: data.sortOrder ?? data.displayOrder ?? undefined,
  }));

export const reorderCategoryItemSchema = z.object({
  id: z.string().uuid('Invalid category ID'),
  sortOrder: z.coerce.number().int().min(0),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(reorderCategoryItemSchema).min(1, 'At least one item is required to reorder'),
});

export const toggleCategoryStatusSchema = z.object({
  isActive: z.boolean(),
});

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

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type ToggleCategoryStatusInput = z.infer<typeof toggleCategoryStatusSchema>;
