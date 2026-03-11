import { useState } from 'react';
import Header from '../components/Header';
import ContinueCard from '../components/ContinueCard';
import MoralWeightFilter from '../components/MoralWeightFilter';
import StoryCarousel from '../components/StoryCarousel';
import StoryList from '../components/StoryList';
import MerchBanner from '../components/MerchBanner';
import stories from '../data/stories';

export default function HomePage() {
    const [filteredStories, setFilteredStories] = useState(null);

    // "Nektek ajánljuk" — shuffle for demo
    const recommended = [...stories].sort(() => Math.random() - 0.5);
    // "Friss mesék" — last 4 (changed from 3 to 4 to match image)
    const fresh = stories.slice(-4).reverse();

    return (
        <div className="fade-in">
            <ContinueCard />
            <MoralWeightFilter onFilterChange={setFilteredStories} />

            {filteredStories ? (
                <StoryList title="Ennek az estének a meséi" stories={filteredStories.slice(0, 5)} hideSeeAll={true} />
            ) : (
                <>
                    <StoryCarousel title="✨ Nektek ajánljuk" stories={recommended} />
                    <StoryCarousel title="🆕 Friss mesék" stories={fresh} isSmall={true} />
                </>
            )}

            <MerchBanner />
        </div>
    );
}
