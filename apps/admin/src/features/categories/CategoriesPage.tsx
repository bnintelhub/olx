import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  FolderTree,
  Plus,
  RotateCw,
  Search,
  ChevronRight,
  ChevronDown,
  Layers,
  Edit2,
  Trash2,
  Power,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Sparkles,
  Upload,
  X,
  Copy,
  Check,
  ExternalLink,
  Tag,
  Info,
} from 'lucide-react';
import { useCategoryTree } from './hook/useCategoriesQuery';
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useToggleCategoryStatusMutation,
  useReorderCategoriesMutation,
  useDeleteCategoryMutation,
} from './hook/useCategoriesMutation';
import { CategoryItem, CreateCategoryPayload } from './service/categories.service';

// Robust category thumbnail with graceful error fallback and automatic retry for async background worker processing
function CategoryThumbnail({
  src,
  alt,
  size = 'sm',
}: {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'lg';
}) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Automatically reset error state whenever image source changes
  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  // If worker is still processing variants asynchronously in background, retry after a short delay
  const handleError = () => {
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setHasError(false);
      }, 1000);
    } else {
      setHasError(true);
    }
  };

  // Fallback if URL is missing, or not a valid HTTP/data path
  const isInvalidUrl =
    !src ||
    (!src.startsWith('http://') &&
      !src.startsWith('https://') &&
      !src.startsWith('/') &&
      !src.startsWith('data:'));

  if (isInvalidUrl || hasError) {
    return (
      <div
        className={`${
          size === 'lg' ? 'h-24 w-24' : 'h-7 w-7'
        } rounded bg-muted border flex items-center justify-center shrink-0 text-muted-foreground/60`}
      >
        <FolderTree className={size === 'lg' ? 'h-8 w-8' : 'h-3.5 w-3.5'} />
      </div>
    );
  }

  // Use cache-busting query parameter upon retry to bypass browser 404 cache while worker writes file
  const imageSrc =
    retryCount > 0 ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}` : src;

  return (
    <div
      className={`${
        size === 'lg' ? 'h-24 w-24' : 'h-7 w-7'
      } rounded bg-muted border flex items-center justify-center overflow-hidden shrink-0 bg-background`}
    >
      <img
        key={imageSrc}
        src={imageSrc}
        alt={alt}
        onError={handleError}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

// Image shown in the category detail modal — reuses the same retry logic as CategoryThumbnail
// so freshly-uploaded images that are still PROCESSING become visible without a manual reload
function DetailModalImage({
  src,
  alt,
  href,
}: {
  src?: string | null;
  alt: string;
  href?: string | null;
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setRetryCount(0);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setHasError(false);
      }, 1000);
    } else {
      setHasError(true);
    }
  };

  const imageSrc = src
    ? retryCount > 0
      ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}`
      : src
    : null;

  return (
    <div className="relative group rounded-lg overflow-hidden border bg-background shrink-0 h-28 w-28 flex items-center justify-center">
      {imageSrc && !hasError ? (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={alt}
          onError={handleError}
          className="h-full w-full object-cover"
        />
      ) : (
        <FolderTree className="h-8 w-8 text-muted-foreground/60" />
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-medium gap-1"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Full
        </a>
      )}
    </div>
  );
}

// Convenient interactive Drag & Drop and click-to-upload image component
interface ImageDropzoneProps {
  previewUrl: string | null;
  selectedFile: File | null;
  currentImageUrl?: string | null;
  removeExistingImage?: boolean;
  onFileSelect: (file: File) => void;
  onClearSelectedFile: () => void;
  onRemoveExistingImage?: () => void;
  onRestoreExistingImage?: () => void;
  label?: string;
}

