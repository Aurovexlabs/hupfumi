import { Link } from '@tanstack/react-router';
import { useProfile } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { formatDate, getInitials, cn } from '@/lib/utils';
import { Star, MapPin, Check, Settings, ExternalLink } from 'lucide-react';
import LoadingScreen from '@/components/common/LoadingScreen';

function useUsername() {
  const parts = window.location.pathname.split('/');
  return parts[parts.indexOf('profile') + 1] ?? '';
}

export default function ProfilePage() {
  const username = useUsername();
  const { user: me } = useAuthStore();
  const { data: profile, isLoading } = useProfile(username);

  if (isLoading) return <LoadingScreen />;
  if (!profile) return <div className="page-container py-20 text-center text-text-secondary dark:text-slate-400">User not found.</div>;

  const p = profile as any;
  const isMe = me?.username === username;

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-72 shrink-0">
          <div className="card p-6 text-center sticky top-20">
            <div className="relative inline-block mb-4">
              {p.avatar
                ? <img src={p.avatar} alt={p.fullName} className="avatar w-24 h-24 mx-auto" />
                : <div className="w-24 h-24 rounded-full bg-brand-navy text-white text-2xl font-bold flex items-center justify-center mx-auto">{getInitials(p.fullName)}</div>}
              {p.isVerifiedBadge && (
                <span className="absolute bottom-0.5 right-0.5 w-7 h-7 bg-brand-green rounded-full border-2 border-surface-0 dark:border-dark-card flex items-center justify-center shadow-sm" title="KYC Verified">
                  <Check size={13} className="text-white" />
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-xl text-brand-navy dark:text-white">{p.fullName}</h1>
            <p className="text-text-tertiary dark:text-slate-500 text-sm">@{p.username}</p>
            <span className={cn('badge mt-2 capitalize inline-block', p.profileType === 'freelancer' ? 'badge-orange' : p.profileType === 'business' ? 'badge-blue' : 'badge-gray')}>{p.profileType}</span>

            {p.averageRating > 0 && (
              <div className="flex items-center justify-center gap-1 mt-3" aria-label={`${p.averageRating} out of 5`}>
                {Array.from({length:5}).map((_,i) => <Star key={i} size={14} className={cn(i < Math.round(p.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-surface-300 dark:text-dark-border')} />)}
                <span className="text-sm text-text-primary dark:text-white font-semibold ml-1">{p.averageRating.toFixed(1)}</span>
                <span className="text-xs text-text-tertiary dark:text-slate-500">({p.reviewCount})</span>
              </div>
            )}

            {p.address?.city && <div className="flex items-center justify-center gap-1 text-xs text-text-tertiary dark:text-slate-500 mt-3"><MapPin size={12} />{p.address.city}, Zimbabwe</div>}

            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={cn('w-2 h-2 rounded-full', p.availabilityStatus === 'available' ? 'bg-brand-green' : p.availabilityStatus === 'busy' ? 'bg-yellow-400' : 'bg-surface-300')} />
              <span className="text-xs text-text-tertiary dark:text-slate-500 capitalize">{p.availabilityStatus}</span>
            </div>

            {isMe && <Link to="/settings/profile" className="btn-secondary w-full mt-5 justify-center text-sm"><Settings size={14} />Edit Profile</Link>}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-5">
          {p.bio && (
            <div className="card p-5">
              <h2 className="font-semibold text-text-primary dark:text-white mb-3">About</h2>
              <p className="text-text-secondary dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{p.bio}</p>
            </div>
          )}

          {p.skills?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-text-primary dark:text-white mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {p.skills.map((s: string) => (
                  <span key={s} className="bg-brand-navy/5 dark:bg-brand-navy/30 text-brand-navy dark:text-blue-300 text-sm px-3 py-1 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {p.portfolio?.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-text-primary dark:text-white mb-4">Portfolio</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {p.portfolio.map((item: any) => (
                  <div key={item._id} className="rounded-2xl overflow-hidden border border-surface-200 dark:border-dark-border hover:border-brand-orange/30 transition-colors group">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300" />}
                    <div className="p-2.5">
                      <p className="text-sm font-semibold text-text-primary dark:text-white truncate">{item.title}</p>
                      {item.description && <p className="text-xs text-text-tertiary dark:text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>}
                      {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline mt-1">View <ExternalLink size={10} /></a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 text-center">
            <p className="text-xs text-text-tertiary dark:text-slate-500">Member since {formatDate(p.createdAt, { dateStyle: 'long' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
