import React, { useState } from 'react';
import { LessonPlan } from '../types';

interface LessonPlanResultProps {
    data: LessonPlan;
}

const LessonPlanResult: React.FC<LessonPlanResultProps> = ({ data }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        // Build human-readable text
        const lines: string[] = [];
        lines.push(`KẾ HOẠCH BÀI DẠY`);
        lines.push(`Bài: ${data.title}`);
        lines.push(`Lớp: ${data.grade}`);
        lines.push('');
        lines.push('I. MỤC TIÊU');
        lines.push(`1. Kiến thức: ${data.objectives.knowledge}`);
        lines.push(`2. Năng lực: ${data.objectives.competence}`);
        lines.push(`3. Phẩm chất: ${data.objectives.quality}`);
        lines.push('');
        lines.push('II. THIẾT BỊ DẠY HỌC & HỌC LIỆU');
        lines.push(data.equipment);
        lines.push('');
        lines.push('III. TIẾN TRÌNH DẠY HỌC');
        data.activities.forEach((act) => {
            lines.push('');
            lines.push(act.name);
            lines.push(`a) Mục tiêu: ${act.objective}`);
            lines.push(`b) Nội dung: ${act.content}`);
            lines.push(`c) Sản phẩm: ${act.product}`);
            lines.push(`d) Tổ chức thực hiện: ${act.organization}`);
        });

        navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {data.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Lớp {data.grade} • KHBD theo Công văn 5512
                    </p>
                </div>
                <button
                    onClick={handleCopy}
                    className={`text-sm px-3 py-1.5 rounded transition flex items-center gap-1.5
                        ${copied
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                >
                    {copied ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            Đã sao chép!
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            Sao chép
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-6">
                {/* I. MỤC TIÊU */}
                <div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                        I. MỤC TIÊU
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-slate-700 dark:text-slate-300">
                        <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">1. Kiến thức: </span>
                            {data.objectives.knowledge}
                        </div>
                        <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">2. Năng lực: </span>
                            {data.objectives.competence}
                        </div>
                        <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">3. Phẩm chất: </span>
                            {data.objectives.quality}
                        </div>
                    </div>
                </div>

                {/* II. THIẾT BỊ DẠY HỌC */}
                <div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                        II. THIẾT BỊ DẠY HỌC & HỌC LIỆU
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300">{data.equipment}</p>
                </div>

                {/* III. TIẾN TRÌNH DẠY HỌC */}
                <div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                        III. TIẾN TRÌNH DẠY HỌC
                    </h4>

                    <div className="space-y-6">
                        {data.activities.map((activity, index) => (
                            <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                                    {activity.name}
                                </div>
                                <div className="p-4 space-y-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <div>
                                        <strong className="block text-slate-900 dark:text-slate-100 mb-1">a) Mục tiêu:</strong>
                                        {activity.objective}
                                    </div>
                                    <div>
                                        <strong className="block text-slate-900 dark:text-slate-100 mb-1">b) Nội dung:</strong>
                                        {activity.content}
                                    </div>
                                    <div>
                                        <strong className="block text-slate-900 dark:text-slate-100 mb-1">c) Sản phẩm:</strong>
                                        {activity.product}
                                    </div>
                                    <div>
                                        <strong className="block text-slate-900 dark:text-slate-100 mb-1">d) Tổ chức thực hiện:</strong>
                                        <div className="whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg mt-1 border border-slate-100 dark:border-slate-800">
                                            {activity.organization}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonPlanResult;

