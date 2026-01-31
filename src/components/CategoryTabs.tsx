import Link from 'next/link';

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange?: (category: string) => void;
}

const categories = [
  { id: 'all', label: 'All', href: '/' },
  { id: 'politics', label: 'Politics', href: '/?category=politics' },
  { id: 'sports', label: 'Sports', href: '/sports' },
  { id: 'culture', label: 'Culture', href: '/?category=culture' },
  { id: 'economics', label: 'Economics', href: '/?category=economics' },
  { id: 'climate', label: 'Climate', href: '/?category=climate' },
  { id: 'world', label: 'World', href: '/?category=world' },
];

export default function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200 -mx-4 px-4 overflow-x-auto">
      {categories.map((cat) => {
        const isActive = cat.id === activeCategory;

        // If onCategoryChange is provided and it's not the sports tab, use button behavior
        if (onCategoryChange && cat.id !== 'sports') {
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                isActive
                  ? 'text-foremark-green'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foremark-green" />
              )}
            </button>
          );
        }

        // Otherwise use links for navigation
        return (
          <Link
            key={cat.id}
            href={cat.href}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
              isActive
                ? 'text-foremark-green'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {cat.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foremark-green" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

export { categories };
