import { CATEGORIES, CategoryType } from '../types';

interface CategorySelectorProps {
  onSelectCategory: (category: CategoryType) => void;
  selectedCategory: CategoryType | null;
}

export function CategorySelector({ onSelectCategory, selectedCategory }: CategorySelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">カテゴリーを選択</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedCategory === category.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{category.icon}</div>
            <div className="text-sm font-medium text-gray-800">{category.name}</div>
            <div className="text-xs text-gray-500 mt-1">{category.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
