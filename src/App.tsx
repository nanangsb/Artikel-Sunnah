import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, BookOpen, ChevronLeft, ChevronRight, Menu, X, Clock, User, Tag, Heart, Share2, Facebook, Twitter, Linkedin, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Virtuoso } from 'react-virtuoso';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { Article, AppConfig } from './types';
import { cn } from './lib/utils';

export default function App() {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('article_favorites');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('article_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true);
        const manifestRes = await fetch('/data/manifest.json');
        if (!manifestRes.ok) throw new Error('Manifest not found');
        const manifest: AppConfig = await manifestRes.json();

        const fetchPromises = manifest.files.map(file => 
          fetch(`/data/${file}`).then(res => {
            if (!res.ok) return [];
            return res.json();
          })
        );

        const results = await Promise.all(fetchPromises);
        const combinedArticles = results.flat() as Article[];
        
        setArticles(combinedArticles.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      } catch (error) {
        console.error('Gagal memuat data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  const toggleFavorite = (link: string) => {
    setFavorites(prev => 
      prev.includes(link) ? prev.filter(l => l !== link) : [...prev, link]
    );
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = article.title.rendered.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           article.content.rendered.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'Semua' || article.categories.includes(Number(selectedCategory));
      const matchesFavorite = !showFavoritesOnly || favorites.includes(article.link);

      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [articles, searchTerm, selectedCategory, favorites, showFavoritesOnly]);

  const categories = useMemo(() => {
    const cats = new Set(articles.flatMap(a => a.categories));
    return ['Semua', ...Array.from(cats)].sort();
  }, [articles]);

  const selectedArticle = useMemo(() => 
    articles.find(a => a.slug === slug),
  [articles, slug]);

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    if (!selectedArticle) return;
    const url = encodeURIComponent(selectedArticle.link);
    const title = encodeURIComponent(selectedArticle.title.rendered);
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };
    
    window.open(shareUrls[platform], '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Mobile Trigger */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <button 
            id="mobile-menu-trigger"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed bottom-6 left-6 z-50 p-4 bg-slate-900 text-white rounded-full shadow-2xl lg:hidden hover:scale-110 active:scale-95 transition-transform"
          >
            <Menu size={20} />
          </button>
        )}
      </AnimatePresence>

      {/* SIDEBAR: Article Index & Filters */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? (window.innerWidth < 1024 ? '100vw' : '320px') : '0px' }}
        className={cn(
          "relative bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out z-40",
          !isSidebarOpen && "border-none"
        )}
      >
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h1 id="app-title" className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">
              Muslim Archive
            </h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  showFavoritesOnly ? "bg-red-50 text-red-500" : "hover:bg-slate-200 text-slate-400"
                )}
                title={showFavoritesOnly ? "Lihat semua" : "Lihat favorit"}
              >
                <Heart size={16} fill={showFavoritesOnly ? "currentColor" : "none"} />
              </button>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-slate-200 rounded text-slate-500">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              id="article-search"
              type="text"
              placeholder={`Search ${articles.length}+ articles...`}
              className="w-full bg-white border border-slate-200 rounded-md py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 placeholder:italic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select 
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="Semua">All Categories</option>
              {categories.filter(c => c !== 'Semua').map(cat => <option key={cat} value={cat}>Category {cat}</option>)}
            </select>
          </div>
        </div>

        {/* Article List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Virtuoso
            data={filteredArticles}
            itemContent={(index, article) => (
              <div 
                id={`article-item-${index}`}
                key={article.link}
                onClick={() => {
                  navigate(`/${article.slug}`);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "px-4 py-3.5 cursor-pointer border-b border-slate-100 transition-all group",
                  slug === article.slug 
                    ? "bg-blue-50 border-l-4 border-l-blue-600 shadow-[inset_-1px_0_0_rgba(37,99,235,0.1)]" 
                    : "hover:bg-slate-50 border-l-4 border-l-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <p className={cn(
                    "text-[10px] uppercase font-bold tracking-wider",
                    slug === article.slug ? "text-blue-600" : "text-slate-400"
                  )}>
                    {format(parseISO(article.date), 'MMM dd, yyyy')}
                  </p>
                  {favorites.includes(article.link) && (
                    <Heart size={10} className="text-red-500" fill="currentColor" />
                  )}
                </div>
                <h3 className={cn(
                  "text-[13px] font-semibold leading-[1.4] transition-colors line-clamp-2",
                  slug === article.slug ? "text-slate-900" : "text-slate-700"
                )}>
                  {article.title.rendered}
                </h3>
              </div>
            )}
          />
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {filteredArticles.length} Result{filteredArticles.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-1">
            <button className="px-2 py-1 bg-white border border-slate-300 rounded text-[9px] font-extrabold text-slate-600 hover:bg-slate-100 uppercase tracking-tighter disabled:opacity-50">PREV</button>
            <button className="px-2 py-1 bg-white border border-slate-300 rounded text-[9px] font-extrabold text-slate-600 hover:bg-slate-100 uppercase tracking-tighter disabled:opacity-50">NEXT</button>
          </div>
        </div>
      </motion.aside>

      {/* MAIN CONTENT: Reader Panel */}
      <main className="flex-1 bg-white flex flex-col relative overflow-hidden">
        <header className="h-14 border-b border-slate-100 flex items-center justify-between px-8 bg-white z-20 shrink-0">
          <div className="flex items-center gap-6">
            <button 
              id="toggle-sidebar"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-slate-50 rounded text-slate-400 transition-colors"
            >
              {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
            <nav className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] h-14 items-center">
              <span className="text-blue-600 border-b-2 border-blue-600 h-full flex items-center translate-y-[1px]">Reading Room</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {selectedArticle && (
              <>
                <button 
                  onClick={() => toggleFavorite(selectedArticle.link)}
                  className={cn(
                    "p-2 transition-colors rounded-full",
                    favorites.includes(selectedArticle.link) ? "text-red-500 bg-red-50" : "text-slate-300 hover:text-slate-900"
                  )}
                  title="Mark as Favorite"
                >
                  <Heart size={18} fill={favorites.includes(selectedArticle.link) ? "currentColor" : "none"} />
                </button>
                <div className="h-4 w-[1px] bg-slate-100 mx-1" />
                <button onClick={() => handleShare('twitter')} className="p-2 text-slate-300 hover:text-blue-400 transition-colors" title="Share to X"><Twitter size={18} /></button>
                <button onClick={() => handleShare('facebook')} className="p-2 text-slate-300 hover:text-blue-600 transition-colors" title="Share to Facebook"><Facebook size={18} /></button>
                <button onClick={() => handleShare('linkedin')} className="p-2 text-slate-300 hover:text-blue-700 transition-colors" title="Share to LinkedIn"><Linkedin size={18} /></button>
              </>
            )}
            <a 
              href={selectedArticle?.link} 
              target="_blank" 
              rel="noreferrer" 
              className="p-2 text-slate-300 hover:text-slate-900 transition-colors" 
              title="Visit Source"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
          <AnimatePresence mode="wait">
            {selectedArticle ? (
              <motion.article
                id="reader-view"
                key={selectedArticle.link}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-8 py-16 lg:py-20"
              >
                <div className="max-w-[720px] mx-auto">
                  {selectedArticle.yoast_head_json?.og_image?.[0]?.url && (
                    <div className="mb-10 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 aspect-video group relative">
                      <img 
                        src={selectedArticle.yoast_head_json.og_image[0].url} 
                        alt={selectedArticle.title.rendered}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-6">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">
                      Category {selectedArticle.categories.join(', ')}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">
                      {format(parseISO(selectedArticle.date), 'MMMM d, yyyy')} • {selectedArticle.yoast_head_json?.author || 'Anonim'}
                    </span>
                  </div>
                  
                  <h2 id="article-heading" className="text-[32px] lg:text-[44px] font-serif font-bold text-slate-900 leading-[1.15] mb-10 tracking-tight">
                    {selectedArticle.title.rendered}
                  </h2>

                  {selectedArticle.excerpt.rendered && (
                    <div 
                      className="mb-10 text-lg lg:text-xl text-slate-500 font-sans italic border-l-4 border-slate-200 pl-4 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedArticle.excerpt.rendered }}
                    />
                  )}
                  
                  <div 
                    id="article-body" 
                    className="prose prose-slate max-w-none font-serif text-[18px] lg:text-[20px] text-slate-700 leading-[1.75] article-content"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content.rendered }}
                  />

                  <footer className="mt-20 pt-10 border-t border-slate-100 text-slate-400 text-[11px] flex justify-between items-center italic">
                    <div className="flex items-center gap-4">
                      <p>Viewed session: {new Date().toLocaleTimeString()}</p>
                    </div>
                    <p>© 2026 Muslim Archive Interface</p>
                  </footer>
                </div>
              </motion.article>
            ) : (
              <div id="empty-state" className="h-full flex flex-col items-center justify-center text-slate-300 p-12 text-center">
                <div className="w-16 h-16 mb-6 opacity-20 transform -rotate-12">
                   <BookOpen size={64} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-2">Workspace Idle</h3>
                <p className="max-w-xs text-xs text-slate-400 leading-relaxed font-medium">
                  Select a record from the explorer to begin high-fidelity reading session. System is optimized for deep text analysis.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* SETUP INSTRUCTIONS REMOVED */}
      </main>
    </div>
  );
}
