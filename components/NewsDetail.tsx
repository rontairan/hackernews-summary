import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { HNStory, HNComment } from '../types';
import { translateArticle, explainText, summarizeComments } from '../services/geminiService';
import Spinner from './Spinner';
import ErrorDisplay from './ErrorDisplay';

declare global {
  interface Window {
    marked: {
      parse(markdownString: string, options?: any): string;
    };
  }
}

interface NewsDetailProps {
  article: HNStory;
  onBack: () => void;
}

const ExplanationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const NewsDetail: React.FC<NewsDetailProps> = ({ article, onBack }) => {
  const [translatedContent, setTranslatedContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [displayLanguage, setDisplayLanguage] = useState<'ja' | 'en'>('ja');

  const [commentSummary, setCommentSummary] = useState<string>('');
  const [isSummarizingComments, setIsSummarizingComments] = useState<boolean>(false);
  const [commentSummaryError, setCommentSummaryError] = useState<string | null>(null);

  const [selectedText, setSelectedText] = useState<string>('');
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);
  
  const articleContentRef = useRef<HTMLDivElement>(null);

  const fetchAndSummarizeComments = useCallback(async () => {
      if (!article.kids || article.kids.length === 0) {
          setCommentSummary('この記事にはコメントがありません。');
          return;
      }
      setIsSummarizingComments(true);
      setCommentSummaryError(null);
      setCommentSummary('');
      try {
          const topCommentIds = article.kids.slice(0, 15);
          const commentPromises = topCommentIds.map(id => 
              fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(res => res.json())
          );
          const comments: HNComment[] = await Promise.all(commentPromises);

          const commentsText = comments
              .filter(c => c && !c.deleted && c.text)
              .map(c => {
                  const tempDiv = document.createElement("div");
                  tempDiv.innerHTML = c.text;
                  return tempDiv.textContent || tempDiv.innerText || "";
              });

          if (commentsText.length > 0) {
              const summaryResult = await summarizeComments(commentsText);
              setCommentSummary(summaryResult);
          } else {
              setCommentSummary('表示できるコメントがありませんでした。');
          }

      } catch (error) {
          setCommentSummaryError("コメントの要約を取得できませんでした。");
      } finally {
          setIsSummarizingComments(false);
      }
  }, [article.kids]);

  useEffect(() => {
    const fetchAndTranslateArticle = async () => {
      setIsTranslating(true);
      setTranslationError(null);
      setTranslatedContent('');
      setOriginalContent('');
      try {
        const { originalText, translatedText } = await translateArticle(article.url);
        setOriginalContent(originalText);
        setTranslatedContent(translatedText);
      } catch (error) {
        setTranslationError(error instanceof Error ? error.message : 'An unknown error occurred.');
      } finally {
        setIsTranslating(false);
      }
    };

    fetchAndTranslateArticle();
    fetchAndSummarizeComments();
  }, [article.url, article.id, fetchAndSummarizeComments]);

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed) {
        if (popupPosition) {
            setPopupPosition(null);
            setSelectedText('');
        }
        return;
      }
      
      const text = selection.toString().trim();

      if (text.length > 10) {
        const range = selection.getRangeAt(0);
        if (articleContentRef.current?.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          const containerRect = articleContentRef.current.getBoundingClientRect();
          setPopupPosition({
            top: rect.bottom - containerRect.top + 5,
            left: rect.left - containerRect.left + rect.width / 2,
          });
          setSelectedText(text);
        }
      } else {
        setPopupPosition(null);
        setSelectedText('');
      }
    }, 0);
  }, [popupPosition]);

  const handleExplainClick = async () => {
    if (!selectedText) return;

    const button = document.querySelector('.explain-popup-button');
    if (button) button.remove();

    setShowExplanationModal(true);
    setIsExplaining(true);
    setExplanation('');

    try {
      const context = displayLanguage === 'ja' ? translatedContent : originalContent;
      const result = await explainText(selectedText, context);
      setExplanation(result);
    } catch (error) {
      setExplanation('Sorry, I could not generate an explanation at this time.');
    } finally {
      setIsExplaining(false);
    }
  };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (popupPosition && articleContentRef.current && !articleContentRef.current.contains(target as Node) && !target.closest('.explain-popup-button')) {
                setSelectedText('');
                setPopupPosition(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [popupPosition]);

    const LanguageToggle = () => (
      <div className="flex items-center space-x-2 mb-4">
          <span className={`text-sm font-medium ${displayLanguage === 'en' ? 'text-white' : 'text-gray-400'}`}>English</span>
          <button
              type="button"
              onClick={() => setDisplayLanguage(lang => lang === 'ja' ? 'en' : 'ja')}
              className={`${displayLanguage === 'ja' ? 'bg-orange-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
              role="switch"
              aria-checked={displayLanguage === 'ja'}
          >
              <span
                  aria-hidden="true"
                  className={`${displayLanguage === 'ja' ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
          </button>
          <span className={`text-sm font-medium ${displayLanguage === 'ja' ? 'text-white' : 'text-gray-400'}`}>日本語</span>
      </div>
  );

  const contentToDisplay = displayLanguage === 'ja' ? translatedContent : originalContent;

  return (
    <div className="bg-gray-800 rounded-lg p-6 sm:p-8 animate-fade-in">
      <button onClick={onBack} className="mb-6 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Back to List
      </button>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-orange-300 mb-2">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{article.translatedTitle || article.title}</a>
      </h1>
       <div className="mb-6 text-sm text-gray-500 flex items-center space-x-4">
          <span>{article.score} points by {article.by}</span>
          <a href={`https://news.ycombinator.com/item?id=${article.id}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 hover:underline">
              {article.descendants} comments
          </a>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        {isTranslating && (
             <div className="flex flex-col justify-center items-center h-40">
                <Spinner size="h-12 w-12" />
                <p className="mt-4 text-gray-400">記事を翻訳中...</p>
            </div>
        )}

        {translationError && <ErrorDisplay message={translationError} />}
        
        {contentToDisplay && (
            <div className="relative" ref={articleContentRef}>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-300 mb-4">AIによる記事翻訳</h2>
                  <LanguageToggle />
                </div>
                <div 
                    className="prose-custom text-lg text-gray-300 leading-relaxed select-text"
                    onMouseUp={handleMouseUp}
                    dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(contentToDisplay) : contentToDisplay }}
                />

                {popupPosition && (
                <button
                    onClick={handleExplainClick}
                    className="absolute bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in-fast explain-popup-button"
                    style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px`, transform: 'translateX(-50%)' }}
                >
                    <ExplanationIcon/> Explain
                </button>
                )}
            </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <h2 className="text-2xl font-bold text-gray-300 mb-4">AIによるコメント要約</h2>
        {isSummarizingComments && (
            <div className="flex flex-col justify-center items-center h-40">
                <Spinner size="h-12 w-12" />
                <p className="mt-4 text-gray-400">Summarizing comments...</p>
            </div>
        )}
        {commentSummaryError && <ErrorDisplay message={commentSummaryError} />}
        {commentSummary && (
             <div 
                className="prose-custom text-lg text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(commentSummary) : commentSummary }}
            />
        )}
      </div>

      {showExplanationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in-fast">
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full relative border border-gray-700 shadow-2xl">
            <button onClick={() => setShowExplanationModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <CloseIcon/>
            </button>
            <h2 className="text-2xl font-bold mb-4 text-blue-300">Explanation</h2>
            {isExplaining ? (
                <div className="flex justify-center items-center h-40">
                    <Spinner size="h-12 w-12" />
                </div>
            ) : (
              <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                <p>{explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsDetail;