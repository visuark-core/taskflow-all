import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const toggleThemeSelector = () => {
    setShowThemeSelector(!showThemeSelector);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="relative">
      <button 
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={toggleThemeSelector}
        title="Toggle theme"
      >
        <ThemeIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>

      {showThemeSelector && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
          <div className="py-1">
            {[
              { icon: Sun, label: 'Light', value: 'light' },
              { icon: Moon, label: 'Dark', value: 'dark' },
              { icon: Monitor, label: 'System', value: 'system' },
            ].map((option) => (
              <button
                key={option.value}
                className={`flex w-full items-center px-4 py-2 text-sm ${
                  theme === option.value 
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  setTheme(option.value as 'light' | 'dark' | 'system');
                  setShowThemeSelector(false);
                }}
              >
                <option.icon className="mr-2 h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}