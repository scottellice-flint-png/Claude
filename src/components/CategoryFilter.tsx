interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categories: { id: string; label: string }[] = [
  { id: 'all', label: 'All Markets' },
  { id: 'politics', label: 'Politics' },
  { id: 'sports', label: 'Sports' },
  { id: 'culture', label: 'Culture' },
  { id: 'economics', label: 'Economics' },
  { id: 'climate', label: 'Climate' },
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
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            selectedCategory === category.id
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
