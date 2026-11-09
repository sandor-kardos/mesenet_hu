import React, { createContext, useContext, useState, useEffect } from 'react';

const StoryContext = createContext();
const CACHE_KEY = 'mesenet_stories_cache_v4';

export function StoryProvider({ children }) {
    const [stories, setStories] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(() => {
        try {
            return !localStorage.getItem(CACHE_KEY);
        } catch {
            return true;
        }
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStories = async () => {
            try {
                let data = null;
                if (typeof window !== 'undefined' && window.__MESENET_STORIES_PROMISE__) {
                    data = await window.__MESENET_STORIES_PROMISE__;
                    window.__MESENET_STORIES_PROMISE__ = null;
                }
                if (!data) {
                    const res = await fetch('https://api.mesenet.hu/wp-json/wp/v2/mese?_embed&per_page=100');
                    if (!res.ok) throw new Error('Nem sikerült betölteni a meséket az API-ból.');
                    data = await res.json();
                }
                
                const mappedStories = data.map(post => {
                    const acf = post.acf || {};
                    const embeddedTerms = post._embedded?.['wp:term']?.flat() || [];

                    const getTermsByTaxonomy = (taxName) => 
                        embeddedTerms.filter(term => term.taxonomy === taxName).map(term => term.name);

                    const ageGroups = getTermsByTaxonomy('age_group');
                    const tags = getTermsByTaxonomy('story_tag');
                    const moods = getTermsByTaxonomy('mood');
                    const collections = getTermsByTaxonomy('collection');
                    
                    let moralWeight = 2;
                    if (moods.length > 0) {
                        const m = moods[0].toLowerCase();
                        if (m.includes('könnyed')) moralWeight = 1;
                        if (m.includes('komoly')) moralWeight = 3;
                    }

                    // Extract responsive image sizes (medium ~210x300 for cards, large/full for reader)
                    const featuredMedia = post._embedded?.['wp:featuredmedia'];
                    const mediaObj = featuredMedia && featuredMedia.length > 0 ? featuredMedia[0] : null;
                    const sizes = mediaObj?.media_details?.sizes || {};
                    const featuredImage = sizes.large?.source_url || mediaObj?.source_url || null;
                    const cardImage = sizes.medium?.source_url || sizes.medium_large?.source_url || featuredImage;

                    // Build srcSet for responsive browser selection
                    const srcSetParts = [];
                    if (sizes.medium?.source_url && sizes.medium?.width) {
                        srcSetParts.push(`${sizes.medium.source_url} ${sizes.medium.width}w`);
                    }
                    if (sizes.medium_large?.source_url && sizes.medium_large?.width) {
                        srcSetParts.push(`${sizes.medium_large.source_url} ${sizes.medium_large.width}w`);
                    }
                    if (sizes.large?.source_url && sizes.large?.width) {
                        srcSetParts.push(`${sizes.large.source_url} ${sizes.large.width}w`);
                    }
                    if (mediaObj?.source_url && mediaObj?.media_details?.width) {
                        srcSetParts.push(`${mediaObj.source_url} ${mediaObj.media_details.width}w`);
                    }
                    const srcSet = srcSetParts.length > 0 ? srcSetParts.join(', ') : undefined;

                    const contentHtml = post.content?.rendered || '';
                    const focalMatch = contentHtml.match(/id=['"]mese-focal-point['"][^>]*>([^<]+)<\/div>/);
                    const focalPoint = focalMatch ? focalMatch[1].trim() : 'center 30%';

                    return {
                        id: post.id,
                        date: post.date,
                        title: post.title?.rendered || 'Névtelen mese',
                        slug: post.slug,
                        content: contentHtml, 
                        heroImage: acf.hero_image || '📖',
                        coverEmoji: acf.hero_image || '📖',
                        featuredImage: featuredImage,
                        cardImage: cardImage,
                        srcSet: srcSet,
                        focalPoint: focalPoint,
                        readingTime: parseInt(acf.reading_time) || 5,
                        ageGroup: ageGroups.length > 0 ? ageGroups[0] : '4-6',
                        collection: collections.length > 0 ? collections[0] : null,
                        moralWeight: moralWeight,
                        tags: tags,
                        discussionQuestions: [
                            acf.question_1,
                            acf.question_2,
                            acf.question_3
                        ].filter(q => q && q.trim() !== '')
                    };
                });
                
                setStories(mappedStories);
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(mappedStories));
                } catch {
                    // Ignore storage quota errors
                }
            } catch (err) {
                console.error('WP API Error:', err);
                if (stories.length === 0) {
                    setError(err.message);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchStories();
    }, []);

    return (
        <StoryContext.Provider value={{ stories, isLoading, error }}>
            {children}
        </StoryContext.Provider>
    );
}

export function useStories() {
    return useContext(StoryContext);
}
