import React from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoginNudgeModal from '../../components/ui/LoginNudgeModal';
import ForumSearchBar from './ForumSearchBar';
import CategoriesPanel from './panels/CategoriesPanel';
import PopularTagsPanel from './panels/PopularTagsPanel';
import PopularNewsPanel from './panels/PopularNewsPanel';
import SuggestedUsersPanel from './panels/SuggestedUsersPanel';

const ForumLayout = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const isSearchPage = location.pathname === '/forum/search';
    const isThreadPage = /^\/forum\/[^/]+$/.test(location.pathname) && !isSearchPage;
    const showWall = !isAuthenticated && !isThreadPage;

    const activeCategory = searchParams.get('category') ?? '';
    const activeTag      = searchParams.get('tag') ?? '';

    const setParam = (key, val) => {
        const next = new URLSearchParams(searchParams);
        if (val) next.set(key, val); else next.delete(key);
        if (key === 'category') next.delete('tag');
        if (key === 'tag') next.delete('category');
        setSearchParams(next);
    };

    const showSides = !isSearchPage;

    return (
        <div className="w-full">
            {showWall && <LoginNudgeModal />}

            {/* Üst bar */}
            <div className="border-b" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
                    <span className="font-extrabold text-lg shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                        Forum<span style={{ color: 'var(--color-brand-primary)' }}>.</span>
                    </span>
                    <ForumSearchBar />
                </div>
            </div>

            <div className="max-w-[1500px] mx-auto w-full px-4 md:px-6 py-6 flex flex-col lg:grid lg:gap-5"
                 style={{ gridTemplateColumns: showSides ? '210px 1fr 290px' : '1fr' }}>

                {/* SOL · keşif */}
                {showSides && (
                    <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
                        <CategoriesPanel activeCategory={activeCategory} onSelect={(c) => setParam('category', c)} />
                        <PopularTagsPanel activeTag={activeTag} onSelect={(t) => setParam('tag', t)} />
                    </aside>
                )}

                {/* MERKEZ */}
                <main className="min-w-0"><Outlet /></main>

                {/* SAĞ · topluluk */}
                {showSides && (
                    <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
                        <PopularNewsPanel />
                        <SuggestedUsersPanel />
                    </aside>
                )}
            </div>
        </div>
    );
};

export default ForumLayout;
