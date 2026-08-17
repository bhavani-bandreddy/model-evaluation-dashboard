import React, { useState, useEffect } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { 
  Database, Activity, Award, CheckCircle2, AlertCircle, 
  BarChart3, RotateCcw, Sparkles, TrendingUp, Info, HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';

export default function Dashboard() {
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [selectedModel, setSelectedModel] = useState('Random Forest');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const fetchData = async (showConfetti = false) => {
    try {
      setError(null);
      
      // Fetch dataset info
      const datasetRes = await axios.get(`${apiBaseUrl}/api/dataset`);
      setDatasetInfo(datasetRes.data);

      // Fetch all evaluation results
      const evalRes = await axios.get(`${apiBaseUrl}/api/evaluation`);
      setEvaluationData(evalRes.data);

      // Set default selected model if present
      if (evalRes.data && evalRes.data.best_model) {
        setSelectedModel(evalRes.data.best_model.model_name || 'Random Forest');
      }

      if (showConfetti) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#5c73ff', '#4754eb', '#3b82f6', '#10b981']
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to connect to the backend server. Please verify the FastAPI backend is running.'
      );
    } finally {
      setIsLoading(false);
      setIsRetraining(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetrain = () => {
    setIsRetraining(true);
    fetchData(true);
  };

  const formatMetric = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return (val * 100).toFixed(1) + '%';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Training ML models and generating evaluations...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-350 max-w-2xl mx-auto space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 shrink-0 text-rose-400" />
          <div>
            <h4 className="font-bold text-base">Connection Failed</h4>
            <p className="mt-1 text-sm leading-relaxed">{error}</p>
          </div>
        </div>
        <button onClick={() => { setIsLoading(true); fetchData(); }} className="btn-primary py-2 px-4 text-xs font-semibold">
          Retry Connection
        </button>
      </div>
    );
  }

  const { models, best_model } = evaluationData;
  const activeModelData = models[selectedModel];

  // Prepare data for the Bar Chart comparison
  const chartData = Object.entries(models).map(([name, data]) => ({
    name,
    F1: parseFloat((data.f1_score * 100).toFixed(1)),
    Accuracy: parseFloat((data.accuracy * 100).toFixed(1)),
    Precision: parseFloat((data.precision * 100).toFixed(1)),
    Recall: parseFloat((data.recall * 100).toFixed(1)),
  }));

  const modelDescriptions = {
    'Logistic Regression': 'A fundamental linear model utilizing L2 regularization. Fast, interpretable baseline.',
    'Random Forest': 'An ensemble classifier of decision trees. Exceptional at capturing complex interactions and robust to overfitting.',
    'SVM': 'Support Vector Machine classifier maximizing decision margin. Uses probability calibration to plot thresholds.',
    'Gradient Boosting': 'Boosted decision tree sequential model. Minimizes classification loss gradient-by-gradient.'
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <Activity className="text-brand-500 w-8 h-8" />
            Model Evaluation Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Analyze and compare machine learning classifiers trained on the labeled dataset.
          </p>
        </div>
        <button 
          onClick={handleRetrain} 
          disabled={isRetraining}
          className="btn-secondary text-xs py-2 px-4 flex items-center gap-2"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
          {isRetraining ? 'Retraining...' : 'Retrain ML Models'}
        </button>
      </div>

      {/* Dataset & Best Model KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dataset Info */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden">
          <div className="absolute right-3 top-3 text-slate-700">
            <Database className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Dataset</span>
          <div className="text-xl font-extrabold text-slate-200 truncate">
            {datasetInfo.dataset_name}
          </div>
          <div className="text-xs text-slate-400 flex justify-between">
            <span>Records: <strong>{datasetInfo.records}</strong></span>
            <span>Features: <strong>{datasetInfo.features_count}</strong></span>
          </div>
        </div>

        {/* Train/Test Split */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden">
          <div className="absolute right-3 top-3 text-slate-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Train / Test Split</span>
          <div className="text-2xl font-extrabold text-slate-200">
            80% / 20%
          </div>
          <div className="text-xs text-slate-400 flex justify-between">
            <span>Train size: <strong>{datasetInfo.train_samples}</strong></span>
            <span>Test size: <strong>{datasetInfo.test_samples}</strong></span>
          </div>
        </div>

        {/* Best Model Highlight */}
        <div className="glass-panel p-5 space-y-3 border-brand-500/40 bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-brand-950/20 relative overflow-hidden">
          <div className="absolute right-3 top-3 text-brand-400">
            <Award className="w-5 h-5 animate-bounce" />
          </div>
          <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block">Best Classifier</span>
          <div className="text-xl font-extrabold text-slate-100 glow-text">
            {best_model.model_name}
          </div>
          <div className="text-xs text-slate-300 flex items-center justify-between">
            <span>Score (F1): <strong>{formatMetric(best_model.score)}</strong></span>
            <span className="bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded text-[9px] font-bold">Metric: F1</span>
          </div>
        </div>

        {/* Class Distribution */}
        <div className="glass-panel p-5 space-y-3 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Target Distribution</span>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-300 flex justify-between mb-1">
                <span>Approved (1)</span>
                <span>50%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-500" style={{ width: '50%' }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-slate-300 flex justify-between mb-1">
                <span>Not Approved (0)</span>
                <span>50%</span>
              </div>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-slate-700 to-slate-500" style={{ width: '50%' }} />
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 text-center">
            Perfectly balanced: 100 positive / 100 negative records
          </div>
        </div>
      </div>

      {/* Main Grid: Comparison & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Model Comparison Table and Bar Chart */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          <div className="glass-panel p-6 space-y-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <BarChart3 className="text-brand-400 w-4 h-4" />
                Model Performance Comparison
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Evaluation results computed on the 20% test split (40 samples).
              </p>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3">Model</th>
                    <th className="p-3 text-right">Accuracy</th>
                    <th className="p-3 text-right">Precision</th>
                    <th className="p-3 text-right">Recall</th>
                    <th className="p-3 text-right font-semibold text-brand-350">F1 Score</th>
                    <th className="p-3 text-right">ROC-AUC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {Object.entries(models).map(([name, data]) => {
                    const isBest = name === best_model.model_name;
                    return (
                      <tr 
                        key={name} 
                        onClick={() => setSelectedModel(name)}
                        className={`hover:bg-slate-900/30 transition-all cursor-pointer ${
                          selectedModel === name ? 'bg-slate-900/40 border-l-2 border-brand-500' : ''
                        }`}
                      >
                        <td className="p-3 font-semibold text-slate-250 flex items-center gap-1.5">
                          {name}
                          {isBest && (
                            <span className="bg-brand-500/20 text-brand-350 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Best
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">{formatMetric(data.accuracy)}</td>
                        <td className="p-3 text-right font-mono">{formatMetric(data.precision)}</td>
                        <td className="p-3 text-right font-mono">{formatMetric(data.recall)}</td>
                        <td className={`p-3 text-right font-mono font-bold ${isBest ? 'text-brand-350' : 'text-slate-200'}`}>
                          {formatMetric(data.f1_score)}
                        </td>
                        <td className="p-3 text-right font-mono">{data.roc_auc !== null ? data.roc_auc.toFixed(3) : 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Comparison Bar Chart */}
            <div className="h-[200px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', fontSize: 10 }}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                  <Bar dataKey="F1" fill="#5c73ff" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === selectedModel ? '#5c73ff' : 'rgba(92, 115, 255, 0.4)'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-slate-500 text-center mt-2">
                F1 Score (%) comparison across classifiers (selected model highlighted).
              </p>
            </div>
          </div>
        </div>

        {/* Dataset Details Column */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 space-y-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Info className="text-brand-400 w-4 h-4" />
                Dataset Overview & Specs
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Features schema loaded from `loan_training_data.csv`.
              </p>
            </div>

            <div className="space-y-4 flex-1 pt-4">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                  Input Features ({datasetInfo.features_count})
                </span>
                <div className="flex flex-wrap gap-1">
                  {datasetInfo.features.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-950 text-slate-350 border border-slate-900">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                  Target Label
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  {datasetInfo.target} (labeled)
                </span>
              </div>

              <div className="border-t border-slate-900 pt-3">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Feature Details & Dtypes
                </span>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(datasetInfo.data_types).map(([col, dtype]) => (
                    <div key={col} className="flex justify-between font-mono text-[10px] text-slate-400">
                      <span className={col === datasetInfo.target ? 'text-brand-400 font-bold' : ''}>{col}</span>
                      <span className="text-slate-600">{dtype}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-900 pt-3 text-[10px] text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Missing values:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{datasetInfo.missing_values.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unique Target Classes:</span>
                  <span className="font-mono text-slate-300">{datasetInfo.classes.join(', ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Section: Confusion Matrix & ROC Curve */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-200">Interactive Model Analysis</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Select a trained classifier to view its Confusion Matrix and ROC Curve.
            </p>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="glass-input text-xs font-semibold max-w-[200px]"
          >
            {Object.keys(models).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
          {/* Confusion Matrix Heatmap */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-350">Confusion Matrix Heatmap</h4>
              <p className="text-[9px] text-slate-550">Row index shows the true class; Column index shows the prediction.</p>
            </div>

            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative">
                {/* Actual Label text */}
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold text-slate-550 uppercase tracking-widest">
                  Actual
                </div>
                
                {/* Predicted Label text */}
                <div className="text-center text-[9px] font-bold text-slate-550 uppercase tracking-widest mb-4">
                  Predicted
                </div>

                <div className="grid gap-2 border border-slate-900 p-2 bg-slate-950/60 rounded-xl" style={{ gridTemplateColumns: `repeat(${activeModelData.classes.length}, minmax(100px, 1fr))` }}>
                  {activeModelData.confusion_matrix.map((row, rIdx) => 
                    row.map((val, cIdx) => {
                      const rowSum = row.reduce((a, b) => a + b, 0) || 1;
                      const cellRatio = val / rowSum;
                      
                      const cellStyle = {
                        backgroundColor: rIdx === cIdx 
                          ? `rgba(92, 115, 255, ${0.1 + cellRatio * 0.75})`
                          : `rgba(244, 63, 94, ${cellRatio * 0.5})`
                      };

                      return (
                        <div 
                          key={`${rIdx}-${cIdx}`}
                          style={cellStyle}
                          className="h-20 flex flex-col items-center justify-center rounded-lg border border-slate-900 text-center transition-all duration-200 hover:scale-[1.03] group relative cursor-help"
                        >
                          <span className="text-base font-extrabold text-slate-100">{val}</span>
                          <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {((val / rowSum) * 100).toFixed(0)}%
                          </span>

                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-950 border border-slate-800 p-2 rounded text-[10px] whitespace-nowrap z-20 pointer-events-none shadow-xl text-left">
                            <p><strong>Actual:</strong> {activeModelData.classes[rIdx] === '1' ? 'Approved (1)' : 'Not Approved (0)'}</p>
                            <p><strong>Predicted:</strong> {activeModelData.classes[cIdx] === '1' ? 'Approved (1)' : 'Not Approved (0)'}</p>
                            <p><strong>Count:</strong> {val} / {rowSum}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="grid gap-2 mt-2 text-center" style={{ gridTemplateColumns: `repeat(${activeModelData.classes.length}, minmax(100px, 1fr))` }}>
                  {activeModelData.classes.map(cls => (
                    <span key={cls} className="text-[10px] font-bold text-slate-500">
                      {cls === '1' ? 'Approved (1)' : 'Not Approved (0)'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ROC Curve Chart */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-350">ROC Curve (Thresholds Analysis)</h4>
              <p className="text-[9px] text-slate-550">Measures the model's ability to distinguish classes across thresholds.</p>
            </div>

            <div className="flex-1 min-h-[220px] max-h-[260px] pt-4">
              {activeModelData.roc_curve_data && activeModelData.roc_curve_data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={activeModelData.roc_curve_data} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="fpr" 
                      type="number"
                      domain={[0, 1]} 
                      stroke="#64748b" 
                      fontSize={9} 
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 9 }}
                    />
                    <YAxis 
                      dataKey="tpr" 
                      type="number"
                      domain={[0, 1]} 
                      stroke="#64748b" 
                      fontSize={9} 
                      tickFormatter={(v) => v.toFixed(1)}
                      label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 9 }}
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
      </div>

      {/* Classification Report for Selected Model */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-200">Per-Class Classification Report ({selectedModel})</h3>
        <div className="overflow-x-auto border border-slate-900 rounded-xl">
          <table className="w-full text-xs text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4">Class Label</th>
                <th className="p-4 text-right">Precision</th>
                <th className="p-4 text-right">Recall</th>
                <th className="p-4 text-right font-semibold text-brand-350">F1 Score</th>
                <th className="p-4 text-right">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-350">
              {Object.entries(activeModelData.classification_report).map(([className, classMetrics]) => {
                if (['accuracy', 'macro avg', 'weighted avg'].includes(className)) return null;
                const label = className === '1' ? 'Approved (1)' : className === '0' ? 'Not Approved (0)' : className;
                return (
                  <tr key={className} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-4 font-bold text-slate-250">{label}</td>
                    <td className="p-4 text-right font-mono">{formatMetric(classMetrics.precision)}</td>
                    <td className="p-4 text-right font-mono">{formatMetric(classMetrics.recall)}</td>
                    <td className="p-4 text-right font-mono font-semibold text-slate-200">
                      {formatMetric(classMetrics.f1_score || classMetrics['f1-score'])}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-500">{classMetrics.support}</td>
                  </tr>
                );
              })}
              {/* Accuracy row */}
              {activeModelData.classification_report['accuracy'] !== undefined && (
                <tr className="bg-slate-950/40 font-semibold text-slate-250">
                  <td className="p-4">Accuracy</td>
                  <td colSpan={3} className="p-4 text-right font-extrabold text-brand-350">
                    {formatMetric(activeModelData.classification_report.accuracy)}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 text-slate-500">
                    {activeModelData.classification_report['macro avg']?.support || activeModelData.classification_report['weighted avg']?.support || 'N/A'}
                  </td>
                </tr>
              )}
              {/* Macro Avg row */}
              {activeModelData.classification_report['macro avg'] && (
                <tr className="hover:bg-slate-900/30 transition-colors font-semibold text-slate-400">
                  <td className="p-4">Macro Average</td>
                  <td className="p-4 text-right font-mono">{formatMetric(activeModelData.classification_report['macro avg'].precision)}</td>
                  <td className="p-4 text-right font-mono">{formatMetric(activeModelData.classification_report['macro avg'].recall)}</td>
                  <td className="p-4 text-right font-mono font-bold">{formatMetric(activeModelData.classification_report['macro avg'].f1_score || activeModelData.classification_report['macro avg']['f1-score'])}</td>
                  <td className="p-4 text-right font-mono text-slate-500">{activeModelData.classification_report['macro avg'].support}</td>
                </tr>
              )}
              {/* Weighted Avg row */}
              {activeModelData.classification_report['weighted avg'] && (
                <tr className="hover:bg-slate-900/30 transition-colors font-semibold text-slate-450">
                  <td className="p-4">Weighted Average</td>
                  <td className="p-4 text-right font-mono">{formatMetric(activeModelData.classification_report['weighted avg'].precision)}</td>
                  <td className="p-4 text-right font-mono">{formatMetric(activeModelData.classification_report['weighted avg'].recall)}</td>
                  <td className="p-4 text-right font-mono">{formatMetric(activeModelData.classification_report['weighted avg'].f1_score || activeModelData.classification_report['weighted avg']['f1-score'])}</td>
                  <td className="p-4 text-right font-mono text-slate-500">{activeModelData.classification_report['weighted avg'].support}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Spec Explanation Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-200">ML Classifier Architecture Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(models).map(([name, data]) => {
            return (
              <div 
                key={name}
                onClick={() => setSelectedModel(name)}
                className={`glass-panel p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[180px] ${
                  selectedModel === name 
                    ? 'border-brand-500 bg-slate-900/50 -translate-y-1 shadow-lg shadow-brand-500/10' 
                    : 'hover:border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center justify-between">
                    {name}
                    {name === best_model.model_name && <Award className="w-3.5 h-3.5 text-brand-450 shrink-0" />}
                  </h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-light">
                    {modelDescriptions[name]}
                  </p>
                </div>
                <div className="border-t border-slate-950/80 pt-3 mt-4 space-y-1 text-[10px] font-mono text-slate-400">
                  <div className="flex justify-between">
                    <span>Train samples:</span>
                    <span>160</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Features:</span>
                    <span>4 cols</span>
                  </div>
                  <div className="flex justify-between">
                    <span>F1 Score:</span>
                    <span className="text-brand-350 font-bold">{formatMetric(data.f1_score)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
