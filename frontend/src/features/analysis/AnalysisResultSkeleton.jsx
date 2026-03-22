import React from 'react';
import { Info } from 'lucide-react';
import Skeleton from '../../components/common/Skeleton';

const AnalysisResultSkeleton = () => {
    return (
        <div className="animate-fade-up mt-8 p-6 md:p-8 rounded-2xl border-2 shadow-lg relative bg-surface border-brutal-border dark:border-surface-solid">

            {/* Analysis Method Badge Skeleton */}
            <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-neutral-fill/20 text-muted text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                <Info size={10} />
                <span>Yapay Zeka Analiz Ediyor...</span>
            </div>

            {/* Header Skeleton */}
            <div className="flex justify-between items-start mb-8 pt-2">
                <div className="flex flex-col gap-2 w-2/3">
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="w-16 h-16 rounded-full" />
            </div>

            {/* Progress Bar Skeleton */}
            <div className="flex flex-col gap-3 mb-8">
                <div className="flex justify-between items-end">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-12" />
                </div>
                <Skeleton className="w-full h-3 rounded-full" />
            </div>

            {/* Message Skeleton */}
            <div className="space-y-3 px-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
            </div>

            {/* Footer Skeleton */}
            <div className="mt-10 flex items-center justify-end gap-4 pt-4 border-t border-brutal-border dark:border-surface-solid">
                <Skeleton className="h-3 w-28" />
                <div className="flex gap-2">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <Skeleton className="w-9 h-9 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default AnalysisResultSkeleton;
