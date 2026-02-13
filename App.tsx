import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, LessonInput, AnalysisResult as AnalysisResultType, LessonPlan } from './types';
import MathRenderer from './components/MathRenderer';
import GraphTool from './components/GraphTool';
import InputForm from './components/InputForm';
import AnalysisResult from './components/AnalysisResult';
import LessonPlanResult from './components/LessonPlanResult';
import ApiKeyModal from './components/ApiKeyModal';
import { streamResponse, generateLessonPlan } from './services/geminiService';

type AppMode = 'chat' | 'lesson-plan';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('lesson-plan');
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Chat State
  const initialMessage: Message = {
    id: 'intro',
    role: Role.MODEL,
    text: "Chào em! Thầy là Thầy Long đây. 👋\nThầy có thể giúp gì cho việc học Toán của em hôm nay? Đừng ngại hỏi, nhưng nhớ là thầy sẽ không giải bài tập về nhà hộ đâu nhé, chúng ta sẽ cùng tư duy! 🧠"
  };

  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Lesson Plan State
  const [lessonLoading, setLessonLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check API key on mount
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    setHasApiKey(!!key);
    if (!key) {
      // Auto-open modal if no API key
      setApiKeyModalOpen(true);
    }
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (mode === 'chat') {
      scrollToBottom();
    }
  }, [messages, mode]);

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
    if (!hasApiKey) {
      setApiKeyModalOpen(true);
      return;
    }
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
    <div className="min-h-screen bg-[#f0f6ff] font-sans">

      {/* ======== TOP HEADER ======== */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Left — Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">SOẠN GIÁO ÁN NĂNG LỰC SỐ</h1>
              <p className="text-[11px] sm:text-xs text-blue-100 hidden sm:block">Hỗ trợ tích hợp Năng lực số toàn cấp bởi Trần Hoài Thanh</p>
            </div>
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* API Key Button */}
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${hasApiKey
                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                : 'bg-amber-400 hover:bg-amber-500 text-amber-900 shadow-lg animate-pulse'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <span className="hidden sm:inline">
                {hasApiKey ? 'Cấu hình API Key' : 'Lấy API key để sử dụng app'}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Mode Switcher */}
            <div className="hidden md:flex bg-white/15 rounded-xl p-0.5 border border-white/10">
              <button
                onClick={() => setMode('lesson-plan')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'lesson-plan' ? 'bg-white text-blue-700 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              >
                📝 Soạn bài
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white text-blue-700 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              >
                💬 Hỏi đáp
              </button>
            </div>

            {/* Gemini Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-xs text-white/80 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Powered by Gemini
            </div>
          </div>
        </div>

        {/* Mobile Mode Switcher */}
        <div className="md:hidden border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-2 flex gap-1">
            <button
              onClick={() => setMode('lesson-plan')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'lesson-plan' ? 'bg-white text-blue-700 shadow' : 'text-white/80 hover:bg-white/10'}`}
            >
              📝 Soạn bài
            </button>
            <button
              onClick={() => setMode('chat')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white text-blue-700 shadow' : 'text-white/80 hover:bg-white/10'}`}
            >
              💬 Hỏi đáp
            </button>
          </div>
        </div>
      </header>

      {/* ======== MAIN CONTENT ======== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* LESSON PLAN MODE */}
        {mode === 'lesson-plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Form */}
            <div className="lg:col-span-2 space-y-6">
              <InputForm onSubmit={handleCreateLessonPlan} isLoading={lessonLoading} />

              {lessonError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center animate-fade-in-up">
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

            {/* Right Column — Guide & Competencies */}
            <div className="space-y-6">
              {/* Hướng dẫn nhanh */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-base font-bold text-slate-800 mb-4">Hướng dẫn nhanh</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                    <p className="text-sm text-slate-600">Chọn môn học và khối lớp.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-sm text-slate-600">
                        <span className="text-red-500 font-semibold">Bắt buộc: </span>
                        Tải lên file giáo án (.docx hoặc .pdf).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold">Tùy: </span>
                      Tải file PPCT nếu muốn AI tham khảo năng lực cụ thể của trường.
                    </p>
                  </div>
                </div>
              </div>

              {/* Miền năng lực số */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-base font-bold text-slate-800 mb-4 italic">Miền năng lực số</h3>
                <ul className="space-y-2.5">
                  {[
                    'Khai thác dữ liệu và thông tin',
                    'Giao tiếp và Hợp tác',
                    'Sáng tạo nội dung số',
                    'An toàn số',
                    'Giải quyết vấn đề',
                    'Ứng dụng AI'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* API Key Status */}
              {!hasApiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-amber-800 mb-1">Cần API Key</p>
                      <p className="text-xs text-amber-700">Nhấn nút "Lấy API key" ở thanh tiêu đề để cấu hình API Key và bắt đầu sử dụng.</p>
                      <button
                        onClick={() => setApiKeyModalOpen(true)}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                      >
                        Cấu hình API Key →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHAT MODE */}
        {mode === 'chat' && (
          <div className="max-w-4xl mx-auto">
            {/* Chat header bar */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">💬 Hỏi đáp với Thầy Long</h2>
              <div className="flex items-center gap-2">
                {messages.length > 1 && (
                  <button
                    onClick={handleNewChat}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Mới
                  </button>
                )}
                <button
                  onClick={() => setIsGraphOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition border border-indigo-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  Đồ thị
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[60vh] max-h-[65vh] overflow-y-auto p-4 space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2
                    ${msg.role === Role.MODEL
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-200 border-slate-300 text-slate-600'}
                  `}>
                    {msg.role === Role.MODEL ? '👨‍🏫' : '🧑‍🎓'}
                  </div>

                  <div className={`
                    max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm
                    ${msg.role === Role.MODEL
                      ? 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
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

            {/* Chat Input */}
            <div className="mt-4">
              {selectedImage && (
                <div className="relative inline-block mb-2">
                  <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-slate-300" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex items-end gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-500 hover:text-blue-500 bg-white rounded-xl border border-slate-200 transition"
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

                <div className="flex-1 bg-white rounded-xl flex flex-col border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm relative">
                  {hasMath && (
                    <div className="w-full px-3 py-2 text-sm text-slate-600 bg-slate-50 rounded-t-xl border-b border-slate-200 max-h-32 overflow-y-auto">
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
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
                    className={`w-full bg-transparent border-none p-3 max-h-32 min-h-[50px] focus:ring-0 resize-none text-slate-800 ${hasMath ? 'rounded-b-xl' : 'rounded-xl'}`}
                    rows={1}
                  />
                </div>

                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className={`
                    p-3 rounded-xl flex items-center justify-center transition-all
                    ${isLoading || (!input.trim() && !selectedImage)
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'}
                  `}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">
                Ứng dụng hỗ trợ học tập, hãy tự tư duy trước khi hỏi thầy nhé! 🎓
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ======== FOOTER ======== */}
      <footer className="bg-slate-800 text-center py-5 px-4">
        <p className="text-sm text-slate-400 mb-2">
          © {new Date().getFullYear()} Soạn Giáo Án Năng Lực Số — Powered by Google Gemini
        </p>
        <p className="text-sm text-slate-300">
          Mọi thông tin vui lòng liên hệ thầy Long: <span className="font-bold text-white">Zalo:</span> <span className="text-blue-300 font-semibold">0943278804</span>
        </p>
      </footer>

      {/* ======== MODALS ======== */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSave={(key) => setHasApiKey(!!key)}
      />
      <GraphTool isOpen={isGraphOpen} onClose={() => setIsGraphOpen(false)} />
    </div>
  );
};

export default App;
