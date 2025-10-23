import React from 'react';
import type { HNStory } from '../types';

interface NewsListProps {
  articles: HNStory[];
  onArticleSelect: (article: HNStory) => void;
}

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
};

const NewsList: React.FC<NewsListProps> = ({ articles, onArticleSelect }) => {
  return (
    <div className="space-y-4">
      {articles.map((article, index) => (
        <div
          key={article.id}
          className="bg-gray-800 rounded-lg p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:bg-gray-700 hover:shadow-lg hover:ring-2 hover:ring-orange-500"
          onClick={() => onArticleSelect(article)}
        >
          <div className="flex items-start space-x-4">
            <span className="text-lg font-bold text-gray-500">{index + 1}.</span>
            <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-orange-300 mb-1">{article.translatedTitle || article.title}</h2>
                <p className="text-sm text-gray-400">
                    ({getDomain(article.url)})
                </p>
                <div className="mt-2 text-sm text-gray-500 flex items-center space-x-4">
                    <span>{article.score} points by {article.by}</span>
                    <a 
                        href={`https://news.ycombinator.com/item?id=${article.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-orange-400 hover:underline"
                    >
                        {article.descendants} comments
                    </a>
                </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NewsList;
