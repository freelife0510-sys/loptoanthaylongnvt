import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { GraphDataPoint } from '../types';

interface GraphToolProps {
  isOpen: boolean;
  onClose: () => void;
}

const GraphTool: React.FC<GraphToolProps> = ({ isOpen, onClose }) => {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [type, setType] = useState<'linear' | 'quadratic'>('quadratic');

  // Generate data points for the graph
  const data: GraphDataPoint[] = useMemo(() => {
    const points: GraphDataPoint[] = [];
    // Range from -10 to 10
    for (let x = -10; x <= 10; x += 0.5) {
      let y = 0;
      if (type === 'quadratic') {
        y = a * (x * x) + b * x + c;
      } else {
        y = a * x + b;
      }
      points.push({ x, y });
    }
    return points;
  }, [a, b, c, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-blue-400 flex items-center gap-2">
            📊 Công Cụ Vẽ Đồ Thị
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50">
           <div>
             <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Dạng hàm số</label>
             <select 
               value={type} 
               onChange={(e) => setType(e.target.value as 'linear' | 'quadratic')}
               className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
             >
               <option value="linear">Bậc nhất (y = ax + b)</option>
               <option value="quadratic">Bậc hai (y = ax² + bx + c)</option>
             </select>
           </div>
           
           <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-slate-500">Hệ số a</label>
                <input type="number" value={a} onChange={(e) => setA(Number(e.target.value))} className="w-full p-2 text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1 text-slate-500">Hệ số b</label>
                <input type="number" value={b} onChange={(e) => setB(Number(e.target.value))} className="w-full p-2 text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
              </div>
              {type === 'quadratic' && (
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 text-slate-500">Hệ số c</label>
                  <input type="number" value={c} onChange={(e) => setC(Number(e.target.value))} className="w-full p-2 text-sm rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white" />
                </div>
              )}
           </div>
        </div>

        {/* Formula Display */}
        <div className="px-4 py-2 text-center">
          <code className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-blue-600 dark:text-blue-400 font-mono font-bold">
            y = {a}x{type === 'quadratic' ? <sup>2</sup> : ''} {b >= 0 ? '+' : ''} {b}x {type === 'quadratic' ? (c >= 0 ? '+' : '') + c : ''}
          </code>
        </div>

        {/* Chart Area */}
        <div className="flex-1 min-h-[300px] p-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.2} />
              <XAxis 
                dataKey="x" 
                type="number" 
                domain={['auto', 'auto']} 
                allowDataOverflow 
                stroke="#64748b" 
              />
              <YAxis 
                stroke="#64748b"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#60a5fa' }}
                labelFormatter={(v) => `x: ${v}`}
                formatter={(value: number) => [value.toFixed(2), 'y']}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
              <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={2} />
              <Line 
                type="monotone" 
                dataKey="y" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={false}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default GraphTool;
