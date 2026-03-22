import React from 'react';
import Skeleton from '../../common/Skeleton';

const TwitterFeedSkeleton = () => {
  return (
    <div className="bg-surface rounded-2xl flex flex-col h-full overflow-hidden border-2 border-brutal-border dark:border-surface-solid shadow-sm">
      <div className="p-4 border-b border-brutal-border dark:border-surface-solid flex justify-center">
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="p-4 space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-surface-solid rounded-xl p-4 border border-brutal-border dark:border-surface-solid">
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
            <div className="flex items-center justify-between pt-4 border-t border-brutal-border dark:border-surface-solid">
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
