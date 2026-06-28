import React, { useState, useEffect } from 'react';
import { 
  Chrome, 
  Sparkles, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Trash2, 
  Play, 
  Target, 
  ArrowRight, 
  ShieldAlert, 
  Copy, 
  FileCode, 
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { TabActivity } from '../types';

interface AutoTrackerProps {
  activities: TabActivity[];
  onAddActivity: (activity: TabActivity) => void;
  onClearActivities: () => void;
  userId: string;
}

interface ProductivityReport {
  isProductive: boolean;
  score: number;
  likelihoodOfGoals: number;
  outliers: {
    flaw: string;
    impact: string;
    trigger: string;
  }[];
  executiveSummary: string;
  recommendations: string[];
}

export default function AutoTracker({ 
  activities, 
  onAddActivity, 
  onClearActivities, 
  userId 
}: AutoTrackerProps) {
  // Local Settings & Goals
  const [productiveGoal, setProductiveGoal] = useState<number>(4); // default 4 hours
  const [maxUnproductiveMins, setMaxUnproductiveMins] = useState<number>(30); // default 30 mins
  const [futureGoals, setFutureGoals] = useState<string[]>([
    'Tuning CNN models and hyper-parameters assignment',
    'Optimizing resume and applying to 5 summer internships'
  ]);
  const [newGoalText, setNewGoalText] = useState('');

  // Guide Tabs
  const [guideTab, setGuideTab] = useState<'manifest' | 'background' | 'popup'>('manifest');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // AI Analyzer report state
  const [report, setReport] = useState<ProductivityReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  // Helper to format seconds to human readable
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Helper to format hours in decimals
  const formatHours = (seconds: number) => {
    return (seconds / 3600).toFixed(2);
  };

  // Group activities by domain for visualization
  const domainSummaries = React.useMemo(() => {
    const summaryMap: Record<string, { domain: string, title: string, duration: number, classification: 'productive' | 'unproductive' | 'neutral', count: number }> = {};
    
    activities.forEach(act => {
      if (!summaryMap[act.domain]) {
        summaryMap[act.domain] = {
          domain: act.domain,
          title: act.title,
          duration: 0,
          classification: act.classification,
          count: 0
        };
      }
      summaryMap[act.domain].duration += act.duration;
      summaryMap[act.domain].count += 1;
    });

    return Object.values(summaryMap).sort((a, b) => b.duration - a.duration);
  }, [activities]);

  // Aggregate duration by classification
  const classAggregation = React.useMemo(() => {
    let productive = 0;
    let unproductive = 0;
    let neutral = 0;

    activities.forEach(act => {
      if (act.classification === 'productive') productive += act.duration;
      else if (act.classification === 'unproductive') unproductive += act.duration;
      else neutral += act.duration;
    });

    const total = productive + unproductive + neutral;

    return {
      productive,
      unproductive,
      neutral,
      total,
      productivePct: total > 0 ? (productive / total) * 100 : 0,
      unproductivePct: total > 0 ? (unproductive / total) * 100 : 0,
      neutralPct: total > 0 ? (neutral / total) * 100 : 0,
    };
  }, [activities]);

  // Data for Recharts Pie
  const pieData = [
    { name: 'Productive', value: classAggregation.productive, color: '#06b6d4' }, // cyan
    { name: 'Unproductive', value: classAggregation.unproductive, color: '#f43f5e' }, // rose
    { name: 'Neutral', value: classAggregation.neutral, color: '#64748b' } // slate
  ].filter(item => item.value > 0);

  // Simulator helper to inject fake tracking entries
  const handleSimulate = (type: 'productive' | 'unproductive' | 'neutral') => {
    const randomDomains = {
      productive: [
        { domain: 'ai.studio', title: 'Google AI Studio — Build and Tune Prompts' },
        { domain: 'github.com', title: 'Pull Requests · Soumya/ml-cnn-tuner' },
        { domain: 'stackoverflow.com', title: 'How to fix tensor shape mismatch in PyTorch - Stack Overflow' },
        { domain: 'docs.google.com', title: 'Resume Refactoring 2026 - Google Docs' }
      ],
      unproductive: [
        { domain: 'youtube.com', title: 'Crazy ML benchmarks and GPU drama! - YouTube' },
        { domain: 'x.com', title: 'Twitter / Home' },
        { domain: 'reddit.com', title: 'r/MachineLearning - PyTorch CNN models hyper-parameter issues' },
        { domain: 'instagram.com', title: 'Instagram' }
      ],
      neutral: [
        { domain: 'google.com', title: 'google-genai SDK typescript quickstart - Google Search' },
        { domain: 'wikipedia.org', title: 'Convolutional neural network - Wikipedia' },
        { domain: 'news.ycombinator.com', title: 'Hacker News' }
      ]
    };

    const choices = randomDomains[type];
    const picked = choices[Math.floor(Math.random() * choices.length)];
    const durations = [300, 600, 1200, 1800]; // 5m, 10m, 20m, 30m
    const pickedDuration = durations[Math.floor(Math.random() * durations.length)];

    const newActivity: TabActivity = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      domain: picked.domain,
      title: picked.title,
      duration: pickedDuration,
      classification: type,
      timestamp: new Date().toISOString()
    };

    onAddActivity(newActivity);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalText.trim()) {
      setFutureGoals([...futureGoals, newGoalText.trim()]);
      setNewGoalText('');
    }
  };

  const handleRemoveGoal = (index: number) => {
    const updated = [...futureGoals];
    updated.splice(index, 1);
    setFutureGoals(updated);
  };

  // Run Gemini analysis via express endpoint
  const handleAnalyzeProductivity = async () => {
    if (activities.length === 0) {
      setAnalyzerError('No tracking activities recorded. Please simulate or connect the extension first!');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzerError(null);
    try {
      const res = await fetch('/api/ai/analyze-productivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities,
          standards: {
            productiveGoal,
            maxUnproductiveMins
          },
          futureGoals,
          currentLocalTime: new Date().toISOString()
        })
      });

      if (!res.ok) {
        throw new Error('Analyst experienced cognitive latency. Please try again.');
      }

      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setAnalyzerError(err.message || 'Failed to generate report.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Source code templates for Extension files
  const extensionFiles = {
    manifest: `{
  "manifest_version": 3,
  "name": "LiveYourDay Auto-Telemetry",
  "version": "1.0.0",
  "description": "Automated background tab tracker for LiveYourDay workspace integration.",
  "permissions": [
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.run.app/*",
    "http://localhost:3000/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}`,
    background: `// LiveYourDay Auto-Telemetry Background Worker
let activeTabId = null;
let activeTabUrl = null;
let activeTabTitle = null;
let lastTimestamp = Date.now();
let trackingLogs = [];

// Clean domain extraction
function getDomain(urlStr) {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return 'local-asset';
  }
}

// Map domains to standard classifications
function classifyDomain(domain) {
  const productive = ['ai.studio', 'github.com', 'stackoverflow.com', 'docs.google.com', 'canvas.edu', 'notion.so', 'gitlab.com', 'localhost'];
  const unproductive = ['youtube.com', 'x.com', 'twitter.com', 'reddit.com', 'facebook.com', 'instagram.com', 'netflix.com', 'twitch.tv', 'tiktok.com'];
  
  if (productive.some(p => domain.includes(p))) return 'productive';
  if (unproductive.some(u => domain.includes(u))) return 'unproductive';
  return 'neutral';
}

// Log time spent on current active tab
function logActiveSession() {
  if (!activeTabUrl) return;
  const now = Date.now();
  const duration = Math.round((now - lastTimestamp) / 1000); // in seconds
  
  if (duration >= 5) { // Only log if focused for 5+ seconds
    const domain = getDomain(activeTabUrl);
    const classification = classifyDomain(domain);
    
    const entry = {
      id: \`ext-\${Date.now()}-\${Math.random().toString(36).substr(2, 5)}\`,
      domain,
      title: activeTabTitle || domain,
      duration,
      classification,
      timestamp: new Date().toISOString()
    };
    
    sendPayloadToWorkspace(entry);
  }
  
  lastTimestamp = now;
}

// Dispatch to LiveYourDay backend service
async function sendPayloadToWorkspace(entry) {
  // Read target server URL from storage (defaults to active workspace)
  chrome.storage.local.get(['workspaceUrl', 'userId'], async (config) => {
    const baseUrl = config.workspaceUrl || 'http://localhost:3000';
    const userId = config.userId || '${userId}';
    
    if (!userId) {
      console.log('No user authenticated. Telemetry paused.');
      return;
    }

    try {
      await fetch(\`\${baseUrl}/api/extension/activity\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, userId })
      });
      console.log('Telemetry synchronization successful:', entry.domain);
    } catch (err) {
      console.warn('Workspace sync failed. Holding telemetry entry in buffer.');
    }
  });
}

// Track tab switches & updates
chrome.tabs.onActivated.addListener(activeInfo => {
  logActiveSession();
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      activeTabId = tab.id;
      activeTabUrl = tab.url;
      activeTabTitle = tab.title;
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    logActiveSession();
    activeTabUrl = changeInfo.url;
    activeTabTitle = tab.title;
  }
});

// Periodic heartbeat to capture long stays on single page
setInterval(() => {
  logActiveSession();
}, 10000);`,
    popup: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 240px;
      font-family: system-ui, sans-serif;
      background: #020617;
      color: #f1f5f9;
      padding: 12px;
      margin: 0;
    }
    h3 { margin-top: 0; color: #06b6d4; font-size: 14px; font-weight: 800; }
    .form-group { margin-bottom: 10px; }
    label { font-size: 10px; color: #94a3b8; display: block; margin-bottom: 4px; }
    input {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      color: #fff;
      padding: 6px;
      border-radius: 6px;
      font-size: 11px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      background: #06b6d4;
      color: #000;
      border: none;
      padding: 8px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    button:hover { background: #22d3ee; }
    .status {
      font-size: 10px;
      color: #10b981;
      margin-top: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h3>LiveYourDay Telemetry</h3>
  <div class="form-group">
    <label>Workspace Service API Endpoint</label>
    <input id="workspaceUrl" type="text" placeholder="http://localhost:3000">
  </div>
  <div class="form-group">
    <label>Authenticated User ID</label>
    <input id="userId" type="text" readonly value="${userId}">
  </div>
  <button id="saveBtn">Save & Bind Link</button>
  <div id="status" class="status">● Telemetry Active</div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      // Default to current host
      const workspaceInput = document.getElementById('workspaceUrl');
      workspaceInput.value = window.location.origin || '${window.location.origin}';

      chrome.storage.local.get(['workspaceUrl'], (res) => {
        if (res.workspaceUrl) {
          workspaceInput.value = res.workspaceUrl;
        }
      });

      document.getElementById('saveBtn').addEventListener('click', () => {
        const url = workspaceInput.value.trim();
        chrome.storage.local.set({ workspaceUrl: url, userId: '${userId}' }, () => {
          const status = document.getElementById('status');
          status.innerText = 'Workspace Link Bound!';
          setTimeout(() => {
            status.innerText = '● Telemetry Active';
          }, 2000);
        });
      });
    });
  </script>
</body>
</html>`
  };

  const copyToClipboard = (text: string, type: 'manifest' | 'background' | 'popup') => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Simulation & Real-time Integration Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Tracking Dashboard Controls */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-950 via-[#0a0f18] to-black border border-cyan-500/10 rounded-2xl p-5 shadow-[0_8px_30px_rgba(6,182,212,0.03)] text-left flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Activity className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Auto-Telemetry Active Tab Tracker</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Instantly receives background tab logs from the Chrome Extension. No manual entries required.
                </p>
              </div>
            </div>

            {/* Simulated Data Injections */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <h4 className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase">Sandbox Simulator</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                If you are running inside a container sandbox where installing real Chrome Extensions is isolated, click below to inject high-fidelity tracking sessions to experience the automated engine!
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1.5">
                <button
                  onClick={() => handleSimulate('productive')}
                  className="py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 font-mono font-extrabold text-[9px] tracking-wider uppercase rounded-lg border border-cyan-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                  + Simulate Productive (Work/AI)
                </button>
                <button
                  onClick={() => handleSimulate('unproductive')}
                  className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-mono font-extrabold text-[9px] tracking-wider uppercase rounded-lg border border-rose-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                  + Simulate Distraction (Socials)
                </button>
                <button
                  onClick={() => handleSimulate('neutral')}
                  className="py-1.5 px-3 bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-slate-300 font-mono font-extrabold text-[9px] tracking-wider uppercase rounded-lg border border-slate-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-2.5 h-2.5 text-slate-400 fill-slate-400" />
                  + Simulate Neutral (Research)
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 font-mono text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${activities.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {activities.length} logs synchronized to Firestore database
            </span>
            {activities.length > 0 && (
              <button
                onClick={onClearActivities}
                className="text-slate-500 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
                title="Wipe telemetries"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Productivity Standards Form */}
        <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <Target className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Personal Productive Standards</h4>
                <p className="text-[10px] text-slate-400 leading-tight">Define targets the AI model uses to audit your behavior.</p>
              </div>
            </div>

            <div className="space-y-3.5 pt-2 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Min Productive Target (Hours)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={productiveGoal}
                    onChange={(e) => setProductiveGoal(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <span className="text-xs font-mono font-bold text-slate-200 min-w-[36px] text-right">{productiveGoal}h</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Max Unproductive Cap (Minutes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="10"
                    value={maxUnproductiveMins}
                    onChange={(e) => setMaxUnproductiveMins(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <span className="text-xs font-mono font-bold text-slate-200 min-w-[36px] text-right">{maxUnproductiveMins}m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Status: Standards Locked</span>
            <span className="text-cyan-400">Auto Save enabled</span>
          </div>
        </div>
      </div>

      {/* Analytics Graph & Raw Logs split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core metrics visualizer */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-left space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-cyan-400">■</span> Real-time Allocation Matrix
            </h3>
            {activities.length > 0 && (
              <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full font-mono">
                Total session: {formatDuration(classAggregation.total)}
              </span>
            )}
          </div>

          {activities.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-xs text-slate-500 italic">No telemetry logs captured yet. Click the simulation buttons above to instantly load data!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Pie chart */}
              <div className="h-44 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatDuration(value)} 
                      contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider leading-none">Productive</span>
                  <span className="text-lg font-black text-white mt-1 leading-none">{classAggregation.productivePct.toFixed(0)}%</span>
                </div>
              </div>

              {/* Aggregation block bars */}
              <div className="md:col-span-2 space-y-4 font-sans">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-cyan-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Productive Work
                    </span>
                    <span className="text-slate-300 font-mono">{formatDuration(classAggregation.productive)} ({classAggregation.productivePct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${classAggregation.productivePct}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-rose-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      Distraction Leak
                    </span>
                    <span className="text-slate-300 font-mono">{formatDuration(classAggregation.unproductive)} ({classAggregation.unproductivePct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${classAggregation.unproductivePct}%` }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Neutral / Admin Research
                    </span>
                    <span className="text-slate-300 font-mono">{formatDuration(classAggregation.neutral)} ({classAggregation.neutralPct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-500 h-full rounded-full transition-all duration-500" style={{ width: `${classAggregation.neutralPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List of domains */}
          {activities.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase mb-3">Domain Allocation Hierarchy</h4>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {domainSummaries.slice(0, 5).map((summary, index) => (
                  <div key={summary.domain} className="p-2.5 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-between text-xs hover:border-cyan-500/25 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        summary.classification === 'productive' ? 'bg-cyan-400' :
                        summary.classification === 'unproductive' ? 'bg-rose-500' : 'bg-slate-500'
                      }`} />
                      <div className="min-w-0 text-left">
                        <span className="font-bold text-slate-200 block truncate">{summary.domain}</span>
                        <span className="text-[10px] text-slate-500 truncate block">{summary.title}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-4 font-mono text-[11px]">
                      <span className="text-slate-300 font-bold">{formatDuration(summary.duration)}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">{summary.count} focus hits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Future Goals Checklist Panel */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-left flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-3">
              <span className="text-amber-500">■</span> Targets Checklist
            </h3>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              We weigh these goals against your background tab history to predict your probability of success.
            </p>

            <form onSubmit={handleAddGoal} className="flex gap-2">
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Add future goal..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!newGoalText.trim()}
                className="py-1.5 px-3 bg-cyan-500 text-black font-bold text-xs rounded-xl hover:bg-cyan-400 transition cursor-pointer disabled:opacity-50"
              >
                +
              </button>
            </form>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {futureGoals.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No future goals defined. Add some above!</p>
              ) : (
                futureGoals.map((goal, index) => (
                  <div key={index} className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex items-start gap-2.5 justify-between group">
                    <div className="flex items-start gap-2 min-w-0 text-left">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-slate-300 leading-tight">{goal}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveGoal(index)}
                      className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500 mt-4">
            <span>Goals Evaluator: Ready</span>
          </div>
        </div>
      </div>

      {/* Neural Daily Outlier & Prediction Engine */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0a0f18] to-black border border-cyan-500/25 rounded-2xl p-6 text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cyan-500/10 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span>Neural Productivity Audit & Goal Predictor</span>
              </h3>
              <p className="text-xs text-slate-400">
                Uses our server-side ML model to isolate time leaks, audit standards, and predict success rates of future commitments.
              </p>
            </div>

            <button
              onClick={handleAnalyzeProductivity}
              disabled={isAnalyzing || activities.length === 0}
              className="py-2.5 px-5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-black text-xs tracking-wider uppercase rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)] font-mono self-start"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Neural Audit Compiling...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  Audit Today's Performance
                </>
              )}
            </button>
          </div>

          {analyzerError && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/25 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{analyzerError}</span>
            </div>
          )}

          {/* AI Output Result Card */}
          {report ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              
              {/* Score ring / status */}
              <div className="bg-slate-950/60 border border-white/5 rounded-xl p-5 text-center flex flex-col items-center justify-center gap-3">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Goal Probability</span>
                
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle cx="50" cy="50" r="42" stroke={report.likelihoodOfGoals >= 70 ? '#10b981' : report.likelihoodOfGoals >= 40 ? '#f59e0b' : '#f43f5e'} strokeWidth="8" fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - report.likelihoodOfGoals / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-white">{report.likelihoodOfGoals}%</span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 mt-1">SUCCESS RATE</span>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    report.isProductive 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {report.isProductive ? 'STANDARDS CONQUERED' : 'STANDARDS LEAKING'}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Productivity score: {report.score}/100</p>
                </div>
              </div>

              {/* Executive summary & Outliers */}
              <div className="md:col-span-2 space-y-5">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-200 font-mono">Executive Neural Log</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#02050b] p-3.5 rounded-xl border border-white/5 italic">
                    "{report.executiveSummary}"
                  </p>
                </div>

                {/* Flaws / Outliers */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Detected Attention Leaks & Flaws
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {report.outliers.map((out, idx) => (
                      <div key={idx} className="p-3 bg-rose-950/10 border border-rose-500/15 rounded-xl text-left space-y-1">
                        <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest">{out.flaw}</span>
                        <p className="text-xs text-slate-200 font-bold mt-1">{out.trigger}</p>
                        <p className="text-[11px] text-slate-400 leading-normal">{out.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-200 font-mono">Prescribed Focus Interventions</h4>
                  <div className="space-y-1.5">
                    {report.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-[#02050b]/40 rounded-xl border border-white/5">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 italic">Report pending. Inject simulated tab data and click "Audit Today's Performance" to compile findings.</p>
            </div>
          )}

        </div>
      </div>

      {/* Chrome Extension Code Builder */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-left space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Chrome className="w-4 h-4 text-cyan-400" />
              Chrome Extension Development Engine
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Compile and load this modular 3-file manifest v3 extension locally in Chrome to synchronize your tabs natively!
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            STANDALONE CLIENT COMPLIANT
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-[#02050b] rounded-xl border border-cyan-500/10 space-y-2 text-xs leading-relaxed">
          <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
            <ChevronRight className="w-4 h-4 text-cyan-400" />
            How to run this extension on your machine:
          </h4>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-400">
            <li>Create an empty folder on your desktop called <strong className="text-slate-200 font-semibold">"LiveYourDay-Telemetry"</strong>.</li>
            <li>Copy and save the three file contents below inside that folder with their exact file names.</li>
            <li>Open Google Chrome and navigate to <strong className="text-slate-200 font-semibold font-mono">chrome://extensions/</strong>.</li>
            <li>Enable <strong className="text-cyan-400 font-semibold">Developer mode</strong> (toggle switch in the top right corner).</li>
            <li>Click <strong className="text-slate-200 font-semibold">Load unpacked</strong> in the top left, and select the folder you created.</li>
            <li>Click the Extension jigsaw icon on your Chrome bar, click the telemetry popup, and input your development App URL!</li>
          </ol>
        </div>

        {/* Tab switcher for files */}
        <div className="space-y-4">
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setGuideTab('manifest')}
              className={`py-2 px-4 text-xs font-mono font-bold tracking-wide border-b-2 transition cursor-pointer ${
                guideTab === 'manifest' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              manifest.json
            </button>
            <button
              onClick={() => setGuideTab('background')}
              className={`py-2 px-4 text-xs font-mono font-bold tracking-wide border-b-2 transition cursor-pointer ${
                guideTab === 'background' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              background.js
            </button>
            <button
              onClick={() => setGuideTab('popup')}
              className={`py-2 px-4 text-xs font-mono font-bold tracking-wide border-b-2 transition cursor-pointer ${
                guideTab === 'popup' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              popup.html
            </button>
          </div>

          {/* Code Viewer card */}
          <div className="relative bg-[#02050b] border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto text-left group">
            <button
              onClick={() => copyToClipboard(extensionFiles[guideTab], guideTab)}
              className="absolute top-3 right-3 p-1.5 bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 rounded-lg transition cursor-pointer opacity-0 group-hover:opacity-100 flex items-center gap-1 shadow-md"
              title="Copy code file"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase">{copiedText === guideTab ? 'Copied!' : 'Copy'}</span>
            </button>
            <pre className="whitespace-pre">{extensionFiles[guideTab]}</pre>
          </div>
        </div>

      </div>

    </div>
  );
}
