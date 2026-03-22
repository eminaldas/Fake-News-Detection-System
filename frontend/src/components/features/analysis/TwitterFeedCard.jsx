import React from 'react';
import { Heart, MessageCircle, Share, Twitter, Repeat } from 'lucide-react';

const TwitterFeedCard = () => {
    const tweets = [
        {
            id: 1,
            user: "Nüfus ve Sosyal Araştı...",
            handle: "@NSA_PSR",
            time: "11:51 AM · Nov 5, 2025",
            content: "SPSS yüklü değilse hızlıca 14 günlük deneme versiyonunu lütfen yükleyin.\n\nBugün derste kullanacağımız veri setini de bu hesapta paylaştığımız linkten indirebilirsiniz.\n\nBiz hazırız.",
            likes: 439,
            replies: 190,
            hasBadge: true
        },
        {
            id: 2,
            user: "Teknoloji Gündemi",
            handle: "@TekGundemi",
            time: "09:30 AM · Nov 5, 2025",
            content: "Yapay zeka modellerinin eğitilmesi için gereken veri miktarının giderek artması, donanım gereksinimlerini de bir üst seviyeye taşıyor.",
            likes: 124,
            replies: 12,
            hasBadge: false
        }
    ];

    return (
        <div className="bg-surface rounded-2xl flex flex-col h-full overflow-hidden border-2 border-brutal-border dark:border-surface-solid shadow-sm">
            <div className="p-4 border-b border-brutal-border dark:border-surface-solid flex items-center justify-center gap-2">
                <h3 className="text-lg font-outfit font-bold text-tx-primary">
                    x'den gelenler
                </h3>
            </div>

            <div className="p-4 flex-grow overflow-y-auto space-y-4 custom-scrollbar">
                {tweets.map(tweet => (
                    <div
                        key={tweet.id}
                        className="bg-surface-solid rounded-xl p-4 shadow-sm border border-brutal-border dark:border-surface-solid transition-all duration-300 hover:shadow-md"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-900/30 dark:bg-blue-900/20 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                                    {tweet.user.substring(0, 3).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <div className="font-bold text-sm text-tx-primary flex items-center gap-1">
                                        <span className="truncate max-w-[120px]">{tweet.user}</span>
                                        {tweet.hasBadge && (
                                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500 fill-current shrink-0">
                                                <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.76 1.868 3.45-.046.223-.07.452-.07.687 0 2.21 1.71 4 3.918 4 .62 0 1.205-.152 1.714-.415C9.773 23.344 10.824 24 12 24s2.227-.657 2.91-1.68c.51.263 1.096.415 1.715.415 2.21 0 3.918-1.79 3.918-4 0-.235-.024-.464-.07-.687 1.127-.69 1.868-2 1.868-3.45z"></path></g>
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted">{tweet.handle}</div>
                                </div>
                            </div>
                            <Twitter className="w-4 h-4 text-muted shrink-0" />
                        </div>

                        {/* Body */}
                        <p className="text-sm text-tx-primary dark:text-tx-secondary whitespace-pre-line mb-3 leading-relaxed">
                            {tweet.content}
                        </p>
                        <div className="text-xs text-muted mb-3">{tweet.time}</div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-muted text-xs font-medium pt-3 border-t border-brutal-border dark:border-surface-solid">
                            <div className="flex items-center gap-1.5 hover:text-pink-400 cursor-pointer transition-colors group">
                                <div className="p-1.5 rounded-full group-hover:bg-pink-500/10 transition-colors">
                                    <Heart className="w-4 h-4" />
                                </div>
                                {tweet.likes}
                            </div>
                            <div className="flex items-center gap-1.5 hover:text-green-500 cursor-pointer transition-colors group">
                                <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
                                    <Repeat className="w-4 h-4" />
                                </div>
                                {Math.floor(tweet.likes * 0.2)}
                            </div>
                            <div className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer transition-colors group">
                                <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                                {tweet.replies}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TwitterFeedCard;
