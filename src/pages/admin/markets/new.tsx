import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Category, Tag, MarketConstraints, MarketRulesStructured, CreateOutcomeInput } from '@/types/admin';

interface FormData {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  isFeatured: boolean;
  featuredOrder: number;
  icon: string;
  heroImageUrl: string;
  cardImageUrl: string;
  marketType: 'binary' | 'multi_outcome';
  timezone: string;
  opensAt: string;
  closesAt: string;
  resolvesBy: string;
  settlesBy: string;
  rulesText: string;
  resolutionSource: string;
  initialYesPrice: number;
  tagIds: string[];
  constraints: MarketConstraints;
  rulesStructured: MarketRulesStructured;
  outcomes: CreateOutcomeInput[];
}

const timezones = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Pacific/Auckland',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
];

const defaultConstraints: MarketConstraints = {
  minTradeAmount: 100,
  maxTradeAmount: 100000,
  maxPositionSize: 10000,
  kycRequired: true,
  kycLevel: 'basic',
  jurisdictionEligibility: ['AU'],
  feeStructure: 'standard',
};

export default function NewMarketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'dates' | 'rules' | 'constraints' | 'outcomes'>('basic');

  const [formData, setFormData] = useState<FormData>({
    slug: '',
    title: '',
    shortDescription: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    isFeatured: false,
    featuredOrder: 0,
    icon: '',
    heroImageUrl: '',
    cardImageUrl: '',
    marketType: 'binary',
    timezone: 'Australia/Sydney',
    opensAt: '',
    closesAt: '',
    resolvesBy: '',
    settlesBy: '',
    rulesText: '',
    resolutionSource: '',
    initialYesPrice: 50,
    tagIds: [],
    constraints: defaultConstraints,
    rulesStructured: {},
    outcomes: [],
  });

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/admin/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 200);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        closesAt: new Date(formData.closesAt).toISOString(),
        resolvesBy: new Date(formData.resolvesBy).toISOString(),
        settlesBy: new Date(formData.settlesBy).toISOString(),
        opensAt: formData.opensAt ? new Date(formData.opensAt).toISOString() : undefined,
        subcategoryId: formData.subcategoryId || undefined,
        heroImageUrl: formData.heroImageUrl || undefined,
        cardImageUrl: formData.cardImageUrl || undefined,
        outcomes: formData.marketType === 'multi_outcome' ? formData.outcomes : undefined,
      };

      const res = await fetch('/api/admin/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        const market = await res.json();
        router.push(`/admin/markets/${market.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create market');
      }
    } catch (err) {
      setError('Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  return (
    <>
      <Head>
        <title>Create Market | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Create New Market">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'basic', label: 'Basic Info' },
                  { id: 'dates', label: 'Dates & Timing' },
                  { id: 'rules', label: 'Rules & Resolution' },
                  { id: 'constraints', label: 'Constraints' },
                  { id: 'outcomes', label: 'Outcomes' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === tab.id
                        ? 'border-foremark-green text-foremark-green'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Basic Info Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        placeholder="Will Labor win the next federal election?"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        placeholder="labor-federal-election-2025"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      placeholder="Predict the outcome of the next Australian federal election"
                      maxLength={300}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.shortDescription.length}/300 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      rows={5}
                      placeholder="Detailed description of the market (supports markdown)"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value, subcategoryId: '' }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
                      <select
                        value={formData.subcategoryId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, subcategoryId: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        disabled={!selectedCategory?.subcategories?.length}
                      >
                        <option value="">None</option>
                        {selectedCategory?.subcategories?.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Market Type</label>
                      <select
                        value={formData.marketType}
                        onChange={(e) => {
                          const newType = e.target.value as 'binary' | 'multi_outcome';
                          setFormData((prev) => ({
                            ...prev,
                            marketType: newType,
                            outcomes: newType === 'multi_outcome' && prev.outcomes.length === 0
                              ? [{ label: '', initialPrice: 50 }, { label: '', initialPrice: 50 }]
                              : newType === 'binary'
                              ? []
                              : prev.outcomes,
                          }));
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      >
                        <option value="binary">Binary (Yes/No)</option>
                        <option value="multi_outcome">Multi-Outcome</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        placeholder="🗳️"
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Yes Price</label>
                      <input
                        type="number"
                        value={formData.initialYesPrice}
                        onChange={(e) => setFormData((prev) => ({ ...prev, initialYesPrice: parseInt(e.target.value) || 50 }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        min={1}
                        max={99}
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-6">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.isFeatured}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                          className="rounded border-gray-300 text-foremark-green focus:ring-foremark-green"
                        />
                        <span className="text-sm text-gray-700">Featured Market</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <label
                          key={tag.id}
                          className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                            formData.tagIds.includes(tag.id)
                              ? 'bg-foremark-green text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.tagIds.includes(tag.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({ ...prev, tagIds: [...prev.tagIds, tag.id] }));
                              } else {
                                setFormData((prev) => ({ ...prev, tagIds: prev.tagIds.filter((id) => id !== tag.id) }));
                              }
                            }}
                          />
                          {tag.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                      <input
                        type="url"
                        value={formData.heroImageUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, heroImageUrl: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Card Image URL</label>
                      <input
                        type="url"
                        value={formData.cardImageUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, cardImageUrl: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dates Tab */}
              {activeTab === 'dates' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                    >
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opens At (optional)</label>
                      <input
                        type="datetime-local"
                        value={formData.opensAt}
                        onChange={(e) => setFormData((prev) => ({ ...prev, opensAt: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty for immediate open</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Closes At <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.closesAt}
                        onChange={(e) => setFormData((prev) => ({ ...prev, closesAt: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resolves By <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.resolvesBy}
                        onChange={(e) => setFormData((prev) => ({ ...prev, resolvesBy: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">When the market outcome will be determined</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Settles By <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.settlesBy}
                        onChange={(e) => setFormData((prev) => ({ ...prev, settlesBy: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">When payouts will be processed</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rules Tab */}
              {activeTab === 'rules' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Market Rules <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.rulesText}
                      onChange={(e) => setFormData((prev) => ({ ...prev, rulesText: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      rows={8}
                      placeholder="Detailed rules for market resolution..."
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Supports markdown formatting</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Source</label>
                    <input
                      type="text"
                      value={formData.resolutionSource}
                      onChange={(e) => setFormData((prev) => ({ ...prev, resolutionSource: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      placeholder="e.g., Australian Electoral Commission official results"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-4">Structured Rules (Advanced)</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Criteria</label>
                        <textarea
                          value={formData.rulesStructured.resolutionCriteria?.join('\n') || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              rulesStructured: {
                                ...prev.rulesStructured,
                                resolutionCriteria: e.target.value.split('\n').filter(Boolean),
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                          rows={3}
                          placeholder="One criterion per line"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Void Conditions</label>
                        <textarea
                          value={formData.rulesStructured.voidConditions?.join('\n') || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              rulesStructured: {
                                ...prev.rulesStructured,
                                voidConditions: e.target.value.split('\n').filter(Boolean),
                              },
                            }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                          rows={3}
                          placeholder="Conditions that would void the market (one per line)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Constraints Tab */}
              {activeTab === 'constraints' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Trade Amount (cents)</label>
                      <input
                        type="number"
                        value={formData.constraints.minTradeAmount || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, minTradeAmount: parseInt(e.target.value) || undefined },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Trade Amount (cents)</label>
                      <input
                        type="number"
                        value={formData.constraints.maxTradeAmount || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, maxTradeAmount: parseInt(e.target.value) || undefined },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Position Size</label>
                      <input
                        type="number"
                        value={formData.constraints.maxPositionSize || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, maxPositionSize: parseInt(e.target.value) || undefined },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        min={0}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Notional Exposure</label>
                      <input
                        type="number"
                        value={formData.constraints.maxNotionalExposure || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, maxNotionalExposure: parseInt(e.target.value) || undefined },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="kycRequired"
                        checked={formData.constraints.kycRequired || false}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, kycRequired: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-foremark-green focus:ring-foremark-green"
                      />
                      <label htmlFor="kycRequired" className="text-sm text-gray-700">
                        KYC Required
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">KYC Level</label>
                      <select
                        value={formData.constraints.kycLevel || 'basic'}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, kycLevel: e.target.value as 'basic' | 'enhanced' | 'full' },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            constraints: { ...prev.constraints, feeStructure: e.target.value as 'standard' | 'reduced' | 'premium' },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      >
                        <option value="standard">Standard</option>
                        <option value="reduced">Reduced</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction Eligibility</label>
                    <input
                      type="text"
                      value={formData.constraints.jurisdictionEligibility?.join(', ') || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          constraints: {
                            ...prev.constraints,
                            jurisdictionEligibility: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          },
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                      placeholder="AU, NZ"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated country codes</p>
                  </div>
                </div>
              )}

              {/* Outcomes Tab */}
              {activeTab === 'outcomes' && (
                <div className="space-y-6">
                  {formData.marketType === 'binary' ? (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-blue-700">
                        Binary markets automatically have Yes/No outcomes. The initial price is set in the Basic Info tab.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({
                          ...prev,
                          marketType: 'multi_outcome',
                          outcomes: [
                            { label: '', initialPrice: 50 },
                            { label: '', initialPrice: 50 },
                          ],
                        }))}
                        className="mt-3 text-sm text-foremark-green hover:underline font-medium"
                      >
                        Switch to multi-outcome market
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Market Outcomes</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Add the people, teams, or options that users can bet on. Probabilities should sum to 100%.
                          </p>
                        </div>
                      </div>

                      {/* Total probability indicator */}
                      {formData.outcomes.length > 0 && (
                        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          formData.outcomes.reduce((sum, o) => sum + (o.initialPrice || 0), 0) === 100
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          Total probability: {formData.outcomes.reduce((sum, o) => sum + (o.initialPrice || 0), 0)}%
                          {formData.outcomes.reduce((sum, o) => sum + (o.initialPrice || 0), 0) !== 100 && ' (should be 100%)'}
                        </div>
                      )}

                      {formData.outcomes.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-500 mb-4">No outcomes added yet. Start by adding at least 2 outcomes.</p>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                outcomes: [
                                  { label: '', initialPrice: 50 },
                                  { label: '', initialPrice: 50 },
                                ],
                              }))
                            }
                            className="px-4 py-2 bg-foremark-green text-white rounded-lg text-sm font-medium hover:bg-foremark-green-dark"
                          >
                            Add 2 Outcomes
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.outcomes.map((outcome, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                  Outcome {index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = formData.outcomes.filter((_, i) => i !== index);
                                    setFormData((prev) => ({ ...prev, outcomes: updated }));
                                  }}
                                  className="text-sm text-red-500 hover:text-red-700 font-medium"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-5">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name / Label <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={outcome.label}
                                    onChange={(e) => {
                                      const updated = [...formData.outcomes];
                                      updated[index] = { ...updated[index], label: e.target.value };
                                      setFormData((prev) => ({ ...prev, outcomes: updated }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                                    placeholder="e.g., Kevin Warsh, Labor, Collingwood"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Initial % <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={outcome.initialPrice || ''}
                                    onChange={(e) => {
                                      const updated = [...formData.outcomes];
                                      updated[index] = { ...updated[index], initialPrice: parseInt(e.target.value) || 0 };
                                      setFormData((prev) => ({ ...prev, outcomes: updated }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                                    min={1}
                                    max={99}
                                    placeholder="50"
                                  />
                                </div>

                                <div className="md:col-span-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                  <input
                                    type="url"
                                    value={outcome.imageUrl || ''}
                                    onChange={(e) => {
                                      const updated = [...formData.outcomes];
                                      updated[index] = { ...updated[index], imageUrl: e.target.value };
                                      setFormData((prev) => ({ ...prev, outcomes: updated }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Outcome Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                outcomes: [
                                  ...prev.outcomes,
                                  { label: '', initialPrice: Math.max(1, Math.floor((100 - prev.outcomes.reduce((s, o) => s + (o.initialPrice || 0), 0)) / 1)) },
                                ],
                              }))
                            }
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-foremark-green hover:text-foremark-green transition-colors flex items-center justify-center gap-2 font-medium"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Another Outcome
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-foremark-green hover:bg-foremark-green-dark text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Market'}
            </button>
          </div>
        </form>
      </AdminLayout>
    </>
  );
}
