import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

export function WordListSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center p-3 rounded-xl border-l-4 border-transparent"
        >
          <div className="flex-1">
            <div className="flex items-center">
              <Skeleton className="w-2.5 h-2.5 rounded-full mr-2.5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AudioPlayerSkeleton() {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-background/80 backdrop-blur-md border border-border/50 rounded-full shadow-lg py-2 px-4">
      <div className="flex items-center">
        <Skeleton className="h-8 w-8 rounded-full mr-2" />
        <div className="flex-1 mr-3">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-1 w-full" />
        </div>
        <div className="flex items-center space-x-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}