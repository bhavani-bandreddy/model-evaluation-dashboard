import React, { useState } from 'react';
import { Play, BookOpen, BarChart3, Database, ShieldAlert, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

export default function Home({ onLaunch }) {
  const [activeMetric, setActiveMetric] = useState(null);

  const metricsGlossary = [
    {
      id: 'accuracy',
      name: 'Accuracy',
      formula: '(TP + TN) / (TP + TN + FP + FN)',
      desc: 'The proportion of total predictions that were correct. Best suited for balanced datasets.',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Overall Performance'
    },
    {
      id: 'precision',
      name: 'Macro Precision',
      formula: 'Mean of per-class Precision',
      desc: 'Calculates Precision for each class independently and takes the average. Crucial when performance on all classes is equally important.',
      color: 'from-emerald-500 to-teal-500',
      badge: 'Aggregated Quality'
    },
    {
      id: 'recall',
      name: 'Macro Recall',
      formula: 'Mean of per-class Recall',
      desc: 'Calculates Recall for each class independently and takes the average. Evaluates coverage across all classes evenly.',
      color: 'from-amber-500 to-orange-500',
      badge: 'Aggregated Coverage'
    },
    {
      id: 'f1',
      name: 'Macro F1 Score',
      formula: 'Mean of per-class F1 Scores',
      desc: 'The average of F1 scores across all classes. Provides a robust overall evaluation regardless of class imbalance.',
      color: 'from-purple-500 to-indigo-500',
      badge: 'Aggregated Measure'
    },
    {
      id: 'rocauc',
      name: 'ROC-AUC',
      formula: 'Area Under True Positive vs False Positive Rate Curve',
      desc: 'Measures the model\'s ability to distinguish between classes across all classification thresholds.',
      color: 'from-pink-500 to-rose-500',
      badge: 'Separability Capacity'
    }
  ];

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-brand-300">
          <Activity className="w-3.5 h-3.5 animate-pulse text-brand-400" />
          Standalone ML Model Validator
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-tight font-sans">
          Evaluate Machine Learning Models <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent glow-text">Instantly</span>
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          Upload your classification datasets, select from leading machine learning models, and analyze performance with premium heatmaps, ROC curves, and detailed evaluation history.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button onClick={onLaunch} className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base">
            <Play className="w-5 h-5 fill-current" />
            Launch Evaluation Harness
          </button>
          <a href="#glossary" className="btn-secondary w-full sm:w-auto px-8 py-3.5 text-base text-slate-300">
            <BookOpen className="w-5 h-5" />
            Learn ML Metrics
          </a>
        </div>
      </section>

      {/* Concept Architecture Flowchart */}
      <section className="glass-panel p-8 max-w-5xl mx-auto glow-card">
        <h3 className="text-xl font-bold mb-8 text-center text-slate-200">The Model Evaluation Pipeline</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {/* Connector line for large screens */}
          <div className="hidden md:block absolute top-[44px] left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-brand-500/20 via-indigo-500/40 to-emerald-500/20 -z-10" />

          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-400 shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Step 1</span>
              <h4 className="font-semibold text-slate-200 mt-1">Dataset Upload</h4>
              <p className="text-xs text-slate-400 mt-1">Accepts any raw CSV classification dataset and auto-parses headers.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Step 2</span>
              <h4 className="font-semibold text-slate-200 mt-1">Model Selection</h4>
              <p className="text-xs text-slate-400 mt-1">Choose between Random Forest, Logistic Regression, SVM, or Gradient Boosting.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Step 3</span>
              <h4 className="font-semibold text-slate-200 mt-1">Train & Score</h4>
              <p className="text-xs text-slate-400 mt-1">Dataset is cleaned, encoded, stratified, and trained automatically.</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Step 4</span>
              <h4 className="font-semibold text-slate-200 mt-1">Interactive Reports</h4>
              <p className="text-xs text-slate-400 mt-1">View metrics, heatmaps, ROC curves, and store historical records.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Glossary Section */}
      <section id="glossary" className="space-y-6 scroll-mt-20 max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-200">Glossary of ML Evaluation Metrics</h2>
          <p className="text-sm text-slate-400">Hover over or click a card to drill down into the mathematical definitions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {metricsGlossary.map((m) => (
            <div
              key={m.id}
              onClick={() => setActiveMetric(activeMetric === m.id ? null : m.id)}
              onMouseEnter={() => setActiveMetric(m.id)}
              onMouseLeave={() => setActiveMetric(null)}
              className={`glass-panel p-5 cursor-pointer transition-all duration-300 select-none flex flex-col justify-between min-h-[160px] ${
                activeMetric === m.id 
                  ? 'border-brand-500 bg-slate-900/60 -translate-y-1 shadow-lg shadow-brand-500/10' 
                  : 'hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <span className="inline-block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {m.badge}
                </span>
                <h4 className="font-bold text-slate-100 flex items-center justify-between">
                  {m.name}
                  <ChevronRight className="w-4 h-4 text-slate-650" />
                </h4>
              </div>

              {activeMetric === m.id ? (
                <div className="mt-2 space-y-1.5 animate-fadeIn">
                  <div className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded text-brand-350 overflow-x-auto whitespace-nowrap">
                    {m.formula}
                  </div>
                  <p className="text-[11px] text-slate-350 leading-relaxed">{m.desc}</p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-light truncate mt-4">
                  {m.desc}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Model Info Comparison Card */}
      <section className="glass-panel p-8 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-gradient-to-br from-slate-900/40 via-slate-900/20 to-slate-950/40">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <BarChart3 className="text-brand-400 w-5 h-5" />
            Dynamic Model Training Engine
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Instead of hardcoded mock statistics, our dashboard employs a fully functioning backend ML server. When you submit your evaluation:
          </p>
          <ul className="space-y-3.5 text-xs text-slate-300 font-light">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <span><strong>Pre-processing & Categoricals:</strong> Automatically identifies categorical headers, applies one-hot encoding, and scales numeric properties using standard normalization (StandardScaler).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <span><strong>Stratified Splitting:</strong> Utilizes stratified 80/20 train-test splits, maintaining target proportions to ensure reliable and non-biased metrics validation.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <span><strong>Probability Calibration:</strong> Configures models to provide class probabilities, which unlocks exact thresholds plotting for the interactive ROC Curves.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-6 space-y-4 font-mono text-[11px] text-slate-400">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-900 pb-2">
            <span>Classifier Specs</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Operational
            </span>
          </div>
          <div>
            <span className="text-indigo-400 font-semibold">1. LogisticRegression</span>
            <p className="text-slate-500 pl-4">Fast linear model, standard baseline. Uses L2 weight regularization.</p>
          </div>
          <div>
            <span className="text-indigo-400 font-semibold">2. RandomForestClassifier</span>
            <p className="text-slate-500 pl-4">Ensemble of decision trees. Exceptional at handling non-linear relations and categorical data.</p>
          </div>
          <div>
            <span className="text-indigo-400 font-semibold">3. SupportVectorClassifier (SVC)</span>
            <p className="text-slate-500 pl-4">Maximizes classification margin. Probability calibration enabled for ROC calculation.</p>
          </div>
          <div>
            <span className="text-indigo-400 font-semibold">4. GradientBoostingClassifier</span>
            <p className="text-slate-500 pl-4">Sequentially builds trees to minimize classification loss. High predictive performance.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
