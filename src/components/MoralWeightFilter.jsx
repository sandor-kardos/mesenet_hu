import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import stories from '../data/stories';

const MORAL_WEIGHTS = [
    { value: 1, emoji: '😴', label: 'Könnyed' },
    { value: 2, emoji: '🤔', label: 'Kalandos' },
    { value: 3, emoji: '📚', label: 'Komoly' },
];

const AGE_GROUPS = ['0-3', '4-6', '7+'];

const ALL_TAGS = [...new Set(stories.flatMap((s) => s.tags))];

export default function MoralWeightFilter({ onFilterChange }) {
    const [activeWeight, setActiveWeight] = useState(null);
    const [activeAges, setActiveAges] = useState([]);
    const [activeTags, setActiveTags] = useState([]);
    const navigate = useNavigate();

    const toggleAge = (age) => {
        setActiveAges((prev) =>
            prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]
        );
    };

    const toggleTag = (tag) => {
        setActiveTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const getFilteredStories = () => {
        return stories.filter((s) => {
            if (activeWeight && s.moralWeight !== activeWeight) return false;
            if (activeAges.length > 0 && !activeAges.includes(s.ageGroup)) return false;
            if (activeTags.length > 0 && !activeTags.some((t) => s.tags.includes(t))) return false;
            return true;
        });
    };

    // Calculate if any filters are active
    const hasActiveFilters = activeWeight !== null || activeAges.length > 0 || activeTags.length > 0;

    // Call onFilterChange when filters change
    useEffect(() => {
        if (hasActiveFilters && onFilterChange) {
            onFilterChange(getFilteredStories());
        } else if (!hasActiveFilters && onFilterChange) {
            onFilterChange(null);
        }
    }, [activeWeight, activeAges, activeTags, onFilterChange]);


    return (
        <div className="fade-in">
            <div className="moral-question">Milyen estét szeretnétek?</div>

            <div className="moral-cards">
                {MORAL_WEIGHTS.map((mw) => (
                    <button
                        key={mw.value}
                        className={`moral-card ${activeWeight === mw.value ? 'active' : ''}`}
                        onClick={() => setActiveWeight(activeWeight === mw.value ? null : mw.value)}
                        id={`moral-weight-${mw.value}`}
                    >
                        <div className="moral-card-emoji">{mw.emoji}</div>
                        <div className="moral-card-label">{mw.label}</div>
                    </button>
                ))}
            </div>

            <div className="filter-row age-filter-row">
                <span className="filter-label">Kor:</span>
                <div className="age-buttons-container">
                    {AGE_GROUPS.map((age) => (
                        <button
                            key={age}
                            className={`chip age-chip ${activeAges.includes(age) ? 'active' : ''}`}
                            onClick={() => toggleAge(age)}
                        >
                            {age}
                        </button>
                    ))}
                </div>
            </div>

            <div className="filter-row">
                <span className="filter-label">Címkék:</span>
                {ALL_TAGS.map((tag) => (
                    <button
                        key={tag}
                        className={`chip ${activeTags.includes(tag) ? 'active' : ''}`}
                        onClick={() => toggleTag(tag)}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>
    );
}
