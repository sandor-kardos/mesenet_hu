import { useNavigate } from 'react-router-dom';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';
import { useLanguage } from '../context/LanguageContext';

export default function ContinueCard() {
    const { lastRead } = useReading();
    const { stories } = useStories();
    const { t } = useLanguage();
    const navigate = useNavigate();

    if (!lastRead || lastRead.scrollPercent >= 98 || !stories || !Array.isArray(stories)) return null;

    const story = stories.find((s) => String(s.id) === String(lastRead.storyId));
    if (!story) return null;

    const percent = Math.round(lastRead.scrollPercent);

    return (
        <div
            className="continue-card fade-in"
            onClick={() => navigate(`/read/${story.id}`)}
            id="continue-card"
        >
            <div className="continue-card-inner">
                <div className="continue-emoji" style={story.featuredImage ? { padding: 0, overflow: 'hidden', background: 'transparent' } : {}}>
                    {story.featuredImage ? (
                        <img src={story.featuredImage} alt={story.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    ) : (
                        story.coverEmoji
                    )}
                </div>
                <div className="continue-info">
                    <div className="continue-label">📖 {t('continue')}</div>
                    <div className="continue-title">{story.title}</div>
                    <div className="continue-progress-bar">
                        <div className="continue-progress-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="continue-percent">{percent}%</div>
                </div>
                <div className="continue-play">▶</div>
            </div>
        </div>
    );
}
