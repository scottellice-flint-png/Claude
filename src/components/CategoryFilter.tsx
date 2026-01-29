import { MarketCategory } from '@/types';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categories: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'All Markets', icon: '🌐' },
  { id: 'politics', label: 'Politics', icon: '🏛️' },
  { id: 'economics', label: 'Economics', icon: '📈' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'climate', label: 'Climate', icon: '🌍' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'science', label: 'Science', icon: '🔬' },
];

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
            selectedCategory === category.id
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <span>{category.icon}</span>
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );
}
