import React from 'react';
import { AnalysisResult as AnalysisResultType } from '../types';

interface AnalysisResultProps {
    data: AnalysisResultType;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ data }) => {
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>📊</span> Phân tích & Đánh giá
            </h3>

            <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                        ✅ Đánh giá theo Công văn 5512 & QĐ 3439
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        {data.competencyAssessment.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                        💡 Gợi ý điều chỉnh & Bổ sung
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        {data.suggestions.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AnalysisResult;
