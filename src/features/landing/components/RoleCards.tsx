import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X, Sparkles, RefreshCcw, FileText } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript interface for the Article API shape (GET /articles)
// ─────────────────────────────────────────────────────────────────────────────
interface Article {
    _id: string;
    title: string;
    description?: string;
    content?: string;
    icon?: string;          // e.g. "🚀" emoji
    category?: string;
    tags?: string[];
    author?: string;
    isActive?: boolean;
    publishedAt?: string;
    slug?: string;
    createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic per-card visual theme — cycles through palettes by index.
// Adding more cards never breaks the visual system.
// ─────────────────────────────────────────────────────────────────────────────
const CARD_PALETTES = [
    {
        bgOrb1: 'bg-blue-400/20',
        bgOrb2: 'bg-indigo-400/20',
        iconGradient: 'from-blue-600 to-indigo-600',
        tagTheme: 'bg-blue-50/80 text-blue-700 border-blue-200/50 hover:bg-blue-100',
        hoverShadow: 'hover:shadow-blue-500/10 hover:border-blue-200',
    },
    {
        bgOrb1: 'bg-orange-400/20',
        bgOrb2: 'bg-rose-400/20',
        iconGradient: 'from-orange-500 to-rose-500',
        tagTheme: 'bg-orange-50/80 text-orange-700 border-orange-200/50 hover:bg-orange-100',
        hoverShadow: 'hover:shadow-orange-500/10 hover:border-orange-200',
    },
    {
        bgOrb1: 'bg-emerald-400/20',
        bgOrb2: 'bg-teal-400/20',
        iconGradient: 'from-emerald-500 to-teal-500',
        tagTheme: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100',
        hoverShadow: 'hover:shadow-emerald-500/10 hover:border-emerald-200',
    },
    {
        bgOrb1: 'bg-violet-400/20',
        bgOrb2: 'bg-purple-400/20',
        iconGradient: 'from-violet-600 to-purple-600',
        tagTheme: 'bg-violet-50/80 text-violet-700 border-violet-200/50 hover:bg-violet-100',
        hoverShadow: 'hover:shadow-violet-500/10 hover:border-violet-200',
    },
    {
        bgOrb1: 'bg-amber-400/20',
        bgOrb2: 'bg-yellow-400/20',
        iconGradient: 'from-amber-500 to-yellow-500',
        tagTheme: 'bg-amber-50/80 text-amber-700 border-amber-200/50 hover:bg-amber-100',
        hoverShadow: 'hover:shadow-amber-500/10 hover:border-amber-200',
    },
    {
        bgOrb1: 'bg-pink-400/20',
        bgOrb2: 'bg-fuchsia-400/20',
        iconGradient: 'from-pink-500 to-fuchsia-500',
        tagTheme: 'bg-pink-50/80 text-pink-700 border-pink-200/50 hover:bg-pink-100',
        hoverShadow: 'hover:shadow-pink-500/10 hover:border-pink-200',
    },
];

const getPalette = (index: number) => CARD_PALETTES[index % CARD_PALETTES.length];

// Strip HTML tags for a plain-text card preview
const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, '');

