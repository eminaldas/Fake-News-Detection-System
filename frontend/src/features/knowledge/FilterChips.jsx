import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

const FilterChips = ({ currentFilter, onFilterChange }) => {
    return (
        <div className="flex items-center gap-2 bg-app-surface p-1 rounded-lg border border-app-gray shadow-sm transition-colors duration-300">
            <button
                onClick={() => onFilterChange('')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${currentFilter === '' ? 'bg-app-charcoal text-white' : 'text-app-charcoal hover:bg-app-gray'}`}
            >
                All
            </button>
            <button
                onClick={() => onFilterChange('FAKE')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${currentFilter === 'FAKE' ? 'bg-app-burgundy text-white' : 'text-app-charcoal hover:bg-app-burgundy hover:bg-opacity-10'}`}
            >
                <ShieldAlert className="w-4 h-4" /> Fake
            </button>
            <button
                onClick={() => onFilterChange('AUTHENTIC')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${currentFilter === 'AUTHENTIC' ? 'bg-app-plum text-white' : 'text-app-charcoal hover:bg-app-plum hover:bg-opacity-10'}`}
            >
                <ShieldCheck className="w-4 h-4" /> Authentic
            </button>
        </div>
    );
};

export default FilterChips;
