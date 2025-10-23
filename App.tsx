import React, { useState, useEffect, useCallback } from 'react';
import NewsList from './components/NewsList';
import NewsDetail from './components/NewsDetail';
import Spinner from './components/Spinner';
import ErrorDisplay from './components/ErrorDisplay';
import type { HNStory } from './types';
import { translateTitles } from './services/geminiService';

const HACKER_NEWS_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const TOP_STORIES_URL = `${HACKER_NEWS_API_BASE}/topstories.json`;
const ITEM_URL = (id: number) => `${HACKER_NEWS_API_BASE}/item/${id}.json`;

const App: React.FC = () => {
  const [stories, setStories] = useState<HNStory[]>([]);
  const [selectedStory, setSelectedStory] = useState<HNStory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStoryDetails = async (id: number): Promise<HNStory> => {
    const response = await fetch(ITEM_URL(id));
    if (!response.ok) {
      throw new Error(`Failed to fetch story ${id}`);
    }
    return response.json();
  };

  const loadStories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(TOP_STORIES_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch top story IDs from Hacker News.');
      }
      const storyIds: number[] = await response.json();
      const top30Ids = storyIds.slice(0, 30);
      
      const storyPromises = top30Ids.map(id => fetchStoryDetails(id));
      const fetchedStories = (await Promise.all(storyPromises))
        .filter(story => story && story.type === 'story' && story.url);

      const originalTitles = fetchedStories.map(story => story.title);
      const translatedTitles = await translateTitles(originalTitles);
      
      const storiesWithTranslatedTitles = fetchedStories.map((story, index) => ({
        ...story,
        translatedTitle: translatedTitles[index] || story.title
      }));

      setStories(storiesWithTranslatedTitles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleArticleSelect = (story: HNStory) => {
    setSelectedStory(story);
  };

  const handleBack = () => {
    setSelectedStory(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col justify-center items-center h-64">
          <Spinner size="h-16 w-16" />
          <p className="mt-4 text-lg text-gray-400">Fetching latest stories from Hacker News...</p>
        </div>
      );
    }

    if (error) {
      return <ErrorDisplay message={error} />;
    }

    if (selectedStory) {
      return <NewsDetail article={selectedStory} onBack={handleBack} />;
    }

    if (stories.length > 0) {
      return <NewsList articles={stories} onArticleSelect={handleArticleSelect} />;
    }

    return <p>No stories found.</p>;
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        .animate-fade-in-fast { animation: fadeIn 0.2s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        .prose-custom h1, .prose-custom h2, .prose-custom h3, .prose-custom h4 { color: #e5e7eb; margin-top: 1.2em; margin-bottom: 0.6em; font-weight: 600; line-height: 1.3; }
        .prose-custom h1 { font-size: 1.875rem; }
        .prose-custom h2 { font-size: 1.5rem; }
        .prose-custom h3 { font-size: 1.25rem; }
        .prose-custom p { margin-bottom: 1.25em; }
        .prose-custom ul, .prose-custom ol { margin-left: 1.5em; margin-bottom: 1.25em; padding-left: 1.5em; }
        .prose-custom ul { list-style-type: disc; }
        .prose-custom ol { list-style-type: decimal; }
        .prose-custom li { margin-bottom: 0.5em; }
        .prose-custom li > p { margin-bottom: 0.5em; }
        .prose-custom a { color: #fb923c; text-decoration: underline; }
        .prose-custom a:hover { color: #fdba74; }
        .prose-custom strong { color: #f9fafb; font-weight: 600; }
        .prose-custom code { background-color: #374151; padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
        .prose-custom pre { background-color: #1f2937; padding: 1em; border-radius: 6px; overflow-x: auto; }
        .prose-custom pre code { background-color: transparent; padding: 0; }
        .prose-custom blockquote { border-left: 4px solid #4b5563; padding-left: 1em; margin-left: 0; color: #9ca3af; font-style: italic; }
      `}</style>
      <header className="text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-300">
            AI Hacker News Reader
          </span>
        </h1>
        <p className="mt-2 text-lg text-gray-400">Your daily digest of Hacker News, translated and summarized by AI.</p>
      </header>
      <main className="max-w-4xl mx-auto">
        {renderContent()}
      </main>
      <footer className="text-center mt-12 text-gray-500 text-sm">
        <p>Powered by Google Gemini & Hacker News</p>
      </footer>
    </div>
  );
};

export default App;