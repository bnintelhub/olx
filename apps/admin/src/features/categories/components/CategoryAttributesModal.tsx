import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  ListFilter,
  CheckSquare,
  CircleDot,
  Hash,
  Type,
  ToggleLeft,
  Calendar,
  X,
  Info,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
  Search,
} from 'lucide-react';
import { CategoryItem, CategoryAttributeItem } from '../service/categories.service';
import { useCategoryAttributesQuery } from '../hook/useCategoriesQuery';
import {
  useAddCategoryAttributeMutation,
  useUpdateCategoryAttributeMutation,
  useDeleteCategoryAttributeMutation,
} from '../hook/useCategoriesMutation';
import { toast } from 'sonner';

interface CategoryAttributesModalProps {
  category: CategoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

type AttributeUiType = 'SELECT' | 'RADIO' | 'CHECKBOX' | 'NUMBER' | 'TEXT' | 'BOOLEAN' | 'DATE';

export function CategoryAttributesModal({
  category,
  isOpen,
  onClose,
}: CategoryAttributesModalProps) {
  const categoryId = category?.id || null;

  // View state: Fullscreen mode & Mobile Tabs
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [mobileTab, setMobileTab] = useState<'FIELDS' | 'ADD'>('ADD');
  const [searchFilter, setSearchFilter] = useState('');

  // Attributes query & mutations
  const { data: attributes = [], isLoading } = useCategoryAttributesQuery(categoryId);
  const addMutation = useAddCategoryAttributeMutation();
  const updateMutation = useUpdateCategoryAttributeMutation();
  const deleteMutation = useDeleteCategoryAttributeMutation();

  // Edit State
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [uiType, setUiType] = useState<AttributeUiType>('SELECT');
  const [optionInput, setOptionInput] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [unit, setUnit] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isFilterable, setIsFilterable] = useState(true);

