import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function useNewsUpdate(systemPrompt: string, userProfile: UserProfile, speak: (text: string) => void) {
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [newsStatus, setNewsStatus] = useState('');

  const runNewsUpdate = async () => {
    if (!userProfile.rssFeeds || userProfile.rssFeeds.length === 0) {
      speak("You haven't set up any RSS feeds yet. Let's add some in the settings.");
      return;
    }

    setIsFetchingNews(true);
    setNewsStatus('Fetching articles...');
    
    try {
      const response = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: userProfile.rssFeeds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch RSS feeds');
      }

      const { articles } = await response.json();
      
      if (!articles || articles.length === 0) {
        speak("I couldn't find any recent articles from your feeds.");
        setIsFetchingNews(false);
        return;
      }

      setNewsStatus('Curating your update...');
      
      const articlesContext = articles.map((a: any, i: number) => `[${i + 1}] Title: ${a.title}\nSource: ${a.source}\nSummary: ${a.contentSnippet}`).join('');

      const prompt = `Please create a news update based on the following articles.
        
Group them by topic for better organization.
Summarize them concisely.
Deliver it as a spoken update, reflecting the following personality:

--- PERSONALITY / SYSTEM PROMPT ---
${systemPrompt}

--- USER CONTEXT ---
Name: ${userProfile.name}
Interests: ${userProfile.interests}

--- ARTICLES TO SUMMARIZE ---
${articlesContext}
`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const synthesizedNews = aiResponse.text || "I've reviewed your news, but I'm having trouble putting it into words at the moment.";
      
      setNewsStatus('');
      speak(synthesizedNews);

    } catch (e: any) {
      console.error(e);
      setNewsStatus('');
      speak("I encountered an error trying to fetch your news update.");
    } finally {
      setIsFetchingNews(false);
    }
  };

  return { runNewsUpdate, isFetchingNews, newsStatus };
}
