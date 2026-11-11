import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';

const WEIGHT_ICONS = { 1: '😴', 2: '🤔', 3: '📚' };

export default function StoryCarousel({ title, stories, isSmall = false, icon = null }) {
    const navigate = useNavigate();
    const scrollRef = useRef(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = isSmall ? 220 : 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleMouseDown = (e) => {
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e, story) => {
        const deltaX = Math.abs(e.clientX - dragStart.x);
        const deltaY = Math.abs(e.clientY - dragStart.y);

        // 10px threshold for drag vs click
        if (deltaX < 10 && deltaY < 10) {
            navigate(story.slug ? `/mese/${story.slug}` : `/read/${story.id}`);
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
                <div className={`story-carousel ${isSmall ? 'small-carousel' : ''}`} ref={scrollRef} tabIndex={0} role="region" aria-label={title ? `${title} görgethető listája` : "Mesék görgethető listája"}>
                    {stories.map((story, idx) => (
                        <div
                            key={story.id}
                            className="story-card"
                            onMouseDown={handleMouseDown}
                            onMouseUp={(e) => handleMouseUp(e, story)}
                            id={`story-card-${story.id}`}
                        >
                            <div className={`story-card-cover ${isSmall ? 'small-cover' : ''}`} style={story.featuredImage ? { background: 'transparent' } : {}}>
                                {story.featuredImage ? (
                                    <img
                                        src={story.cardImage || story.featuredImage}
                                        srcSet={story.srcSet}
                                        sizes="(max-width: 600px) 210px, 260px"
                                        width="210"
                                        height="280"
                                        alt={story.title}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            pointerEvents: 'none',
                                            objectPosition: story.focalPoint || 'center 30%'
                                        }}
                                        loading={idx < 2 && !isSmall ? 'eager' : 'lazy'}
                                        fetchPriority={idx < 2 && !isSmall ? 'high' : 'auto'}
                                        decoding="async"
                                    />
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
