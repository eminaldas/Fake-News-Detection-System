import React from 'react';
import Skeleton from '../../common/Skeleton';

const RecentHeadlinesSkeleton = () => {
  return (
    <div className="bg-base dark:bg-[#1c1c1f] rounded-2xl flex flex-col overflow-hidden border border-[#5a6058] dark:border-[#303036] shadow-sm border-2">
      <div className="p-4 border-b border-[#5a6058] dark:border-[#303036]">
        <Skeleton className="h-6 w-32 mx-auto" />
      </div>
      <div className="p-3 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3.5 rounded-xl border-l-4 border-l-black/10 dark:border-l-white/10 bg-black/5 dark:bg-white/5">
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