function ImageDropzone({
  previewUrl,
  selectedFile,
  currentImageUrl,
  removeExistingImage = false,
  onFileSelect,
  onClearSelectedFile,
  onRemoveExistingImage,
  onRestoreExistingImage,
  label = 'Category Icon / Image',
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-semibold text-foreground block text-xs">{label}</label>
        {selectedFile && (
          <span className="text-[10px] text-muted-foreground font-mono">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
        )}
      </div>

      {/* 1. New File Selected -> Preview Card with Drop Replacement */}
      {previewUrl && selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex items-center gap-3 p-2.5 border rounded-lg transition ${
            isDragging ? 'border-primary bg-primary/10 border-dashed' : 'bg-muted/20 border-border'
          }`}
        >
          <img
            src={previewUrl}
            alt="Preview"
            className="h-14 w-14 rounded-md object-cover border shrink-0 bg-background shadow-xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary text-primary">
                Ready
              </Badge>
              <p className="text-xs font-medium text-foreground truncate">{selectedFile.name}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {selectedFile.type || 'image'} • {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <p className="text-[9px] text-muted-foreground/75 mt-0.5">
              Drop another file or click &quot;Change&quot; to replace
            </p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="h-6 px-2 text-[10px] cursor-pointer"
            >
              Change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onClearSelectedFile}
              className="h-6 px-2 text-destructive hover:bg-destructive/10 text-[10px] cursor-pointer"
            >
              <X className="h-3 w-3 mr-0.5" />
              Remove
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/jpg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      ) : removeExistingImage ? (
        /* 2. Existing image marked for deletion */
        <div className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-destructive/5 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            <span>Icon will be deleted on save.</span>
          </div>
          {onRestoreExistingImage && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRestoreExistingImage}
              className="h-7 px-2.5 text-xs cursor-pointer"
            >
              Undo
            </Button>
          )}
        </div>
      ) : currentImageUrl ? (
        /* 3. Existing image card (drag & drop over it to replace instantly) */
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex items-center gap-3 p-2.5 border rounded-lg transition ${
            isDragging
              ? 'border-primary bg-primary/10 border-dashed scale-[1.01]'
              : 'bg-muted/20 border-border hover:bg-muted/30'
          }`}
        >
          <img
            src={currentImageUrl}
            alt="Current category icon"
            className="h-14 w-14 rounded-md object-cover border shrink-0 bg-background shadow-xs"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">Current Category Icon</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isDragging ? 'Drop image here to replace!' : 'Drag & drop image here to replace, or click Change'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="h-7 px-2 text-xs cursor-pointer gap-1"
            >
              <Upload className="h-3 w-3" />
              Change
            </Button>
            {onRemoveExistingImage && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onRemoveExistingImage}
                className="h-7 px-2 text-destructive hover:bg-destructive/10 text-xs cursor-pointer"
                title="Remove current icon"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/jpg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      ) : (
        /* 4. Empty dropzone: Interactive Drag & Drop Area */
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 transition cursor-pointer text-center group ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-muted-foreground/25 hover:border-primary/60 hover:bg-muted/30 bg-muted/10'
          }`}
        >
          <div
            className={`p-2 rounded-full mb-1.5 transition ${
              isDragging
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'
            }`}
          >
            <Upload className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold text-foreground">
            {isDragging ? 'Drop image to upload!' : 'Drag & drop image here, or click to browse'}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            Supports JPEG, PNG, WebP, HEIC (Max 10MB)
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/jpg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);
  const [detailsCategory, setDetailsCategory] = useState<CategoryItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Direct Image File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  // Revoke object URL on unmount or file change to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle direct file selection with client validation
  const handleFileSelect = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and HEIC images are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image exceeds maximum allowed size of 10MB');
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  };

  const handleClearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Queries & Mutations
  const { data: tree = [], isLoading, isFetching, refetch } = useCategoryTree(true);
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const toggleStatusMutation = useToggleCategoryStatusMutation();
  const reorderMutation = useReorderCategoriesMutation();
  const deleteMutation = useDeleteCategoryMutation();

  // Flattens tree into a flat list for select dropdowns & parent options
  const flatCategoryList = useMemo(() => {
    const list: Array<{ id: string; name: string; level: number; parentId: string | null; sortOrder: number }> = [];
    const traverse = (items: CategoryItem[]) => {
      items.forEach((item) => {
        list.push({ id: item.id, name: item.name, level: item.level, parentId: item.parentId, sortOrder: item.sortOrder ?? 0 });
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      });
    };
    traverse(tree);
    return list;
  }, [tree]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Automatically calculate next sort order among siblings (max + 1)
  const getNextSortOrder = (parentId: string | null) => {
    const siblings = flatCategoryList.filter((c) =>
      parentId ? c.parentId === parentId : !c.parentId
    );
    if (siblings.length === 0) return 0;
    const maxOrder = Math.max(...siblings.map((s) => s.sortOrder ?? 0));
    return maxOrder + 1;
  };

  const handleOpenCreate = (parentId: string | null = null) => {
    setFormName('');
    setFormSlug('');
    setFormParentId(parentId);
    setFormDescription('');
    setFormSortOrder(getNextSortOrder(parentId));
    handleClearSelectedFile();
    setRemoveExistingImage(false);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormParentId(cat.parentId);
    setFormDescription(cat.description || '');
    setFormSortOrder(cat.sortOrder);
    handleClearSelectedFile();
    setRemoveExistingImage(false);
  };

  const handleSubmitCreate = () => {
    if (!formName.trim()) return;

    const payload: CreateCategoryPayload = {
      name: formName.trim(),
      slug: formSlug.trim() || undefined,
      parentId: formParentId || null,
      description: formDescription.trim() || undefined,
      sortOrder: formSortOrder,
      isActive: true,
    };

    createMutation.mutate(
      { payload, imageFile: selectedFile },
      {
        onSuccess: () => {
          handleClearSelectedFile();
          setIsCreateOpen(false);
        },
      }
    );
  };

  const handleSubmitUpdate = () => {
    if (!editingCategory || !formName.trim()) return;

    updateMutation.mutate(
      {
        id: editingCategory.id,
        payload: {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          parentId: formParentId,
          description: formDescription.trim() || null,
          sortOrder: formSortOrder,
        },
        imageFile: selectedFile,
        removeImage: removeExistingImage,
      },
      {
        onSuccess: (updatedCat) => {
          handleClearSelectedFile();
          setEditingCategory(null);
          // Sync details modal immediately with updated category and fresh media
          if (detailsCategory && detailsCategory.id === updatedCat.id) {
            setDetailsCategory(updatedCat);
          }
        },
      }
    );
  };

  const handleMoveSibling = (category: CategoryItem, direction: 'UP' | 'DOWN', siblings: CategoryItem[]) => {
    const currentIndex = siblings.findIndex((s) => s.id === category.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetCategory = siblings[targetIndex];
    reorderMutation.mutate([
      { id: category.id, sortOrder: targetCategory.sortOrder },
      { id: targetCategory.id, sortOrder: category.sortOrder },
    ]);
  };

  // Recursive renderer for category rows
  const renderCategoryRow = (cat: CategoryItem, siblings: CategoryItem[]) => {
    const hasChildren = Boolean(cat.children && cat.children.length > 0);
    const isExpanded = expandedIds.has(cat.id);

    // Filter check
    const matchesSearch =
      !search ||
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.slug.toLowerCase().includes(search.toLowerCase());

    return (
      <div key={cat.id} className="border-b last:border-b-0">
        <div
          onClick={() => {
            // Clicking row card toggles and opens child subcategories one by one down the hierarchy
            if (hasChildren) {
              toggleExpand(cat.id);
            }
          }}
          className={`flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition text-xs select-none ${
            hasChildren ? 'cursor-pointer' : 'cursor-default'
          } ${!cat.isActive ? 'opacity-60 bg-muted/10' : ''}`}
        >
          {/* Left: Tree indentation + Name + Icon */}
          <div
            className="flex items-center gap-2 min-w-0 flex-1"
            style={{ paddingLeft: `${cat.level * 24}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(cat.id);
                }}
                className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground cursor-pointer shrink-0"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}

            {/* Thumbnail / Icon (clicking opens details) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setDetailsCategory(cat);
              }}
              className="cursor-pointer"
              title="Click to view details"
            >
              <CategoryThumbnail
                src={cat.image?.thumbnailUrl || cat.image?.url}
                alt={cat.name}
              />
            </div>

            {/* Category info (clicking name opens details) */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsCategory(cat);
                  }}
                  className="font-semibold text-foreground text-xs truncate hover:underline hover:text-primary cursor-pointer"
                  title="Click to view category details"
                >
                  {cat.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">/{cat.slug}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                  L{cat.level}
                </Badge>
              </div>
              {cat.description && (
                <div className="text-[10px] text-muted-foreground truncate max-w-sm">
                  {cat.description}
                </div>
              )}
            </div>
          </div>

          {/* Center: Ads count & Sort Order */}
          <div className="flex items-center gap-4 text-xs shrink-0 px-4">
            <span className="font-mono text-muted-foreground text-[11px]" title="Sort Sequence">
              Order: <strong>{cat.sortOrder}</strong>
            </span>
            <span className="text-muted-foreground text-[11px]">
              {cat.adsCount ? `${cat.adsCount.toLocaleString()} ads` : '0 ads'}
            </span>
            <Badge
              variant={cat.isActive ? 'default' : 'secondary'}
              className="text-[9px] font-semibold px-1.5 py-0"
            >
              {cat.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Right: Actions */}
          <div
            className="flex items-center gap-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sibling Reordering buttons */}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 cursor-pointer"
              title="Move Up"
              disabled={reorderMutation.isPending}
              onClick={() => handleMoveSibling(cat, 'UP', siblings)}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 cursor-pointer"
              title="Move Down"
              disabled={reorderMutation.isPending}
              onClick={() => handleMoveSibling(cat, 'DOWN', siblings)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>

            {/* Add Child (allowed up to Level 3) */}
            {cat.level < 3 && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-1.5 text-[10px] gap-1 cursor-pointer"
                title="Add Subcategory"
                onClick={() => handleOpenCreate(cat.id)}
              >
                <Plus className="h-2.5 w-2.5" />
                <span>Add Sub</span>
              </Button>
            )}

            {/* Toggle Status */}
            <Button
              size="icon"
              variant="ghost"
              className={`h-6 w-6 cursor-pointer ${
                cat.isActive ? 'text-muted-foreground hover:text-amber-600' : 'text-emerald-600'
              }`}
              title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
              onClick={() => toggleStatusMutation.mutate({ id: cat.id, isActive: !cat.isActive })}
            >
              <Power className="h-3 w-3" />
            </Button>

            {/* Edit */}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 cursor-pointer"
              title="Edit Metadata"
              onClick={() => handleOpenEdit(cat)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>

            {/* Delete */}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
              title="Delete Category"
              onClick={() => setDeletingCategory(cat)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Child Subtree */}
        {hasChildren && isExpanded && (
          <div>
            {cat.children!.map((child) => renderCategoryRow(child, cat.children!))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Categories & Taxonomy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Self-referencing hierarchical category tree with automated depth enforcement, WebP CDN icons, and transactional reordering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8 cursor-pointer"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 h-8 bg-primary text-primary-foreground cursor-pointer shadow-xs"
            onClick={() => handleOpenCreate(null)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Root Category</span>
          </Button>
        </div>
      </div>

      {/* Main Category Tree Card */}
      <Card className="border shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search categories by name or slug..."
                className="pl-9 h-9 text-xs bg-muted/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Total Root Categories: <strong className="text-foreground">{tree.length}</strong>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              <div>Loading category hierarchy from server...</div>
            </div>
          ) : tree.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <FolderTree className="h-8 w-8 mx-auto opacity-40 mb-2" />
              <div>No categories found. Click &quot;Add Root Category&quot; to initialize taxonomy.</div>
            </div>
          ) : (
            <div className="divide-y">
              {tree.map((rootCategory) => renderCategoryRow(rootCategory, tree))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1. Create Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            {formParentId ? 'Add Subcategory' : 'Add Root Category'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Categories organize classified advertisements and dynamic specification filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">Category Name *</label>
            <Input
              placeholder="e.g. Electric Cars, Smart Watches..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">URL Slug (Optional)</label>
            <Input
              placeholder="Auto-generated if left empty (e.g. electric-cars)"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Parent Category</label>
            <select
              value={formParentId || ''}
              onChange={(e) => {
                const nextParentId = e.target.value || null;
                setFormParentId(nextParentId);
                setFormSortOrder(getNextSortOrder(nextParentId));
              }}
              className="w-full text-xs h-9 border rounded-md px-2.5 bg-background text-foreground"
            >
              <option value="">(None - Root Category Level 0)</option>
              {flatCategoryList
                .filter((c) => c.level < 3)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {'-'.repeat(c.level * 2)} {c.name} (Level {c.level})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Description (Optional)</label>
            <Input
              placeholder="Brief description for SEO and category preview"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-foreground">Sort Order</label>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded font-mono">
                Auto-assigned: #{formSortOrder}
              </span>
            </div>
            <Input
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
              className="text-xs h-9 font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Automatically prefilled with the next available order (#{formSortOrder}) among siblings.
            </p>
          </div>

          <ImageDropzone
            label="Category Icon / Image (Optional)"
            previewUrl={previewUrl}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onClearSelectedFile={handleClearSelectedFile}
          />
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setIsCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs cursor-pointer"
            disabled={createMutation.isPending || !formName.trim()}
            onClick={handleSubmitCreate}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 2. Edit Category Modal */}
      <Dialog open={Boolean(editingCategory)} onOpenChange={(open) => !open && setEditingCategory(null)} className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">Edit Category</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update taxonomy metadata, change parent level, or upload/replace category icons.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="font-semibold text-foreground block mb-1">Category Name *</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">URL Slug</label>
            <Input
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Parent Category</label>
            <select
              value={formParentId || ''}
              onChange={(e) => setFormParentId(e.target.value || null)}
              className="w-full text-xs h-9 border rounded-md px-2.5 bg-background text-foreground"
            >
              <option value="">(None - Root Category Level 0)</option>
              {flatCategoryList
                .filter((c) => c.id !== editingCategory?.id && c.level < 3)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {'-'.repeat(c.level * 2)} {c.name} (Level {c.level})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Description</label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Sort Order</label>
            <Input
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <ImageDropzone
            label="Category Icon / Image"
            previewUrl={previewUrl}
            selectedFile={selectedFile}
            currentImageUrl={(editingCategory?.image?.thumbnailUrl || editingCategory?.image?.url) ?? undefined}
            removeExistingImage={removeExistingImage}
            onFileSelect={handleFileSelect}
            onClearSelectedFile={handleClearSelectedFile}
            onRemoveExistingImage={() => setRemoveExistingImage(true)}
            onRestoreExistingImage={() => setRemoveExistingImage(false)}
          />
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setEditingCategory(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs cursor-pointer"
            disabled={updateMutation.isPending || !formName.trim()}
            onClick={handleSubmitUpdate}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 3. Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingCategory)} onOpenChange={(open) => !open && setDeletingCategory(null)} className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-destructive flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" />
            <span>Delete Category</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to delete category &quot;{deletingCategory?.name}&quot;? Deletion will be rejected if it has subcategories or active listings.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3">
          <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setDeletingCategory(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs cursor-pointer"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (deletingCategory) {
                deleteMutation.mutate(deletingCategory.id, {
                  onSuccess: () => setDeletingCategory(null),
                });
              }
            }}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* 4. Category Details View on Row Click */}
      <Dialog
        open={Boolean(detailsCategory)}
        onOpenChange={(open) => !open && setDetailsCategory(null)}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-bold text-foreground">
              {detailsCategory?.name}
            </DialogTitle>
            <Badge variant="outline" className="text-xs font-mono">
              Level {detailsCategory?.level} ({detailsCategory?.level === 0 ? 'Root' : 'Subcategory'})
            </Badge>
            <Badge variant={detailsCategory?.isActive ? 'default' : 'secondary'} className="text-xs">
              {detailsCategory?.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            /{detailsCategory?.slug}
          </DialogDescription>
        </DialogHeader>

        {detailsCategory && (
          <div className="space-y-4 py-2 text-xs">
            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/30 rounded-lg border">
              {detailsCategory.level < 3 && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 cursor-pointer"
                  onClick={() => {
                    const parentId = detailsCategory.id;
                    setDetailsCategory(null);
                    handleOpenCreate(parentId);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Subcategory
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 cursor-pointer"
                onClick={() => {
                  const catToEdit = detailsCategory;
                  setDetailsCategory(null);
                  handleOpenEdit(catToEdit);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Category
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 cursor-pointer"
                onClick={() => {
                  toggleStatusMutation.mutate(
                    { id: detailsCategory.id, isActive: !detailsCategory.isActive },
                    {
                      onSuccess: (updated) => {
                        setDetailsCategory((prev) => (prev ? { ...prev, isActive: updated.isActive } : null));
                      },
                    }
                  );
                }}
              >
                <Power className="h-3.5 w-3.5" />
                {detailsCategory.isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 cursor-pointer ml-auto"
                onClick={() => {
                  const catToDelete = detailsCategory;
                  setDetailsCategory(null);
                  setDeletingCategory(catToDelete);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>

            {/* Visual Icon & Media Variants Delivery */}
            <div className="p-3.5 rounded-lg border bg-card">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-primary" />
                Category Icon & Media Service Delivery
              </h4>

              {detailsCategory.image?.url || detailsCategory.image?.thumbnailUrl ? (
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <DetailModalImage
                    src={detailsCategory.image.url || detailsCategory.image.thumbnailUrl}
                    alt={detailsCategory.name}
                    href={detailsCategory.image.url || detailsCategory.image.thumbnailUrl}
                  />

                  <div className="space-y-2 flex-1 min-w-0">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Media Storage Reference:</span>
                      <span className="font-mono text-xs font-semibold text-foreground select-all">
                        {detailsCategory.imageMediaId || 'Custom URL'}
                      </span>
                    </div>

                    {/* Available CDN Variants */}
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Generated CDN Variants:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detailsCategory.image.variants?.thumbnail && (
                          <a
                            href={detailsCategory.image.variants.thumbnail}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted text-[11px] font-mono transition text-foreground"
                          >
                            thumbnail (300px)
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                          </a>
                        )}
                        {detailsCategory.image.variants?.card && (
                          <a
                            href={detailsCategory.image.variants.card}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted text-[11px] font-mono transition text-foreground"
                          >
                            card (600px)
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                          </a>
                        )}
                        {detailsCategory.image.variants?.medium && (
                          <a
                            href={detailsCategory.image.variants.medium}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted text-[11px] font-mono transition text-foreground"
                          >
                            medium (1200px)
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                          </a>
                        )}
                        {detailsCategory.image.variants?.large && (
                          <a
                            href={detailsCategory.image.variants.large}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted text-[11px] font-mono transition text-foreground"
                          >
                            large (1920px)
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
                  <FolderTree className="h-6 w-6 text-muted-foreground/60 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-xs">No Icon Assigned</p>
                    <p className="text-[11px]">
                      This category is currently using default folder representation. Click &quot;Edit Category&quot; to upload a custom icon.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Taxonomy & Hierarchy Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-card space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  Hierarchy & Positioning
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Parent Category:</span>
                    <span className="font-medium text-foreground">
                      {detailsCategory.parentId
                        ? flatCategoryList.find((c) => c.id === detailsCategory.parentId)?.name || detailsCategory.parentId
                        : '(None - Root Category)'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Depth Level:</span>
                    <span className="font-mono text-foreground">Level {detailsCategory.level}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Sibling Sort Sequence:</span>
                    <span className="font-mono text-foreground">{detailsCategory.sortOrder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Listings:</span>
                    <span className="font-semibold text-foreground">{detailsCategory.adsCount || 0} ads</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card space-y-2">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-primary" />
                  Metadata & Identifiers
                </h4>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">System Identifier (UUID):</span>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="font-mono text-[10px] text-foreground truncate select-all">{detailsCategory.id}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0 cursor-pointer"
                        title="Copy ID"
                        onClick={() => {
                          navigator.clipboard.writeText(detailsCategory.id);
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                          toast.success('Category ID copied to clipboard');
                        }}
                      >
                        {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-foreground">{new Date(detailsCategory.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="text-foreground">{new Date(detailsCategory.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description (if present) */}
            {detailsCategory.description && (
              <div className="p-3 rounded-lg border bg-card">
                <span className="text-muted-foreground block text-[11px] mb-1 font-semibold">Description</span>
                <p className="text-foreground text-xs leading-relaxed">{detailsCategory.description}</p>
              </div>
            )}

            {/* Subcategories Chip List */}
            {detailsCategory.children && detailsCategory.children.length > 0 && (
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Subcategories ({detailsCategory.children.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {detailsCategory.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setDetailsCategory(child)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-muted/30 hover:bg-muted text-xs transition cursor-pointer text-foreground"
                    >
                      <CategoryThumbnail src={child.image?.thumbnailUrl || child.image?.url} alt={child.name} />
                      <span className="font-medium">{child.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">/{child.slug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Specification Attributes */}
            {detailsCategory.attributes && detailsCategory.attributes.length > 0 && (
              <div className="p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-primary" />
                  Specification Attributes ({detailsCategory.attributes.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {detailsCategory.attributes.map((attr: any) => (
                    <div key={attr.id || attr.key} className="p-2 border rounded bg-background/50 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{attr.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                          {attr.type}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Key: <code className="font-mono">{attr.key}</code>
                        {attr.isRequired && <span className="text-destructive ml-1.5">• Required</span>}
                        {attr.isFilterable && <span className="text-primary ml-1.5">• Filterable</span>}
                      </div>
                      {attr.options && attr.options.length > 0 && (
                        <div className="mt-1 text-[10px] text-muted-foreground truncate" title={attr.options.join(', ')}>
                          Options: {attr.options.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs cursor-pointer ml-auto"
            onClick={() => setDetailsCategory(null)}
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
