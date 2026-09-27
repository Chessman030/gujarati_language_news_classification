"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { Activity, AlignLeft, RefreshCw, BarChart2, ShieldCheck, Cpu, Zap, ChevronDown, ChevronUp, Type, Settings } from "lucide-react";

export default function GujSankshepDashboard() {
  const [activeTab, setActiveTab] = useState("realtime");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [showOtherModels, setShowOtherModels] = useState(false);
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [isEditingApi, setIsEditingApi] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.60);

  useEffect(() => {
    // Load saved API URL on client-side mount
    const saved = localStorage.getItem("guj_api_url");
    if (saved) setApiUrl(saved);
  }, []);

  const getAbsoluteUrl = (url: string) => {
    if (!url) return "http://localhost:8000";
    let cleaned = url.trim();
    if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
      cleaned = `http://${cleaned}`;
    }
    return cleaned;
  };

  useEffect(() => {
    // Fetch metrics whenever apiUrl changes
    try {
      const validUrl = getAbsoluteUrl(apiUrl);
      fetch(`${validUrl}/api/metrics`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Backend not reachable");
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
             throw new TypeError("Received HTML instead of JSON. Check API URL.");
          }
          return res.json();
        })
        .then((data) => setMetrics(data))
        .catch((err) => {
          console.error("Failed to load metrics:", err);
          setMetrics({ error: "Failed to connect to Backend Server. Please verify the API URL." });
        });
    } catch (err) {
      console.error("Synchronous fetch error:", err);
      setMetrics({ error: "Invalid API URL format." });
    }
  }, [apiUrl]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const validUrl = getAbsoluteUrl(apiUrl);
      const res = await fetch(`${validUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, threshold: confidenceThreshold }),
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: "Failed to reach backend API. Check your API URL." });
    }
    setLoading(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case "business": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "entertainment": return "text-pink-500 bg-pink-500/10 border-pink-500/20";
      case "tech": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      default: return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    }
  };

  const COLORS = ['#3b82f6', '#ec4899', '#f97316', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16 pb-12 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-blue-400 text-sm mb-6">
            <Zap size={14} /> Powered by AI4Bharat & NLLB-200
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 text-transparent bg-clip-text">
            GujSankshep AI
          </h1>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Intelligent Gujarati News Classification, Summarization & Translation Engine
          </p>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-6xl mx-auto px-4 pb-20 relative z-10">
        
        {/* API Settings */}
        <div className="flex justify-end mb-4">
          {isEditingApi ? (
            <div className="flex gap-2 items-center bg-slate-900/80 p-2 rounded-xl border border-slate-700 animate-in fade-in">
              <span className="text-sm text-slate-400">API URL:</span>
              <input 
                type="text" 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)} 
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 outline-none focus:border-blue-500 w-64"
                placeholder="http://localhost:8000"
              />
              <button 
                onClick={() => {
                  const validUrl = getAbsoluteUrl(apiUrl);
                  setApiUrl(validUrl);
                  localStorage.setItem("guj_api_url", validUrl);
                  setIsEditingApi(false);
                }} 
                className="bg-blue-600 hover:bg-blue-500 text-white rounded px-3 py-1 text-sm font-medium transition-colors"
              >
                Save
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditingApi(true)} 
              className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1.5 bg-slate-900/40 px-4 py-1.5 rounded-full border border-slate-800 transition-colors"
            >
              <Settings size={14} /> Backend: {apiUrl}
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/60 backdrop-blur-md w-fit mx-auto">
          {[
            { id: 'realtime', icon: Activity, label: 'Real-Time Analysis' },
            { id: 'metrics', icon: BarChart2, label: 'Performance Metrics' },
            { id: 'validation', icon: ShieldCheck, label: 'Data Validation' },
            { id: 'architecture', icon: Cpu, label: 'Architecture' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.15)] border border-blue-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Real-Time Analysis */}
        {activeTab === 'realtime' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-2xl">
              <label className="block text-sm font-medium text-slate-400 mb-3 ml-1">
                Gujarati News Input
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your Gujarati news article here..."
                className="w-full h-40 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
              />
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-1/2 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800">
                  <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
                    Strictness: {(confidenceThreshold * 100).toFixed(0)}%
                  </label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    value={confidenceThreshold} 
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !inputText.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:shadow-none w-full sm:w-auto justify-center"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <AlignLeft size={18} />}
                  {loading ? "Processing..." : "Analyze & Translate News"}
                </button>
              </div>
            </div>

            {/* Results Grid */}
            {result && !result.error && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Card 1: Prediction */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10" />
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-blue-400"/> Classification
                  </h3>
                  <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border mb-4 capitalize ${getCategoryColor(result.predictedCategory)}`}>
                    {result.predictedCategory}
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Confidence</span>
                      <span className="text-slate-200 font-mono">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Best Model</span>
                      <span className="text-slate-200">{result.bestModel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Test Accuracy</span>
                      <span className="text-slate-200 font-mono">{(result.bestModelAccuracy * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Gujarati Summary */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-pink-500/10" />
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <AlignLeft size={16} className="text-pink-400"/> Gujarati Summary
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                    {result.summary}
                  </p>
                </div>

                {/* Card 3: English Translation */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/10" />
                  <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Type size={16} className="text-purple-400"/> English Digest
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                    {result.translation}
                  </p>
                </div>

                {/* Compare Expandable */}
                <div className="col-span-1 md:col-span-3">
                  <button 
                    onClick={() => setShowOtherModels(!showOtherModels)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mx-auto"
                  >
                    Compare Predictions Across All Models
                    {showOtherModels ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {showOtherModels && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
                      {result.otherModels?.map((m: any, i: number) => (
                        <div key={i} className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4">
                          <h4 className="text-slate-300 text-sm font-medium mb-3">{m.modelName}</h4>
                          <div className="flex justify-between items-center text-xs">
                            <span className={`px-2 py-1 rounded-md border capitalize ${getCategoryColor(m.prediction)}`}>
                              {m.prediction}
                            </span>
                            <div className="text-right">
                              <div className="text-slate-400">Conf: {(m.confidence * 100).toFixed(1)}%</div>
                              <div className="text-slate-500">Acc: {(m.accuracy * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
            {result?.error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-center">
                {result.error}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Performance Metrics */}
        {activeTab === 'metrics' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {metrics?.error ? (
              <div className="text-center text-red-400 p-8 bg-red-500/10 rounded-3xl border border-red-500/20">
                {metrics.error}
              </div>
            ) : metrics ? (
              <>
                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
                    <BarChart2 className="text-blue-400" /> Evaluation Matrix
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="pb-3 font-medium">Model Algorithm</th>
                          <th className="pb-3 font-medium">Accuracy</th>
                          <th className="pb-3 font-medium">Precision</th>
                          <th className="pb-3 font-medium">Recall</th>
                          <th className="pb-3 font-medium">F1-Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {metrics.metrics.map((m: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-4 text-slate-200 font-medium flex items-center gap-2">
                              {m.name === metrics.bestModel && <span className="w-2 h-2 rounded-full bg-blue-500" title="Best Model" />}
                              {m.name}
                            </td>
                            <td className="py-4 text-slate-300 font-mono">{(m.accuracy * 100).toFixed(2)}%</td>
                            <td className="py-4 text-slate-400 font-mono">{(m.precision * 100).toFixed(2)}%</td>
                            <td className="py-4 text-slate-400 font-mono">{(m.recall * 100).toFixed(2)}%</td>
                            <td className="py-4 text-slate-300 font-mono">{(m.f1Score * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl h-[400px]">
                  <h3 className="text-lg font-semibold text-slate-200 mb-6">Accuracy vs F1-Score Comparison</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.metrics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1]} tickFormatter={(val) => `${(val*100).toFixed(0)}%`} stroke="#64748b" axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                      <Bar dataKey="accuracy" name="Accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="f1Score" name="F1-Score" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-slate-500" /></div>
            )}
          </div>
        )}

        {/* TAB 3: Data Validation */}
        {activeTab === 'validation' && (
          <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6">
               <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                 <ShieldCheck className="text-green-400" /> Test Set Validation
               </h3>
               <p className="text-slate-400 text-sm mb-6">
                 Dataset breakdown based on the original AI4Bharat IndicNLP Gujarati Corpus.
               </p>
               
               <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Test Samples</div>
                    <div className="text-3xl font-light text-slate-200">1,500+</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                    <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Validation Split</div>
                    <div className="text-3xl font-light text-slate-200">80/20</div>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 flex flex-col items-center">
              <h3 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-wider w-full text-left">Category Distribution (Mocked)</h3>
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Business', value: 400 },
                        { name: 'Entertainment', value: 500 },
                        { name: 'Tech', value: 600 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {['Business', 'Entertainment', 'Tech'].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Architecture */}
        {activeTab === 'architecture' && (
          <div className="animate-in fade-in duration-500 bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 shadow-xl">
             <h3 className="text-xl font-semibold text-slate-200 mb-8 flex items-center gap-2">
                <Cpu className="text-blue-400" /> Pipeline Architecture
             </h3>
             
             <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                {/* Branch 1 */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-center">
                    <div className="text-blue-400 font-semibold mb-1">Preprocessing Branch</div>
                    <div className="text-slate-400 text-sm">Stemming & TF-IDF Vectorization</div>
                  </div>
                  <div className="flex justify-center"><ChevronDown className="text-slate-600" /></div>
                  <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-center">
                    <div className="text-blue-400 font-semibold mb-1">Machine Learning Models</div>
                    <div className="text-slate-400 text-sm">Naive Bayes, LR, SVC, Random Forest</div>
                  </div>
                  <div className="flex justify-center"><ChevronDown className="text-slate-600" /></div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 text-center shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                    <div className="text-blue-400 font-semibold mb-1">Predicted Category</div>
                    <div className="text-slate-400 text-sm">Output Class Label</div>
                  </div>
                </div>

                <div className="hidden md:block w-px h-64 bg-slate-800" />

                {/* Branch 2 */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-center">
                    <div className="text-purple-400 font-semibold mb-1">Summarization Engine</div>
                    <div className="text-slate-400 text-sm">Extractive Word-Frequency Scoring</div>
                  </div>
                  <div className="flex justify-center"><ChevronDown className="text-slate-600" /></div>
                  <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5 text-center">
                    <div className="text-purple-400 font-semibold mb-1">Neural Translator</div>
                    <div className="text-slate-400 text-sm">Meta NLLB-200 (Seq2Seq PyTorch)</div>
                  </div>
                  <div className="flex justify-center"><ChevronDown className="text-slate-600" /></div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 text-center shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <div className="text-purple-400 font-semibold mb-1">English Digest</div>
                    <div className="text-slate-400 text-sm">Translated Final Output</div>
                  </div>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
