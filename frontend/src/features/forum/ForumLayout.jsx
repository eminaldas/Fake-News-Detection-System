import React from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoginNudgeModal from '../../components/ui/LoginNudgeModal';
import ForumSearchModal from './ForumSearchModal';
import SortPanel from './panels/SortPanel';
import CategoriesPanel from './panels/CategoriesPanel';
import PopularPostsPanel from './panels/PopularPostsPanel';
import PopularTagsPanel from './panels/PopularTagsPanel';
import SuggestedUsersPanel from './panels/SuggestedUsersPanel';

const ForumLayout = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchOpen, setSearchOpen] = React.useState(false);

    const isSearchPage = location.pathname === '/forum/search';
    const isThreadPage = /^\/forum\/[^/]+$/.test(location.pathname) && !isSearchPage;
    const showWall = !isAuthenticated && !isThreadPage;

    const activeCategory = searchParams.get('category') ?? '';
    const activeTag      = searchParams.get('tag') ?? '';
    const activeSort     = searchParams.get('sort') ?? 'hot';

    const setParam = (key, val) => {
        const next = new URLSearchParams(searchParams);
        if (val) next.set(key, val); else next.delete(key);
        if (key === 'category') next.delete('tag');
        if (key === 'tag') next.delete('category');
        setSearchParams(next);
    };

    React.useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const showSides = !isSearchPage;

    return (
        <div className="w-full">
            {showWall && <LoginNudgeModal />}
            {searchOpen && <ForumSearchModal onClose={() => setSearchOpen(false)} />}

            <div className="max-w-[1500px] mx-auto w-full px-4 md:px-6 py-6 flex flex-col lg:grid lg:gap-5"
                 style={{ gridTemplateColumns: showSides ? '236px 1fr 300px' : '1fr' }}>

                {/* SOL · keşif (sabit) */}
                {showSides && (
                    <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center gap-2.5 w-full px-4 py-3 border font-bold text-[13.5px] transition-colors hover:brightness-105"
                            style={{
                                background:  'var(--color-terminal-surface)',
                                borderColor: 'var(--color-terminal-border-raw)',
                                color:       'var(--color-brand-primary)',
                            }}
                        >
                            <Search className="w-4 h-4 shrink-0" />
                            Keşfet — ara
                            <span className="ml-auto font-mono text-[9px] font-bold px-1.5 py-0.5"
                                  style={{ color: 'var(--color-brand-primary)', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                ⌘K
                            </span>
                        </button>
                        <SortPanel activeSort={activeSort} onSelect={(s) => setParam('sort', s)} />
                        <CategoriesPanel activeCategory={activeCategory} onSelect={(c) => setParam('category', c)} />
                    </aside>
                )}

                {/* MERKEZ (kayan) */}
                <main className="min-w-0"><Outlet /></main>

                {/* SAĞ · topluluk (sabit) */}
                {showSides && (
                    <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
                        <PopularPostsPanel />
                        <PopularTagsPanel activeTag={activeTag} onSelect={(t) => setParam('tag', t)} />
                        <SuggestedUsersPanel />
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ForumLayout;
