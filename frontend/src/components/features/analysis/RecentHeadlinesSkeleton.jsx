import React from 'react';
import Skeleton from '../../common/Skeleton';

const RecentHeadlinesSkeleton = () => {
  return (
    <div className="bg-surface rounded-2xl flex flex-col overflow-hidden border-2 border-brutal-border dark:border-surface-solid shadow-sm">
      <div className="p-4 border-b border-brutal-border dark:border-surface-solid">
        <Skeleton className="h-6 w-32 mx-auto" />
      </div>
      <div className="p-3 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3.5 rounded-xl border-l-4 border-l-brutal-border dark:border-l-surface-solid bg-surface-solid">
            <Skeleton className="h-3 w-16 mb-2 rounded-full" />
            <Skeleton className="h-4 w-full mb-1.5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentHeadlinesSkeleton;
