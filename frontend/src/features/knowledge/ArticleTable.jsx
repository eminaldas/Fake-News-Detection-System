import React from 'react';
import { Search, ChevronLeft, ChevronRight, ShieldAlert, ShieldCheck } from 'lucide-react';

const ArticleTable = ({ articles, loading, page, totalPages, prevPage, nextPage }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-charcoal"></div>
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="bg-app-surface p-12 text-center rounded-xl border border-app-gray transition-colors duration-300">
                <Search className="w-12 h-12 text-app-gray mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-app-charcoal">No articles found</h3>
                <p className="text-app-charcoal opacity-60">Try adjusting your filters or submitting a new claim.</p>
            </div>
        );
    }

    return (
        <div className="bg-app-surface shadow-sm rounded-xl border border-app-gray overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-app-bg border-b border-app-gray text-app-charcoal text-sm uppercase font-bold tracking-wider transition-colors duration-300">
                            <th className="py-4 px-6 opacity-70">Article Excerpt</th>
                            <th className="py-4 px-6 opacity-70 w-32 text-center">Status</th>
                            <th className="py-4 px-6 opacity-70 w-32 hidden md:table-cell text-right">Words</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-app-gray">
                        {articles.map((article) => {
                            const rawStatus = article.status || 'UNKNOWN';
                            const statusUpper = rawStatus.toUpperCase();

                            let isFake = false;
                            let printStatus = 'UNKNOWN';
                            let colorClasses = 'bg-app-charcoal bg-opacity-10 text-app-charcoal border border-app-charcoal border-opacity-20';

                            if (['FAKE', 'YANLIŞ', 'YANLIS'].includes(statusUpper)) {
                                isFake = true;
                                printStatus = 'FAKE';
                                colorClasses = 'bg-app-burgundy bg-opacity-10 text-app-burgundy border border-app-burgundy border-opacity-20';
                            } else if (['AUTHENTIC', 'DOĞRU', 'DOGRU'].includes(statusUpper)) {
                                printStatus = 'AUTH';
                                colorClasses = 'bg-app-plum bg-opacity-10 text-app-plum border border-app-plum border-opacity-20';
                            }

                            return (
                                <tr key={article.id} className="hover:bg-app-bg transition-colors group">
                                    <td className="py-4 px-6">
                                        <p className="text-app-charcoal font-medium line-clamp-2 leading-relaxed">
                                            {article.content}
                                        </p>
                                        <div className="mt-2 text-xs text-app-charcoal opacity-50 font-mono">
                                            ID: {article.id.split('-')[0]}...
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${colorClasses}`}>
                                            {isFake ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                            {printStatus}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 hidden md:table-cell text-right text-app-charcoal font-medium opacity-80">
                                        {article.content.split(' ').length}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="bg-app-bg px-6 py-4 flex items-center justify-between border-t border-app-gray transition-colors duration-300">
                <span className="text-sm text-app-charcoal opacity-70 font-medium">
                    Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={prevPage}
                        disabled={page === 1}
                        className="p-2 rounded-md bg-app-surface border border-app-gray text-app-charcoal hover:bg-app-gray disabled:opacity-50 disabled:hover:bg-app-surface transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextPage}
                        disabled={page === totalPages}
                        className="p-2 rounded-md bg-app-surface border border-app-gray text-app-charcoal hover:bg-app-gray disabled:opacity-50 disabled:hover:bg-app-surface transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArticleTable;
