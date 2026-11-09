import { useState } from 'react';
import { useStories } from '../context/StoryContext';
import ContinueCard from '../components/ContinueCard';
import MoralWeightFilter from '../components/MoralWeightFilter';
import StoryCarousel from '../components/StoryCarousel';
import StoryList from '../components/StoryList';
import MerchBanner from '../components/MerchBanner';
import { useLanguage } from '../context/LanguageContext';

export default function HomePage() {
    const { stories, isLoading, error } = useStories();
    const { t } = useLanguage();
    const [filteredStories, setFilteredStories] = useState(null);

    if (error && stories.length === 0) {
        return (
            <div className="fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>⚠️</div>
                <h2 style={{ marginTop: '20px' }}>{t('somethingWentWrong')}</h2>
                <p>{error}</p>
            </div>
        );
    }

    // "Nektek ajánljuk" · shuffle for variety (limit to 6 cards on home carousel to avoid downloading 17 images on mobile 4G)
    const recommended = [...stories].sort(() => Math.random() - 0.5).slice(0, 6);
    // "Friss mesék" · newest published stories by date or ID descending
    const fresh = [...stories].sort((a, b) => {
        if (b.date && a.date) {
            const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (diff !== 0) return diff;
        }
        return Number(b.id) - Number(a.id);
    }).slice(0, 6);

    return (
        <div className="fade-in">
            <ContinueCard />
            <MoralWeightFilter onFilterChange={setFilteredStories} />

            {isLoading && stories.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', animation: 'spin 2s linear infinite' }}>⏳</div>
                    <p style={{ marginTop: '12px', fontWeight: 600 }}>{t('loadingStories')}</p>
                </div>
            ) : filteredStories ? (
                <StoryList title={t('tonightsStories')} stories={filteredStories.slice(0, 5)} hideSeeAll={true} />
            ) : (
                <>
                    {recommended.length > 0 && (
                        <StoryCarousel title={t('recommended')} stories={recommended} />
                    )}
                    <StoryCarousel title={t('fresh')} stories={fresh} isSmall={true} />
                </>
            )}

            <MerchBanner />
        </div>
    );
}
