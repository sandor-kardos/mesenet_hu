import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, ThumbsDown, Bookmark, MessageCircle, Share2, ArrowRight, Check } from 'lucide-react';
import SocialShareButton from '../components/SocialShareButton';
import { useTheme } from '../context/ThemeContext';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';
import { useLanguage } from '../context/LanguageContext';
import { stripZwj, watermarkOnCopy } from '../utils/watermark';

const QUESTION_EMOJIS = ['🫶', '🌱', '💡'];
const FEEDBACK_PRESETS = [
    { emoji: '❤️', id: 'love', label: 'Tetszett' },
    { emoji: '📌', id: 'neutral', label: 'Mentés' },
    { emoji: '👎', id: 'dislike', label: 'Nem' }
];

/**
 * FireEmber Komponens - Egyedi parázs szemcse
 */
const FireEmber = ({ id, x, y, size, delay, color }) => {
  const driftStart = (Math.random() - 0.5) * 15;
  const driftEnd = (Math.random() - 0.5) * 35;

  return (
    <div
      className="animate-ember-steady"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        borderRadius: '50%',
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}%`,
        top: `${y}%`,
        background: color,
        boxShadow: `0 0 ${size * 5}px ${color}, 0 0 ${size * 2}px white`,
        animationDelay: `${delay}s`,
        '--drift-start': `${driftStart}px`,
        '--drift-end': `${driftEnd}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    />
  );
};

