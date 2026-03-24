import React from 'react';
import Skeleton from '../../components/common/Skeleton';

const AnalysisResultSkeleton = () => {
    return (
        <div className="animate-fade-up mt-6 md:mt-8 w-full result-card rounded-3xl overflow-hidden flex flex-col relative border border-brutal-border/10">

            {/* Header */}
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-brutal-border/10">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="h-2.5 w-28" />
                        <Skeleton className="h-6 w-52" />
                        <Skeleton className="h-2.5 w-36" />
                    </div>
                </div>
                <Skeleton className="w-24 h-24 rounded-full shrink-0 self-center sm:self-auto" />
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6">

                {/* AI Commentary */}
                <div className="bg-base rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="w-5 h-5 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-3/4" />
                    </div>
                </div>

                {/* Signal bento grid */}
                <div>
                    <Skeleton className="h-2.5 w-40 mb-3" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-surface rounded-xl p-4 sm:p-5 border border-brutal-border/10 space-y-3">
                                <Skeleton className="h-2.5 w-24" />
                                <Skeleton className="h-7 w-14" />
                                <Skeleton className="h-1 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-surface px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brutal-border/10">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultSkeleton;
