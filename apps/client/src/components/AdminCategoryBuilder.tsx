import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Eye,
  Check,
  ChevronRight,
  ChevronDown,
  Layers,
  X,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Category } from '../types';

interface AttributeItem {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'DATE';
  options?: string[];
  isRequired: boolean;
  isFilterable: boolean;
  unit?: string;
  displayOrder: number;
}

interface CategoryNode extends Category {
  children?: CategoryNode[];
  attributes?: AttributeItem[];
}

export const AdminCategoryBuilder: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [resolvedAttributes, setResolvedAttributes] = useState<AttributeItem[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'FIELDS' | 'PREVIEW' | 'ADD_FIELD'>('FIELDS');

  // Form State for Adding New Attribute
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrType, setNewAttrType] = useState<'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT'>('SELECT');
  const [newAttrOptions, setNewAttrOptions] = useState('');
  const [newAttrUnit, setNewAttrUnit] = useState('');
  const [newAttrRequired, setNewAttrRequired] = useState(false);
  const [newAttrFilterable, setNewAttrFilterable] = useState(true);
  const [isSavingAttr, setIsSavingAttr] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form State for Adding New Subcategory
  const [isAddingSubcat, setIsAddingSubcat] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [newSubcatSlug, setNewSubcatSlug] = useState('');

  const fetchTree = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/categories/tree');
      const data = await res.json();
      if (data.success && data.data) {
        setTree(data.data);
        if (!selectedCategory && data.data.length > 0) {
          selectCategoryNode(data.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTree();
    }
  }, [isOpen]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectCategoryNode = async (cat: CategoryNode) => {
    setSelectedCategory(cat);
    // Fetch resolved attributes including inheritance
    try {
      const res = await fetch(`/api/v1/categories/${cat.id}/attributes`);
      const data = await res.json();
      if (data.success && data.data) {
        setResolvedAttributes(data.data.attributes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNameChange = (val: string) => {
    setNewAttrName(val);
    setNewAttrKey(
      val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
    );
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newAttrName || !newAttrKey) return;

    setIsSavingAttr(true);
    try {
      const token = localStorage.getItem('olx_access_token');
      const optionsArray =
        newAttrType === 'SELECT'
          ? newAttrOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;

      const res = await fetch(`/api/v1/categories/${selectedCategory.id}/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          name: newAttrName,
          key: newAttrKey,
          type: newAttrType,
          options: optionsArray,
          unit: newAttrUnit || undefined,
          isRequired: newAttrRequired,
          isFilterable: newAttrFilterable,
          displayOrder: resolvedAttributes.length + 1,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Field "${newAttrName}" added successfully!`);
        // Refresh attributes
        selectCategoryNode(selectedCategory);
        setNewAttrName('');
        setNewAttrKey('');
        setNewAttrOptions('');
        setNewAttrUnit('');
        setActiveTab('FIELDS');
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        alert(data.error?.message || 'Failed to save attribute');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingAttr(false);
    }
  };

  const handleDeleteAttribute = async (attrId: string) => {
    if (!confirm('Are you sure you want to delete this dynamic attribute?')) return;
    try {
      const token = localStorage.getItem('olx_access_token');
      const res = await fetch(`/api/v1/categories/attributes/${attrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (res.ok) {
        if (selectedCategory) selectCategoryNode(selectedCategory);
      } else {
        alert('Action failed. Make sure you are logged in as ADMIN.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newSubcatName || !newSubcatSlug) return;

    try {
      const token = localStorage.getItem('olx_access_token');
      const res = await fetch('/api/v1/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          name: newSubcatName,
          slug: newSubcatSlug.toLowerCase().trim(),
          parentId: selectedCategory.id,
          displayOrder: (selectedCategory.children?.length || 0) + 1,
        }),
      });

      if (res.ok) {
        setNewSubcatName('');
        setNewSubcatSlug('');
        setIsAddingSubcat(false);
        fetchTree();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Failed to create subcategory');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-primary px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Category & Dynamic Attribute Builder</h2>
              <p className="text-xs text-gray-300">
                Phase 2 Engine: Configure taxonomy, nested subcategories & dynamic specifications schema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTree}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-300 hover:bg-white/10 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action alert message */}
        {actionMessage && (
          <div className="bg-emerald-50 px-6 py-2 text-xs font-bold text-emerald-800 border-b border-emerald-200 flex items-center gap-2">
            <Check size={16} /> {actionMessage}
          </div>
        )}

        {/* 3-Column Studio Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Category Hierarchy Tree */}
          <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Taxonomy Tree ({tree.length} Root Categories)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {tree.map((cat) => {
                const isExpanded = expandedNodes[cat.id];
                const isSelected = selectedCategory?.id === cat.id;
                const hasChildren = cat.children && cat.children.length > 0;

                return (
                  <div key={cat.id} className="space-y-0.5">
                    <div
                      onClick={() => selectCategoryNode(cat)}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-semibold cursor-pointer transition ${
                        isSelected
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-primary hover:bg-gray-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(cat.id, e)}
                            className="p-0.5 hover:bg-black/10 rounded"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <span className="w-4"></span>
                        )}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {cat.attributes?.length || 0} fields
                      </span>
                    </div>

                    {/* Subcategories */}
                    {isExpanded && hasChildren && (
                      <div className="ml-5 pl-2 border-l-2 border-gray-300 space-y-0.5 mt-0.5">
                        {cat.children!.map((sub) => {
                          const isSubSelected = selectedCategory?.id === sub.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => selectCategoryNode(sub)}
                              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium cursor-pointer transition ${
                                isSubSelected
                                  ? 'bg-primary text-white font-bold'
                                  : 'text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <span className="truncate">{sub.name}</span>
                              <span className="text-[9px] opacity-75">Sub</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Category Dynamic Specifications & Live Preview */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedCategory ? (
              <>
                {/* Category Header & Tabs */}
                <div className="border-b border-gray-200 p-4 bg-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-primary">{selectedCategory.name}</h3>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 font-mono">
                        slug: {selectedCategory.slug}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {resolvedAttributes.length} dynamic attributes defined for this category
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddingSubcat(!isAddingSubcat)}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Plus size={14} /> Add Subcategory
                    </button>
                    <button
                      onClick={() => setActiveTab('FIELDS')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'FIELDS' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Dynamic Fields ({resolvedAttributes.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('ADD_FIELD')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'ADD_FIELD' ? 'bg-accent text-white' : 'bg-accent-light text-accent'
                      }`}
                    >
                      <Plus size={14} /> New Field
                    </button>
                    <button
                      onClick={() => setActiveTab('PREVIEW')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        activeTab === 'PREVIEW' ? 'bg-sell text-primary' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Eye size={14} /> Seller Form Preview
                    </button>
                  </div>
                </div>

                {/* Subcategory inline creator */}
                {isAddingSubcat && (
                  <form
                    onSubmit={handleCreateSubcategory}
                    className="bg-amber-50/70 p-3 border-b border-amber-200 flex items-center gap-3 text-xs"
                  >
                    <span className="font-bold text-amber-900">New Subcategory under {selectedCategory.name}:</span>
                    <input
                      type="text"
                      placeholder="Name (e.g. Electric SUVs)"
                      value={newSubcatName}
                      onChange={(e) => {
                        setNewSubcatName(e.target.value);
                        setNewSubcatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }}
                      className="rounded border border-gray-300 px-2.5 py-1 bg-white outline-none w-48 font-medium"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Slug"
                      value={newSubcatSlug}
                      onChange={(e) => setNewSubcatSlug(e.target.value)}
                      className="rounded border border-gray-300 px-2.5 py-1 bg-white outline-none w-40 font-mono"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded bg-primary px-3 py-1 text-white font-bold hover:bg-primary-dark"
                    >
                      Save Subcategory
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSubcat(false)}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                {/* Tab 1: Field List */}
                {activeTab === 'FIELDS' && (
                  <div className="flex-1 overflow-y-auto p-6">
                    {resolvedAttributes.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <Layers size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-semibold">No dynamic specifications defined yet.</p>
                        <p className="text-xs mt-1">Click "+ New Field" above to add dynamic attributes for this category.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {resolvedAttributes.map((attr, idx) => (
                          <div
                            key={attr.id}
                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-accent transition"
                          >
                            <div className="flex items-center gap-4">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-primary">{attr.name}</h4>
                                  <span className="font-mono text-xs text-gray-400">({attr.key})</span>
                                  <span className="rounded bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                                    {attr.type}
                                  </span>
                                  {attr.unit && (
                                    <span className="rounded bg-purple-50 text-purple-700 px-1.5 py-0.5 text-[10px] font-semibold">
                                      Unit: {attr.unit}
                                    </span>
                                  )}
                                  {attr.isRequired && (
                                    <span className="rounded bg-red-50 text-red-600 px-1.5 py-0.5 text-[10px] font-bold">
                                      REQUIRED
                                    </span>
                                  )}
                                  {attr.isFilterable && (
                                    <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">
                                      SEARCH FILTERABLE
                                    </span>
                                  )}
                                </div>
                                {attr.options && attr.options.length > 0 && (
                                  <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                                    Options: {attr.options.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteAttribute(attr.id)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                              title="Delete attribute"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Add New Dynamic Field */}
                {activeTab === 'ADD_FIELD' && (
                  <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h4 className="font-bold text-base text-primary mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-accent" />
                        Add Dynamic Field to "{selectedCategory.name}"
                      </h4>

                      <form onSubmit={handleSaveAttribute} className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Field Display Label *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Battery Health, Mileage, Fuel"
                              value={newAttrName}
                              onChange={(e) => handleNameChange(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 p-2.5 font-medium outline-none focus:border-accent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Database Attribute Key *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. battery_health"
                              value={newAttrKey}
                              onChange={(e) => setNewAttrKey(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 p-2.5 font-mono text-xs outline-none focus:border-accent bg-gray-50"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Field Type *
                            </label>
                            <select
                              value={newAttrType}
                              onChange={(e) => setNewAttrType(e.target.value as any)}
                              className="w-full rounded-lg border border-gray-300 p-2.5 font-medium outline-none focus:border-accent bg-white"
                            >
                              <option value="SELECT">SELECT (Single Dropdown Choice)</option>
                              <option value="NUMBER">NUMBER (e.g. Year, KM, Price)</option>
                              <option value="TEXT">TEXT (Freeform Input)</option>
                              <option value="BOOLEAN">BOOLEAN (Yes / No Toggle)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Measurement Unit (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. KM, GB, Sq.Ft, BHK"
                              value={newAttrUnit}
                              onChange={(e) => setNewAttrUnit(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 p-2.5 font-medium outline-none focus:border-accent"
                            />
                          </div>
                        </div>

                        {newAttrType === 'SELECT' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                              Dropdown Options (Comma-separated) *
                            </label>
                            <textarea
                              rows={2}
                              required
                              placeholder="e.g. 64 GB, 128 GB, 256 GB, 512 GB"
                              value={newAttrOptions}
                              onChange={(e) => setNewAttrOptions(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 p-2.5 font-medium outline-none focus:border-accent"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-6 pt-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newAttrRequired}
                              onChange={(e) => setNewAttrRequired(e.target.checked)}
                              className="h-4 w-4 rounded text-accent focus:ring-accent"
                            />
                            <span className="text-xs font-semibold text-gray-700">Is Required Field</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newAttrFilterable}
                              onChange={(e) => setNewAttrFilterable(e.target.checked)}
                              className="h-4 w-4 rounded text-accent focus:ring-accent"
                            />
                            <span className="text-xs font-semibold text-gray-700">Enable in Search Filters</span>
                          </label>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveTab('FIELDS')}
                            className="rounded-lg px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSavingAttr}
                            className="rounded-lg bg-accent px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-accent-dark transition disabled:opacity-50"
                          >
                            {isSavingAttr ? 'Saving...' : 'Add Attribute to Schema'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Tab 3: Interactive Live Form Preview */}
                {activeTab === 'PREVIEW' && (
                  <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
                    <div className="rounded-2xl border-2 border-dashed border-accent/40 bg-gray-50/50 p-6">
                      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                          <span className="rounded bg-sell px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                            LIVE SELLER PREVIEW
                          </span>
                          <h4 className="mt-1 font-bold text-base text-primary">
                            Post Ad in "{selectedCategory.name}"
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500">How dynamic fields look to sellers</p>
                      </div>

                      <div className="space-y-4">
                        {resolvedAttributes.map((attr) => (
                          <div key={attr.id}>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                              {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                              {attr.unit && <span className="text-gray-400 font-normal ml-1">({attr.unit})</span>}
                            </label>

                            {attr.type === 'SELECT' ? (
                              <div className="flex flex-wrap gap-2">
                                {attr.options?.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-accent hover:text-accent focus:bg-accent-light focus:border-accent"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            ) : attr.type === 'NUMBER' ? (
                              <div className="relative max-w-xs">
                                <input
                                  type="number"
                                  placeholder={`Enter ${attr.name.toLowerCase()}`}
                                  className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-medium outline-none focus:border-accent"
                                />
                                {attr.unit && (
                                  <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">
                                    {attr.unit}
                                  </span>
                                )}
                              </div>
                            ) : attr.type === 'BOOLEAN' ? (
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                                  <input type="radio" name={attr.key} defaultChecked className="text-accent" /> Yes
                                </label>
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                                  <input type="radio" name={attr.key} className="text-accent" /> No
                                </label>
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder={`Enter ${attr.name.toLowerCase()}`}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-medium outline-none focus:border-accent"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-gray-400 text-sm font-semibold">
                Select a category from the tree on the left to view or edit attributes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
