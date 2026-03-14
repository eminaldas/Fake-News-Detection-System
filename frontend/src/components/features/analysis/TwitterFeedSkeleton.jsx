import React from 'react';
import Skeleton from '../../common/Skeleton';

const TwitterFeedSkeleton = () => {
  return (
    <div className="bg-base dark:bg-[#1c1c1f] rounded-2xl flex flex-col h-full overflow-hidden border border-[#5a6058] dark:border-[#303036] shadow-sm border-2">
      <div className="p-4 border-b border-[#5a6058] dark:border-[#303036] flex justify-center">
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="p-4 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-[#26262b] rounded-xl p-4 border border-[#5a6058]/10 dark:border-[#303036]">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex flex-col gap-2 w-full">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
            {/* Body */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#5a6058] dark:border-[#303036]">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TwitterFeedSkeleton;
