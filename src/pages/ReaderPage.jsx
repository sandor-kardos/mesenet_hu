import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Pin, ThumbsDown, MessageCircle, Palette, Share2, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';
import DrawingCanvas from '../components/DrawingCanvas';
import { useLanguage } from '../context/LanguageContext';

const QUESTION_EMOJIS = ['🫶', '🌱', '💡'];
const FEEDBACK_PRESETS = [
    { emoji: '❤️', id: 'love', label: 'Tetszett' },
    { emoji: '📌', id: 'neutral', label: 'Mentés' },
    { emoji: '👎', id: 'dislike', label: 'Nem' }
];

export default function ReaderPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { cycleTheme, themeIcon } = useTheme();
    const { updateProgress, markAsRead, rateStory, ratings, lastRead, saveDrawing, userDrawings, favorites, toggleFavorite } = useReading();
    const { stories, isLoading, error } = useStories();
    const { t, toggleLanguage } = useLanguage();

    const story = stories.find((s) => String(s.id) === String(id));
    const contentRef = useRef(null);
    const hideTimeout = useRef(null);
    const fileInputRef = useRef(null);
    const lastScrollTop = useRef(0);

    const [fontSize, setFontSize] = useState(100);
    const [headerVisible, setHeaderVisible] = useState(true);
    const [enlargedImage, setEnlargedImage] = useState(null); 
    const [scrollPercent, setScrollPercent] = useState(0);
    const [discussionOpen, setDiscussionOpen] = useState(false);
    const [currentRating, setCurrentRating] = useState(ratings[id] || null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    
    const existingDrawing = userDrawings.find(d => String(d.storyId) === String(id));
    const [tempDrawing, setTempDrawing] = useState(existingDrawing?.dataUrl || null);
    const [workshopOpen, setWorkshopOpen] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [showDislikeReasons, setShowDislikeReasons] = useState(false);
    const [magicBurst, setMagicBurst] = useState(false);
    // Generate a random stable number for likes so they feel connected
    const [fakeLikes] = useState(() => Math.floor(Math.random() * 850) + 120);

    useEffect(() => {
        if (ratings[id]) setCurrentRating(ratings[id]);
    }, [id, ratings]);

    useEffect(() => {
        if (lastRead && String(lastRead.storyId) === String(id) && lastRead.scrollPercent > 0) {
            setTimeout(() => {
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (scrollHeight > 0) {
                    window.scrollTo({ top: (lastRead.scrollPercent / 100) * scrollHeight, behavior: 'smooth' });
                }
            }, 500);
        }
    }, [id, lastRead]);

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
            if (scrollPercent > 0) updateProgress(id, scrollPercent);
        }, 5000);
        return () => clearInterval(interval);
    }, [scrollPercent, id, updateProgress]);

    useEffect(() => {
        if (scrollPercent >= 95) markAsRead(id);
    }, [scrollPercent, id, markAsRead]);

    const handleContentClick = () => {
        setHeaderVisible(true);
        clearTimeout(hideTimeout.current);
        if (window.scrollY > 100) {
            hideTimeout.current = setTimeout(() => setHeaderVisible(false), 3000);
        }
    };

    const handleRate = (ratingId) => {
        setCurrentRating(ratingId);
        rateStory(id, ratingId);
        
        if (ratingId === 'dislike') {
            setShowDislikeReasons(true);
            setFeedbackSubmitted(false);
        } else {
            setShowDislikeReasons(false);
            setFeedbackSubmitted(true);
        }
        
        // Connect to Favorites Log automatically
        const isFavorited = favorites.includes(String(id)) || favorites.includes(Number(id));
        if (ratingId === 'love' && !isFavorited) {
            toggleFavorite(id);
            // Trigger Magic Effect!
            setMagicBurst(true);
            setTimeout(() => setMagicBurst(false), 2200);
        } else if (ratingId !== 'love' && isFavorited) {
            // Remove from favorites if they downgrade their rating
            toggleFavorite(id);
        }

        // Also ensure it is marked as read since they gave feedback!
        markAsRead(id);

        console.log('[Feedback] Native reaction:', ratingId);
    };

    const handleDislikeReason = (reason) => {
        console.log('[Feedback] Dislike reason:', reason);
        setShowDislikeReasons(false);
        setFeedbackSubmitted(true);
    };

    const getNextStory = () => {
        const idx = stories.findIndex((s) => String(s.id) === String(id));
        return stories[(idx + 1) % stories.length];
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: story.title,
                    text: 'A Mesenet appban olvasom!',
                    url: window.location.href
                });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            alert('A megosztás nem támogatott ezen az eszközön.');
        }
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
        saveDrawing(id, dataUrl);
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
        return result.trim();
    };

    if (isLoading) return <div className="reader-shell fade-in" style={{ textAlign: 'center', paddingTop: 100 }}>⏳ {t('loading')}</div>;
    if (error) return <div className="reader-shell fade-in" style={{ textAlign: 'center', paddingTop: 100 }}>⚠️ {t('error')}: {error}</div>;
    if (!story) return <div className="reader-shell"><div className="placeholder-page"><div className="placeholder-emoji">📖</div><div className="placeholder-title">{t('storyNotFound')}</div><button className="next-story-btn" onClick={() => navigate('/')}>← {t('backToHome')}</button></div></div>;

    const nextStory = getNextStory();
    const contentHtml = cleanContent(story.content.includes('<p>') ? story.content : story.content.split('\n\n').map(p => `<p>${p}</p>`).join(''));

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
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); setFontSize(p => p >= 150 ? 100 : p + 25); }}>
                            🔍<span className="tiny-percent">{fontSize}%</span>
                        </button>
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); toggleLanguage(); }}>🪄</button>
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); cycleTheme(); }}>{themeIcon}</button>
                        <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); navigate('/profile'); }}>👤</button>
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
                        />
                    ) : (
                        <div className="story-cover-emoji">{story.coverEmoji}</div>
                    )}
                </div>

                <div className="mese-body-wrapper" style={{ fontSize: `${fontSize}%`, transition: 'font-size 0.3s ease' }}>
                    <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                </div>

                <div className="end-block">
                    <div className="end-marker">{t('end')}</div>

                    {/* 5 Quick Reaction Presets */}
                    <div className="reader-action-card glass-blur">
                        <div className="action-row">
                            <button 
                                className={`action-btn ${currentRating === 'love' ? 'active-like' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRate('love'); }}
                                title={t('Tetszett')}
                            >
                                <Heart size={28} fill={currentRating === 'love' ? 'currentColor' : 'none'} className={currentRating === 'love' ? 'animate-jump-3' : 'hover-wiggle'} />
                                <span className={`action-count-badge ${currentRating === 'love' ? 'active-badge' : ''}`}>
                                    {fakeLikes + (currentRating === 'love' ? 1 : 0)}
                                </span>
                            </button>
                            
                            <button 
                                className={`action-btn ${currentRating === 'neutral' ? 'active-pin' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRate('neutral'); }}
                                title={t('Mentés')}
                            >
                                <Pin size={24} fill={currentRating === 'neutral' ? 'currentColor' : 'none'} className={currentRating === 'neutral' ? '' : 'hover-wiggle'} />
                            </button>

                            <button 
                                className={`action-btn ${currentRating === 'dislike' ? 'active-dislike' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRate('dislike'); }}
                                title={t('Nem')}
                            >
                                <ThumbsDown size={24} fill={currentRating === 'dislike' ? 'currentColor' : 'none'} className={currentRating === 'dislike' ? '' : 'hover-wiggle'} />
                            </button>

                            <button 
                                className="action-btn"
                                onClick={handleShare}
                                title={t('Megosztás')}
                            >
                                <Share2 size={24} className="hover-wiggle" />
                            </button>
                        </div>

                        {showDislikeReasons && (
                            <div className="feedback-grid animate-slide-down">
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
                    </div>

                    <div className="secondary-tools-row">
                        <button className="secondary-tool-btn group" onClick={(e) => { e.stopPropagation(); setDiscussionOpen(!discussionOpen); }}>
                            <MessageCircle size={18} className="tool-icon-ask" />
                            <span>Kérdezz</span>
                        </button>
                        
                        <button className="secondary-tool-btn group" onClick={(e) => { e.stopPropagation(); setWorkshopOpen(!workshopOpen); }}>
                            <Palette size={18} className="tool-icon-draw" />
                            <span>Rajzolj</span>
                        </button>
                    </div>

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

                    {workshopOpen && (
                        <div className="discussion-card workshop-card animate-slide-down" style={{ marginTop: '-12px', marginBottom: '24px' }}>
                            <div className="accordion-body open">
                                {!isDrawingMode ? (
                                    <div className="workshop-content" style={{ padding: '10px 0 20px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎨</div>
                                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{t('drawPrompt')}</p>
                                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            <button className="mese-btn drawing-main-btn" onClick={(e) => { e.stopPropagation(); setIsDrawingMode(true); }}>✏️ {t('drawButton')}</button>
                                            <button className="mese-btn upload-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>📸 {t('uploadButton')}</button>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                                        {tempDrawing && (
                                            <div style={{ marginTop: '1.5rem', position: 'relative', display: 'inline-block' }}>
                                                <img src={tempDrawing} alt="Saját rajz" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '12px', border: '2px solid #ffd700', cursor: 'pointer' }} onClick={() => setEnlargedImage(tempDrawing)} />
                                                <div style={{ position: 'absolute', top: -8, right: -8, background: '#ffd700', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#1a1a2e' }}>✨</div>
                                            </div>
                                        )}
                                        {uploadedFile && <p style={{ color: '#ffd700', fontSize: '0.8rem', marginTop: '1rem' }}>✅ <strong>{uploadedFile.name}</strong> — {t('saved')}</p>}
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px 0' }}>
                                        <DrawingCanvas onSave={handleSaveDrawing} onCancel={() => setIsDrawingMode(false)} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button className="gradient-next-btn group" onClick={(e) => { e.stopPropagation(); navigate(`/read/${nextStory.id}`); window.scrollTo(0, 0); }}>
                        <div className="gradient-next-content">
                            <span>KÖVETKEZŐ MESE</span>
                            <ArrowRight size={20} className="gradient-next-arrow" />
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

            {magicBurst && (
                <div className="magic-burst-container">
                    {[...Array(30)].map((_, i) => {
                        // Calculate a random explosion vector
                        const tx = (Math.random() - 0.5) * 400; // Spread wide X
                        const ty = -(Math.random() * 300 + 100); // Shoot up Y
                        return (
                            <div 
                                key={i} 
                                className={`magic-particle`} 
                                style={{ 
                                    '--tx': `${tx}px`, 
                                    '--ty': `${ty}px`,
                                    animationDelay: `${Math.random() * 0.15}s` 
                                }}
                            >
                                {['✨', '💖', '🌟', '🪄', '⭐'][Math.floor(Math.random() * 5)]}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
