import { cn } from '@/lib/utils';

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl h-32', className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn('skeleton h-4 rounded', i === lines - 1 ? 'w-3/4' : 'w-full')} />
      ))}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-dark-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange flex items-center justify-center shadow-orange">
            <span className="text-white font-display font-black text-2xl">H</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-green rounded-full border-2 border-white dark:border-dark-bg animate-pulse" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-brand-orange animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={32} className="text-brand-orange" />
    </div>
  );
}
