import React, { useState, useEffect, useMemo } from 'react';
import { Orb } from './components/Orb';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { Settings, X, Mic, MicOff, Plus, Trash2, Edit2, Download, User, Save, Check, Rss, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemPrompt, UserProfile } from './types';

const DEFAULT_PROMPTS: SystemPrompt[] = [
  {
    id: 'default',
    name: 'VIVICA Original',
    content: 'You are VIVICA, a helpful and friendly AI assistant. Respond conversationally and keep responses concise for voice interaction.'
  },
  {
    id: 'professional',
    name: 'Professional Assistant',
    content: 'You are a professional assistant. Be formal, efficient, and direct. Focus on task completion and accuracy.'
  },
  {
    id: 'creative',
    name: 'Creative Companion',
    content: 'You are a creative companion. Be expressive, imaginative, and encouraging. Use colorful language and inspire the user.'
  }
];

const INITIAL_PROFILE: UserProfile = {
  name: '',
  occupation: '',
  interests: '',
  additionalContext: ''
};

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'profile' | 'feeds'>('prompts');
  const [newRssFeed, setNewRssFeed] = useState('');
  
  // State for prompts
  const [prompts, setPrompts] = useState<SystemPrompt[]>(() => {
    const saved = localStorage.getItem('vivica_prompts');
    return saved ? JSON.parse(saved) : DEFAULT_PROMPTS;
  });
  const [activePromptId, setActivePromptId] = useState(() => {
    return localStorage.getItem('vivica_active_prompt_id') || 'default';
  });
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null);

  // State for profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('vivica_user_profile');
    return saved ? JSON.parse(saved) : INITIAL_PROFILE;
  });

  const activePrompt = useMemo(() => {
    return prompts.find(p => p.id === activePromptId) || prompts[0];
  }, [prompts, activePromptId]);

  const { state, statusText, isActive, toggleListening, runNewsUpdate } = useVoiceAssistant(activePrompt.content, userProfile);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('vivica_prompts', JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem('vivica_active_prompt_id', activePromptId);
  }, [activePromptId]);

  useEffect(() => {
    localStorage.setItem('vivica_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Prompt actions
  const handleAddPrompt = () => {
    const newPrompt: SystemPrompt = {
      id: crypto.randomUUID(),
      name: 'New Prompt',
      content: ''
    };
    setPrompts([...prompts, newPrompt]);
    setEditingPrompt(newPrompt);
  };

  const handleUpdatePrompt = (updated: SystemPrompt) => {
    setPrompts(prompts.map(p => p.id === updated.id ? updated : p));
    setEditingPrompt(null);
  };

  const handleDeletePrompt = (id: string) => {
    if (id === 'default') return;
    setPrompts(prompts.filter(p => p.id !== id));
    if (activePromptId === id) setActivePromptId('default');
  };

  const handleExportPrompts = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prompts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "vivica_prompts.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="relative w-full h-full bg-transparent overflow-hidden touch-none" onClick={(e) => {
      if ((e.target as HTMLElement).closest('.controls-layer')) return;
      if (!showSettings) toggleListening();
    }}>
      <Orb state={state} />

      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 pointer-events-none controls-layer">
        <div className="flex justify-between items-start pointer-events-auto">
          <div 
            className={`transition-opacity duration-300 max-w-[70vw] px-3 py-2 bg-black/50 backdrop-blur-md rounded-lg text-xs tracking-wide text-white shadow-lg border border-white/5 ${statusText ? 'opacity-100' : 'opacity-0'}`}
          >
            {statusText}
          </div>

          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 rounded-xl border border-white/20 bg-black/40 text-white flex items-center justify-center backdrop-blur-md shadow-lg hover:bg-black/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center pb-8">
          <div className="text-[clamp(24px,5vw,36px)] font-bold tracking-[4px] text-white/90 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] mb-6">
            V I V I C A
          </div>

          <div className="flex gap-4 items-center">
            <button 
              onClick={runNewsUpdate}
              title="Daily News Update"
              disabled={state === 'processing' || state === 'speaking'}
              className="pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
            >
              <Rss className="w-5 h-5 opacity-80" />
            </button>

            <button 
              onClick={toggleListening}
              className={`pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50
                ${isActive ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/60 text-white hover:bg-black/80'}`}
            >
              {isActive ? <Mic className="w-7 h-7 text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]" /> : <MicOff className="w-7 h-7 opacity-60" />}
            </button>
          </div>

          {!isActive && (
            <div className="text-[11px] uppercase tracking-wider text-white/40 mt-6 pointer-events-none text-center">
              Tap mic or screen to start<br/>
              <span className="text-[9px] opacity-60">Active: {activePrompt.name}</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-4 sm:inset-auto sm:top-6 sm:right-6 sm:w-[400px] sm:max-h-[80vh] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-50 controls-layer pointer-events-auto flex flex-col"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('prompts')}
                  className={`text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'prompts' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  Prompts
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  Profile
                </button>
                <button 
                  onClick={() => setActiveTab('feeds')}
                  className={`text-xs font-bold tracking-widest uppercase transition-colors ${activeTab === 'feeds' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  Feeds
                </button>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Content Area */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {activeTab === 'prompts' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Saved Prompts</span>
                    <div className="flex gap-2">
                       <button 
                        onClick={handleExportPrompts}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                        title="Export Prompts"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={handleAddPrompt}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" /> New
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {prompts.map(p => (
                      <div 
                        key={p.id}
                        className={`group p-3 rounded-xl border transition-all ${activePromptId === p.id ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <button 
                            onClick={() => setActivePromptId(p.id)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            <span className={`text-sm font-medium ${activePromptId === p.id ? 'text-white' : 'text-white/60'}`}>
                              {p.name}
                            </span>
                            {activePromptId === p.id && <Check className="w-3.5 h-3.5 text-green-400" />}
                          </button>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingPrompt(p)}
                              className="p-1.5 text-white/40 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {p.id !== 'default' && (
                              <button 
                                onClick={() => handleDeletePrompt(p.id)}
                                className="p-1.5 text-red-400/60 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-white/30 line-clamp-2 italic leading-relaxed">
                          {p.content || "Empty prompt..."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === 'profile' ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold tracking-widest text-white/80 uppercase mb-4 flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Personal Context
                    </h3>
                    <p className="text-[11px] text-white/40 mb-4 leading-relaxed">
                      Vivica uses your profile to personalize her memory and communication style.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Full Name</label>
                      <input 
                        type="text" 
                        value={userProfile.name}
                        onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all"
                        placeholder="Lex Grayson"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Occupation / Primary Interest</label>
                      <input 
                        type="text" 
                        value={userProfile.occupation}
                        onChange={(e) => setUserProfile({...userProfile, occupation: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all"
                        placeholder="Software Engineer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Interests & Hobbies</label>
                      <textarea 
                        value={userProfile.interests}
                        onChange={(e) => setUserProfile({...userProfile, interests: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all min-h-[60px] resize-none"
                        placeholder="Physics, AI Ethics, Jazz Piano..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-widest text-white/40">Additional Context</label>
                      <textarea 
                        value={userProfile.additionalContext || ''}
                        onChange={(e) => setUserProfile({...userProfile, additionalContext: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all min-h-[80px] resize-none"
                        placeholder="Prefer concise explanations, I live in Seattle..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-xs font-bold tracking-widest text-white/80 uppercase mb-4 flex items-center gap-2">
                      <Rss className="w-3.5 h-3.5" /> RSS Feeds
                    </h3>
                    <p className="text-[11px] text-white/40 mb-4 leading-relaxed">
                      Add RSS feeds here. Vivica will read and summarize the latest updates when you request a News Update.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                       <input 
                        type="url" 
                        value={newRssFeed}
                        onChange={(e) => setNewRssFeed(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newRssFeed) {
                            if (!userProfile.rssFeeds?.includes(newRssFeed)) {
                              setUserProfile({...userProfile, rssFeeds: [...(userProfile.rssFeeds || []), newRssFeed]});
                            }
                            setNewRssFeed('');
                          }
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all"
                        placeholder="https://example.com/rss.xml"
                      />
                      <button 
                         onClick={() => {
                           if (newRssFeed && !userProfile.rssFeeds?.includes(newRssFeed)) {
                             setUserProfile({...userProfile, rssFeeds: [...(userProfile.rssFeeds || []), newRssFeed]});
                           }
                           setNewRssFeed('');
                         }}
                         className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold uppercase tracking-wider text-[10px]"
                      >
                        Add
                      </button>
                    </div>

                    <div className="space-y-2">
                      {userProfile.rssFeeds?.map((feed, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent">
                           <span className="text-sm text-white/80 truncate pr-4">{feed}</span>
                           <button 
                             onClick={() => {
                               setUserProfile({
                                 ...userProfile, 
                                 rssFeeds: userProfile.rssFeeds?.filter((_, i) => i !== index)
                               });
                             }}
                             className="p-1.5 text-red-400/60 hover:text-red-400 transition-colors shrink-0"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      ))}
                      
                      {(!userProfile.rssFeeds || userProfile.rssFeeds.length === 0) && (
                        <div className="text-center p-4 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
                          No feeds added yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10 text-center">
               <p className="text-[9px] text-white/20 uppercase tracking-widest">
                 Vivica Voice Assistant • {currentYear}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Prompt Modal */}
      <AnimatePresence>
        {editingPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md controls-layer pointer-events-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-3xl"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center justify-between">
                Edit Prompt
                <button onClick={() => setEditingPrompt(null)}><X className="w-4 h-4 text-white/40 hover:text-white" /></button>
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Prompt Name</label>
                  <input 
                    type="text" 
                    value={editingPrompt.name}
                    onChange={(e) => setEditingPrompt({...editingPrompt, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-white/40">Instruction Content</label>
                  <textarea 
                    value={editingPrompt.content}
                    onChange={(e) => setEditingPrompt({...editingPrompt, content: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/40 transition-all min-h-[200px] resize-y"
                    placeholder="Enter AI instructions here..."
                  />
                </div>

                <button 
                  onClick={() => handleUpdatePrompt(editingPrompt)}
                  className="w-full py-3 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Instructions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
