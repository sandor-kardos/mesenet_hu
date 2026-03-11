import { useNavigate } from 'react-router-dom';

const WEIGHT_ICONS = { 1: '😴', 2: '🤔', 3: '📚' };

export default function StoryList({ title, stories, hideSeeAll = false }) {
    const navigate = useNavigate();

    return (
        <div className="section fade-in">
            <div className="section-title">{title}</div>
            <div className="story-list">
                {stories.map((story) => (
                    <div
                        key={story.id}
                        className="story-list-item"
                        onClick={() => navigate(`/read/${story.id}`)}
                        id={`story-list-${story.id}`}
                    >
                        <div className="story-list-cover" style={story.featuredImage ? { padding: 0 } : {}}>
                            {story.featuredImage ? (
                                <img src={story.featuredImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                            ) : (
                                story.coverEmoji
                            )}
                        </div>
                        <div className="story-list-info">
                            <div className="story-list-title">{story.title}</div>
                            <div className="story-list-meta">
                                {story.ageGroup} · {WEIGHT_ICONS[story.moralWeight]} · ⏱ {story.readingTime}p
                            </div>
                            <div className="story-list-tags">{story.tags.join(', ')}</div>
                        </div>
                    </div>
                ))}
            </div>
            {!hideSeeAll && (
                <button className="see-all-btn" onClick={() => navigate('/discover')}>
                    Összes mese →
                </button>
            )}
        </div>
    );
}
