import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import type { ConstraintTemplate, MarketConstraints } from '@/types/admin';

const defaultConstraints: MarketConstraints = {
  minTradeAmount: 100,
  maxTradeAmount: 100000,
  maxPositionSize: 10000,
  maxNotionalExposure: 1000000,
  kycRequired: true,
  kycLevel: 'basic',
  jurisdictionEligibility: ['AU'],
  feeStructure: 'standard',
};

export default function ConstraintsPage() {
  const [templates, setTemplates] = useState<ConstraintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConstraintTemplate | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDefault: false,
    constraints: defaultConstraints,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/constraint-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const url = editingTemplate
        ? `/api/admin/constraint-templates/${editingTemplate.id}`
        : '/api/admin/constraint-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchTemplates();
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
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/admin/constraint-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTemplates();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const openModal = (template?: ConstraintTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        isDefault: template.isDefault,
        constraints: template.constraints,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        isDefault: false,
        constraints: defaultConstraints,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({ name: '', description: '', isDefault: false, constraints: defaultConstraints });
  };

  const updateConstraint = (key: keyof MarketConstraints, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      constraints: { ...prev.constraints, [key]: value },
    }));
  };

  return (
    <>
      <Head>
        <title>Constraint Templates | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Constraint Templates">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">What are Constraint Templates?</p>
          <p className="text-sm mt-1">
            Constraint templates define trading limits, KYC requirements, and jurisdiction rules that can be
            applied to markets. Create templates for different market types (e.g., &quot;Standard&quot;, &quot;High Value&quot;,
            &quot;Novelty&quot;) to streamline market creation.
          </p>
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={() => openModal()}
            className="bg-foremark-green hover:bg-foremark-green-dark text-white px-4 py-2 rounded-lg"
          >
            + Add Template
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No constraint templates found. Create one to get started.
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {template.name}
                        {template.isDefault && (
                          <span className="ml-2 px-2 py-0.5 bg-foremark-lime/20 text-foremark-green text-xs rounded">
                            Default
                          </span>
                        )}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(template)}
                        className="text-sm text-foremark-green hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-sm text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Min Trade:</span>{' '}
                      <span className="font-medium">${(template.constraints.minTradeAmount || 0) / 100}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Max Trade:</span>{' '}
                      <span className="font-medium">${(template.constraints.maxTradeAmount || 0) / 100}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Max Position:</span>{' '}
                      <span className="font-medium">{template.constraints.maxPositionSize?.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">KYC:</span>{' '}
                      <span className="font-medium capitalize">{template.constraints.kycLevel || 'None'}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded col-span-2">
                      <span className="text-gray-500">Jurisdictions:</span>{' '}
                      <span className="font-medium">
                        {template.constraints.jurisdictionEligibility?.join(', ') || 'All'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 my-8">
              <h3 className="text-lg font-medium mb-4">
                {editingTemplate ? 'Edit Template' : 'Add Template'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Standard Constraints"
                      required
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Set as default template</span>
                    </label>
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

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-4">Trading Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Trade (cents)</label>
                      <input
                        type="number"
                        value={formData.constraints.minTradeAmount || ''}
                        onChange={(e) => updateConstraint('minTradeAmount', parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Trade (cents)</label>
                      <input
                        type="number"
                        value={formData.constraints.maxTradeAmount || ''}
                        onChange={(e) => updateConstraint('maxTradeAmount', parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Position Size</label>
                      <input
                        type="number"
                        value={formData.constraints.maxPositionSize || ''}
                        onChange={(e) => updateConstraint('maxPositionSize', parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Notional Exposure</label>
                      <input
                        type="number"
                        value={formData.constraints.maxNotionalExposure || ''}
                        onChange={(e) => updateConstraint('maxNotionalExposure', parseInt(e.target.value) || undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-4">KYC & Compliance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="kycRequired"
                        checked={formData.constraints.kycRequired || false}
                        onChange={(e) => updateConstraint('kycRequired', e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="kycRequired" className="text-sm">KYC Required</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">KYC Level</label>
                      <select
                        value={formData.constraints.kycLevel || 'basic'}
                        onChange={(e) => updateConstraint('kycLevel', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="basic">Basic</option>
                        <option value="enhanced">Enhanced</option>
                        <option value="full">Full</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fee Structure</label>
                      <select
                        value={formData.constraints.feeStructure || 'standard'}
                        onChange={(e) => updateConstraint('feeStructure', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="standard">Standard</option>
                        <option value="reduced">Reduced</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-4">Jurisdiction</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Eligible Jurisdictions (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.constraints.jurisdictionEligibility?.join(', ') || ''}
                      onChange={(e) =>
                        updateConstraint(
                          'jurisdictionEligibility',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="AU, NZ"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-foremark-green text-white rounded-lg">
                    Save Template
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