  // Auto-slugify name into key (only in create mode)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingAttributeId) {
      const generatedKey = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);
      setKey(generatedKey);
    }
  };

  // Start editing existing attribute
  const handleStartEdit = (attr: CategoryAttributeItem) => {
    setEditingAttributeId(attr.id);
    setName(attr.name);
    setKey(attr.key);
    let ui: AttributeUiType = 'SELECT';
    if (attr.type === 'MULTI_SELECT') {
      ui = 'CHECKBOX';
    } else if (attr.type === 'SELECT') {
      ui = 'SELECT';
    } else {
      ui = attr.type;
    }
    setUiType(ui);
    setOptions(Array.isArray(attr.options) ? [...attr.options] : []);
    setUnit(attr.unit || '');
    setIsRequired(Boolean(attr.isRequired));
    setIsFilterable(attr.isFilterable !== false);
    setMobileTab('ADD');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingAttributeId(null);
    setName('');
    setKey('');
    setOptionInput('');
    setOptions([]);
    setUnit('');
    setIsRequired(false);
    setIsFilterable(true);
    setUiType('SELECT');
  };

  // Add individual or comma-separated options
  const handleAddOption = (text?: string) => {
    const raw = text ?? optionInput;
    if (!raw.trim()) return;

    const tokens = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const merged = Array.from(new Set([...options, ...tokens]));
    setOptions(merged);
    setOptionInput('');
  };

  const handleRemoveOption = (optToRemove: string) => {
    setOptions(options.filter((o) => o !== optToRemove));
  };

  // Filtered attributes based on search filter
  const filteredAttributes = useMemo(() => {
    if (!searchFilter.trim()) return attributes;
    const q = searchFilter.toLowerCase();
    return attributes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.key.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [attributes, searchFilter]);

  const handleCreateAttribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    if (!name.trim()) {
      toast.error('Field Name is required');
      return;
    }

    const cleanKey = key.trim().toLowerCase();
    if (!cleanKey || !/^[a-z0-9_]+$/.test(cleanKey)) {
      toast.error('Field Key must only contain lowercase letters, numbers, and underscores (e.g. fuel_type)');
      return;
    }

    // Determine backend AttributeType
    let backendType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'DATE';
    if (uiType === 'RADIO' || uiType === 'SELECT') {
      backendType = 'SELECT';
    } else if (uiType === 'CHECKBOX') {
      backendType = 'MULTI_SELECT';
    } else {
      backendType = uiType;
    }

    // Options validation: required for SELECT & MULTI_SELECT, forbidden for others
    let finalOptions: string[] | undefined = undefined;
    if (backendType === 'SELECT' || backendType === 'MULTI_SELECT') {
      let merged = [...options];
      if (optionInput.trim()) {
        const extra = optionInput
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
        merged = Array.from(new Set([...merged, ...extra]));
      }

      if (merged.length === 0) {
        toast.error(`Please provide at least 1 option for ${uiType === 'CHECKBOX' ? 'checklist' : 'dropdown/radio'}`);
        return;
      }
      finalOptions = merged;
    }

    if (editingAttributeId) {
      // UPDATE EXISTING ATTRIBUTE
      updateMutation.mutate(
        {
          categoryId,
          attributeId: editingAttributeId,
          payload: {
            name: name.trim(),
            key: cleanKey,
            displayLabel: name.trim(),
            type: backendType,
            options: finalOptions,
            unit: backendType === 'NUMBER' && unit.trim() ? unit.trim() : undefined,
            isRequired,
            isFilterable,
          },
        },
        {
          onSuccess: () => {
            handleCancelEdit();
            setMobileTab('FIELDS');
          },
        }
      );
    } else {
      // CREATE NEW ATTRIBUTE
      addMutation.mutate(
        {
          categoryId,
          payload: {
            name: name.trim(),
            key: cleanKey,
            displayLabel: name.trim(),
            type: backendType,
            options: finalOptions,
            unit: backendType === 'NUMBER' && unit.trim() ? unit.trim() : undefined,
            isRequired,
            isFilterable,
            displayOrder: attributes.length,
          },
        },
        {
          onSuccess: () => {
            handleCancelEdit();
            setMobileTab('FIELDS');
          },
        }
      );
    }
  };

  const handleDeleteAttribute = (attrId: string, attrName: string) => {
    if (!categoryId) return;
    if (confirm(`Are you sure you want to delete the field "${attrName}"?`)) {
      deleteMutation.mutate({ categoryId, attributeId: attrId });
    }
  };

  if (!category) return null;

  // Responsive full-screen dialog styling
  const dialogContainerClasses = isFullscreen
    ? 'w-full h-full max-w-none max-h-none rounded-none p-3 sm:p-5 flex flex-col overflow-hidden bg-background'
    : 'w-[98vw] max-w-7xl h-[94vh] max-h-[94vh] rounded-xl p-4 sm:p-6 flex flex-col overflow-hidden bg-background';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      className={dialogContainerClasses}
      containerClassName={isFullscreen ? 'p-0' : 'p-2 sm:p-4'}
    >
      <DialogContent className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                  Custom Specification Fields Studio
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-bold border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  {category.name}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Level {category.level}
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                  /{category.slug}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Dynamic fields configured here automatically reflect in the client sell form and search filters.
              </DialogDescription>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 self-end sm:self-center pr-6 sm:pr-8">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 text-xs gap-1.5 cursor-pointer hidden sm:inline-flex"
              title={isFullscreen ? 'Exit Full Screen' : 'Expand Full Screen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Full Screen</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile View Tab Switcher (Visible on small screens) */}
        <div className="flex lg:hidden rounded-lg border bg-muted/40 p-1 my-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('FIELDS')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              mobileTab === 'FIELDS'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Configured Fields ({attributes.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('ADD')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              mobileTab === 'ADD'
                ? 'bg-background text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            + Add New Dynamic Field
          </button>
        </div>

        {/* Main Workspace Body: Auto-Responsive Two-Column Studio Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 overflow-hidden">
          {/* Left Column: Configured Fields Directory (5 cols) */}
          <div
            className={`lg:col-span-5 h-full flex flex-col border rounded-xl bg-card overflow-hidden shadow-2xs ${
              mobileTab === 'FIELDS' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Header & Search */}
            <div className="p-3 border-b bg-muted/20 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ListFilter className="h-4 w-4 text-primary" />
                  Configured Fields Directory ({attributes.length})
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Inherited & Direct
                </Badge>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search field by name, key, or type..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Scrollable Attributes Directory */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading specification fields...
                </div>
              ) : filteredAttributes.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/10 space-y-2">
                  <SlidersHorizontal className="h-7 w-7 text-muted-foreground mx-auto opacity-60" />
                  <p className="text-xs font-semibold text-foreground">
                    {searchFilter ? 'No matching fields found' : 'No fields configured yet'}
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    {searchFilter
                      ? 'Try clearing the search query to view all fields.'
                      : 'Use the studio form to add dropdowns, checklists, radio lists, numbers, or text fields.'}
                  </p>
                </div>
              ) : (
                filteredAttributes.map((attr) => (
                  <div
                    key={attr.id || attr.key}
                    className="p-3 rounded-lg border bg-background hover:border-primary/40 transition space-y-2 shadow-2xs group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-foreground">
                            {attr.name}
                          </span>

                          {/* Attribute Type Badge with Icon */}
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 font-mono flex items-center gap-1"
                          >
                            {attr.type === 'SELECT' && <ListFilter className="h-2.5 w-2.5 text-blue-500" />}
                            {attr.type === 'MULTI_SELECT' && <CheckSquare className="h-2.5 w-2.5 text-indigo-500" />}
                            {attr.type === 'NUMBER' && <Hash className="h-2.5 w-2.5 text-amber-500" />}
                            {attr.type === 'TEXT' && <Type className="h-2.5 w-2.5 text-emerald-500" />}
                            {attr.type === 'BOOLEAN' && <ToggleLeft className="h-2.5 w-2.5 text-violet-500" />}
                            {attr.type === 'DATE' && <Calendar className="h-2.5 w-2.5 text-cyan-500" />}
                            <span>{attr.type}</span>
                          </Badge>

                          {attr.unit && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                              Unit: {attr.unit}
                            </Badge>
                          )}
                        </div>

                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          Key: <code className="text-foreground">{attr.key}</code>
                        </div>
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-6 w-6 shrink-0 cursor-pointer transition ${
                            editingAttributeId === attr.id
                              ? 'text-primary bg-primary/10'
                              : 'text-muted-foreground hover:text-primary'
                          }`}
                          title="Edit / Update Field"
                          onClick={() => handleStartEdit(attr)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 cursor-pointer opacity-70 group-hover:opacity-100 transition"
                          title="Delete Field"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDeleteAttribute(attr.id, attr.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Options Pills for SELECT / MULTI_SELECT */}
                    {attr.options && attr.options.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-semibold text-muted-foreground block">
                          Options ({attr.options.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 rounded bg-muted/20 border">
                          {attr.options.map((opt: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-background text-[10px] text-foreground border shadow-2xs font-medium"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requirement & Filterability Footer */}
                    <div className="flex items-center gap-2 pt-1 border-t text-[10px]">
                      {attr.isRequired ? (
                        <span className="text-destructive font-semibold flex items-center gap-0.5">
                          • Required in Sell Form
                        </span>
                      ) : (
                        <span className="text-muted-foreground">• Optional in Sell Form</span>
                      )}
                      {attr.isFilterable && (
                        <span className="text-primary font-semibold flex items-center gap-0.5">
                          • Search Filterable
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Add Dynamic Field Form (7 cols) */}
          <div
            className={`lg:col-span-7 h-full flex flex-col border rounded-xl bg-card overflow-hidden shadow-2xs ${
              mobileTab === 'ADD' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Header */}
            <div className="p-3 border-b bg-muted/20 shrink-0 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  {editingAttributeId ? (
                    <>
                      <Edit2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>Update Dynamic Field</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 text-emerald-600" />
                      <span>Define New Dynamic Field</span>
                    </>
                  )}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {editingAttributeId
                    ? `Editing specification "${name || 'field'}". Update controls and save changes.`
                    : `Configure input controls and validation parameters for category ${category.name}.`}
                </p>
              </div>

              {editingAttributeId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-7 text-xs px-2.5 cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                >
                  Cancel Edit
                </Button>
              )}
            </div>

            {/* Scrollable Form Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <form onSubmit={handleCreateAttribute} className="space-y-4 max-w-3xl">
                {/* Field Label & Key (Auto-responsive grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground block">
                      Field Label / Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Fuel Type, Bedrooms, KM Driven, Brand"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="h-8.5 text-xs"
                      required
                    />
                    <span className="text-[10px] text-muted-foreground block">
                      The user-facing label shown in the seller post form.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground block">
                      Field Key Identifier <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="e.g. fuel_type, bedrooms, km_driven"
                      value={key}
                      onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      className="h-8.5 text-xs font-mono"
                      required
                    />
                    <span className="text-[10px] text-muted-foreground block">
                      Lowercase letters, numbers, and underscores only.
                    </span>
                  </div>
                </div>

                {/* Input Type Selector (Responsive 7-item grid) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Input Control Type <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
                    {/* 1. Dropdown */}
                    <button
                      type="button"
                      onClick={() => setUiType('SELECT')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'SELECT'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ListFilter className="h-4 w-4 shrink-0 text-blue-500" />
                      <div>
                        <div className="leading-tight">Dropdown</div>
                        <div className="text-[9px] font-normal text-muted-foreground">Single select</div>
                      </div>
                    </button>

                    {/* 2. Radio Buttons */}
                    <button
                      type="button"
                      onClick={() => setUiType('RADIO')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'RADIO'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <CircleDot className="h-4 w-4 shrink-0 text-sky-500" />
                      <div>
                        <div className="leading-tight">Radio Pills</div>
                        <div className="text-[9px] font-normal text-muted-foreground">Single choice</div>
                      </div>
                    </button>

                    {/* 3. Checklist */}
                    <button
                      type="button"
                      onClick={() => setUiType('CHECKBOX')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'CHECKBOX'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <CheckSquare className="h-4 w-4 shrink-0 text-indigo-500" />
                      <div>
                        <div className="leading-tight">Checklist</div>
                        <div className="text-[9px] font-normal text-muted-foreground">Multi choice</div>
                      </div>
                    </button>

                    {/* 4. Number */}
                    <button
                      type="button"
                      onClick={() => setUiType('NUMBER')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'NUMBER'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Hash className="h-4 w-4 shrink-0 text-amber-500" />
                      <div>
                        <div className="leading-tight">Number</div>
                        <div className="text-[9px] font-normal text-muted-foreground">With units</div>
                      </div>
                    </button>

                    {/* 5. Text */}
                    <button
                      type="button"
                      onClick={() => setUiType('TEXT')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'TEXT'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Type className="h-4 w-4 shrink-0 text-emerald-500" />
                      <div>
                        <div className="leading-tight">Text Input</div>
                        <div className="text-[9px] font-normal text-muted-foreground">Free form</div>
                      </div>
                    </button>

                    {/* 6. Boolean */}
                    <button
                      type="button"
                      onClick={() => setUiType('BOOLEAN')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'BOOLEAN'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ToggleLeft className="h-4 w-4 shrink-0 text-violet-500" />
                      <div>
                        <div className="leading-tight">Yes / No</div>
                        <div className="text-[9px] font-normal text-muted-foreground">Boolean switch</div>
                      </div>
                    </button>

                    {/* 7. Date */}
                    <button
                      type="button"
                      onClick={() => setUiType('DATE')}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        uiType === 'DATE'
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Calendar className="h-4 w-4 shrink-0 text-cyan-500" />
                      <div>
                        <div className="leading-tight">Date Picker</div>
                        <div className="text-[9px] font-normal text-muted-foreground">Calendar date</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Options List (For Dropdown, Radio, Checklist) */}
                {(uiType === 'SELECT' || uiType === 'RADIO' || uiType === 'CHECKBOX') && (
                  <div className="space-y-2 p-3.5 rounded-xl border bg-muted/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <span>Options List</span>
                        <span className="text-destructive">*</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        Press Enter or separate with commas
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. Petrol, Diesel, Electric, Hybrid, CNG"
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                        className="h-8.5 text-xs bg-background"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddOption()}
                        className="h-8.5 text-xs px-3.5 cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>

                    {/* Options Chips Preview */}
                    {options.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                          <span>Configured Options ({options.length}):</span>
                          <button
                            type="button"
                            onClick={() => setOptions([])}
                            className="text-destructive hover:underline cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border rounded-lg bg-background">
                          {options.map((opt) => (
                            <span
                              key={opt}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                            >
                              <span>{opt}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(opt)}
                                className="text-primary/70 hover:text-destructive cursor-pointer ml-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ At least 1 option is required for {uiType === 'CHECKBOX' ? 'checklist' : 'dropdown/radio'}.
                      </p>
                    )}
                  </div>
                )}

                {/* Unit Input (For Number Type) */}
                {uiType === 'NUMBER' && (
                  <div className="space-y-1.5 p-3.5 rounded-xl border bg-muted/10">
                    <label className="text-xs font-semibold text-foreground block">
                      Measurement Unit (Optional)
                    </label>
                    <Input
                      placeholder="e.g. KM, sq.ft, GB, BHK, cc, Years"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="h-8.5 text-xs font-mono bg-background"
                    />
                    <span className="text-[10px] text-muted-foreground block">
                      Optional unit displayed next to number input (e.g. KM, sq.ft, GB, BHK).
                    </span>
                  </div>
                )}

                {/* Requirement & Search Filter Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-background cursor-pointer hover:bg-muted/30 transition">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="mt-0.5 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Mandatory Field (Required)
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Seller cannot publish the ad without providing this specification.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border bg-background cursor-pointer hover:bg-muted/30 transition">
                    <input
                      type="checkbox"
                      checked={isFilterable}
                      onChange={(e) => setIsFilterable(e.target.checked)}
                      className="mt-0.5 rounded cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Search Filter Facet
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Renders in the search page sidebar for buyers to filter listings.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Submit Action Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={addMutation.isPending || updateMutation.isPending}
                    className="w-full h-10 text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer shadow-md hover:shadow-lg transition"
                  >
                    {editingAttributeId ? (
                      <>
                        <Check className="h-4 w-4" />
                        {updateMutation.isPending ? 'Updating Dynamic Specification Field...' : 'Update Dynamic Field'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {addMutation.isPending ? 'Saving Dynamic Specification Field...' : 'Add Dynamic Field to Category'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t mt-2 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-muted-foreground">
            Category: <strong>{category.name}</strong> • Active Fields: <strong>{attributes.length}</strong>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs cursor-pointer px-4"
            onClick={onClose}
          >
            Done / Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
