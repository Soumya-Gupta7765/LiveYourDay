/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  LogOut, 
  Flame, 
  Bot, 
  CheckCircle2, 
  FileText, 
  Zap, 
  Clock, 
  Mic,
  Calendar,
  Layers,
  GraduationCap,
  Moon,
  AlertCircle,
  Activity
} from 'lucide-react';
import { User } from 'firebase/auth';

// Component imports
import TaskPrioritizer from './components/TaskPrioritizer';
import SaverChat from './components/SaverChat';
import DriveScanner from './components/DriveScanner';
import CalendarSync from './components/CalendarSync';
import VoiceAssistant from './components/VoiceAssistant';
import HabitTracker from './components/HabitTracker';
import AccountabilityWallet from './components/AccountabilityWallet';

// Core Planning, Focus, and Reflection additions
import TimeBlockingCalendar from './components/TimeBlockingCalendar';
import PomodoroTimer from './components/PomodoroTimer';
import DailyShutdownRitual from './components/DailyShutdownRitual';
import AutoTracker from './components/AutoTracker';

import { Task, Habit, Recommendation, TabActivity } from './types';
import { 
  initAuth, 
  googleSignIn, 
  logoutUser, 
  fetchTasksFromDb, 
  saveTaskToDb, 
  deleteTaskFromDb,
  fetchHabitsFromDb,
  saveHabitToDb,
  deleteHabitFromDb,
  fetchTabActivitiesFromDb,
  saveTabActivityToDb,
  deleteTabActivityFromDb
} from './firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Core database state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tabActivities, setTabActivities] = useState<TabActivity[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  
  // Dashboard view selection
  const [activeSegment, setActiveSegment] = useState<'priorities' | 'integrations' | 'history' | 'calendar' | 'focus' | 'shutdown' | 'tracker'>('priorities');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Natural Language Quick Add State
  const [nlpText, setNlpText] = useState('');
  const [isNlpParsing, setIsNlpParsing] = useState(false);

  // Authenticate user on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        loadUserData(currentUser.uid);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      let liveTasks = await fetchTasksFromDb(userId);
      
      // AUTO SEED INJECTOR for the Demo Scenario
      if (liveTasks.length === 0) {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const endOfWeek = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

        const seedTasks: Task[] = [
          {
            id: 'demo-completed-1',
            userId,
            title: 'Initial Dashboard Review & Setup',
            description: 'Logged into LiveYourDay dashboard, connected cloud endpoints, and initialized productivity controls.',
            deadline: now.toISOString(),
            priority: 'low',
            status: 'completed',
            category: 'Personal',
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
            estimatedEffort: 0.5,
            riskScore: 5,
            riskLevel: 'safe',
            coachTip: 'Great job initializing your dashboard. You are already in control!',
            subtasks: [
              { id: 'comp-s1', title: 'Review initial prioritized task suggestions', completed: true, estimatedTime: '10m', priority: 'low', order: 1 },
              { id: 'comp-s2', title: 'Configure personal productivity profile', completed: true, estimatedTime: '15m', priority: 'low', order: 2 }
            ]
          },
          {
            id: 'demo-ml',
            userId,
            title: 'ML Assignment: Neural Nets Tuning & Evaluation',
            description: 'Optimize hyper-parameters for CNN modeling, execute loss evaluation on training/cross-val datasets, and write up model behavior analysis report.',
            deadline: tomorrow.toISOString(),
            priority: 'urgent',
            status: 'pending',
            category: 'Academic',
            createdAt: now.toISOString(),
            estimatedEffort: 4.5,
            riskScore: 82,
            riskLevel: 'critical',
            coachTip: 'To beat this extreme deadline, outline your hyper-parameter results in clear bullet points first. Focus hyper-parameter code executions before model validation visualizations.',
            executionPlan: [
              { timeSlot: 'Next 2 Hours', activity: 'Train initial hyperparameter scenarios and save checkpoint logs' },
              { timeSlot: 'Next 1 Hour', activity: 'Compare accuracy curves and draft metrics write-up report' },
              { timeSlot: 'Last 30 Mins', activity: 'Package findings with evaluation code structure and submit' }
            ],
            subtasks: [
              { id: 'ml-s1', title: 'Prepare training hyper-parameter evaluation scripts', completed: false, estimatedTime: '45m', priority: 'high', order: 1 },
              { id: 'ml-s2', title: 'Compile loss charts & comparison graphs', completed: false, estimatedTime: '30m', priority: 'high', order: 2 },
              { id: 'ml-s3', title: 'Draft critical evaluation summary write-up', completed: false, estimatedTime: '1.5h', priority: 'medium', order: 3 }
            ]
          },
          {
            id: 'demo-intern',
            userId,
            title: 'Summer Internship Applications: Resume Refresh',
            description: 'Refactor current resume with latest academic project outcomes and prepare cold application outlines for summer opportunities.',
            deadline: inThreeDays.toISOString(),
            priority: 'high',
            status: 'pending',
            category: 'Career',
            createdAt: now.toISOString(),
            estimatedEffort: 3.0,
            riskScore: 48,
            riskLevel: 'moderate',
            coachTip: 'Keep it descriptive but crisp. Focus heavy impact verbs on quantifiable action points. Work on 3 target company custom cover letter models first.',
            executionPlan: [
              { timeSlot: 'Day 1 Today', activity: 'Align past experiences to resume target descriptions' },
              { timeSlot: 'Day 2 Tomorrow', activity: 'Write and fine-tune cover letters targeting company roles' },
              { timeSlot: 'Day 3 Deadline', activity: 'Review details and submit application packets' }
            ],
            subtasks: [
              { id: 'in-s1', title: 'Extract key performance verbs to rewrite active bullets', completed: false, estimatedTime: '1h', priority: 'high', order: 1 },
              { id: 'in-s2', title: 'Draft tailored pitch statement cover letters', completed: false, estimatedTime: '1.5h', priority: 'medium', order: 2 }
            ]
          },
          {
            id: 'demo-dbms',
            userId,
            title: 'DBMS Project: Full SQL Schema & Queries',
            description: 'Code the transaction processing layer queries, index tables for read optimization, and configure entity-relationship database constraints.',
            deadline: endOfWeek.toISOString(),
            priority: 'medium',
            status: 'pending',
            category: 'Academic',
            createdAt: now.toISOString(),
            estimatedEffort: 6.0,
            riskScore: 28,
            riskLevel: 'safe',
            coachTip: 'Ensure relational integrity constraints are fully initialized. Procastination here will cause snowball decay—schedule small daily SQL executions.',
            executionPlan: [
              { timeSlot: 'Phase 1 - Mon-Tue', activity: 'Map entity relationship layouts on drawing board' },
              { timeSlot: 'Phase 2 - Wed-Thu', activity: 'Translate design into DDL/DML script files' },
              { timeSlot: 'Phase 3 - Fri-Sat', activity: 'Query efficiency tests with read transaction logs' }
            ],
            subtasks: [
              { id: 'db-s1', title: 'Document transaction scenarios mappings', completed: false, estimatedTime: '1.5h', priority: 'high', order: 1 },
              { id: 'db-s2', title: 'Validate logical key constraints indexes', completed: false, estimatedTime: '2h', priority: 'medium', order: 2 }
            ]
          }
        ];

        // Save seeds sequentially to DB
        for (const task of seedTasks) {
          await saveTaskToDb(task).catch(e => console.error('Seed task fail:', e));
        }
        liveTasks = seedTasks;
      }
      
      setTasks(liveTasks);

      let liveHabits = await fetchHabitsFromDb(userId);
      if (liveHabits.length === 0) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const seedHabits: Habit[] = [
          {
            id: 'habit-seed-1',
            userId,
            title: '90-Min Focus Block',
            streak: 5,
            lastCompletedDate: yesterdayStr,
            createdAt: now.toISOString()
          },
          {
            id: 'habit-seed-2',
            userId,
            title: 'Hydration & Daily Walk',
            streak: 8,
            lastCompletedDate: dateStr,
            createdAt: now.toISOString()
          },
          {
            id: 'habit-seed-3',
            userId,
            title: 'EOD Review & Inbox Zero',
            streak: 3,
            lastCompletedDate: yesterdayStr,
            createdAt: now.toISOString()
          }
        ];

        for (const habit of seedHabits) {
          await saveHabitToDb(habit).catch(e => console.error('Seed habit fail:', e));
        }
        liveHabits = seedHabits;
      }
      setHabits(liveHabits);

      let liveActivities = await fetchTabActivitiesFromDb(userId);
      setTabActivities(liveActivities || []);
    } catch (err) {
      console.error('Failed to load durable data from Firestore:', err);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        await loadUserData(result.user.uid);
      }
    } catch (err: any) {
      console.error('Google authorization failed:', err);
      const errStr = err?.message || String(err);
      if (err?.code === 'auth/popup-blocked' || errStr.includes('popup-blocked')) {
        setAuthError('popup-blocked');
      } else {
        setAuthError(errStr || 'An unexpected error occurred during Google Sign-In.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await logoutUser();
      setUser(null);
      setToken(null);
      setTasks([]);
      setHabits([]);
      setTabActivities([]);
      setRecommendations([]);
      setNeedsAuth(true);
    }
  };

  const handleInvalidToken = () => {
    setToken(null);
    localStorage.removeItem('google_oauth_access_token');
  };

  const handleAddTabActivity = async (activity: TabActivity) => {
    setTabActivities((prev) => [activity, ...prev]);
    await saveTabActivityToDb(activity).catch(e => console.error('Failed to save tab activity:', e));
  };

  const handleClearTabActivities = async () => {
    if (window.confirm('Are you sure you want to delete all synchronized active tab logs?')) {
      for (const act of tabActivities) {
        await deleteTabActivityFromDb(act.id).catch(e => console.error('Delete activity error:', e));
      }
      setTabActivities([]);
    }
  };

  // Add Task Callback
  const handleAddTask = async (taskTemplate: Omit<Task, 'id' | 'userId' | 'createdAt' | 'status'>) => {
    if (!user) return;
    const newTask: Task = {
      ...taskTemplate,
      id: Math.random().toString(),
      userId: user.uid,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Optimistic local state update
    setTasks(prev => [newTask, ...prev]);
    // Save to Firestore for durability
    await saveTaskToDb(newTask);
  };

  // Natural Language Intelligence NLP Quick Add Handler
  const handleNlpQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;
    setIsNlpParsing(true);
    try {
      const res = await fetch('/api/ai/parse-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: nlpText,
          currentLocalTime: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error('NLP Parsing failed');
      const data = await res.json();
      
      if (data && data.title) {
        await handleAddTask({
          title: data.title,
          description: data.description || 'Parsed via natural language intelligence',
          deadline: data.deadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          priority: data.priority || 'medium',
          category: data.category || 'Personal',
          subtasks: [],
          urgencyRating: data.urgencyRating || 5,
          importanceRating: data.importanceRating || 5,
          priorityScore: data.priorityScore || ((data.urgencyRating || 5) * (data.importanceRating || 5)),
          recurrence: data.recurrence || 'none',
          contextTags: data.contextTags || []
        });
        setNlpText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsNlpParsing(false);
    }
  };

  // Update Task Callback
  const handleUpdateTask = async (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    await saveTaskToDb(updatedTask);
  };

  // Delete Task Callback
  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await deleteTaskFromDb(taskId);
  };

  // Bulk update (AI responses mapping)
  const handleBulkUpdateTasks = async (updatedTasks: Task[], newRecs: Recommendation[]) => {
    setTasks(updatedTasks);
    setRecommendations(newRecs);
    // Write batch sequentially
    for (const task of updatedTasks) {
      await saveTaskToDb(task);
    }
  };

  // Add Habit Callback
  const handleAddHabit = async (title: string) => {
    if (!user) return;
    const newHabit: Habit = {
      id: Math.random().toString(),
      userId: user.uid,
      title,
      streak: 0,
      createdAt: new Date().toISOString()
    };
    setHabits(prev => [...prev, newHabit]);
    await saveHabitToDb(newHabit);
  };

  // Complete Habit Callback
  const handleCompleteHabit = async (habit: Habit) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (habit.lastCompletedDate === todayStr) return;

    const updatedHabit: Habit = {
      ...habit,
      streak: habit.streak + 1,
      lastCompletedDate: todayStr
    };
    setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit : h));
    await saveHabitToDb(updatedHabit);
  };

  // Delete Habit Callback
  const handleDeleteHabit = async (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    await deleteHabitFromDb(habitId);
  };

  // Compute stats & find most urgent task
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const totalStreaks = habits.reduce((sum, h) => sum + h.streak, 0);

  // Sorting Pending Tasks to locate the absolute single most urgent threat
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
  const mostUrgentTask = sortedPendingTasks[0] || null;

  // Compute remaining minutes for the hero section
  const getMinutesLeftText = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diff < 0) return { label: 'OVERDUE', isOverdue: true };
    const mins = Math.round(diff / (1000 * 60));
    if (mins < 60) return { label: `${mins} Minutes`, isOverdue: false };
    const hrs = Math.round(diff / (1000 * 60 * 60));
    if (hrs < 24) return { label: `${hrs} Hours`, isOverdue: false };
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return { label: `${days} Days`, isOverdue: false };
  };

  // Authenticate Interface (Pristine, High-Contrast Google Login Card with Cyan Glows)
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#05070A] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Immersive grid & cyan glowing orb */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] select-none pointer-events-none" />
        
        <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-[0_0_50px_rgba(6,182,212,0.1)] relative z-10 text-center">
          <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 inline-block mb-6 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-10 h-10 animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-bold font-sans tracking-tight text-white mb-2 leading-tight">
            LiveYour<span className="text-cyan-400">Day</span>
          </h1>
          <p className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase mb-4">AI Productivity Companion</p>
          
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            An AI-powered emergency cockpit. Directly scan assignment files, extract looming project deadlines, create low-friction subtasks, and lock focus slots straight onto your calendar.
          </p>

          {authError && (
            <div className="mb-6 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-left text-xs text-rose-200">
              <div className="flex items-start gap-2.5 mb-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-rose-300">
                  {authError === 'popup-blocked' 
                    ? 'Sign-in popup blocked' 
                    : 'Authorization issue'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed mb-3">
                {authError === 'popup-blocked'
                  ? 'Your browser blocked the Google sign-in window. This is common when applications run inside preview frames.'
                  : `Authentication failed: ${authError}`}
              </p>
              <div className="space-y-2 bg-black/30 p-3 rounded-xl border border-white/5 font-sans text-[11px] text-slate-400">
                <p className="font-semibold text-slate-300">How to fix this:</p>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Enable popups for this site in your browser's address bar.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>Or **open this application in a new tab** using the button in the top right corner of the preview area. It will sign you in instantly!</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3.5 bg-white hover:bg-slate-100 text-slate-900 font-medium py-3.5 px-4 rounded-xl border border-slate-200 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.1)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.3)] transition-all duration-150 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Bot className="w-5 h-5 text-cyan-600 animate-spin" />
              ) : (
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
              <span className="font-bold text-sm">Authorize with Google</span>
            </button>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              Auto-declares reading credentials for Calendar and Drive
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Active User Immersive Interface
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 flex flex-col md:flex-row font-sans transition-all overflow-x-hidden">
      
      {/* Sidebar Navigation - Immersive UI Style */}
      <aside className="w-full md:w-64 bg-[#07090e]/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col gap-6 shrink-0 shadow-2xl">
        
        {/* Branding Logo - Ultra Premium Catchy Marketing Style */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-cyan-950/30 via-[#0a0f18]/90 to-black/50 border border-cyan-500/25 rounded-2xl shadow-[0_8px_32px_0_rgba(6,182,212,0.08),inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden group transition-all duration-500 hover:border-cyan-400/50 hover:shadow-[0_12px_40px_0_rgba(6,182,212,0.15)] hover:-translate-y-0.5">
          {/* Subtle Cyber Grid/Line background decorations */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:10px_10px] opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-tr from-cyan-500/10 to-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          
          {/* Icon Badge with Pulse Aura */}
          <div className="relative shrink-0">
            <span className="absolute -inset-1 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 blur-sm opacity-40 group-hover:opacity-100 group-hover:blur-md transition duration-500 animate-pulse" />
            <div className="relative w-12 h-12 bg-slate-950/95 border border-cyan-500/30 rounded-xl flex items-center justify-center shadow-inner transform group-hover:rotate-6 group-hover:scale-105 transition-all duration-500">
              <svg className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Typography */}
          <div className="flex flex-col min-w-0 z-10">
            <h1 className="text-[21px] font-black tracking-tight text-white leading-none flex items-center">
              <span>Live</span>
              <span className="text-cyan-400 font-extrabold">Your</span>
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(45,212,191,0.2)] ml-0.5">Day</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[8px] font-extrabold font-mono text-cyan-400/80 tracking-widest uppercase">NEURAL ENGINE</span>
            </div>
          </div>
        </div>

        {/* Command Center Tabs */}
        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveSegment('priorities')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'priorities'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'priorities' ? 'text-cyan-400 scale-110' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Command Center</span>
            {activeSegment === 'priorities' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveSegment('calendar')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'calendar'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Calendar className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'calendar' ? 'text-cyan-400 scale-110' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Time-Blocking</span>
            {activeSegment === 'calendar' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveSegment('focus')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'focus'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Clock className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'focus' ? 'text-cyan-400 scale-110 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Focus Sprints</span>
            {activeSegment === 'focus' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveSegment('shutdown')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'shutdown'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300 font-semibold shadow-[0_0_15px_rgba(244,63,94,0.05)]'
                : 'border-transparent text-rose-400/75 hover:text-rose-200 hover:bg-rose-500/5'
            }`}
          >
            <Moon className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'shutdown' ? 'text-rose-400 scale-110' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Shutdown Ritual</span>
            {activeSegment === 'shutdown' && (
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveSegment('integrations')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'integrations'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Zap className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'integrations' ? 'text-cyan-400 scale-110' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Intelligent Intake</span>
            {activeSegment === 'integrations' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveSegment('history')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'history'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'history' ? 'text-cyan-400 scale-110' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Conquered Logs</span>
            {completedTasks.length > 0 ? (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full transition-colors ${activeSegment === 'history' ? 'bg-cyan-400/20 text-cyan-300' : 'bg-emerald-500/15 text-emerald-400'}`}>
                {completedTasks.length}
              </span>
            ) : activeSegment === 'history' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveSegment('tracker')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
              activeSegment === 'tracker'
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Activity className={`w-4 h-4 transition-transform duration-300 ${activeSegment === 'tracker' ? 'text-cyan-400 scale-110' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold tracking-wide flex-1 text-left">Auto-Telemetry</span>
            {tabActivities.length > 0 ? (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full transition-colors ${activeSegment === 'tracker' ? 'bg-cyan-400/20 text-cyan-300' : 'bg-cyan-500/15 text-cyan-400'}`}>
                {tabActivities.length}
              </span>
            ) : activeSegment === 'tracker' && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>
        </nav>

        {/* Neural active safeguards or active assistant feedback */}
        <div className="mt-auto p-4 bg-gradient-to-b from-cyan-950/10 to-cyan-950/20 border border-cyan-500/15 rounded-2xl backdrop-blur-md shadow-[0_4px_20px_rgba(6,182,212,0.02),_inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50" />
          <div className="pl-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400"></span>
              </span>
              <span className="text-[9px] tracking-wider text-cyan-400 font-bold font-mono uppercase">AI Copilot Active</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic font-sans">
              {pendingTasks.length > 0 
                ? `"I have processed your deadlines. Check your ${mostUrgentTask?.title || 'commitments'} checklist."`
                : `"Systems fully green! Ready to scan your local folders or drive files for upcoming battles."`}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="border-b border-white/5 bg-black/40 px-6 py-4.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          <div>
            <h2 className="text-xs font-mono font-bold text-cyan-400 tracking-wide flex items-center gap-1.5">
              <span>Neural Control Center</span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">A calm, intelligent workspace to prioritize, schedule, and conquer your commitments.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-mono font-bold tracking-wide flex items-center gap-2 transition cursor-pointer ${
                isChatOpen 
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'bg-white/5 border-white/10 hover:border-cyan-500/30 text-slate-300'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              AI Copilot: {isChatOpen ? 'Active' : 'Ready'}
            </button>

            {user && (
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/5 px-3 py-1 rounded-xl">
                {user.photoURL ? (
                  <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName || 'Profile'} className="w-5.5 h-5.5 rounded-full" />
                ) : (
                  <div className="h-5.5 w-5.5 rounded-full bg-cyan-600 text-black flex items-center justify-center font-bold text-xs uppercase font-mono">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <span className="text-[11px] font-mono font-normal text-slate-200 hidden sm:inline">{user.displayName || 'Saver User'}</span>
                <button
                  onClick={handleLogout}
                  className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title="Force exit cockpit"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Primary Page Canvas */}
        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* Core Telemetry Widgets */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-slate-400 font-medium">Live Commitments</p>
                <p className="text-base font-bold font-mono text-white">{tasks.length}</p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-slate-400 font-medium">Critical Threat State</p>
                <p className="text-base font-bold font-mono text-white">{pendingTasks.length} Pending</p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-slate-400 font-medium">Conquered Iterations</p>
                <p className="text-base font-bold font-mono text-white">{completedTasks.length}</p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <Flame className="w-5 h-5 fill-amber-500/20" />
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-slate-400 font-medium">Autopilot Integrity</p>
                <p className="text-base font-bold font-mono text-white">{totalStreaks} days consistency</p>
              </div>
            </div>
          </section>

          {/* Intelligence Layer: Natural Language Quick Add Bar */}
          <section className="bg-slate-950/40 border border-cyan-500/10 hover:border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.05)] transition-all">
            <form onSubmit={handleNlpQuickAdd} className="flex gap-3 items-center">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-pulse" />
              <input
                type="text"
                value={nlpText}
                onChange={(e) => setNlpText(e.target.value)}
                disabled={isNlpParsing}
                placeholder="Intelligence quick-add: e.g. 'Project kickoff next Thursday at 3pm @laptop urgency 8 importance 9'"
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 focus:ring-0 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isNlpParsing || !nlpText.trim()}
                className="cursor-pointer px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 hover:border-cyan-500 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition disabled:opacity-50"
              >
                {isNlpParsing ? 'AI Parsing...' : 'Parse & Add'}
              </button>
            </form>
          </section>

          {/* Dynamic Interactive Segment Grid */}
          <div className="transition-all">
            {activeSegment === 'priorities' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                  {mostUrgentTask && (
                    <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-[#05070A] border border-white/10 rounded-2xl p-5 overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full -mr-16 -mt-16"></div>
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 h-full">
                        <div className="space-y-1.5 max-w-xl text-left">
                          <span className="text-[9px] font-mono font-bold text-rose-500 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 inline-block animate-pulse">
                            Urgent Intervention Required
                          </span>
                          <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                            {mostUrgentTask.title}
                          </h2>
                          <p className="text-slate-400 text-xs font-sans leading-relaxed">
                            {mostUrgentTask.description || 'Decompose and address this looming deadline using active focus controls.'}
                          </p>
                          <div className="flex flex-wrap gap-3 pt-1 font-mono text-[10px]">
                            <div>
                              <span className="text-slate-500">Looming: </span>
                              <span className="text-rose-400 font-bold">
                                {getMinutesLeftText(mostUrgentTask.deadline).label}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Steps: </span>
                              <span className="text-cyan-400 font-bold">{mostUrgentTask.subtasks.length} subtasks</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setIsChatOpen(true)}
                          className="sm:self-center py-2 px-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] tracking-wider uppercase rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer text-center shrink-0"
                        >
                          Decompose & Plan
                        </button>
                      </div>
                    </div>
                  )}

                  <TaskPrioritizer
                    tasks={tasks}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onBulkUpdateTasks={handleBulkUpdateTasks}
                    recommendations={recommendations}
                  />
                </div>
                <div className="space-y-6">
                  <AccountabilityWallet
                    tasks={tasks}
                    onUpdateTask={handleUpdateTask}
                  />
                  <HabitTracker
                    habits={habits}
                    onAddHabit={handleAddHabit}
                    onCompleteHabit={handleCompleteHabit}
                    onDeleteHabit={handleDeleteHabit}
                  />
                  <CalendarSync
                    accessToken={token}
                    tasks={tasks}
                    onTaskUpdated={handleUpdateTask}
                    onReauthorize={handleLogin}
                    onInvalidToken={handleInvalidToken}
                  />
                </div>
              </div>
            )}

            {activeSegment === 'calendar' && (
              <div className="animate-fade-in">
                <TimeBlockingCalendar
                  tasks={tasks}
                  onUpdateTask={handleUpdateTask}
                />
              </div>
            )}

            {activeSegment === 'focus' && (
              <div className="animate-fade-in">
                <PomodoroTimer
                  tasks={tasks}
                  onUpdateTask={handleUpdateTask}
                />
              </div>
            )}

            {activeSegment === 'shutdown' && (
              <div className="animate-fade-in">
                <DailyShutdownRitual
                  tasks={tasks}
                  habits={habits}
                  onUpdateTask={handleUpdateTask}
                  onCompleteHabit={handleCompleteHabit}
                />
              </div>
            )}

            {activeSegment === 'integrations' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
                <VoiceAssistant onTaskExtracted={handleAddTask} />
                <DriveScanner accessToken={token} onTaskImportCount={handleAddTask} onReauthorize={handleLogin} onInvalidToken={handleInvalidToken} />
              </div>
            )}

            {activeSegment === 'history' && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
                  <div>
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                      <span className="text-emerald-400 font-mono">■</span> Conquered Project Logs
                    </h3>
                    <p className="text-xs text-slate-400">Chronological list of successfully completed operations</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                      Autopilot Cleared
                    </span>
                  </div>
                </div>

                {completedTasks.length === 0 ? (
                  <div className="text-center py-12 bg-black/20 rounded-xl border border-white/5 p-4">
                    <p className="text-xs text-slate-500 italic">No completed operations yet. Finish a task to log tactical outcomes here!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="p-4 bg-slate-950/60 rounded-xl border border-white/5 hover:border-emerald-500/20 transition flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {task.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">{task.description || 'No description recorded.'}</p>
                          <div className="flex gap-2.5 mt-1 text-[9px] font-mono text-slate-500">
                            <span>Category: {task.category}</span>
                            <span>•</span>
                            <span>Decomposed steps: {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] font-mono text-emerald-400 tracking-wider">SECURED</span>
                          <p className="text-[9px] text-slate-500 mt-0.5">{new Date(task.deadline).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSegment === 'tracker' && (
              <div className="animate-fade-in">
                <AutoTracker
                  activities={tabActivities}
                  onAddActivity={handleAddTabActivity}
                  onClearActivities={handleClearTabActivities}
                  userId={user?.uid || 'guest'}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Persistent/Collapsible Right Sidebar: Saver AI Support Channel */}
      {isChatOpen && (
        <aside className="w-full md:w-80 bg-black/30 border-t md:border-t-0 md:border-l border-white/5 p-5 flex flex-col shrink-0">
          <SaverChat tasks={tasks} />
        </aside>
      )}
    </div>
  );
}

