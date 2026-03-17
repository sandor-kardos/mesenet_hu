import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

const WEIGHT_ICONS = { 1: '😴', 2: '🤔', 3: '📚' };

export default function StoryCarousel({ title, stories, isSmall = false, icon = null }) {
    const navigate = useNavigate();
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = isSmall ? 220 : 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="section fade-in carousel-container">
            <div className="section-title">
                {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
                {title}
            </div>
            
            <div className="carousel-wrapper">
                <button className="carousel-nav-btn left" onClick={(e) => { e.stopPropagation(); scroll('left'); }} aria-label="Scroll left">‹</button>
                <div className={`story-carousel ${isSmall ? 'small-carousel' : ''}`} ref={scrollRef}>
                    {stories.map((story) => (
                        <div
                            key={story.id}
                            className="story-card"
                            onClick={() => navigate(`/read/${story.id}`)}
                            id={`story-card-${story.id}`}
                        >
                            <div className={`story-card-cover ${isSmall ? 'small-cover' : ''}`} style={story.featuredImage ? { background: 'transparent' } : {}}>
                                {story.featuredImage ? (
                                    <img src={story.featuredImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    story.coverEmoji
                                )}
                            </div>
                            <div className={`story-card-body ${isSmall ? 'small-body' : ''}`}>
                                <div className="story-card-title">{story.title}</div>
                                {isSmall ? null : (
                                    <div className="story-card-meta">
                                        <span>{story.ageGroup}</span>
                                        <span>·</span>
                                        <span>{WEIGHT_ICONS[story.moralWeight]}</span>
                                        <span>·</span>
                                        <span>⏱ {story.readingTime}p</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <button className="carousel-nav-btn right" onClick={(e) => { e.stopPropagation(); scroll('right'); }} aria-label="Scroll right">›</button>
            </div>
        </div>
    );
}
