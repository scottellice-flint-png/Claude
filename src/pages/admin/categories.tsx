import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Category, Subcategory } from '@/types/admin';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    icon: '',
    displayOrder: 0,
    isActive: true,
  });

  const [subFormData, setSubFormData] = useState({
    categoryId: '',
    slug: '',
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    if (router.isReady) {
      fetchCategories();
    }
  }, [router.isReady]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      setError('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchCategories();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingSubcategory
        ? `/api/admin/subcategories/${editingSubcategory.id}`
        : '/api/admin/subcategories';
      const method = editingSubcategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subFormData),
      });

      if (res.ok) {
        fetchCategories();
        closeSubModal();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    try {
      const res = await fetch(`/api/admin/subcategories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        slug: category.slug,
        name: category.name,
        description: category.description || '',
        icon: category.icon || '',
        displayOrder: category.displayOrder,
        isActive: category.isActive,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        slug: '',
        name: '',
        description: '',
        icon: '',
        displayOrder: categories.length,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ slug: '', name: '', description: '', icon: '', displayOrder: 0, isActive: true });
  };

  const openSubModal = (categoryId: string, subcategory?: Subcategory) => {
    setSelectedCategoryId(categoryId);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubFormData({
        categoryId,
        slug: subcategory.slug,
        name: subcategory.name,
        description: subcategory.description || '',
        displayOrder: subcategory.displayOrder,
        isActive: subcategory.isActive,
      });
    } else {
      setEditingSubcategory(null);
      const category = categories.find(c => c.id === categoryId);
      setSubFormData({
        categoryId,
        slug: '',
        name: '',
        description: '',
        displayOrder: category?.subcategories?.length || 0,
        isActive: true,
      });
    }
    setShowSubModal(true);
  };

  const closeSubModal = () => {
    setShowSubModal(false);
    setEditingSubcategory(null);
    setSelectedCategoryId('');
    setSubFormData({ categoryId: '', slug: '', name: '', description: '', displayOrder: 0, isActive: true });
  };

  return (
    <>
      <Head>
        <title>Categories | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Categories">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}

        <div className="flex justify-end mb-6">
          <button
            onClick={() => openModal()}
            className="bg-foremark-green hover:bg-foremark-green-dark text-white px-4 py-2 rounded-lg"
          >
            + Add Category
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{category.icon || '📁'}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {category.name}
                        {!category.isActive && (
                          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Inactive</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{category.slug} • {category._count?.markets || 0} markets</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openSubModal(category.id)}
                      className="text-sm text-foremark-green hover:underline"
                    >
                      + Subcategory
                    </button>
                    <button
                      onClick={() => openModal(category)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500 mb-2">Subcategories:</p>
                    <div className="flex flex-wrap gap-2">
                      {category.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                            sub.isActive ? 'bg-white border' : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          <span>{sub.name}</span>
                          <button
                            onClick={() => openSubModal(category.id, sub)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDeleteSub(sub.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Category Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="📁"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm">Active</label>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-foremark-green text-white rounded-lg">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subcategory Modal */}
        {showSubModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                {editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}
              </h3>
              <form onSubmit={handleSubSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={subFormData.name}
                      onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      type="text"
                      value={subFormData.slug}
                      onChange={(e) => setSubFormData({ ...subFormData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={subFormData.description}
                    onChange={(e) => setSubFormData({ ...subFormData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="subIsActive"
                    checked={subFormData.isActive}
                    onChange={(e) => setSubFormData({ ...subFormData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="subIsActive" className="text-sm">Active</label>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeSubModal} className="px-4 py-2 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-foremark-green text-white rounded-lg">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