export default function ReaderPage() {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { cycleTheme, themeIcon } = useTheme();
    const { updateProgress, markAsRead, rateStory, ratings, lastRead, favorites, toggleFavorite, isFavorite, userDrawings = [], saveDrawing } = useReading();
    const { stories, isLoading, error } = useStories();
    const { t, toggleLanguage } = useLanguage();

    const storyParam = slug || id;
    const story = stories.find((s) => 
        String(s.id) === String(storyParam) || 
        s.slug === storyParam ||
        s.slug === `${storyParam}-nepmese` ||
        s.slug?.replace(/-nepmese$/, '') === storyParam?.replace(/-nepmese$/, '')
    );
    const storyId = story ? story.id : id;
    const isSaved = story ? isFavorite(story.id) : false;

    // Canonical URL enforcement: If loaded via /read/:id or non-canonical slug, redirect to /mese/:slug
    useEffect(() => {
        if (story && story.slug && (id || slug !== story.slug)) {
            navigate(`/mese/${story.slug}`, { replace: true });
        }
    }, [story, id, slug, navigate]);

    // Dynamic Open Graph & Meta Tags for High-CTR Social Sharing
    useEffect(() => {
        if (!story) return;
        document.title = `${story.title} · Mesenet.hu`;

        const updateMeta = (prop, content) => {
            if (!content) return;
            const isOg = prop.startsWith('og:');
            let el = document.querySelector(`meta[${isOg ? 'property' : 'name'}="${prop}"]`);
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(isOg ? 'property' : 'name', prop);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        const shareUrl = window.location.origin ? `${window.location.origin}/mese/${story.slug || story.id}` : `https://mesenet.hu/mese/${story.slug || story.id}`;
        const shareDesc = `Olvasd el a(z) „${story.title}” című mesét a Mesenet.hu-n! Ingyenes esti mese gyönyörű illusztrációval és beszélgetős kérdésekkel gyerekeknek.`;

        updateMeta('og:title', `${story.title} · Mesenet.hu`);
        updateMeta('og:description', shareDesc);
        updateMeta('og:url', shareUrl);
        updateMeta('og:type', 'article');
        if (story.featuredImage) {
            updateMeta('og:image', story.featuredImage);
            updateMeta('twitter:image', story.featuredImage);
        }
        updateMeta('twitter:card', 'summary_large_image');
        updateMeta('twitter:title', `${story.title} · Mesenet.hu`);
        updateMeta('twitter:description', shareDesc);

        // Schema.org JSON-LD Structured Data for Google Rich Snippets
        let schemaScript = document.querySelector('script[data-schema="story"]');
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.setAttribute('data-schema', 'story');
            document.head.appendChild(schemaScript);
        }
        schemaScript.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ShortStory",
            "name": story.title,
            "headline": story.title,
            "inLanguage": "hu",
            "url": shareUrl,
            "image": story.featuredImage || "https://api.mesenet.hu/wp-content/uploads/a-vak-kiraly-nepmese.png",
            "description": shareDesc,
            "author": {
                "@type": "Person",
                "name": story.collection || "Magyar népmese"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Mesenet.hu",
                "url": "https://mesenet.hu"
            }
        });
    }, [story]);
    const contentRef = useRef(null);
    const hideTimeout = useRef(null);
    const fileInputRef = useRef(null);
    const lastScrollTop = useRef(0);

    const [fontSize, setFontSize] = useState(100);
    const [headerVisible, setHeaderVisible] = useState(true);
    const [enlargedImage, setEnlargedImage] = useState(null); 
    const [scrollPercent, setScrollPercent] = useState(0);
    const [discussionOpen, setDiscussionOpen] = useState(false);
    const [currentRating, setCurrentRating] = useState(ratings[storyId] || null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    
    const existingDrawing = userDrawings.find(d => String(d.storyId) === String(storyId));
    const [tempDrawing, setTempDrawing] = useState(existingDrawing?.dataUrl || null);
    const [workshopOpen, setWorkshopOpen] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [showDislikeReasons, setShowDislikeReasons] = useState(false);
    const [dislikeConfirmed, setDislikeConfirmed] = useState(false);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [embers, setEmbers] = useState([]);
    const [isJumping, setIsJumping] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    // Generate a random stable number for likes so they feel connected
    const [fakeLikes] = useState(() => Math.floor(Math.random() * 850) + 120);

    useEffect(() => {
        if (storyId && ratings[storyId]) setCurrentRating(ratings[storyId]);
        else setCurrentRating(null);
    }, [storyId, ratings]);

    useEffect(() => {
        if (lastRead && storyId && String(lastRead.storyId) === String(storyId) && lastRead.scrollPercent > 0) {
            setTimeout(() => {
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (scrollHeight > 0) {
                    window.scrollTo({ top: (lastRead.scrollPercent / 100) * scrollHeight, behavior: 'smooth' });
                }
            }, 500);
        }
    }, [storyId, lastRead]);

    const handleScroll = useCallback(() => {
        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        setScrollPercent(Math.min(100, Math.round(percent)));
        
        if (scrollTop > lastScrollTop.current && scrollTop > 100) {
            setHeaderVisible(false);
        } else {
            setHeaderVisible(true);
        }
        lastScrollTop.current = scrollTop;

        clearTimeout(hideTimeout.current);
        if (scrollTop > 100) {
            hideTimeout.current = setTimeout(() => setHeaderVisible(false), 3000);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(hideTimeout.current);
        };
    }, [handleScroll]);

    useEffect(() => {
        if (!contentRef.current) return;
        const imgs = contentRef.current.querySelectorAll('img');
        const handleImgDblClick = (e) => {
            e.stopPropagation();
            setEnlargedImage(e.target.src);
        };
        imgs.forEach(img => img.addEventListener('dblclick', handleImgDblClick));
        return () => {
            imgs.forEach(img => img.removeEventListener('dblclick', handleImgDblClick));
        };
    }, [story]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollPercent > 0 && storyId) updateProgress(storyId, scrollPercent);
        }, 5000);
        return () => clearInterval(interval);
    }, [scrollPercent, storyId, updateProgress]);

    useEffect(() => {
        if (scrollPercent >= 95 && storyId) markAsRead(storyId);
    }, [scrollPercent, storyId, markAsRead]);

    const handleContentClick = () => {
        setHeaderVisible(true);
        clearTimeout(hideTimeout.current);
        if (window.scrollY > 100) {
            hideTimeout.current = setTimeout(() => setHeaderVisible(false), 3000);
        }
    };

    const handleRate = (ratingId) => {
        if (!storyId) return;
        // Toggle off if the same rating is clicked again
        if (currentRating === ratingId) {
            setCurrentRating(null);
            rateStory(storyId, null);
            setShowDislikeReasons(false);
            setFeedbackSubmitted(false);
            const isFavorited = favorites.includes(String(storyId)) || favorites.includes(Number(storyId));
            if (ratingId === 'love' && isFavorited) toggleFavorite(storyId);
            return;
        }

        setCurrentRating(ratingId);
        rateStory(storyId, ratingId);

        if (ratingId === 'dislike') {
            setShowDislikeReasons(true);
            setFeedbackSubmitted(false);
        } else {
            setShowDislikeReasons(false);
            setFeedbackSubmitted(true);
        }

        // Connect to Favorites Log automatically
        const isFavorited = favorites.includes(String(storyId)) || favorites.includes(Number(storyId));
        if (ratingId === 'love') {
            if (!isFavorited) {
                toggleFavorite(storyId);
            }
            
            // New Ember & Jump Effect
            setIsJumping(true);
            const newEmbers = Array.from({ length: 25 }).map((_, i) => ({
                id: Math.random() + i,
                x: 50 + (Math.random() - 0.5) * 30, // Tighter X spread
                y: 55 + (Math.random() - 0.5) * 25, // Centered on heart
                size: Math.random() * 3 + 2,
                delay: Math.random() * 1.5,
                color: Math.random() > 0.4 ? '#fbbf24' : '#ef4444', 
            }));
            setEmbers(newEmbers);
            setTimeout(() => setIsJumping(false), 2400);
            setTimeout(() => setEmbers([]), 7500);

        } else if (ratingId !== 'love' && isFavorited) {
            // Remove from favorites if they downgrade their rating
            toggleFavorite(storyId);
        }

        // Also ensure it is marked as read since they gave feedback!
        markAsRead(storyId);

        console.log('[Feedback] Native reaction:', ratingId);
    };

    const handleDislikeReason = (reason) => {
        console.log('[Feedback] Dislike reason:', reason);
        setShowDislikeReasons(false);
        setFeedbackSubmitted(true);
        setDislikeConfirmed(true);
        setTimeout(() => setDislikeConfirmed(false), 3200);
    };

    const getNextStory = () => {
        const idx = stories.findIndex((s) => String(s.id) === String(storyId));
        return stories[(idx + 1) % stories.length];
    };

    const handleShare = (e) => {
        e.stopPropagation();
        setShowSharePanel(p => !p);
    };

    const handleFileChange = (e) => { 
        const f = e.target.files[0]; 
        if (f) {
            setUploadedFile(f);
            setTempDrawing(null);
        }
    };

    const handleSaveDrawing = (dataUrl) => {
        setTempDrawing(dataUrl);
        setIsDrawingMode(false);
        if (storyId && saveDrawing) saveDrawing(storyId, dataUrl);
        setUploadedFile({ name: 'Saját rajz.png' });
    };

    const cleanContent = (html) => {
        if (!html) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const root = doc.body.firstChild;
        let markerFound = false;
        const classesToStrip = [
            'mese-feedback-section', 'mese-accessibility-controls', 'mese-questions-accordion', 
            'mese-alkotomuhely-accordion', 'mese-next-story-section', 'rating-card', 
            'discussion-card', 'zoom-controls', 'rating-question', 'rating-buttons', 
            'discussion-toggle', 'discussion-body', 'share-section', 'social-share', 
            'next-story-btn', 'text-size-bar'
        ];
        const nodes = Array.from(root.childNodes);
        for (const node of nodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const text = node.textContent;
                if (node.classList.contains('end-marker') || text.includes('~ Vége ~') || text.includes('~ The End ~')) {
                    markerFound = true;
                    continue;
                }
                if (!markerFound) {
                    const hasClass = classesToStrip.some(cls => node.classList.contains(cls) || node.querySelector(`.${cls}`));
                    const isShareBtn = node.tagName === 'BUTTON' && (text.includes('Megosztás') || text.includes('Share'));
                    const hasShareBtn = node.querySelector('button') && (node.querySelector('button').textContent.includes('Megosztás') || node.querySelector('button').textContent.includes('Share'));
                    if (hasClass || isShareBtn || hasShareBtn) node.remove();
                } else {
                    const hasClass = classesToStrip.some(cls => node.classList.contains(cls) || node.querySelector(`.${cls}`));
                    if (hasClass) node.remove();
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.includes('~ Vége ~') || node.textContent.includes('~ The End ~')) markerFound = true;
            }
        }
        let result = root.innerHTML;
        if (markerFound) {
            const markerPos = result.search(/~ Vége ~|~ The End ~|<div class=["']end-marker/);
            if (markerPos !== -1) {
                const prefix = result.substring(0, markerPos);
                const suffix = result.substring(markerPos);
                result = prefix.replace(/~ Vége ~/g, '').replace(/~ The End ~/g, '') + suffix;
            }
        }
        // Security / XSS Sanitization: neutralize any unsafe tags and event handlers
        root.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
        root.querySelectorAll('*').forEach(el => {
            for (const attr of Array.from(el.attributes)) {
                if (attr.name.toLowerCase().startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
                    el.removeAttribute(attr.name);
                }
            }
        });

        // Strip visible OCR artifacts and em-dashes
        result = result.replace(/—\s*\d+\s*—/g, '');
        result = result.replace(/—/g, '–');
        return result.trim();
    };

    if (isLoading) return <div className="reader-shell fade-in" style={{ textAlign: 'center', paddingTop: 100 }}>⏳ {t('loading')}</div>;
    if (error) return <div className="reader-shell fade-in" style={{ textAlign: 'center', paddingTop: 100 }}>⚠️ {t('error')}: {error}</div>;
    if (!story) return <div className="reader-shell"><div className="placeholder-page"><div className="placeholder-emoji">📖</div><div className="placeholder-title">{t('storyNotFound')}</div><button className="next-story-btn" onClick={() => navigate('/')}>← {t('backToHome')}</button></div></div>;

    const nextStory = getNextStory();
    const contentHtml = stripZwj(cleanContent(story.content.includes('<p>') ? story.content : story.content.split('\n\n').map(p => `<p>${p}</p>`).join('')));

    return (
        <div className="reader-shell" onClick={handleContentClick} style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
            {/* Stable 3-Column Header */}
            <div className={`reader-header ${headerVisible ? '' : 'hidden'}`}>
                <div className="header-col-left">
                    <button className="reader-back-btn" onClick={(e) => { e.stopPropagation(); navigate('/'); }}>← {t('back')}</button>
                </div>
                <div className="header-col-center">
                    <div className="reader-title">{story.title}</div>
                </div>
                <div className="header-col-right">
                    <div className="reader-actions-group">
                        <button 
                            className="icon-btn-small" 
                            onClick={(e) => { e.stopPropagation(); if (story) toggleFavorite(story.id); }}
                            title={isSaved ? 'Mentve a könyvtárba' : 'Mentés a könyvtárba'}
                            style={isSaved ? { color: '#ffd700', borderColor: '#ffd700', background: 'rgba(255, 215, 0, 0.15)' } : {}}
                        >
                            <Bookmark size={17} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); setFontSize(p => p >= 150 ? 100 : p + 25); }}>
                            🔍<span className="tiny-percent">{fontSize}%</span>
                        </button>
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); toggleLanguage(); }}>🪄</button>
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); cycleTheme(); }}>{themeIcon}</button>
                    </div>
                </div>
            </div>

            <div className="reader-content" ref={contentRef}>
                <div className="reader-cover" onDoubleClick={(e) => { e.stopPropagation(); if (story.featuredImage) setEnlargedImage(story.featuredImage); }}>
                    {story.featuredImage ? (
                        <img 
                            src={story.featuredImage} 
                            alt={story.title} 
                            className="story-image-mock" 
                            style={{ objectPosition: story.focalPoint || 'center 30%' }}
                            loading="eager"
                        />
                    ) : (
                        <div className="story-cover-emoji">{story.coverEmoji}</div>
                    )}
                </div>

                <div className="mese-body-wrapper" onCopy={watermarkOnCopy} style={{ fontSize: `${fontSize}%`, transition: 'font-size 0.3s ease' }}>
                    <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                </div>

                <div className="end-block">
                    <div className="end-marker">{t('end')}</div>

                    {/* Premium Action Card */}
                    <div className="reader-action-card glass-blur">
                        <div className="action-row">
                            <div style={{ position: 'relative' }}>
                                <button
                                    className={`action-btn ${currentRating === 'love' ? 'active-like' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleRate('love'); }}
                                    title={t('Tetszett')}
                                >
                                    {embers.map(e => (
                                        <FireEmber key={e.id} x={e.x} y={e.y} size={e.size} delay={e.delay} color={e.color} />
                                    ))}
                                    <Heart 
                                        size={28} 
                                        fill={currentRating === 'love' ? 'currentColor' : 'none'} 
                                        className={isJumping ? 'animate-jump-extra-slow' : 'hover-wiggle'} 
                                    />
                                    <span className={`action-count-badge ${currentRating === 'love' ? 'active-badge' : ''}`}>
                                        {fakeLikes + (currentRating === 'love' ? 1 : 0)}
                                    </span>
                                </button>
                            </div>
                            
                            <button
                                className={`action-btn ${currentRating === 'dislike' ? 'active-dislike' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRate('dislike'); }}
                                title={t('Nem')}
                            >
                                <ThumbsDown 
                                    size={24} 
                                    fill={currentRating === 'dislike' ? 'currentColor' : 'none'} 
                                    className={currentRating === 'dislike' ? 'animate-shake-calm' : 'hover-wiggle'} 
                                />
                            </button>

                            <button
                                className={`action-btn ${isSaved ? 'active-save' : ''}`}
                                onClick={(e) => { e.stopPropagation(); if (story) toggleFavorite(story.id); }}
                                title={isSaved ? 'Mentve a könyvtárba' : 'Mentés a könyvtárba'}
                                style={isSaved ? { color: '#ffd700', borderColor: '#ffd700', background: 'rgba(255, 215, 0, 0.12)' } : {}}
                            >
                                <Bookmark 
                                    size={25} 
                                    fill={isSaved ? 'currentColor' : 'none'} 
                                    className={isSaved ? 'animate-jump-extra-slow' : 'hover-wiggle'} 
                                />
                            </button>

                            <div style={{ position: 'relative' }}>
                                {showSharePanel && (
                                    <div
                                        className="animate-ripple"
                                        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid currentColor', pointerEvents: 'none' }}
                                    />
                                )}
                                <button
                                    className={`action-btn ${showSharePanel ? 'active-share' : ''}`}
                                    onClick={handleShare}
                                    title={t('Megosztás')}
                                >
                                    <Share2
                                        size={24}
                                        className={showSharePanel ? 'animate-share-bloom' : 'hover-wiggle'}
                                    />
                                </button>
                            </div>
                        </div>

                        {showDislikeReasons && (
                            <div className="feedback-grid animate-slide-up-smooth">
                                <button className="feedback-btn" onClick={() => handleDislikeReason('rossz_szoveg')}>
                                    <span style={{ fontSize: '1.2rem' }}>📝</span>
                                    <span>Rossz szöveg</span>
                                </button>
                                <button className="feedback-btn" onClick={() => handleDislikeReason('szetesett_tartalom')}>
                                    <span style={{ fontSize: '1.2rem' }}>🧩</span>
                                    <span>Szétesett tartalom</span>
                                </button>
                                <button className="feedback-btn" onClick={() => handleDislikeReason('nem_tetszett_tortenet')}>
                                    <span style={{ fontSize: '1.2rem' }}>🥱</span>
                                    <span>Nem tetszett</span>
                                </button>
                                <button className="feedback-btn" onClick={() => handleDislikeReason('egyeb')}>
                                    <span style={{ fontSize: '1.2rem' }}>➕</span>
                                    <span>Egyéb ok</span>
                                </button>
                            </div>
                        )}

                        {dislikeConfirmed && (
                            <div className="dislike-confirm animate-confirm-pop">
                                <div className="dislike-confirm-check">
                                    <Check size={26} strokeWidth={2.5} />
                                </div>
                                <p className="dislike-confirm-title">Köszönjük!</p>
                                <p className="dislike-confirm-sub">Segítesz jobbá tenni a meséket.</p>
                            </div>
                        )}

                        {showSharePanel && (
                            <SocialShareButton
                                url={typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/mese/${story.slug || story.id}` : `https://mesenet.hu/mese/${story.slug || story.id}`}
                                title={story.title}
                            />
                        )}
                    </div>

                    {story.discussionQuestions && story.discussionQuestions.length > 0 && (
                        <div className="secondary-tools-row" style={{ justifyContent: 'center' }}>
                            <button className="secondary-tool-btn group" onClick={(e) => { e.stopPropagation(); setDiscussionOpen(!discussionOpen); }}>
                                <MessageCircle size={22} className="tool-icon-ask" />
                                <span>Kérdezz</span>
                            </button>
                        </div>
                    )}

                    {discussionOpen && story.discussionQuestions && story.discussionQuestions.length > 0 && (
                        <div className="discussion-card animate-slide-down" style={{ marginTop: '-12px', marginBottom: '24px' }}>
                            <div className="discussion-body open">
                                {story.discussionQuestions.map((q, i) => (
                                    <div key={i} className="discussion-question">
                                        <span className="discussion-question-emoji">{QUESTION_EMOJIS[i] || '💬'}</span>
                                        <span>„{q}"</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button className="gradient-next-btn group" onClick={(e) => { e.stopPropagation(); navigate(nextStory.slug ? `/mese/${nextStory.slug}` : `/read/${nextStory.id}`); window.scrollTo(0, 0); }}>
                        <div className="gradient-next-content">
                            <span style={{ opacity: 0.9 }}>KÖVETKEZŐ MESE</span>
                            <ArrowRight size={24} className="gradient-next-arrow" />
                        </div>
                        <div className="gradient-next-shine" />
                    </button>
                </div>
            </div>

            {enlargedImage && (
                <div className="lightbox-overlay" onDoubleClick={() => setEnlargedImage(null)} onClick={() => setEnlargedImage(null)}>
                    <img src={enlargedImage} alt="Enlarged" className="lightbox-image" />
                    <div className="lightbox-close">✕</div>
                </div>
            )}

            <div className="reader-progress">
                <div className="reader-progress-bar">
                    <div className="reader-progress-fill" style={{ width: `${scrollPercent}%` }} />
                </div>
                <div className="reader-progress-text">{scrollPercent}%</div>
            </div>
        </div>
    );
}
