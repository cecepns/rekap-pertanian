import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full animate-pulse space-y-3 py-2">
      <div className="h-10 bg-slate-200/70 rounded-xl mb-4 w-full"></div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-3 border-b border-slate-100">
          {[...Array(cols)].map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-slate-100 rounded ${
                j === 0 ? 'w-24' : j === cols - 1 ? 'w-16 ml-auto' : 'flex-1'
              }`}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
          <div className="h-4 bg-slate-200/80 rounded w-1/2"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-3 bg-slate-100 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
}
