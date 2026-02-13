import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, LessonInput, AnalysisResult as AnalysisResultType, LessonPlan } from './types';
import Sidebar from './components/Sidebar';
import MathRenderer from './components/MathRenderer';
import GraphTool from './components/GraphTool';
import InputForm from './components/InputForm';
import AnalysisResult from './components/AnalysisResult';
import LessonPlanResult from './components/LessonPlanResult';
import { streamResponse, generateLessonPlan } from './services/geminiService';

type AppMode = 'chat' | 'lesson-plan';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('chat');

  // Chat State
  const initialMessage: Message = {
    id: 'intro',
    role: Role.MODEL,
    text: "Chào em! Thầy là Thầy Long đây. 👋\nThầy có thể giúp gì cho việc học Toán của em hôm nay? Đừng ngại hỏi, nhưng nhớ là thầy sẽ không giải bài tập về nhà hộ đâu nhé, chúng ta sẽ cùng tư duy! 🧠"
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Lesson Plan State
  const [lessonLoading, setLessonLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (mode === 'chat') {
      scrollToBottom();
    }
  }, [messages, mode]);

  // Handle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // New Chat handler
  const handleNewChat = () => {
    setMessages([initialMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: Role.USER,
      text: input,
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    const teacherMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: teacherMsgId,
      role: Role.MODEL,
      text: ''
    }]);

    try {
      const stream = await streamResponse(
        [...messages, newUserMsg],
        input,
        newUserMsg.image
      );

      let fullText = '';

      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => prev.map(msg =>
          msg.id === teacherMsgId ? { ...msg, text: fullText } : msg
        ));
      }
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.id === teacherMsgId
          ? { ...msg, text: "Ôi, thầy bị mất kết nối một chút. Em thử hỏi lại nhé! 😅", isError: true }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLessonPlan = async (data: LessonInput) => {
    setLessonLoading(true);
    setLessonError(null);
    setAnalysisResult(null);
    setLessonPlan(null);

    try {
      const result = await generateLessonPlan(data);
      setAnalysisResult(result.analysis);
      setLessonPlan(result.lessonPlan);
    } catch (err) {
      setLessonError("Có lỗi xảy ra khi tạo giáo án. Vui lòng thử lại sau. (Kiểm tra API Key hoặc kết nối mạng)");
    } finally {
      setLessonLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMath = input.includes('$') || input.includes('\\');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">

      {/* Sidebar - Only visible in Chat mode on mobile, or always on desktop if toggled */}
      <Sidebar
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        onSelectPrompt={(txt) => {
          setInput(txt);
          setMode('chat'); // Switch to chat if prompt selected
        }}
        currentMode={mode}
        onSwitchMode={setMode}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">

        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {mode === 'chat' ? 'Lớp Học Thầy Long' : 'Soạn Giáo Án (AI)'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* New Chat Button (Chat mode only) */}
            {mode === 'chat' && messages.length > 1 && (
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                title="Tạo cuộc trò chuyện mới"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="hidden sm:inline">Mới</span>
              </button>
            )}

            {/* Mode Switcher for Desktop */}
            <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2">
              <button
                onClick={() => setMode('chat')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Hỏi đáp
              </button>
              <button
                onClick={() => setMode('lesson-plan')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'lesson-plan' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                Soạn bài
              </button>
            </div>

            <button
              onClick={() => setIsGraphOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span className="hidden sm:inline">Đồ thị</span>
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle Theme"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">

          {/* CHAT MODE */}
          {mode === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6 pb-20">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2
                    ${msg.role === Role.MODEL
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'}
                  `}>
                    {msg.role === Role.MODEL ? '👨‍🏫' : '🧑‍🎓'}
                  </div>

                  <div className={`
                    max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm
                    ${msg.role === Role.MODEL
                      ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                      : 'bg-blue-600 text-white rounded-tr-none'}
                  `}>
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-3 border border-white/20" />
                    )}
                    <MathRenderer content={msg.text} />
                    {msg.isError && (
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-2 text-xs underline opacity-80 hover:opacity-100"
                      >
                        Tải lại trang
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* LESSON PLAN MODE */}
          {mode === 'lesson-plan' && (
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              <InputForm onSubmit={handleCreateLessonPlan} isLoading={lessonLoading} />

              {lessonError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800 text-center">
                  {lessonError}
                </div>
              )}

              {analysisResult && (
                <div className="animate-fade-in-up">
                  <AnalysisResult data={analysisResult} />
                </div>
              )}

              {lessonPlan && (
                <div className="animate-fade-in-up delay-100">
                  <LessonPlanResult data={lessonPlan} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input Footer (Only valid in Chat Mode) */}
        {mode === 'chat' && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 absolute bottom-0 left-0 right-0 z-10">
            {selectedImage && (
              <div className="relative inline-block mb-2 ml-[max(0px,calc(50%-28rem))]">
                <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-300 dark:border-slate-700" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}

            <div className="max-w-4xl mx-auto flex items-end gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition"
                title="Tải ảnh bài toán"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 4.5L8.812 15.187a1.125 1.125 0 01-1.591 1.591L4.5 14.25" />
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />

              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col border border-transparent focus-within:border-blue-500 transition-colors relative">
                {hasMath && (
                  <div className="w-full px-3 py-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-900/50 rounded-t-xl border-b border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Xem trước công thức
                    </div>
                    <MathRenderer content={input} />
                  </div>
                )}

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi thầy Long... (Gõ $...$ để viết công thức toán)"
                  className={`w-full bg-transparent border-none p-3 max-h-32 min-h-[50px] focus:ring-0 resize-none text-slate-900 dark:text-slate-100 ${hasMath ? 'rounded-b-xl' : 'rounded-xl'}`}
                  rows={1}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className={`
                    p-3 rounded-xl flex items-center justify-center transition-all
                    ${isLoading || (!input.trim() && !selectedImage)
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'}
                  `}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transform rotate-0">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
              Ứng dụng hỗ trợ học tập, hãy tự tư duy trước khi hỏi thầy nhé! 🎓
            </p>
          </div>
        )}

        {/* Graph Modal */}
        <GraphTool isOpen={isGraphOpen} onClose={() => setIsGraphOpen(false)} />

      </div>
    </div>
  );
};

export default App;