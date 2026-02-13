import React, { useState } from 'react';
import { LessonInput } from '../types';

interface InputFormProps {
    onSubmit: (data: LessonInput) => void;
    isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
    const [formData, setFormData] = useState<LessonInput>({
        topic: '',
        grade: '',
        duration: '45 phút',
        objectives: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span>📝</span> Thông tin bài dạy
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Tên bài học / Chủ đề
                        </label>
                        <input
                            type="text"
                            name="topic"
                            required
                            value={formData.topic}
                            onChange={handleChange}
                            placeholder="Ví dụ: Phương trình bậc hai một ẩn"
                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 p-2.5"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Lớp
                        </label>
                        <select
                            name="grade"
                            value={formData.grade}
                            onChange={handleChange}
                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 p-2.5"
                        >
                            <option value="">Chọn lớp</option>
                            <option value="10">Lớp 10</option>
                            <option value="11">Lớp 11</option>
                            <option value="12">Lớp 12</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Thời lượng
                        </label>
                        <input
                            type="text"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            placeholder="Ví dụ: 45 phút, 90 phút"
                            className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 p-2.5"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Yêu cầu cần đạt / Mục tiêu đầu vào
                    </label>
                    <textarea
                        name="objectives"
                        rows={3}
                        required
                        value={formData.objectives}
                        onChange={handleChange}
                        placeholder="Ví dụ: Học sinh giải được phương trình bậc hai, ứng dụng vào bài toán thực tế..."
                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 p-2.5"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !formData.topic || !formData.grade}
                    className={`
            w-full py-3 px-4 rounded-xl font-medium text-white transition-all shadow-lg
            ${isLoading || !formData.topic || !formData.grade
                            ? 'bg-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'}
          `}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Đang phân tích và soạn giáo án...
                        </span>
                    ) : (
                        '🚀 Tạo Kế hoạch bài dạy (AI)'
                    )}
                </button>
            </form>
        </div>
    );
};

export default InputForm;
