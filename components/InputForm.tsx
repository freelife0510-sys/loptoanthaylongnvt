import React, { useState, useRef } from 'react';
import { LessonInput } from '../types';

interface InputFormProps {
    onSubmit: (data: LessonInput) => void;
    isLoading: boolean;
}

const SUBJECTS = [
    'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học',
    'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Công nghệ', 'Âm nhạc',
    'Mỹ thuật', 'Thể dục'
];

const GRADES = [
    'Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5',
    'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9',
    'Lớp 10', 'Lớp 11', 'Lớp 12'
];

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState<LessonInput>({
        subject: 'Toán',
        topic: '',
        grade: 'Lớp 7',
        duration: '45 phút',
        objectives: ''
    });

    const [lessonFileName, setLessonFileName] = useState<string>('');
    const [ppctFileName, setPpctFileName] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const lessonFileRef = useRef<HTMLInputElement>(null);
    const ppctFileRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLessonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, lessonFile: file }));
            setLessonFileName(file.name);
        }
    };

    const handlePpctFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, ppctFile: file }));
            setPpctFileName(file.name);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.subject || !formData.grade) return;
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Thông tin Kế hoạch bài dạy */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                    Thông tin Kế hoạch bài dạy
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">
                            Môn học
                        </label>
                        <select
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition appearance-none cursor-pointer"
                        >
                            {SUBJECTS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1.5">
                            Khối lớp
                        </label>
                        <select
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition appearance-none cursor-pointer"
                        >
                            {GRADES.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tài liệu đầu vào */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                    Tài liệu đầu vào
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* File Giáo án */}
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">
                            <span className="text-red-500">*</span> File Giáo án
                        </p>
                        <div
                            onClick={() => lessonFileRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-blue-50/50 group min-h-[180px]"
                        >
                            <input
                                type="file"
                                ref={lessonFileRef}
                                className="hidden"
                                accept=".docx,.pdf"
                                onChange={handleLessonFile}
                            />
                            {lessonFileName ? (
                                <>
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-green-600">
                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 text-center">{lessonFileName}</p>
                                    <p className="text-xs text-blue-500 mt-1 hover:underline">Đổi file</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">Tải lên Giáo án</p>
                                    <p className="text-xs text-slate-400 mt-1 text-center">Giáo án bài dạy cần tích hợp</p>
                                    <p className="text-xs text-blue-500 mt-2">Hỗ trợ .docx, .pdf</p>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm.75-10.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zM8 12a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            Bắt buộc
                        </p>
                    </div>

                    {/* File PPCT */}
                    <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">
                            File Phân phối chương trình
                        </p>
                        <div
                            onClick={() => ppctFileRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-blue-50/50 group min-h-[180px]"
                        >
                            <input
                                type="file"
                                ref={ppctFileRef}
                                className="hidden"
                                accept=".docx,.pdf"
                                onChange={handlePpctFile}
                            />
                            {ppctFileName ? (
                                <>
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-green-600">
                                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 text-center">{ppctFileName}</p>
                                    <p className="text-xs text-blue-500 mt-1 hover:underline">Đổi file</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">Tải lên PPCT</p>
                                    <p className="text-xs text-slate-400 mt-1 text-center">Tài liệu tham khảo năng lực (nếu có)</p>
                                    <p className="text-xs text-blue-500 mt-2">Hỗ trợ .docx, .pdf</p>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5">
                            Tùy chọn. Giúp AI xác định năng lực chính xác hơn.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tùy chọn nâng cao */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Tùy chọn nâng cao
                    </span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className={`w-4 h-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                {showAdvanced && (
                    <div className="px-6 pb-5 space-y-4 border-t border-slate-100 pt-4 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    Tên bài học / Chủ đề
                                </label>
                                <input
                                    type="text"
                                    name="topic"
                                    value={formData.topic}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: Phương trình bậc hai..."
                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                    Thời lượng
                                </label>
                                <input
                                    type="text"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    placeholder="45 phút, 90 phút..."
                                    className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                Yêu cầu cần đạt / Mục tiêu
                            </label>
                            <textarea
                                name="objectives"
                                rows={3}
                                value={formData.objectives}
                                onChange={handleChange}
                                placeholder="Mô tả yêu cầu cần đạt, mục tiêu bài học..."
                                className="w-full rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 p-3 transition text-sm resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Submit button */}
            <button
                type="submit"
                disabled={isLoading || !formData.subject || !formData.grade}
                className={`
                    w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all shadow-lg text-base
                    ${isLoading || !formData.subject || !formData.grade
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/25 active:scale-[0.98]'}
                `}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang phân tích và soạn giáo án...
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                        Soạn giáo án năng lực số (AI)
                    </span>
                )}
            </button>
        </form>
    );
};

export default InputForm;
