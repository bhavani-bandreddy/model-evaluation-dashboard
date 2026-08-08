import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  History as HistoryIcon, ShieldCheck, AlertCircle, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, RefreshCw, BarChart2, Calendar, FileSpreadsheet,
  TrendingUp, Activity, Terminal
} from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch SQLite evaluation runs
  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    try {
      const response = await axios.get(`${apiBaseUrl}/history`);
      setHistory(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load evaluation history from the SQLite database. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatPercent = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return (val * 100).toFixed(1) + '%';
  };

  const getDelta = (valLatest, valPrevious) => {
    if (valLatest === null || valPrevious === null || valLatest === undefined || valPrevious === undefined) return null;
    const diff = valLatest - valPrevious;
    return diff;
  };

  const renderDeltaBadge = (delta) => {
    if (delta === null || delta === undefined) return null;
    if (delta === 0) return <span className="text-[10px] text-slate-500 font-mono">No change</span>;
    
    const percentageString = (delta * 100).toFixed(1) + '%';
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono">
          <ArrowUpRight className="w-3 h-3" />
          +{percentageString}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold font-mono">
          <ArrowDownRight className="w-3 h-3" />
          {percentageString}
        </span>
      );
    }
  };

  // Helper to generate dynamic recommendation explanation
  const generateRecommendation = (latest, previous) => {
    if (!latest || !previous) return null;

    let recommended = null;
    let fallback = null;
    let winReason = '';
    let isTie = false;
    let winMetric = '';

    // 1. Higher Macro F1 wins
    if (latest.f1_score > previous.f1_score) {
      recommended = latest;
      fallback = previous;
      winMetric = 'f1';
      winReason = `higher **Macro F1 Score** (${formatPercent(latest.f1_score)} vs ${formatPercent(previous.f1_score)})`;
    } else if (previous.f1_score > latest.f1_score) {
      recommended = previous;
      fallback = latest;
      winMetric = 'f1';
      winReason = `higher **Macro F1 Score** (${formatPercent(previous.f1_score)} vs ${formatPercent(latest.f1_score)})`;
    } else {
      // 2. If F1 tied, compare Macro Recall
      if (latest.recall > previous.recall) {
        recommended = latest;
        fallback = previous;
        winMetric = 'recall';
        winReason = `higher **Macro Recall** (${formatPercent(latest.recall)} vs ${formatPercent(previous.recall)}) at an identical Macro F1 Score`;
      } else if (previous.recall > latest.recall) {
        recommended = previous;
        fallback = latest;
        winMetric = 'recall';
        winReason = `higher **Macro Recall** (${formatPercent(previous.recall)} vs ${formatPercent(latest.recall)}) at an identical Macro F1 Score`;
      } else {
        // 3. If Recall tied, compare Accuracy
        if (latest.accuracy > previous.accuracy) {
          recommended = latest;
          fallback = previous;
          winMetric = 'accuracy';
          winReason = `higher **Accuracy** (${formatPercent(latest.accuracy)} vs ${formatPercent(previous.accuracy)}) at identical Macro F1 Score and Macro Recall benchmarks`;
        } else if (previous.accuracy > latest.accuracy) {
          recommended = previous;
          fallback = latest;
          winMetric = 'accuracy';
          winReason = `higher **Accuracy** (${formatPercent(previous.accuracy)} vs ${formatPercent(latest.accuracy)}) at identical Macro F1 Score and Macro Recall benchmarks`;
        } else {
          // 4. If Accuracy tied, compare run time if available
          const latestTime = latest.run_time_seconds;
          const previousTime = previous.run_time_seconds;
          
          if (latestTime !== undefined && previousTime !== undefined && latestTime !== null && previousTime !== null) {
            if (latestTime < previousTime) {
              recommended = latest;
              fallback = previous;
              winMetric = 'runtime';
              winReason = `faster training/evaluation execution time (${latestTime.toFixed(3)}s vs ${previousTime.toFixed(3)}s) at identical statistical benchmarks`;
            } else if (previousTime < latestTime) {
              recommended = previous;
              fallback = latest;
              winMetric = 'runtime';
              winReason = `faster training/evaluation execution time (${previousTime.toFixed(3)}s vs ${latestTime.toFixed(3)}s) at identical statistical benchmarks`;
            } else {
              isTie = true;
            }
          } else {
            isTie = true;
          }
        }
      }
    }

    let explanation = "";
    if (isTie) {
      explanation = `**Tie**: Both **${latest.model_name}** (Run #${latest.id}) and **${previous.model_name}** (Run #${previous.id}) have identical measured performance (Macro F1, Macro Recall, Accuracy, and execution time) on the frozen test set.`;
      return {
        recommendedModel: "Tie / No Clear Winner",
        recommendedId: "N/A",
        explanation,
        isTie: true
      };
    } else if (winMetric === 'runtime') {
      explanation = `Based on direct statistical comparison, **Run #${latest.id}** and **Run #${previous.id}** have identical evaluation metrics. **Run #${recommended.id}** is recommended because it has a faster execution time (${recommended.run_time_seconds.toFixed(3)}s vs ${fallback.run_time_seconds.toFixed(3)}s).`;
      return {
        recommendedModel: recommended.model_name,
        recommendedId: recommended.id,
        explanation,
        isTie: false
      };
    } else {
      const sameModel = latest.model_name === previous.model_name;
      explanation = `Based on direct statistical comparison, we recommend shipping **${recommended.model_name}** (Run #${recommended.id}). `;
      
      if (sameModel) {
        if (recommended.id === latest.id) {
          explanation += `The latest **${latest.model_name}** run (Run #${latest.id}) outperforms the previous **${previous.model_name}** run (Run #${previous.id}) due to ${winReason}.`;
        } else {
          explanation += `The previous **${previous.model_name}** run (Run #${previous.id}) remains statistically superior to the latest **${latest.model_name}** run (Run #${latest.id}) due to ${winReason}.`;
        }
      } else {
        if (recommended.id === latest.id) {
          explanation += `The latest evaluation shows that **${latest.model_name}** (Run #${latest.id}) outperforms **${previous.model_name}** (Run #${previous.id}) due to ${winReason}.`;
        } else {
          explanation += `Although **${latest.model_name}** (Run #${latest.id}) is the latest run, the previous evaluation of **${previous.model_name}** (Run #${previous.id}) remains statistically superior due to ${winReason}.`;
        }
      }
      return {
        recommendedModel: recommended.model_name,
        recommendedId: recommended.id,
        explanation,
        isTie: false
      };
    }
  };

  const latestTwo = history.slice(0, 2);
  const comparison = latestTwo.length === 2 ? generateRecommendation(latestTwo[0], latestTwo[1]) : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <HistoryIcon className="text-brand-500 w-8 h-8" />
            Evaluation History & Comparison
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Browse all historical SQLite runs and inspect side-by-side statistical comparisons of the latest two models.
          </p>
        </div>
        <button 
          onClick={fetchHistory} 
          disabled={isLoading}
          className="btn-secondary text-xs py-2 px-4 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Runs
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h4 className="font-bold">Database Error</h4>
            <p className="mt-0.5 text-xs text-rose-450">{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-mono">Querying historical database records...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="glass-panel p-12 text-center max-w-2xl mx-auto space-y-4">
          <HistoryIcon className="w-12 h-12 text-slate-700 mx-auto" />
          <h3 className="text-xl font-bold text-slate-200">No Evaluation History</h3>
          <p className="text-sm text-slate-450 leading-relaxed font-light">
            You haven't run any evaluations yet. Navigate to the <strong>Evaluate Model</strong> tab to upload a classification dataset and validate a model.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Side-by-side comparison block */}
          {latestTwo.length < 2 ? (
            <div className="glass-panel p-6 bg-slate-900/10 border-slate-900/60 text-center">
              <p className="text-xs text-slate-450 font-light">
                Found {history.length} run stored in SQLite. You need at least <strong>two runs</strong> to display a side-by-side model comparison.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recommendation Banner */}
              {comparison && (
                <div className={`glass-panel p-6 border-l-4 bg-gradient-to-r animate-fadeIn ${comparison.isTie ? 'border-l-amber-500 from-amber-950/10 via-slate-900/40 to-slate-950/10' : 'border-l-emerald-500 from-emerald-950/15 via-slate-900/40 to-slate-950/10'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${comparison.isTie ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                      {comparison.isTie ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div className="space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${comparison.isTie ? 'bg-amber-500/15 text-amber-350' : 'bg-emerald-500/15 text-emerald-350'}`}>
                        {comparison.isTie ? 'Evaluation Outcome' : 'Recommended Run'}
                      </span>
                      <h3 className="text-base font-extrabold text-slate-250 mt-1">
                        {comparison.isTie ? comparison.recommendedModel : `Recommended Run: ${comparison.recommendedModel} (Run #${comparison.recommendedId})`}
                      </h3>
                      <p 
                        className="text-xs text-slate-350 leading-relaxed font-light pt-1"
                        dangerouslySetInnerHTML={{ __html: comparison.explanation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-side Table Comparison */}
              <div className="glass-panel p-6 overflow-hidden">
                <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2 uppercase tracking-wider">
                  <BarChart2 className="w-4 h-4 text-brand-400" />
                  Latest Two Runs Side-By-Side Comparison
                </h3>

                <div className="grid grid-cols-3 gap-4 border-b border-slate-900 pb-3 font-semibold text-[10px] text-slate-500 uppercase tracking-widest">
                  <div>Metric Benchmark</div>
                  <div className="text-right text-brand-350">
                    Latest Run (#{latestTwo[0].id})
                    <span className="block text-[8px] text-slate-450 normal-case font-normal truncate mt-0.5">
                      {latestTwo[0].model_name}
                    </span>
                  </div>
                  <div className="text-right text-indigo-350">
                    Previous Run (#{latestTwo[1].id})
                    <span className="block text-[8px] text-slate-450 normal-case font-normal truncate mt-0.5">
                      {latestTwo[1].model_name}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-900 text-xs">
                  {/* Model Name */}
                  <div className="grid grid-cols-3 py-3 items-center">
                    <span className="font-medium text-slate-400">Model Version</span>
                    <span className="text-right font-mono font-bold text-slate-200">{latestTwo[0].model_name}</span>
                    <span className="text-right font-mono font-bold text-slate-400">{latestTwo[1].model_name}</span>
                  </div>

                  {/* Date */}
                  <div className="grid grid-cols-3 py-3 items-center">
                    <span className="font-medium text-slate-400">Date Evaluated</span>
                    <span className="text-right font-mono text-[10px] text-slate-300">
                      {new Date(latestTwo[0].evaluated_at).toLocaleString()}
                    </span>
                    <span className="text-right font-mono text-[10px] text-slate-400">
                      {new Date(latestTwo[1].evaluated_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Accuracy */}
                  <div className="grid grid-cols-3 py-3.5 items-center">
                    <span className="font-semibold text-slate-300">Accuracy</span>
                    <div className="text-right flex items-center justify-end gap-2">
                      {renderDeltaBadge(getDelta(latestTwo[0].accuracy, latestTwo[1].accuracy))}
                      <span className="font-mono font-extrabold text-slate-100">{formatPercent(latestTwo[0].accuracy)}</span>
                    </div>
                    <span className="text-right font-mono text-slate-400 font-medium">{formatPercent(latestTwo[1].accuracy)}</span>
                  </div>

                  {/* Precision */}
                  <div className="grid grid-cols-3 py-3.5 items-center">
                    <span className="font-semibold text-slate-300">Macro Precision</span>
                    <div className="text-right flex items-center justify-end gap-2">
                      {renderDeltaBadge(getDelta(latestTwo[0].precision, latestTwo[1].precision))}
                      <span className="font-mono font-extrabold text-slate-100">{formatPercent(latestTwo[0].precision)}</span>
                    </div>
                    <span className="text-right font-mono text-slate-400 font-medium">{formatPercent(latestTwo[1].precision)}</span>
                  </div>

                  {/* Recall */}
                  <div className="grid grid-cols-3 py-3.5 items-center">
                    <span className="font-semibold text-slate-300">Macro Recall</span>
                    <div className="text-right flex items-center justify-end gap-2">
                      {renderDeltaBadge(getDelta(latestTwo[0].recall, latestTwo[1].recall))}
                      <span className="font-mono font-extrabold text-slate-100">{formatPercent(latestTwo[0].recall)}</span>
                    </div>
                    <span className="text-right font-mono text-slate-400 font-medium">{formatPercent(latestTwo[1].recall)}</span>
                  </div>

                  {/* F1 Score */}
                  <div className="grid grid-cols-3 py-3.5 items-center">
                    <span className="font-semibold text-slate-300">Macro F1 Score</span>
                    <div className="text-right flex items-center justify-end gap-2">
                      {renderDeltaBadge(getDelta(latestTwo[0].f1_score, latestTwo[1].f1_score))}
                      <span className="font-mono font-extrabold text-slate-100">{formatPercent(latestTwo[0].f1_score)}</span>
                    </div>
                    <span className="text-right font-mono text-slate-400 font-medium">{formatPercent(latestTwo[1].f1_score)}</span>
                  </div>

                  {/* ROC-AUC */}
                  <div className="grid grid-cols-3 py-3.5 items-center">
                    <span className="font-semibold text-slate-300">ROC-AUC</span>
                    <div className="text-right flex items-center justify-end gap-2">
                      {renderDeltaBadge(getDelta(latestTwo[0].roc_auc, latestTwo[1].roc_auc))}
                      <span className="font-mono font-extrabold text-slate-100">
                        {latestTwo[0].roc_auc !== null ? latestTwo[0].roc_auc.toFixed(3) : 'N/A'}
                      </span>
                    </div>
                    <span className="text-right font-mono text-slate-400 font-medium">
                      {latestTwo[1].roc_auc !== null ? latestTwo[1].roc_auc.toFixed(3) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Confusion Matrices Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-900">
                  {/* Matrix 1 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-450 uppercase tracking-widest text-center">
                      Matrix: Run #{latestTwo[0].id} ({latestTwo[0].model_name})
                    </h4>
                    <div className="flex justify-center p-2">
                      <div className="grid gap-1.5 p-1.5 bg-slate-950/60 border border-slate-900 rounded-lg" style={{ gridTemplateColumns: `repeat(${latestTwo[0].confusion_matrix.length}, minmax(50px, 1fr))` }}>
                        {latestTwo[0].confusion_matrix.map((row, rIdx) => 
                          row.map((val, cIdx) => {
                            const sum = row.reduce((a, b) => a + b, 0) || 1;
                            const ratio = val / sum;
                            const bg = rIdx === cIdx 
                              ? `rgba(92, 115, 255, ${0.15 + ratio * 0.7})` 
                              : `rgba(244, 63, 94, ${ratio * 0.45})`;
                            return (
                              <div key={`${rIdx}-${cIdx}`} style={{ backgroundColor: bg }} className="w-14 h-12 rounded border border-slate-900/60 flex flex-col items-center justify-center font-mono">
                                <span className="text-[11px] font-bold text-slate-200">{val}</span>
                                <span className="text-[8px] text-slate-450">{((val / sum) * 100).toFixed(0)}%</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matrix 2 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-450 uppercase tracking-widest text-center">
                      Matrix: Run #{latestTwo[1].id} ({latestTwo[1].model_name})
                    </h4>
                    <div className="flex justify-center p-2">
                      <div className="grid gap-1.5 p-1.5 bg-slate-950/60 border border-slate-900 rounded-lg" style={{ gridTemplateColumns: `repeat(${latestTwo[1].confusion_matrix.length}, minmax(50px, 1fr))` }}>
                        {latestTwo[1].confusion_matrix.map((row, rIdx) => 
                          row.map((val, cIdx) => {
                            const sum = row.reduce((a, b) => a + b, 0) || 1;
                            const ratio = val / sum;
                            const bg = rIdx === cIdx 
                              ? `rgba(92, 115, 255, ${0.15 + ratio * 0.7})` 
                              : `rgba(244, 63, 94, ${ratio * 0.45})`;
                            return (
                              <div key={`${rIdx}-${cIdx}`} style={{ backgroundColor: bg }} className="w-14 h-12 rounded border border-slate-900/60 flex flex-col items-center justify-center font-mono">
                                <span className="text-[11px] font-bold text-slate-200">{val}</span>
                                <span className="text-[8px] text-slate-450">{((val / sum) * 100).toFixed(0)}%</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database History Run Table */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              All SQLite Evaluation Runs ({history.length})
            </h3>
            
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Run ID</th>
                    <th className="p-4">Dataset Name</th>
                    <th className="p-4">Model Version</th>
                    <th className="p-4">Target Label</th>
                    <th className="p-4 text-right">Accuracy</th>
                    <th className="p-4 text-right">Macro Precision</th>
                    <th className="p-4 text-right">Macro Recall</th>
                    <th className="p-4 text-right">Macro F1 Score</th>
                    <th className="p-4">Evaluated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {history.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-mono font-semibold text-brand-400">#{run.id}</td>
                      <td className="p-4 font-medium text-slate-200">
                        <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {run.dataset_name}
                        </span>
                      </td>
                      <td className="p-4 font-bold">{run.model_name}</td>
                      <td className="p-4 font-mono text-slate-500 text-[10px]">{run.target_column}</td>
                      <td className="p-4 text-right font-mono font-semibold text-slate-200">{formatPercent(run.accuracy)}</td>
                      <td className="p-4 text-right font-mono text-slate-300">{formatPercent(run.precision)}</td>
                      <td className="p-4 text-right font-mono text-slate-300">{formatPercent(run.recall)}</td>
                      <td className="p-4 text-right font-mono text-slate-200 font-semibold">{formatPercent(run.f1_score)}</td>
                      <td className="p-4 font-mono text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(run.evaluated_at).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