// Truncate text to a max length
const truncate = (text: string, max: number) =>
    text.length > max ? text.substring(0, max).trimEnd() + '…' : text;

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton shimmer card — shown during loading
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="flex flex-col bg-white/70 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 border-[1.5px] border-white shadow-xl shadow-black/[0.03] relative overflow-hidden animate-pulse">
            <div className="flex justify-between items-start mb-12">
                <div className="w-20 h-20 rounded-[2rem] bg-gray-200" />
                <div className="w-24 h-8 rounded-full bg-gray-100" />
            </div>
            <div className="flex-1 flex flex-col gap-3">
                <div className="h-8 w-3/4 bg-gray-200 rounded-xl" />
                <div className="h-4 w-full bg-gray-100 rounded-lg" />
                <div className="h-4 w-5/6 bg-gray-100 rounded-lg" />
                <div className="h-4 w-4/6 bg-gray-100 rounded-lg" />
                <div className="flex gap-2 mt-6">
                    <div className="h-7 w-20 bg-gray-100 rounded-xl" />
                    <div className="h-7 w-16 bg-gray-100 rounded-xl" />
                    <div className="h-7 w-24 bg-gray-100 rounded-xl" />
                </div>
                <div className="flex items-center justify-between pt-6 mt-auto border-t border-gray-200/60">
                    <div className="h-5 w-28 bg-gray-200 rounded-lg" />
                    <div className="w-12 h-12 rounded-full bg-gray-200" />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export function RoleCards() {
    const [cards, setCards] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [selectedPalette, setSelectedPalette] = useState<typeof CARD_PALETTES[0] | null>(null);
    const [articleDetail, setArticleDetail] = useState<Article | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // ── Fetch active articles from public API ──────────────────────────────
    const fetchArticles = useCallback(() => {
        setLoading(true);
        setError(null);

        fetch(`${API_BASE_URL}/articles`)
            .then(res => {
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                return res.json();
            })
            .then((res: { success?: boolean; data?: Article[] | { articles?: Article[] } }) => {
                if (res.success && res.data) {
                    // Handle both `data: []` and `data: { articles: [] }` shapes
                    const raw = Array.isArray(res.data)
                        ? res.data
                        : Array.isArray((res.data as { articles?: Article[] }).articles)
                            ? (res.data as { articles: Article[] }).articles
                            : [];
                    // Only show isActive articles (public API should only return active,
                    // but guard just in case)
                    setCards(raw.filter(a => a.isActive !== false));
                } else {
                    setCards([]);
                }
            })
            .catch((err: Error) => {
                console.error('[RoleCards] Failed to fetch articles:', err);
                setError('Could not load articles. Please try again.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    // ── Hide Navbar & lock body scroll while modal is open ─────────────────
    useEffect(() => {
        const navbar = document.getElementById('main-navbar');
        if (selectedArticle) {
            if (navbar) { navbar.style.opacity = '0'; navbar.style.pointerEvents = 'none'; }
            document.body.style.overflow = 'hidden';
        } else {
            if (navbar) { navbar.style.opacity = '1'; navbar.style.pointerEvents = 'auto'; }
            document.body.style.overflow = 'unset';
        }
        return () => {
            if (navbar) { navbar.style.opacity = '1'; navbar.style.pointerEvents = 'auto'; }
            document.body.style.overflow = 'unset';
        };
    }, [selectedArticle]);

    // ── Fetch full article detail when modal opens ─────────────────────────
    useEffect(() => {
        if (!selectedArticle?._id) {
            setArticleDetail(null);
            return;
        }
        setIsLoadingDetail(true);
        const idOrSlug = selectedArticle.slug || selectedArticle._id;
        fetch(`${API_BASE_URL}/articles/${idOrSlug}`)
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then((res: { success?: boolean; data?: Article }) => {
                if (res.success && res.data) setArticleDetail(res.data);
            })
            .catch((err: unknown) => console.error('[RoleCards] Detail fetch failed:', err))
            .finally(() => setIsLoadingDetail(false));
    }, [selectedArticle]);

    const openModal = (article: Article, index: number) => {
        setSelectedArticle(article);
        setSelectedPalette(getPalette(index));
        setArticleDetail(null);
    };

    const closeModal = () => {
        setSelectedArticle(null);
        setSelectedPalette(null);
        setArticleDetail(null);
    };

    // ── Resolve display values safely ──────────────────────────────────────
    const getDisplayDesc = (article: Article): string => {
        const raw = article.description
            || (article.content ? stripHtml(article.content) : '');
        return raw ? truncate(raw, 130) : 'No description available.';
    };

    const getDisplayTags = (article: Article): string[] =>
        Array.isArray(article.tags) && article.tags.length > 0
            ? article.tags.slice(0, 4)
            : article.category ? [article.category] : [];

    const getSubtitle = (article: Article): string =>
        article.category
            ? article.category.charAt(0).toUpperCase() + article.category.slice(1)
            : 'Article';

    return (
        <section className="relative py-24 w-full bg-[#fafafa] overflow-hidden">
            {/* Global background ambient glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-blue-100/40 via-purple-50/40 to-transparent rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-50/40 via-amber-50/40 to-transparent rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />

            <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">

                {/* Section header */}
                <div className="mb-20 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-gray-200 mb-8 shadow-sm"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-gray-800 text-[13px] font-extrabold tracking-widest uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            The Ecosystem
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-5xl md:text-[64px] text-[#111] tracking-tighter leading-[1.05] font-black mb-8 max-w-2xl"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        A place for{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">
                            everyone.
                        </span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-[18px] md:text-[20px] text-gray-500 leading-[1.7] font-medium max-w-xl mx-auto"
                    >
                        No matter where you are in your career journey, there's a space designed exactly for your energy.
                    </motion.p>
                </div>

                {/* ── Loading state: skeleton cards ───────────────────────────────────── */}
                {loading && (
                    <div className="flex flex-wrap justify-center gap-8 lg:gap-10">
                        <div className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)] max-w-[480px]"><SkeletonCard /></div>
                        <div className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)] max-w-[480px]"><SkeletonCard /></div>
                        <div className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)] max-w-[480px]"><SkeletonCard /></div>
                    </div>
                )}

                {/* ── Error state ─────────────────────────────────────────────────────── */}
                {!loading && error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center py-24 gap-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                            <FileText className="w-9 h-9 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h3>
                            <p className="text-gray-500 text-base">{error}</p>
                        </div>
                        <button
                            onClick={fetchArticles}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" /> Try again
                        </button>
                    </motion.div>
                )}

                {/* ── Empty state ─────────────────────────────────────────────────────── */}
                {!loading && !error && cards.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center py-24 gap-6"
                    >
                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                            <Sparkles className="w-9 h-9 text-gray-300" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Coming soon</h3>
                            <p className="text-gray-400 text-base max-w-sm">
                                Our team is preparing exciting content for you. Check back shortly.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ── Dynamic card grid ────────────────────────────────────────────────── */}
                {!loading && !error && cards.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-8 lg:gap-10">
                        {cards.map((article, i) => {
                            const palette = getPalette(i);
                            const displayDesc = getDisplayDesc(article);
                            const displayTags = getDisplayTags(article);
                            const subtitle = getSubtitle(article);

                            return (
                                <motion.div
                                    key={article._id}
                                    onClick={() => openModal(article, i)}
                                    initial={{ opacity: 0, y: 40 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-50px' }}
                                    transition={{ duration: 0.7, delay: Math.min(i * 0.12, 0.5), ease: 'easeOut' }}
                                    className={`group flex flex-col bg-white/70 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 border-[1.5px] border-white shadow-xl shadow-black/[0.03] transition-all duration-500 hover:-translate-y-3 cursor-pointer relative overflow-hidden w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)] max-w-[480px] ${palette.hoverShadow}`}
                                >
                                    {/* Floating Background Color Orbs */}
                                    <div className={`absolute -top-20 -right-20 w-64 h-64 ${palette.bgOrb1} rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000 ease-out`} />
                                    <div className={`absolute -bottom-32 -left-20 w-72 h-72 ${palette.bgOrb2} rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 ease-out`} />

                                    {/* Overlay gradient to keep text crisp */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/80 to-white z-0" />

                                    {/* Top Header: Icon + Category badge */}
                                    <div className="relative z-10 flex justify-between items-start mb-12">
                                        {/* Glassy floating icon */}
                                        <div className="relative flex items-center justify-center">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${palette.iconGradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 rounded-full`} />
                                            <div className={`relative w-20 h-20 rounded-[2rem] bg-gradient-to-br ${palette.iconGradient} flex items-center justify-center shadow-lg shadow-black/5 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ease-in-out`}>
                                                {article.icon ? (
                                                    <span className="text-3xl leading-none select-none" role="img" aria-label={article.title}>
                                                        {article.icon}
                                                    </span>
                                                ) : (
                                                    <FileText className="w-9 h-9 text-white" strokeWidth={2} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Category badge */}
                                        <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full border border-gray-100 shadow-sm mt-1">
                                            <span className="font-bold text-[11px] text-[#111] uppercase tracking-[0.2em]">{subtitle}</span>
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <div className="relative z-10 flex-1 flex flex-col">
                                        <h3 className="text-[28px] md:text-[32px] font-black text-[#111] mb-5 tracking-tight leading-[1.1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                            {article.title}
                                        </h3>

                                        <p className="text-gray-600 font-medium text-[15px] md:text-[16px] leading-[1.7] mb-10">
                                            {displayDesc}
                                        </p>

                                        {/* Tags */}
                                        {displayTags.length > 0 && (
                                            <div className="flex flex-wrap gap-2.5 mb-12 mt-auto">
                                                {displayTags.map((tag, idx) => (
                                                    <div key={idx} className={`px-4 py-1.5 rounded-xl text-[13px] font-bold tracking-wide transition-colors duration-300 border backdrop-blur-sm ${palette.tagTheme}`}>
                                                        {tag}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Explore button row */}
                                        <div className="flex items-center justify-between pt-6 mt-auto border-t border-gray-200/60 transition-colors duration-300 group-hover:border-gray-300">
                                            <span className="font-extrabold text-[17px] text-[#111]" style={{ fontFamily: "'Outfit', sans-serif" }}>Explore Space</span>
                                            <div className={`w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm transition-all duration-500 group-hover:bg-gradient-to-br ${palette.iconGradient} group-hover:border-transparent group-hover:shadow-lg group-hover:text-white group-hover:scale-110 group-active:scale-95`}>
                                                <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500" strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Article Detail Modal Overlay ──────────────────────────────────────── */}
            <AnimatePresence>
                {selectedArticle && selectedPalette && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
                    >
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={closeModal}
                        />

                        {/* Modal panel */}
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 10, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Gradient Header with icon */}
                            <div className={`relative h-28 md:h-36 w-full bg-gradient-to-br ${selectedPalette.iconGradient} flex items-center justify-center overflow-hidden flex-shrink-0`}>
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />

                                {selectedArticle.icon ? (
                                    <span className="text-5xl md:text-6xl relative z-10 drop-shadow-lg select-none" role="img" aria-label={selectedArticle.title}>
                                        {selectedArticle.icon}
                                    </span>
                                ) : (
                                    <FileText className="w-16 h-16 md:w-20 md:h-20 text-white opacity-90 drop-shadow-md relative z-10" strokeWidth={1.5} />
                                )}

                                {/* Close button */}
                                <button
                                    onClick={closeModal}
                                    className="absolute top-4 right-4 md:top-6 md:right-6 w-9 h-9 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors z-20"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                                {/* Category / subtitle badge */}
                                <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
                                    {getSubtitle(articleDetail || selectedArticle)}
                                </div>

                                {/* Article title */}
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight leading-[1.1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    {articleDetail?.title || selectedArticle.title}
                                </h2>

                                {/* Tags row */}
                                {(() => {
                                    const modalTags = getDisplayTags(articleDetail || selectedArticle);
                                    return modalTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {modalTags.map((tag, idx) => (
                                                <span key={idx} className={`px-3 py-1 rounded-lg text-[12px] font-bold border ${selectedPalette.tagTheme}`}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}

                                {/* Content area */}
                                <div className="prose prose-base md:prose-lg max-w-none">
                                    {isLoadingDetail ? (
                                        <div className="flex items-center gap-3 py-8 text-gray-400">
                                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            <span className="text-sm font-medium">Loading full article…</span>
                                        </div>
                                    ) : (articleDetail?.content || selectedArticle.content) ? (
                                        // Render HTML content from the backend safely
                                        <div
                                            className="text-base md:text-lg leading-relaxed text-gray-700 prose prose-headings:font-black prose-headings:text-gray-900 prose-p:text-gray-600 prose-p:leading-relaxed max-w-none"
                                            dangerouslySetInnerHTML={{ __html: articleDetail?.content || selectedArticle.content || '' }}
                                        />
                                    ) : (
                                        // Fallback: show description text
                                        <div className="space-y-4 md:space-y-6">
                                            <p className="text-lg md:text-xl leading-relaxed text-gray-800 font-semibold">
                                                {articleDetail?.description || selectedArticle.description || 'No description available.'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Author / published info row */}
                                {(articleDetail?.author || selectedArticle.author || articleDetail?.publishedAt || selectedArticle.publishedAt) && (
                                    <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
                                        {(articleDetail?.author || selectedArticle.author) && (
                                            <span>By <span className="font-semibold text-gray-600">{articleDetail?.author || selectedArticle.author}</span></span>
                                        )}
                                        {(articleDetail?.publishedAt || selectedArticle.publishedAt) && (
                                            <span>{new Date(articleDetail?.publishedAt || selectedArticle.publishedAt || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        )}
                                    </div>
                                )}

                                {/* Admin-curated insight callout */}
                                <div className="mt-8 p-4 md:p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm md:text-base font-bold text-gray-900">Admin Curated Insight</h4>
                                        <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 leading-relaxed">
                                            This content has been published and curated directly by the Squrex administration team to guide your journey.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
