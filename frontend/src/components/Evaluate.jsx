import React, { useState, useRef } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { 
  UploadCloud, FileSpreadsheet, Play, Activity, 
  CheckCircle2, AlertCircle, BarChart3, RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

export default function Evaluate() {
  // Upload and parsing states
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [targetColumn, setTargetColumn] = useState('');
  const [modelName, setModelName] = useState('Random Forest');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const fileInputRef = useRef(null);

  // Parse CSV headers and rows locally for preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines.length === 0) {
          setError('The uploaded CSV file is empty.');
          return;
        }

        // Helper to split CSV row taking quotes into account
        const parseCSVRow = (text) => {
          let p = '', r = [];
          let q = false;
          for (let i = 0; i < text.length; i++) {
            let c = text[i];
            if (c === '"') {
              q = !q;
            } else if (c === ',' && !q) {
              r.push(p.trim().replace(/^["']|["']$/g, ''));
              p = '';
            } else {
              p += c;
            }
          }
          r.push(p.trim().replace(/^["']|["']$/g, ''));
          return r;
        };

        const headers = parseCSVRow(lines[0]);
        setColumns(headers);

        // Preview first 5 rows
        const rows = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          const values = parseCSVRow(lines[i]);
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] !== undefined ? values[idx] : '';
          });
          rows.push(rowObj);
        }
        
        setPreviewRows(rows);
        setTotalRows(lines.length - 1);

        // Auto-select standard targets if available
        const defaultTarget = headers.find(h => 
          ['target', 'label', 'y', 'class', 'status', 'output'].includes(h.toLowerCase())
        );
        setTargetColumn(defaultTarget || headers[headers.length - 1] || '');

      } catch (err) {
        setError('Failed to parse the CSV file. Please check its formatting.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropFile = e.dataTransfer.files[0];
      const mockEvent = { target: { files: [dropFile] } };
      handleFileChange(mockEvent);
    }
  };

  // POST /evaluate trigger
  const runEvaluation = async () => {
    if (!file || !targetColumn || !modelName) {
      setError('Please select a file, target column, and model.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_name', modelName);
    formData.append('target_column', targetColumn);

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    try {
      const response = await axios.post(`${apiBaseUrl}/evaluate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(response.data);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#5c73ff', '#4754eb', '#3b82f6', '#10b981']
      });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'An error occurred while communicating with the evaluation server. Make sure the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setColumns([]);
    setPreviewRows([]);
    setTotalRows(0);
    setTargetColumn('');
    setResults(null);
    setError(null);
  };

  // Helper to format float values
  const formatMetric = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return (val * 100).toFixed(1) + '%';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <Activity className="text-brand-500 w-8 h-8 animate-pulse" />
            Evaluation Harness
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Train and validate classifier models against custom datasets with instant performance outputs.
          </p>
        </div>
        {results && (
          <button onClick={resetForm} className="btn-secondary text-xs py-2 px-4">
            <RotateCcw className="w-3.5 h-3.5" />
            Evaluate New Dataset
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h4 className="font-bold">Error Encountered</h4>
            <p className="mt-0.5 text-xs text-rose-450 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {!results ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: File drop and configs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3">
                1. Upload & Setup
              </h3>
              
              {/* Drag and Drop Zone */}
              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 bg-slate-950/40 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv"
                    className="hidden"
                  />
                  <UploadCloud className="w-12 h-12 text-slate-600 group-hover:text-brand-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-semibold text-slate-300">Click or Drag CSV here</p>
                  <p className="text-[11px] text-slate-500 mt-1">Supports binary or multi-class tables</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {totalRows.toLocaleString()} rows • {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setFile(null); setColumns([]); setPreviewRows([]); }}
                    className="text-xs text-rose-450 hover:text-rose-400 font-semibold px-2 py-1 hover:bg-rose-950/20 rounded"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Configurations */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Target Column (Label)
                  </label>
                  <select
                    disabled={!file}
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                    className="glass-input w-full text-xs font-semibold disabled:opacity-50"
                  >
                    <option value="" disabled>-- Select Column --</option>
                    {columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Model Classifier
                  </label>
                  <select
                    disabled={!file}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="glass-input w-full text-xs font-semibold disabled:opacity-50"
                  >
                    <option value="Logistic Regression">Logistic Regression (Linear Classifier)</option>
                    <option value="Random Forest">Random Forest (Ensemble Trees)</option>
                    <option value="SVM">Support Vector Machine (SVC)</option>
                    <option value="Gradient Boosting">Gradient Boosting Classifier</option>
                  </select>
                </div>

                <button
                  onClick={runEvaluation}
                  disabled={!file || !targetColumn || isLoading}
                  className="btn-primary w-full mt-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      Evaluating Classifier...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                      Run Model Evaluation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Dataset Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 flex flex-col h-full min-h-[350px]">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-900 pb-3 mb-4">
                2. Dataset Columns & Preview
              </h3>

              {!file ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 font-light border border-dashed border-slate-900 rounded-xl">
                  <FileSpreadsheet className="w-10 h-10 mb-3 text-slate-700" />
                  <p className="text-sm">Upload a CSV dataset to view columns and records.</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1 pb-1">
                    {columns.map(col => (
                      <span 
                        key={col} 
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          col === targetColumn 
                            ? 'bg-brand-500/20 text-brand-400 border-brand-500/30 font-extrabold animate-pulse' 
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {col} {col === targetColumn && ' (Target)'}
                      </span>
                    ))}
                  </div>

                  <div className="flex-1 overflow-x-auto border border-slate-900 rounded-xl">
                    <table className="w-full text-[11px] text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-900">
                          {columns.map(col => (
                            <th 
                              key={col} 
                              className={`p-3 font-bold tracking-wider uppercase text-[10px] ${
                                col === targetColumn ? 'text-brand-400 bg-brand-500/5' : 'text-slate-500'
                              }`}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {previewRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                            {columns.map(col => (
                              <td 
                                key={col} 
                                className={`p-3 max-w-[200px] truncate ${
                                  col === targetColumn ? 'text-brand-350 bg-brand-500/5 font-semibold' : 'text-slate-300'
                                }`}
                              >
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">
                    Showing top 5 rows preview of {totalRows.toLocaleString()} rows total.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-8 animate-fadeIn">
          {/* Evaluation Metadata Banner */}
          <div className="glass-panel px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-brand-600/10 via-slate-900/50 to-indigo-600/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Model Evaluation Success</p>
                <h3 className="text-sm font-bold text-slate-200">
                  {results.model_name} on <span className="text-brand-350">{results.dataset_name}</span>
                </h3>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-450 border-t md:border-t-0 md:border-l border-slate-900 pt-3 md:pt-0 md:pl-6">
              <div>
                Target: <span className="text-slate-200">{targetColumn}</span>
              </div>
              <div>
                Classes: <span className="text-slate-200">{results.classes.join(', ')}</span>
              </div>
              <div>
                Duration: <span className="text-slate-200">{results.run_time_seconds.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Cards metrics metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Accuracy */}
            <div className="glass-panel p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Accuracy</span>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100 glow-text">
                {formatMetric(results.accuracy)}
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                  style={{ width: `${results.accuracy * 100}%` }}
                />
              </div>
            </div>

            {/* Precision */}
            <div className="glass-panel p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Macro Precision</span>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100 glow-text">
                {formatMetric(results.precision)}
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                  style={{ width: `${results.precision * 100}%` }}
                />
              </div>
            </div>

            {/* Recall */}
            <div className="glass-panel p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Macro Recall</span>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100 glow-text">
                {formatMetric(results.recall)}
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" 
                  style={{ width: `${results.recall * 100}%` }}
                />
              </div>
            </div>

            {/* F1 Score */}
            <div className="glass-panel p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Macro F1 Score</span>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100 glow-text">
                {formatMetric(results.f1_score)}
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" 
                  style={{ width: `${results.f1_score * 100}%` }}
                />
              </div>
            </div>

            {/* ROC-AUC */}
            <div className="glass-panel col-span-2 lg:col-span-1 p-5 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">ROC-AUC</span>
              <div className="text-2xl md:text-3xl font-extrabold text-slate-100 glow-text">
                {results.roc_auc !== null ? results.roc_auc.toFixed(3) : 'N/A'}
              </div>
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" 
                  style={{ width: `${(results.roc_auc || 0) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Confusion Matrix Heatmap */}
            <div className="glass-panel p-6 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-200">Confusion Matrix Heatmap</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Rows represent actual labels, columns represent predictions.</p>
              </div>

              <div className="flex flex-col items-center justify-center p-4">
                <div className="relative">
                  {/* Actual Label text */}
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-550 uppercase tracking-widest">
                    Actual
                  </div>
                  
                  {/* Predicted Label text */}
                  <div className="text-center text-[10px] font-bold text-slate-550 uppercase tracking-widest mb-4">
                    Predicted
                  </div>

                  <div className="grid gap-2 border border-slate-900/60 p-2 bg-slate-950/60 rounded-xl" style={{ gridTemplateColumns: `repeat(${results.classes.length}, minmax(80px, 1fr))` }}>
                    {results.confusion_matrix.map((row, rIdx) => 
                      row.map((val, cIdx) => {
                        // Find cell total row sum to calc percentage for shading opacity
                        const rowSum = row.reduce((a, b) => a + b, 0) || 1;
                        const cellRatio = val / rowSum;
                        
                        // Pick background color intensity based on ratio
                        const cellStyle = {
                          backgroundColor: rIdx === cIdx 
                            ? `rgba(92, 115, 255, ${0.1 + cellRatio * 0.75})` // diagonal matches
                            : `rgba(244, 63, 94, ${cellRatio * 0.5})` // non-diagonal errors
                        };

                        return (
                          <div 
                            key={`${rIdx}-${cIdx}`}
                            style={cellStyle}
                            className="h-20 flex flex-col items-center justify-center rounded-lg border border-slate-900 text-center transition-all duration-300 hover:scale-[1.03] group relative cursor-help"
                          >
                            <span className="text-sm font-bold text-slate-100">{val}</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              {((val / rowSum) * 100).toFixed(0)}%
                            </span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 border border-slate-800 p-2 rounded text-[10px] whitespace-nowrap z-20 pointer-events-none shadow-xl text-left">
                              <p><strong>Actual:</strong> {results.classes[rIdx]}</p>
                              <p><strong>Predicted:</strong> {results.classes[cIdx]}</p>
                              <p><strong>Matches:</strong> {val} (out of {rowSum})</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Header/Footer labels */}
                  <div className="grid gap-2 mt-2 text-center" style={{ gridTemplateColumns: `repeat(${results.classes.length}, minmax(80px, 1fr))` }}>
                    {results.classes.map(cls => (
                      <span key={cls} className="text-[10px] font-semibold text-slate-500 truncate">{cls}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ROC Curve Chart */}
            <div className="glass-panel p-6 space-y-6 flex flex-col">
              <div>
                <h3 className="text-base font-bold text-slate-200">ROC Curve (Thresholds Analysis)</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Plots True Positive Rate (TPR) against False Positive Rate (FPR).</p>
              </div>

              <div className="flex-1 min-h-[220px] max-h-[280px]">
                {results.roc_curve_data && results.roc_curve_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={results.roc_curve_data} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="fpr" 
                        type="number"
                        domain={[0, 1]} 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickFormatter={(v) => v.toFixed(1)}
                        label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis 
                        dataKey="tpr" 
                        type="number"
                        domain={[0, 1]} 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickFormatter={(v) => v.toFixed(1)}
                        label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 10 }}
                        labelFormatter={(v) => `FPR: ${Number(v).toFixed(2)}`}
                        formatter={(val) => [`TPR: ${Number(val).toFixed(2)}`, 'ROC']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="tpr" 
                        stroke="#5c73ff" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                      {/* Random guess baseline */}
                      <Line 
                        data={[{fpr: 0, tpr: 0}, {fpr: 1, tpr: 1}]} 
                        dataKey="tpr" 
                        stroke="#475569" 
                        strokeWidth={1} 
                        strokeDasharray="4 4" 
                        dot={false}
                        activeDot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-650 text-xs border border-slate-900 rounded-xl">
                    ROC curve coordinates not available.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Classification Report Table */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-200">Per-Class Classification Report</h3>
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Class Label</th>
                    <th className="p-4 text-right">Precision</th>
                    <th className="p-4 text-right">Recall</th>
                    <th className="p-4 text-right">F1 Score</th>
                    <th className="p-4 text-right">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {Object.entries(results.classification_report).map(([className, metrics]) => {
                    // Filter out non-class averages
                    if (['accuracy', 'macro avg', 'weighted avg'].includes(className)) return null;
                    return (
                      <tr key={className} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 font-bold text-slate-250">{className}</td>
                        <td className="p-4 text-right font-mono">{formatMetric(metrics.precision)}</td>
                        <td className="p-4 text-right font-mono">{formatMetric(metrics.recall)}</td>
                        <td className="p-4 text-right font-mono">{formatMetric(metrics.f1_score || metrics['f1-score'])}</td>
                        <td className="p-4 text-right font-mono text-slate-500">{metrics.support}</td>
                      </tr>
                    );
                  })}
                  {/* Summary metrics */}
                  {results.classification_report['accuracy'] !== undefined && (
                    <tr className="bg-slate-950/40 font-semibold text-slate-250">
                      <td className="p-4">Accuracy</td>
                      <td colSpan={3} className="p-4 text-right font-bold text-brand-350">
                        {formatMetric(results.classification_report.accuracy)}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500">
                        {results.classification_report['macro avg']?.support || results.classification_report['weighted avg']?.support || 'N/A'}
                      </td>
                    </tr>
                  )}
                  {results.classification_report['macro avg'] && (
                    <tr className="hover:bg-slate-900/30 transition-colors font-semibold text-slate-400">
                      <td className="p-4">Macro Average</td>
                      <td className="p-4 text-right font-mono">{formatMetric(results.classification_report['macro avg'].precision)}</td>
                      <td className="p-4 text-right font-mono">{formatMetric(results.classification_report['macro avg'].recall)}</td>
                      <td className="p-4 text-right font-mono">{formatMetric(results.classification_report['macro avg'].f1_score || results.classification_report['macro avg']['f1-score'])}</td>
                      <td className="p-4 text-right font-mono text-slate-500">{results.classification_report['macro avg'].support}</td>
                    </tr>
                  )}
                  {results.classification_report['weighted avg'] && (
                    <tr className="hover:bg-slate-900/30 transition-colors font-semibold text-slate-450">
                      <td className="p-4">Weighted Average</td>
                      <td className="p-4 text-right font-mono">{formatMetric(results.classification_report['weighted avg'].precision)}</td>
                      <td className="p-4 text-right font-mono">{formatMetric(results.classification_report['weighted avg'].recall)}</td>
                      <td className="p-4 text-right font-mono">{formatMetric(results.classification_report['weighted avg'].f1_score || results.classification_report['weighted avg']['f1-score'])}</td>
                      <td className="p-4 text-right font-mono text-slate-500">{results.classification_report['weighted avg'].support}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
