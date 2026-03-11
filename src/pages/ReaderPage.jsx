import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';

const QUESTION_EMOJIS = ['🫶', '🌱', '💡'];

export default function ReaderPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { cycleTheme, themeIcon } = useTheme();
    const { updateProgress, markAsRead, rateStory, ratings, lastRead } = useReading();
    const { stories, isLoading, error } = useStories();

    const story = stories.find((s) => s.id === parseInt(id));
    const contentRef = useRef(null);
    const hideTimeout = useRef(null);

    const [scrollPercent, setScrollPercent] = useState(0);
    const [headerVisible, setHeaderVisible] = useState(true);
    const [discussionOpen, setDiscussionOpen] = useState(false);
    const [currentRating, setCurrentRating] = useState(ratings[id] || null);
    const [ratingAnimating, setRatingAnimating] = useState(false);

    // Scroll to saved position on mount
    useEffect(() => {
        if (lastRead && lastRead.storyId === parseInt(id) && lastRead.scrollPercent > 0) {
            setTimeout(() => {
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                const targetScroll = (lastRead.scrollPercent / 100) * scrollHeight;
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }, 100);
        }
    }, [id, lastRead]);

    // Track scroll
    const handleScroll = useCallback(() => {
        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        setScrollPercent(Math.min(100, Math.round(percent)));

        // Auto-hide header
        setHeaderVisible(false);
        clearTimeout(hideTimeout.current);
        hideTimeout.current = setTimeout(() => {
            setHeaderVisible(true);
        }, 150);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(hideTimeout.current);
        };
    }, [handleScroll]);

    // Save progress periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollPercent > 0) {
                updateProgress(parseInt(id), scrollPercent);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [scrollPercent, id, updateProgress]);

    // Mark as read when reaching end
    useEffect(() => {
        if (scrollPercent >= 95) {
            markAsRead(parseInt(id));
        }
    }, [scrollPercent, id, markAsRead]);

    // Show header on tap
    const handleContentClick = () => {
        setHeaderVisible(true);
        clearTimeout(hideTimeout.current);
        hideTimeout.current = setTimeout(() => {
            if (window.scrollY > 100) {
                setHeaderVisible(false);
            }
        }, 3000);
    };

    const handleRate = (rating) => {
        setCurrentRating(rating);
        setRatingAnimating(true);
        rateStory(parseInt(id), rating);
        setTimeout(() => setRatingAnimating(false), 400);
    };

    const getNextStory = () => {
        const currentIndex = stories.findIndex((s) => s.id === parseInt(id));
        const nextIndex = (currentIndex + 1) % stories.length;
        return stories[nextIndex];
    };

    const handleShare = async (e) => {
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Nézd meg ezt a képet a(z) ${story.title} meséhez!`,
                    text: 'A Mesenet appban olvasom ezt a szuper mesét!',
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            alert('A megosztás nem támogatott ezen az eszközön.');
        }
    };

    if (isLoading) {
        return <div className="reader-shell fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}>⏳ Betöltés...</div>;
    }

    if (error) {
        return <div className="reader-shell fade-in" style={{ textAlign: 'center', paddingTop: '100px' }}>⚠️ Hiba: {error}</div>;
    }

    if (!story) {
        return (
            <div className="reader-shell">
                <div className="placeholder-page">
                    <div className="placeholder-emoji">📖</div>
                    <div className="placeholder-title">Mese nem található</div>
                    <button className="next-story-btn" onClick={() => navigate('/')}>
                        ← Vissza a főoldalra
                    </button>
                </div>
            </div>
        );
    }

    // Replace <br/> or inner HTML safely or split simple newlines. 
    // WordPress usually sends <p> tags, so using dangeroulySetInnerHTML is safer, but for now we fallback softly:
    const contentHtml = story.content.includes('<p>') ? story.content : story.content.split('\n\n').map(p => `<p>${p}</p>`).join('');
    
    const nextStory = getNextStory();

    return (
        <div className="reader-shell" onClick={handleContentClick}>
            {/* Reader Header */}
            <div className={`reader-header ${headerVisible ? '' : 'hidden'}`}>
                <button className="reader-back-btn" onClick={(e) => { e.stopPropagation(); navigate('/'); }}>
                    ← Vissza
                </button>
                <div className="reader-title">{story.title}</div>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); cycleTheme(); }} aria-label="Témaváltás">
                    {themeIcon}
                </button>
            </div>

            {/* Content */}
            <div className="reader-content" ref={contentRef}>
                {/* Static Story Hero Image */}
                {(story.heroImage || story.featuredImage) && (
                    <div className="story-image-container fade-in">
                        <div className="story-image-mock" style={story.featuredImage ? { padding: 0, overflow: 'hidden', background: 'transparent', border: 'none' } : {}}>
                            {story.featuredImage ? (
                                <img src={story.featuredImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                story.heroImage
                            )}
                        </div>
                    </div>
                )}

                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />

                {/* End Block */}
                <div className="end-block">
                    <div className="end-marker">~ Vége ~</div>

                    {/* Rating */}
                    <div className="rating-card">
                        <div className="rating-question">Tetszett a mese?</div>
                        <div className="rating-buttons">
                            <button
                                className={`rate-btn ${currentRating === 'up' ? 'selected-up' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRate('up'); }}
                                id="rate-up"
                            >
                                👍
                            </button>
                            <button
                                className={`rate-btn ${currentRating === 'down' ? 'selected-down' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleRate('down'); }}
                                id="rate-down"
                            >
                                👎
                            </button>
                        </div>
                    </div>

                    {/* Share Action */}
                    <div className="share-section" style={{ marginBottom: '20px' }}>
                        <button 
                            className="next-story-btn"
                            onClick={handleShare}
                            style={{ background: 'var(--discussion-bg)', color: 'var(--text-primary)', border: '1.5px solid var(--border)', boxShadow: 'none', width: '100%', justifyContent: 'center' }}
                        >
                            📤 Megosztás
                        </button>
                    </div>

                    {/* Discussion */}
                    <div className="discussion-card">
                        <button
                            className="discussion-toggle"
                            onClick={(e) => { e.stopPropagation(); setDiscussionOpen(!discussionOpen); }}
                            id="discussion-toggle"
                        >
                            <span>💬 Miről beszélgessünk?</span>
                            <span className={`discussion-arrow ${discussionOpen ? 'open' : ''}`}>▼</span>
                        </button>
                        <div className={`discussion-body ${discussionOpen ? 'open' : ''}`}>
                            {story.discussionQuestions.map((q, i) => (
                                <div key={i} className="discussion-question">
                                    <span className="discussion-question-emoji">{QUESTION_EMOJIS[i] || '💬'}</span>
                                    <span>„{q}"</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Next story */}
                    <button
                        className="next-story-btn"
                        onClick={(e) => { e.stopPropagation(); navigate(`/read/${nextStory.id}`); window.scrollTo(0, 0); }}
                        id="next-story-btn"
                    >
                        → Következő mese
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="reader-progress">
                <div className="reader-progress-bar">
                    <div className="reader-progress-fill" style={{ width: `${scrollPercent}%` }} />
                </div>
                <div className="reader-progress-text">{scrollPercent}%</div>
            </div>
        </div>
    );
}
