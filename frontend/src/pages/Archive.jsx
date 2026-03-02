import React from 'react';
import { Database } from 'lucide-react';
import { useArticles } from '../hooks/useArticles';
import FilterChips from '../features/knowledge/FilterChips';
import ArticleTable from '../features/knowledge/ArticleTable';

const Archive = () => {
    const {
        articles, loading, error, page, totalPages,
        filter, setFilter, nextPage, prevPage
    } = useArticles();

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-app-gray pb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-app-plum p-3 rounded-xl text-white shadow-sm">
                        <Database className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-app-charcoal">Knowledge Base</h1>
                        <p className="text-app-charcoal opacity-70">A global registry of verified statements and classified fake news.</p>
                    </div>
                </div>

                <FilterChips currentFilter={filter} onFilterChange={setFilter} />
            </div>

            {error && (
                <div className="bg-app-burgundy bg-opacity-10 p-4 rounded-lg mb-6 text-app-burgundy font-medium text-center">
                    {error}
                </div>
            )}

            <ArticleTable
                articles={articles}
                loading={loading}
                page={page}
                totalPages={totalPages}
                prevPage={prevPage}
                nextPage={nextPage}
            />
        </div>
    );
};

export default Archive;
