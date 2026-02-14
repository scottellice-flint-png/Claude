import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import type { MarketCollection } from '@/types/admin';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<MarketCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MarketCollection | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    heroImageUrl: '',
    displayOrder: 0,
    isActive: true,
    isFeatured: false,
  });

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/admin/collections?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.data || data);
      }
    } catch (err) {
      setError('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingCollection
        ? `/api/admin/collections/${editingCollection.id}`
        : '/api/admin/collections';
      const method = editingCollection ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchCollections();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    try {
      const res = await fetch(`/api/admin/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCollections();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const openModal = (collection?: MarketCollection) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        slug: collection.slug,
        name: collection.name,
        description: collection.description || '',
        heroImageUrl: collection.heroImageUrl || '',
        displayOrder: collection.displayOrder,
        isActive: collection.isActive,
        isFeatured: collection.isFeatured,
      });
    } else {
      setEditingCollection(null);
      setFormData({
        slug: '',
        name: '',
        description: '',
        heroImageUrl: '',
        displayOrder: collections.length,
        isActive: true,
        isFeatured: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCollection(null);
    setFormData({
      slug: '',
      name: '',
      description: '',
      heroImageUrl: '',
      displayOrder: 0,
      isActive: true,
      isFeatured: false,
    });
  };

  return (
    <>
      <Head>
        <title>Collections | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Market Collections">
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
            + Add Collection
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No collections found
              </div>
            ) : (
              collections.map((collection) => (
                <div key={collection.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {collection.heroImageUrl && (
                    <img
                      src={collection.heroImageUrl}
                      alt={collection.name}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {collection.name}
                          {collection.isFeatured && (
                            <span className="ml-2 px-2 py-0.5 bg-foremark-lime/20 text-foremark-green text-xs rounded">
                              Featured
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{collection.slug}</p>
                      </div>
                      {!collection.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {collection.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{collection.description}</p>
                    )}
                    <div className="mt-3 text-sm text-gray-500">
                      {collection._count?.markets || 0} markets
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="text-sm text-foremark-green hover:underline"
                      >
                        Manage Markets
                      </Link>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openModal(collection)}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(collection.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                {editingCollection ? 'Edit Collection' : 'Add Collection'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                  <input
                    type="url"
                    value={formData.heroImageUrl}
                    onChange={(e) => setFormData({ ...formData, heroImageUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Featured</span>
                  </label>
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
      </AdminLayout>
    </>
  );
}
