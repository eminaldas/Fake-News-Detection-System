import React from 'react';

function SkeletonBlock({ h = 'h-24' }) {
    return <div className={`${h} rounded-xl bg-neutral-fill/50 animate-pulse`} />;
}

export default function ReportSkeleton() {
    return (
        <div className="space-y-6 mt-6">
            <div className="text-center py-4">
                <p className="text-tx-secondary text-sm font-medium animate-pulse">
                    Derin analiz yapılıyor, bu işlem 1-2 dakika sürebilir...
                </p>
            </div>
            <SkeletonBlock h="h-32" />
            <SkeletonBlock h="h-20" />
            <SkeletonBlock h="h-28" />
            <SkeletonBlock h="h-16" />
        </div>
    );
}
