import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { AssistantState, UserProfile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function useVoiceAssistant(systemPrompt: string, userProfile: UserProfile) {
  const [state, setState] = useState<AssistantState>('idle');
  const [statusText, setStatusText] = useState('');
  const [isActive, setIsActive] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<any>(null);
  const stateRef = useRef(state);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const [location, setLocation] = useState<string | null>(null);

  // Fetch location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`Latitude: ${latitude.toFixed(4)}, Longitude: ${longitude.toFixed(4)}`);
        },
        (error) => {
          console.warn("Location access denied or failed", error);
        }
      );
    }
  }, []);

  // Construct combined system instruction
  const getFullSystemInstruction = useCallback(() => {
    let instruction = systemPrompt;
    
    const contextParts = [];
    
    // Dynamic Time Context
    const now = new Date();
    contextParts.push(`Current Time: ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}.`);

    // User Profile
    if (userProfile.name) contextParts.push(`The user's name is ${userProfile.name}.`);
    if (userProfile.occupation) contextParts.push(`The user works as or is interested in: ${userProfile.occupation}.`);
    if (userProfile.interests) contextParts.push(`The user's interests include: ${userProfile.interests}.`);
    if (userProfile.additionalContext) contextParts.push(`Additional context about the user: ${userProfile.additionalContext}.`);
    
    // Location Context
    if (location) {
      contextParts.push(`User Location Coordinates: ${location}. Use this for local context (weather, news, local time, etc.) if relevant.`);
    }
    
    if (contextParts.length > 0) {
      instruction += "\n\n--- OPERATIONAL CONTEXT ---\n" + contextParts.join("\n");
      instruction += "\n\nUse Google Search to provide up-to-date information when asked about current events, facts, or local details. Keep responses concise and friendly for voice interaction.";
    }
    
    return instruction;
  }, [systemPrompt, userProfile, location]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setState('listening');
        setStatusText('Listening…');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setStatusText(`You: ${transcript}`);
          processQuery(transcript);
        } else {
          setStatusText('Heard nothing. Please try again.');
          scheduleRestart();
        }
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        
        if (error === 'not-allowed') {
          console.error('Speech recognition permission denied');
          setStatusText('Microphone access denied. Please allow microphone permissions in your browser settings and refresh.');
          setState('error');
          setIsActive(false);
          return;
        }

        if (error === 'no-speech' || error === 'aborted') {
          // These are common and often expected in a voice assistant loop
          console.log(`Speech recognition: ${error}`);
          setStatusText(error === 'no-speech' ? 'Listening...' : '');
          scheduleRestart();
        } else {
          console.error('Speech recognition error:', error);
          setStatusText(`Error: ${error}`);
          setState('error');
          // Wait longer before restarting on real errors to avoid spamming
          setTimeout(() => {
            if (isActiveRef.current) scheduleRestart();
          }, 3000);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still active and not processing/speaking
        if (isActiveRef.current && stateRef.current !== 'processing' && stateRef.current !== 'speaking' && stateRef.current !== 'error') {
          scheduleRestart();
        } else if (!isActiveRef.current) {
           setState('idle');
           setStatusText('');
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('SpeechRecognition API not supported');
      setStatusText('Speech recognition not supported in this browser.');
    }
  }, []);

  // Initialize Gemini Chat
  useEffect(() => {
    try {
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: getFullSystemInstruction(),
          temperature: 0.7,
        },
        tools: [{ googleSearch: {} }] // Enable search grounding
      });
    } catch (e) {
      console.error("Failed to initialize chat", e);
    }
  }, [getFullSystemInstruction]);

  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleRestart = useCallback(() => {
    if (!isActiveRef.current) return;
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    restartTimeoutRef.current = setTimeout(() => {
      restartTimeoutRef.current = null;
      if (isActiveRef.current && stateRef.current !== 'processing' && stateRef.current !== 'speaking') {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          // Ignore error if already started
        }
      }
    }, 500);
  }, []);

  const toggleListening = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      setState('idle');
      setStatusText('Tap anywhere to start');
      window.speechSynthesis.cancel();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    } else {
      setIsActive(true);
      setState('listening');
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    }
  }, [isActive]);

  const processQuery = async (query: string) => {
    if (!chatRef.current) return;
    
    setState('processing');
    setStatusText('Thinking…');

    try {
      const response = await chatRef.current.sendMessage({ message: query });
      const aiResponseText = response.text || 'I could not understand that.';
      setStatusText(`VIVICA: ${aiResponseText}`);
      speak(aiResponseText);
    } catch (error) {
      console.error('API Error:', error);
      setStatusText('Sorry, I encountered an error processing your request.');
      setState('error');
      speak('Sorry, I encountered an error. Please try again.');
    }
  };

  const getPreferredVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.name.includes('Google') && v.name.includes('Female')) || 
           voices.find(v => v.name.includes('Samantha')) ||
           voices.find(v => v.name.includes('Microsoft Zira')) ||
           voices.find(v => v.name.includes('Karen')) ||
           voices[0];
  }, []);

  const speak = (text: string) => {
    setState('speaking');
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    utterance.onend = () => {
      if (isActiveRef.current) {
        setState('listening');
        scheduleRestart();
      } else {
        setState('idle');
      }
    };

    utterance.onerror = () => {
      if (isActiveRef.current) {
        setState('listening');
        scheduleRestart();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const runNewsUpdate = async () => {
    if (!userProfile.rssFeeds || userProfile.rssFeeds.length === 0) {
      setStatusText('No RSS feeds configured. Please add some in settings.');
      speak("You haven't set up any RSS feeds yet. Let's add some in the settings.");
      return;
    }

    setState('processing');
    setStatusText('Fetching articles...');
    
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
        setStatusText('No recent articles found.');
        speak("I couldn't find any recent articles from your feeds.");
        return;
      }

      setStatusText('Curating your update...');
      
      const articlesContext = articles.map((a: any, i: number) => `[${i + 1}] Title: ${a.title}\nSource: ${a.source}\nSummary: ${a.contentSnippet}`).join('');

      const prompt = `Please create a news update based on the following articles.
        
Group them by topic for better organization.
Summarize them concisely. Do not use asterisks or markdown, use pure spoken text.
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
      
      setStatusText(`VIVICA: Curated news update generated.`);
      speak(synthesizedNews);

    } catch (e: any) {
      console.error(e);
      setStatusText('Error fetching news update.');
      speak("I encountered an error trying to fetch your news update.");
    }
  };

  return {
    state,
    statusText,
    isActive,
    toggleListening,
    runNewsUpdate
  };
}
