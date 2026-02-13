import React from 'react';
import { MOCK_TOPICS } from '../constants';

type AppMode = 'chat' | 'lesson-plan';

interface SidebarProps {
  onSelectPrompt: (prompt: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  currentMode: AppMode;
  onSwitchMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectPrompt, isOpen, onCloseMobile, currentMode, onSwitchMode }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`
          fixed md:relative z-30 
          w-72 h-full 
          bg-slate-900 text-slate-100 
          border-r border-slate-700 
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xl shadow-lg shadow-blue-900/50">
              🧮
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Thầy Long Math</h1>
              <p className="text-xs text-slate-400">Trợ lý Toán học AI</p>
            </div>
          </div>
        </div>

        {/* Mobile Mode Switcher */}
        <div className="sm:hidden p-3 border-b border-slate-700">
          <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => { onSwitchMode('chat'); onCloseMobile(); }}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${currentMode === 'chat' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              💬 Hỏi đáp
            </button>
            <button
              onClick={() => { onSwitchMode('lesson-plan'); onCloseMobile(); }}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${currentMode === 'lesson-plan' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              📝 Soạn bài
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {MOCK_TOPICS.map((topic) => (
            <div key={topic.id}>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3 px-2">
                {topic.title}
              </h3>
              <div className="space-y-1">
                {topic.prompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectPrompt(prompt);
                      onCloseMobile();
                    }}
                    className="w-full text-left p-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors duration-200 line-clamp-1"
                    title={prompt}
                  >
                    • {prompt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
          © {new Date().getFullYear()} MathTutor Long <br /> Powered by Gemini
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
