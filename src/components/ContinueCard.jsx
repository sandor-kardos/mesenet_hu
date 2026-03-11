import { useNavigate } from 'react-router-dom';
import { useReading } from '../context/ReadingContext';
import { useStories } from '../context/StoryContext';

export default function ContinueCard() {
    const { lastRead } = useReading();
    const { stories } = useStories();
    const navigate = useNavigate();

    if (!lastRead || lastRead.scrollPercent >= 98) return null;

    const story = stories.find((s) => s.id === lastRead.storyId);
    if (!story) return null;

    const percent = Math.round(lastRead.scrollPercent);

    return (
        <div
            className="continue-card fade-in"
            onClick={() => navigate(`/read/${story.id}`)}
            id="continue-card"
        >
            <div className="continue-card-inner">
                <div className="continue-emoji">{story.coverEmoji}</div>
                <div className="continue-info">
                    <div className="continue-label">📖 Folytatás</div>
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
