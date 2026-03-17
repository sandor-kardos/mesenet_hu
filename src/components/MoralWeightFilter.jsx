import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStories } from '../context/StoryContext';
import { useLanguage } from '../context/LanguageContext';

const AGE_GROUPS = ['0-3', '4-6', '7+'];

export default function MoralWeightFilter({ onFilterChange }) {
    const { stories } = useStories();
    const { t } = useLanguage();
    const [activeWeight, setActiveWeight] = useState(null);
    const [activeAges, setActiveAges] = useState([]);
    const [activeTags, setActiveTags] = useState([]);

    const ALL_TAGS = [...new Set(stories.flatMap((s) => s.tags || []))];

    const MORAL_WEIGHTS = [
        { value: 1, emoji: '😴', label: t('moralLight') },
        { value: 2, emoji: '🤔', label: t('moralAdventure') },
        { value: 3, emoji: '📚', label: t('moralSerious') },
    ];

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
            if (activeWeight && parseInt(s.moralWeight) !== activeWeight) return false;
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
            <div className="moral-question">{t('moralQuestion')}</div>

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
                <span className="filter-label">{t('ageLabel')}</span>
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

            <div className="tags-filter-row">
                <span className="filter-label">{t('tagsLabel')}</span>
                <div className="tags-scroll-container">
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
        </div>
    );
}
