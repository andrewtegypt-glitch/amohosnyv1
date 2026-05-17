import React, { useState, useRef, useEffect } from "react";
import { Send, ImageIcon, Sparkles, MessageSquarePlus, RefreshCw, Settings, Menu, X, Clock, LogIn, LogOut } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";

// Import the generated image as our avatar!
// @ts-ignore
import hosnyAvatar from './assets/images/hosny_avatar_1779005331675.png';


type Message = {
  role: "user" | "model";
  content: string;
  suggestions?: string[];
};

const TOURIST_QUERIES = [
  "How long did it actually take to build the pyramids?",
  "What is the best way to get to the Pyramids of Giza?",
  "How do you negotiate at Khan el-Khalili?",
  "What should I wear when visiting Cairo?",
  "Can you teach me some basic Egyptian Arabic phrases?",
  "What's the real story behind the Sphinx's missing nose?",
  "Tell me about the history of Alexandria.",
  "What are some must-see places outside of Cairo?",
  "What is the best time of year to visit Egypt?"
];

const LOCAL_QUERIES = [
  "What's the best local spot for Koshary in Downtown?",
  "Give me an Egyptian proverb for someone who talks too much.",
  "Tell me a classic Masry joke.",
  "Can you teach me some essential Egyptian street slang?",
  "Recommend a classic Adel Emam movie.",
  "What's the secret to making good Mahshi?",
  "How to make the perfect cup of Egyptian tea with mint?",
  "What is the best way to avoid traffic on the Ring Road?",
  "Tell me a story about old Cairo."
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userPersona, setUserPersona] = useState<"tourist" | "local">(() => {
     return (localStorage.getItem("hosny_persona") as "tourist" | "local") || "tourist";
  });
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const shuffleSuggestions = (persona: "tourist" | "local" = userPersona) => {
    const queries = persona === "tourist" ? TOURIST_QUERIES : LOCAL_QUERIES;
    const shuffled = [...queries].sort(() => 0.5 - Math.random());
    setRandomSuggestions(shuffled.slice(0, 4));
  };

  useEffect(() => {
    shuffleSuggestions(userPersona);
  }, [userPersona]);

  const togglePersona = (persona: "tourist" | "local") => {
     setUserPersona(persona);
     localStorage.setItem("hosny_persona", persona);
  };

  const startNewChat = () => {
    setMessages([]);
    setSidebarOpen(false);
    shuffleSuggestions(userPersona);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          persona: userPersona,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      setMessages((prev) => [...prev, { 
         role: "model", 
         content: data.reply, 
         suggestions: data.suggestions && Array.isArray(data.suggestions) ? data.suggestions : [] 
      }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "model", content: "Ma2lesh, it seems my internet is acting up! Try again in a minute ya basha." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isIdle = messages.length === 0;

  let activeSuggestions = [...randomSuggestions];
  if (!isIdle) {
     const lastModelMsg = [...messages].reverse().find(m => m.role === 'model');
     if (lastModelMsg && lastModelMsg.suggestions && lastModelMsg.suggestions.length > 0) {
        activeSuggestions = lastModelMsg.suggestions;
     } else {
        activeSuggestions = [];
     }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0a0b0e] text-slate-200 shadow-2xl relative z-20 w-full">
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
         <div className="font-display font-black text-2xl italic text-egypt-gold drop-shadow-md">HOSNY.AI</div>
         <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
           <X size={20} />
         </button>
      </div>
      
      <div className="p-4 border-b border-white/5">
         <button onClick={startNewChat} className="w-full flex justify-center items-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 p-3 rounded-xl font-medium transition-all">
            <MessageSquarePlus size={18} className="text-egypt-gold" />
            <span>Start Fresh</span>
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
         <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-1">Past Interactions</p>
         
         <button className="w-full text-left p-3 rounded-xl bg-transparent border border-transparent hover:border-white/10 hover:bg-white/5 text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-all flex items-center gap-3 group">
            <Clock size={14} className="opacity-50 group-hover:text-egypt-gold group-hover:opacity-100 transition-all shrink-0" />
            <span className="truncate">How long did it actually take...</span>
         </button>
         <button className="w-full text-left p-3 rounded-xl bg-transparent border border-transparent hover:border-white/10 hover:bg-white/5 text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-all flex items-center gap-3 group">
            <Clock size={14} className="opacity-50 group-hover:text-egypt-gold group-hover:opacity-100 transition-all shrink-0" />
            <span className="truncate">Local spot for Koshary...</span>
         </button>
      </div>
      <div className="p-4 border-t border-white/5 mt-auto">
         {currentUser ? (
           <div className="flex items-center gap-3 p-3 w-full border border-white/10 bg-black/40 rounded-xl text-slate-200 mb-2 overflow-hidden shadow-inner">
             {currentUser.photoURL ? (
               <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-egypt-gold/50" />
             ) : (
               <div className="w-8 h-8 rounded-full bg-egypt-gold/20 flex items-center justify-center text-egypt-gold font-bold">{currentUser.email?.[0].toUpperCase()}</div>
             )}
             <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Traveler'}</p>
               <p className="text-[10px] text-slate-400 truncate tracking-tight">{currentUser.email}</p>
             </div>
             <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Sign Out">
               <LogOut size={16} />
             </button>
           </div>
         ) : (
           <button onClick={handleSignIn} className="flex items-center justify-center gap-3 p-3 w-full border border-egypt-gold/30 hover:border-egypt-gold/60 bg-egypt-gold/10 hover:bg-egypt-gold/20 rounded-xl text-egypt-gold transition-all mb-2 shadow-[0_0_15px_rgba(197,160,89,0.1)]">
             <LogIn size={18} />
             <span className="text-sm font-bold tracking-wide">Sign In to Save</span>
           </button>
         )}

         <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 p-3 w-full border border-transparent hover:border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
            <Settings size={18} className="text-egypt-gold" />
            <span className="text-sm font-medium">Settings</span>
         </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-egypt-dark text-slate-200 font-sans overflow-hidden">
      {/* Dynamic Keyframes for Smoke */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes smoke-flow {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; filter: blur(4px); }
          20% { opacity: 0.8; filter: blur(6px); }
          100% { transform: translate(40px, -150px) scale(4); opacity: 0; filter: blur(12px); }
        }
        .smoke-puff {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(220, 220, 230, 0.95) 0%, rgba(200, 200, 200, 0) 70%);
          pointer-events: none;
        }
      `}} />

      {/* Global Sidebar Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-300 pointer-events-none",
          sidebarOpen ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none transition-opacity",
            sidebarOpen && "pointer-events-auto"
          )} 
          onClick={() => setSidebarOpen(false)} 
        />
        
        {/* Sidebar Panel */}
        <aside 
          className={cn(
            "absolute inset-y-0 left-0 w-[80vw] sm:w-[320px] max-w-[320px] transform transition-transform duration-300 ease-in-out pointer-events-auto shadow-[20px_0_50px_rgba(0,0,0,0.5)]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </aside>
      </div>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative w-full h-full min-h-0 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 0%, var(--color-egypt-bg) 0%, var(--color-egypt-dark) 100%)' }}>
        
        {/* Settings Modal */}
        {settingsOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-sm shadow-2xl" onClick={() => setSettingsOpen(false)} />
             <div className="relative bg-[#111318] border border-white/10 rounded-2xl w-full max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                   <h2 className="text-xl font-display font-medium text-slate-200">Settings</h2>
                   <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
                     <X size={20} />
                   </button>
                </div>
                <div className="p-6 space-y-6">
                   <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3">Who are you?</h3>
                      <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
                         <button 
                           onClick={() => togglePersona("tourist")}
                           className={cn(
                             "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                             userPersona === "tourist" ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                           )}
                         >
                           Tourist
                         </button>
                         <button 
                           onClick={() => togglePersona("local")}
                           className={cn(
                             "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                             userPersona === "tourist" ? "text-slate-500 hover:text-slate-300" : "bg-white/10 text-white shadow-sm"
                           )}
                         >
                           Local Egyptian
                         </button>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                         {userPersona === "tourist" ? "Suggested prompts will cater to travel, history, and advice." : "Suggested prompts will cater to street smarts, slang, and local culture."}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Ambient Glow */}
        <div className="absolute inset-x-0 top-0 h-96 bg-egypt-gold/5 blur-[100px] pointer-events-none" />

        {/* Universal Sticky Header (Always Present) */}
        <header className="flex-none w-full p-4 flex items-center justify-between z-40 relative border-b border-transparent">
            <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="text-slate-200 p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all shadow-sm">
                    <Menu size={20} />
                </button>
                <div className="text-egypt-gold font-display font-black text-xl sm:text-2xl italic drop-shadow-md cursor-pointer tracking-wider ml-2" onClick={startNewChat}>
                    Hosny.AI
                </div>
            </div>
            
            <button 
                onClick={startNewChat} 
                className="text-egypt-dark p-2 sm:px-4 sm:py-2 bg-egypt-gold rounded-xl hover:bg-egypt-gold-light active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(197,160,89,0.4)]"
                title="New Conversation"
            >
                <MessageSquarePlus size={20} />
                <span className="hidden sm:inline text-sm font-bold tracking-widest uppercase">New Chat</span>
            </button>
        </header>

        {/* Main Scrollable Area */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 z-10 w-full flex flex-col px-4 sm:px-8 custom-scroll">
            <style dangerouslySetInnerHTML={{ __html: `
              .custom-scroll {
                 mask-image: linear-gradient(to bottom, transparent, black 1rem, black calc(100% - 1rem), transparent);
                 -webkit-mask-image: linear-gradient(to bottom, transparent, black 1rem, black calc(100% - 1rem), transparent);
              }
            `}} />
            
            <div className={cn(
                "flex-1 w-full max-w-4xl mx-auto flex flex-col",
                isIdle && "justify-center"
            )}>
                {/* Dynamic Avatar Region */}
                <div className={cn(
                    "flex-none flex flex-col items-center transition-all duration-700 ease-in-out shrink-0 z-20 relative w-full",
                    isIdle ? "py-4 sm:py-8" : "pt-4 pb-6"
                )}>
                   <div className={cn("relative transition-all duration-700 ease-in-out", isIdle ? "w-48 h-48 sm:w-[280px] sm:h-[280px]" : "w-16 h-16 sm:w-20 sm:h-20")}>
                      {/* Image Bubble */}
                      <img 
                         src={hosnyAvatar} 
                         alt="Amo Hosny" 
                         className="w-full h-full object-cover rounded-full border-[3px] sm:border-4 border-egypt-gold shadow-[0_0_40px_rgba(197,160,89,0.3)] bg-[#111318]" 
                      />

                      {/* Shisha Loading Animation overlying Avatar */}
                      <div className={cn(
                          "absolute right-0 bottom-0 z-40 transition-opacity duration-500",
                          isLoading ? "opacity-100" : "opacity-0 pointer-events-none",
                          isIdle ? "translate-x-[15%] translate-y-[10%]" : "translate-x-[30%] translate-y-[20%]"
                       )}>
                         {/* Shisha Base Emoji */}
                         <div className={cn("absolute z-50 drop-shadow-2xl", isIdle ? "text-6xl -bottom-2 -left-10" : "text-3xl -bottom-1 -left-6")}>🏺</div>
                         
                         {/* Bellowing Smoke Particles */}
                         <div className="absolute bottom-6 right-0">
                             {[...Array(8)].map((_, i) => (
                                 <div key={i} className="smoke-puff" style={{
                                     width: isIdle ? '45px' : '20px', 
                                     height: isIdle ? '45px' : '20px',
                                     bottom: 0,
                                     right: 0,
                                     animation: `smoke-flow ${2.5 + Math.random() * 1.5}s infinite ease-out ${i * 0.3}s`
                                 }} />
                             ))}
                         </div>
                      </div>
                   </div>

                   {/* Welcome Text */}
                   {isIdle && (
                      <div className="mt-8 text-center animate-fade-in transition-opacity">
                         <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent mb-4 tracking-tight drop-shadow-md">
                            Ahlan Ya Habibi!
                         </h1>
                         <p className="text-slate-400 text-sm sm:text-base max-w-sm mx-auto leading-relaxed px-4">
                            I am your Uncle Hosny. Ask me about local history, advice, or just for a good laugh.
                         </p>
                      </div>
                   )}
                </div>

                {!isIdle && (
                    <div className="flex flex-col w-full space-y-6 sm:space-y-8 flex-1 pb-4">
                   {messages.map((msg, idx) => (
                      <div key={idx} className={cn("flex flex-col w-full", msg.role === "user" ? "items-end" : "items-start")}>
                        <span className="text-[10px] text-slate-400 tracking-widest uppercase font-mono mb-1.5 px-2">
                           {msg.role === "user" ? "You" : "Amo Hosny"}
                        </span>
                        <div className={cn(
                          "p-4 sm:p-5 rounded-3xl shadow-lg leading-relaxed text-sm sm:text-base max-w-[95%] sm:max-w-[85%]",
                          msg.role === "user" 
                            ? "bg-white/10 border border-white/20 text-white rounded-tr-sm backdrop-blur-md" 
                            : "bg-[#161a22]/80 border border-egypt-gold/20 text-slate-200 rounded-tl-sm backdrop-blur-md shadow-[0_5px_30px_rgba(0,0,0,0.3)]"
                        )}>
                          {msg.role === "user" ? (
                            msg.content
                          ) : (
                            <div className="markdown-body prose prose-invert prose-p:text-slate-200 prose-a:text-egypt-gold hover:prose-a:text-egypt-gold-light max-w-none marker:text-egypt-gold">
                              <ReactMarkdown components={{
                                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-egypt-gold/50 hover:decoration-egypt-gold transition-colors" />
                              }}>{msg.content}</ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                   ))}
                   <div ref={messagesEndRef} className="h-6" />
                </div>
            )}
            </div>
        </div>

        {/* Persistent Input Footer */}
        <footer className="flex-none p-4 sm:p-6 w-full bg-egypt-dark border-t border-white/5 relative z-40 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
           <div className="max-w-3xl mx-auto flex flex-col">
              
              {/* Contextual Suggestions Above Input */}
              {activeSuggestions.length > 0 && !isLoading && (
                 <div className="mb-4 flex flex-nowrap gap-2 sm:gap-3 overflow-x-auto hide-scrollbar pb-2 sm:pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <style dangerouslySetInnerHTML={{ __html: `
                      .hide-scrollbar::-webkit-scrollbar { display: none; }
                      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}} />
                    {activeSuggestions.map((suggestion, sIdx) => (
                       <button
                         key={sIdx}
                         onClick={() => sendMessage(suggestion)}
                         className="whitespace-nowrap flex items-center gap-2 text-xs text-egypt-gold bg-egypt-gold/5 border border-egypt-gold/20 hover:border-egypt-gold/50 hover:bg-egypt-gold/15 px-4 py-2.5 rounded-full transition-all shadow-sm shrink-0 font-medium tracking-wide"
                       >
                         <Sparkles size={14} className="opacity-80" />
                         {suggestion}
                       </button>
                    ))}
                 </div>
              )}

              {/* Input Box */}
              <div className="relative flex items-center gap-2 bg-black/60 rounded-full shadow-inner border border-white/10 focus-within:border-egypt-gold/50 focus-within:ring-1 focus-within:ring-egypt-gold/50 transition-all p-1.5 focus-within:bg-black/80">
                 <button 
                    type="button"
                    className="p-3 text-slate-400 hover:text-egypt-gold transition-colors rounded-full shrink-0 group"
                    title="Upload picture"
                 >
                    <ImageIcon size={22} className="group-hover:scale-110 transition-transform" />
                 </button>
                 
                 <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isLoading ? "Amo Hosny is thinking..." : "Ask Amo Hosny..."}
                    className="w-full bg-transparent px-2 sm:px-3 py-3 outline-none text-slate-200 placeholder:text-slate-500 text-[15px] sm:text-base font-light transition-all"
                    disabled={isLoading}
                 />
                 
                 <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-egypt-gold text-egypt-dark hover:bg-egypt-gold-light rounded-full shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(197,160,89,0.3)] mr-1 group font-bold relative overflow-hidden"
                 >
                    {!isLoading ? (
                       <Send size={18} className="translate-x-[2px] group-hover:scale-110 transition-transform" />
                    ) : (
                       <RefreshCw size={18} className="animate-spin text-egypt-dark" />
                    )}
                 </button>
              </div>

              {/* Tagline */}
              {!isIdle && (
                 <p className="text-center text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-4 mb-1 opacity-50 hidden sm:block">
                    Engineered with Gemini for the Egyptian Soul
                 </p>
              )}
           </div>
        </footer>
      </main>
    </div>
  );
}
