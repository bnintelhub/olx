import { AttributeType } from '@prisma/client';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
  ReorderCategoriesInput,
} from './categories.schema';
import {
  MAX_CATEGORY_DEPTH,
  CategoryQueryService,
  CategoryMutationService,
  CategoryMediaService,
  CategoryAttributeService,
} from './services';

export { MAX_CATEGORY_DEPTH };

export class CategoriesService {
  // Query operations
  static getAll = CategoryQueryService.getAll;
  static getTree = CategoryQueryService.getTree;
  static getBySlug = CategoryQueryService.getBySlug;

  // Attribute & specification operations
  static validateAttributeTypeOptions(type: AttributeType, options?: string[]) {
    return CategoryAttributeService.validateAttributeTypeOptions(type, options);
  }
  static getAttributes = CategoryAttributeService.getAttributes;
  static addAttribute = CategoryAttributeService.addAttribute;
  static updateAttribute = CategoryAttributeService.updateAttribute;
  static deleteAttribute = CategoryAttributeService.deleteAttribute;

  // Standard mutation operations
  static create(input: CreateCategoryInput) {
    return CategoryMutationService.create(input);
  }
  static update(id: string, input: UpdateCategoryInput) {
    return CategoryMutationService.update(id, input);
  }
  static reorder(input: ReorderCategoriesInput) {
    return CategoryMutationService.reorder(input);
  }
  static toggleActive(id: string, isActive: boolean) {
    return CategoryMutationService.toggleActive(id, isActive);
  }
  static delete(id: string) {
    return CategoryMutationService.delete(id);
  }

  // Media & file upload mutation operations
  static createWithFile(fields: any, filePart: any, userId: string, baseUrl?: string) {
    return CategoryMediaService.createWithFile(fields, filePart, userId, baseUrl);
  }
  static updateWithFile(id: string, fields: any, filePart: any, userId: string, baseUrl?: string) {
    return CategoryMediaService.updateWithFile(id, fields, filePart, userId, baseUrl);
  }
}
