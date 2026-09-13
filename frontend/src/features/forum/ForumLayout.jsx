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

    const storedSort = (() => { try { return localStorage.getItem('forum_sort'); } catch { return null; } })();
    const activeCategory = searchParams.get('category') ?? '';
    const activeTag      = searchParams.get('tag') ?? '';
    const activeSort     = searchParams.get('sort') ?? storedSort ?? 'hot';

    const setParam = (key, val) => {
        if (key === 'sort') { try { localStorage.setItem('forum_sort', val); } catch { /* ignore */ } }
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

            <div className="max-w-[1720px] mx-auto w-full px-4 md:px-10 py-8 flex flex-col lg:grid lg:gap-12 lg:items-start"
                 style={{ gridTemplateColumns: showSides ? '270px minmax(0,1fr) 320px' : '1fr' }}>

                {/* SOL · keşif (sabit) */}
                {showSides && (
                    <aside className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-6 self-start">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center gap-2.5 w-full h-16 px-5 rounded-full font-semibold text-[14.5px] transition-colors hover:brightness-95"
                            style={{ background: 'var(--color-navbar-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                            <Search className="w-4 h-4 shrink-0" />
                            Keşfet — ara
                            <span className="ml-auto text-[10.5px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-surface-solid)' }}>
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
                    <aside className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-6 self-start">
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
