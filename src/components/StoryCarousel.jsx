import { useNavigate } from 'react-router-dom';

const WEIGHT_ICONS = { 1: '😴', 2: '🤔', 3: '📚' };

export default function StoryCarousel({ title, stories, isSmall = false }) {
    const navigate = useNavigate();

    return (
        <div className="section fade-in">
            <div className="section-title">{title}</div>
            <div className={`story-carousel ${isSmall ? 'small-carousel' : ''}`}>
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
        </div>
    );
}
