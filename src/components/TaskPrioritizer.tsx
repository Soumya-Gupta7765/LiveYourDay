/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Clock, 
  Folder, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square,
  BarChart2,
  Calendar,
  LifeBuoy,
  ShieldAlert,
  Activity,
  Zap
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Task, SubTask, TaskPriority, Recommendation } from '../types';

interface TaskPrioritizerProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'userId' | 'createdAt' | 'status'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onBulkUpdateTasks: (updatedTasks: Task[], newRecs: Recommendation[]) => void;
  recommendations: Recommendation[];
}

export default function TaskPrioritizer({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onBulkUpdateTasks,
  recommendations
}: TaskPrioritizerProps) {
  // Manual Task Creation State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Academic');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // New Core Planning state fields
  const [importanceRating, setImportanceRating] = useState<number>(5);
  const [urgencyRating, setUrgencyRating] = useState<number>(5);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'weekdays' | 'biweekly' | 'second-tuesday' | 'last-day-of-month'>('none');
  const [tagsInput, setTagsInput] = useState<string>('');

  // Contact detail fields for missed deadline alerts
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Apology Generator states
  const [isGeneratingApologyTaskId, setIsGeneratingApologyTaskId] = useState<string | null>(null);
  const [apologyDraft, setApologyDraft] = useState<{
    subject: string;
    body: string;
    contactEmail: string;
    contactName: string;
    taskTitle: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Monetary Penalty Form State
  const [penaltyEnabled, setPenaltyEnabled] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState(5);
  const [penaltyTarget, setPenaltyTarget] = useState('The Black Hole');

  // AI Autopilot loading state
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isRescuingTaskId, setIsRescuingTaskId] = useState<string | null>(null);
  const [taskDetailTab, setTaskDetailTab] = useState<'checklist' | 'schedule' | 'contact'>('checklist');

  // LiveYourDay: Dynamic Real-time Risk Score & Level Evaluation Engine
  const getTaskRiskInfo = (task: Task, workload: number) => {
    if (task.status === 'completed') {
      return { score: 0, level: 'safe', label: 'CONQUERED', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', barColor: 'bg-emerald-500' };
    }
    
    // If AI score is present, utilize it
    if (task.riskScore !== undefined && task.riskLevel !== undefined) {
      let color = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      let barColor = 'bg-emerald-500';
      if (task.riskLevel === 'moderate') {
        color = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        barColor = 'bg-amber-500';
      } else if (task.riskLevel === 'high') {
        color = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
        barColor = 'bg-orange-500';
      } else if (task.riskLevel === 'critical') {
        color = 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse';
        barColor = 'bg-rose-500';
      }
      return {
        score: task.riskScore,
        level: task.riskLevel,
        label: task.riskLevel.toUpperCase() + ' RISK',
        color,
        barColor
      };
    }

    // Dynamic Calculation formula (Fallback)
    const diff = new Date(task.deadline).getTime() - new Date().getTime();
    if (diff <= 0) {
      return { score: 100, level: 'critical', label: 'CRITICAL RISK', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse', barColor: 'bg-rose-500' };
    }
    
    const hoursRemaining = diff / (1000 * 60 * 60);
    const effort = task.estimatedEffort || (task.subtasks.length > 0 ? task.subtasks.reduce((sum, s) => sum + (s.estimatedTime?.includes('h') ? parseFloat(s.estimatedTime) : 0.4), 0) : 3);
    
    let score = Math.min(100, Math.round((effort / hoursRemaining) * 75 + (workload * 4)));
    if (hoursRemaining < 12) {
      score = Math.max(score, 85); // emergency minimum for sub-12 hour tasks
    } else if (hoursRemaining < 24) {
      score = Math.max(score, 60);
    }
    
    let level: 'safe' | 'moderate' | 'high' | 'critical' = 'safe';
    let color = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    let barColor = 'bg-emerald-500';
    
    if (score >= 75 || hoursRemaining < 6) {
      level = 'critical';
      color = 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse';
      barColor = 'bg-rose-500';
    } else if (score >= 50) {
      level = 'high';
      color = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      barColor = 'bg-orange-500';
    } else if (score >= 25) {
      level = 'moderate';
      color = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      barColor = 'bg-amber-500';
    }

    return { score, level, label: level.toUpperCase() + ' RISK', color, barColor };
  };

  // Rescue Mode handler - makes an API request and commits rescueState to the task model
  const triggerRescueMode = async (task: Task) => {
    setIsRescuingTaskId(task.id);
    try {
      const response = await fetch('/api/ai/rescue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            title: task.title,
            description: task.description,
            deadline: task.deadline,
            subtasks: task.subtasks
          },
          currentLocalTime: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Rescue Mode generation failed');
      }

      const rescuePlan = await response.json();
      
      onUpdateTask({
        ...task,
        rescueModeActive: true,
        rescuePlan
      });
      // Expand the task to show immediate plan
      setExpandedTaskId(task.id);
    } catch (err) {
      console.error(err);
      alert('Emergency rescue plan could not be compiled. Focus on high-value items!');
    } finally {
      setIsRescuingTaskId(null);
    }
  };

  const deactivateRescueMode = (task: Task) => {
    onUpdateTask({
      ...task,
      rescueModeActive: false
    });
  };

  const handleGenerateApology = async (task: Task) => {
    if (!task.contactEmail) return;
    setIsGeneratingApologyTaskId(task.id);
    setIsCopied(false);
    try {
      const response = await fetch('/api/ai/generate-apology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description,
          deadline: task.deadline,
          contactName: task.contactName || 'Valued Contact',
          contactEmail: task.contactEmail
        })
      });

      if (!response.ok) {
        throw new Error('Apology generation failed');
      }

      const data = await response.json();
      setApologyDraft({
        subject: data.subject || `Apology: Delay regarding "${task.title}"`,
        body: data.body || '',
        contactEmail: task.contactEmail,
        contactName: task.contactName || '',
        taskTitle: task.title
      });
    } catch (err) {
      console.error(err);
      // Fallback local apology
      setApologyDraft({
        subject: `Apology: Delay regarding "${task.title}"`,
        body: `Dear ${task.contactName || 'Valued Contact'},\n\nI hope you are doing well.\n\nI am writing to sincerely apologize for missing our deadline of ${new Date(task.deadline).toLocaleDateString()} for the task: "${task.title}".\n\nI am working diligently on completing this task right now and expect to have it finalized as soon as possible. Thank you for your patience and understanding.\n\nBest regards,\n[Your Name]`,
        contactEmail: task.contactEmail,
        contactName: task.contactName || '',
        taskTitle: task.title
      });
    } finally {
      setIsGeneratingApologyTaskId(null);
    }
  };

  // Helper: calculation of days/hours left
  const getDeadlineText = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diff < 0) {
      return { text: 'Overdue', color: 'text-rose-400 font-extrabold animate-pulse' };
    }
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) {
      return { text: `In ${mins}m`, color: 'text-amber-400 font-bold' };
    }
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    if (hrs < 24) {
      return { text: `In ${hrs}h`, color: 'text-amber-400 font-semibold' };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { text: `In ${days} days`, color: 'text-slate-300' };
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    // Smart context tags parsing (auto-extract words starting with @)
    const autoTags = (title.trim() + " " + description.trim()).match(/@\w+/g) || [];
    const manualTags = tagsInput.split(',').map(t => t.trim()).filter(t => t.startsWith('@'));
    const allTags = Array.from(new Set([...autoTags, ...manualTags]));

    const calculatedScore = urgencyRating * importanceRating;
    
    // Auto-promote priority based on score mapping
    let derivedPriority = priority;
    if (calculatedScore >= 75) {
      derivedPriority = 'urgent';
    } else if (calculatedScore >= 50) {
      derivedPriority = 'high';
    } else if (calculatedScore >= 20) {
      derivedPriority = 'medium';
    } else {
      derivedPriority = 'low' as any;
    }

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      deadline,
      priority: derivedPriority,
      category,
      subtasks: [],
      penaltyEnabled,
      penaltyAmount,
      penaltyTarget,
      penaltyStatus: penaltyEnabled ? 'active' : undefined,
      urgencyRating,
      importanceRating,
      priorityScore: calculatedScore,
      recurrence,
      contextTags: allTags,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined
    });

    setTitle('');
    setDescription('');
    setDeadline('');
    setPriority('medium');
    setImportanceRating(5);
    setUrgencyRating(5);
    setRecurrence('none');
    setTagsInput('');
    setContactName('');
    setContactEmail('');
    setPenaltyEnabled(false);
    setPenaltyAmount(5);
    setPenaltyTarget('The Black Hole');
  };

  const toggleSubtask = (task: Task, subId: string) => {
    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  const addManualSubtask = (task: Task, subTitle: string) => {
    if (!subTitle.trim()) return;
    const newSub: SubTask = {
      id: Math.random().toString(),
      title: subTitle.trim(),
      completed: false
    };
    onUpdateTask({ ...task, subtasks: [...task.subtasks, newSub] });
  };

  const runAiAutopilot = async () => {
    if (tasks.length === 0) return;
    setIsPrioritizing(true);
    try {
      const response = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            deadline: t.deadline,
            priority: t.priority,
            subtasks: t.subtasks
          })),
          currentLocalTime: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('AI Prioritization call failed');
      }

      const data = await response.json();
      
      // Map AI prioritization back into original files
      const mergedTasks = tasks.map(originalTask => {
        const aiTaskMatch = (data.tasks || []).find((at: any) => at.id === originalTask.id);
        if (aiTaskMatch) {
          // Parse and merge subtasks
          const mergedSubtasks = originalTask.subtasks.length === 0 
            ? aiTaskMatch.subtasks 
            : originalTask.subtasks.map(originalSub => {
                const stepMatch = (aiTaskMatch.subtasks || []).find(
                  (as: any) => as.title.toLowerCase() === originalSub.title.toLowerCase()
                );
                return {
                  ...originalSub,
                  estimatedTime: stepMatch?.estimatedTime || '15m',
                  priority: stepMatch?.priority || 'medium',
                  order: stepMatch?.order || 1
                };
              });

          return {
            ...originalTask,
            priority: aiTaskMatch.priority as TaskPriority,
            suggestedScheduleTime: aiTaskMatch.suggestedScheduleTime,
            estimatedEffort: aiTaskMatch.estimatedEffort,
            riskScore: aiTaskMatch.riskScore,
            riskLevel: aiTaskMatch.riskLevel,
            coachTip: aiTaskMatch.coachTip,
            executionPlan: aiTaskMatch.executionPlan,
            subtasks: mergedSubtasks
          };
        }
        return originalTask;
      });

      onBulkUpdateTasks(mergedTasks, data.recommendations || []);
    } catch (err) {
      console.error(err);
      alert('Failed to trigger AI Autopilot optimization.');
    } finally {
      setIsPrioritizing(false);
    }
  };

  // Recharts: Priority distribution chart data
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;

  const urgentCount = pendingTasks.filter(t => t.priority === 'urgent').length;
  const highCount = pendingTasks.filter(t => t.priority === 'high').length;
  const medCount = pendingTasks.filter(t => t.priority === 'medium').length;

  const chartData = [
    { name: 'Overdue / Urgent', value: urgentCount, color: '#f43f5e' },
    { name: 'High Priority', value: highCount, color: '#f59e0b' },
    { name: 'Medium Priority', value: medCount, color: '#3b82f6' },
    { name: 'Completed', value: completedTasksCount, color: '#10b981' },
  ].filter(item => item.value > 0);

  // Sorting Pending Tasks (Urgent first, then closest deadline)
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
    const weightDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const displayedTasks = activeTab === 'pending' ? sortedPendingTasks : tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* AI Recommendations Banner */}
      {recommendations.length > 0 && (
        <div id="ai-recs-banner" className="bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-cyan-500/10 border border-white/5 rounded-2xl p-4.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            Looming Threat AI Diagnostics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-3 bg-black/60 rounded-xl border border-white/5 hover:bg-black/80 transition flex flex-col justify-between">
                <div>
                  <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded-full mb-1.5 uppercase ${
                    rec.badge === 'Critical' 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                      : rec.badge === 'Quick Win' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {rec.badge}
                  </span>
                  <h5 className="text-xs font-semibold text-slate-200">{rec.title}</h5>
                  <p className="text-[11px] text-slate-400 mt-1 font-sans">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Add Task & Active Tasks */}
      <div id="tasks-main-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Register Task */}
        <div className="bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-3.5">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              Commitment intake
            </h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Homework, Electric Bill..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Brief Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your goals or material instructions..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Work">Corporate</option>
                    <option value="Personal">Personal</option>
                    <option value="Finance">Bill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Starting Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Priority Scoring Matrix */}
              <div className="border border-white/5 rounded-2xl p-3 bg-black/40 space-y-3.5">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                  ⚡ Smart Priority Matrix (Urgency × Importance)
                </span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex justify-between text-[9px] font-mono text-slate-400 uppercase mb-1">
                      <span>Importance</span>
                      <span className="text-cyan-400 font-bold">{importanceRating}/10</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={importanceRating}
                      onChange={(e) => setImportanceRating(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="flex justify-between text-[9px] font-mono text-slate-400 uppercase mb-1">
                      <span>Urgency</span>
                      <span className="text-cyan-400 font-bold">{urgencyRating}/10</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={urgencyRating}
                      onChange={(e) => setUrgencyRating(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                  <span className="text-slate-500">Calculated Priority Score:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded ${
                    importanceRating * urgencyRating >= 75 
                      ? 'bg-rose-500/10 text-rose-400' 
                      : importanceRating * urgencyRating >= 50 
                      ? 'bg-amber-500/10 text-amber-400' 
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {importanceRating * urgencyRating} / 100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Recurrence</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as any)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 animate-fade-in"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="second-tuesday">Every 2nd Tuesday</option>
                    <option value="last-day-of-month">Last Day of Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Context Tags</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="@laptop, @phone"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Exact Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1"
                />
              </div>

              {/* Linked Recipient Contact for delay apologies */}
              <div className="border border-white/5 rounded-2xl p-3 bg-black/40 space-y-3">
                <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                  ✉️ Linked Apology Recipient
                </span>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  If you miss this deadline, we'll draft an intelligent, template-based apology email for them in one click.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Boss/Prof"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. boss@corp.com"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Monetary Pledge */}
              <div className="border border-white/5 rounded-2xl p-3 bg-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1.5 uppercase">
                    🔒 Accountability Penalty
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={penaltyEnabled} 
                      onChange={(e) => setPenaltyEnabled(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                {penaltyEnabled && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        Pledged Amount
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[5, 10, 25, 50].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setPenaltyAmount(amt)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer ${
                              penaltyAmount === amt 
                                ? 'bg-rose-500 text-black shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                                : 'bg-black/60 text-slate-400 border border-white/5 hover:border-white/10'
                            }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        Forfeit Target Charity
                      </label>
                      <select
                        value={penaltyTarget}
                        onChange={(e) => setPenaltyTarget(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-rose-500/20"
                      >
                        <option value="The Black Hole">The Black Hole (Burn Pool)</option>
                        <option value="Clean the Oceans Org">Clean the Oceans Org 🌊</option>
                        <option value="Save the Koalas Fund">Save the Koalas Fund 🐨</option>
                        <option value="Anti-Procrastination Fund">Anti-Procrastination Fund ⚡</option>
                        <option value="Rival Team Donation">Rival Sports Team Donation ⚽</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition duration-200 mt-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Commitment
              </button>
            </form>
          </div>

          {/* Stress chart overlay */}
          {tasks.length > 0 && (
            <div className="border-t border-slate-800/80 pt-4 mt-5">
              <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                Deadline Stress Diagnostic
              </h4>
              <div className="h-28 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={22}
                      outerRadius={38}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#020617', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Active Tasks List */}
        <div className="col-span-1 lg:col-span-2 bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`text-xs font-bold font-mono tracking-wide uppercase cursor-pointer ${
                    activeTab === 'pending' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400'
                  }`}
                >
                  Active Panic ({pendingTasks.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`text-xs font-bold font-mono tracking-wide uppercase cursor-pointer ${
                    activeTab === 'completed' ? 'text-emerald-400 border-b-2 border-emerald-500 pb-1' : 'text-slate-400'
                  }`}
                >
                  Conquered ({completedTasksCount})
                </button>
              </div>

              {pendingTasks.length > 0 && activeTab === 'pending' && (
                <button
                  onClick={runAiAutopilot}
                  disabled={isPrioritizing}
                  className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/25 px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse group-hover:text-black" />
                  {isPrioritizing ? 'Autopiloting...' : 'Prioritize & Breakdown (AI)'}
                </button>
              )}
            </div>

            {/* List */}
            {displayedTasks.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-xl border border-white/5 p-4">
                <p className="text-xs text-slate-500 italic">No tasks listed here. Add tasks or scan a Google Drive document to proceed.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                {(() => {
                  const pendingCount = tasks.filter(t => t.status === 'pending').length;
                  return displayedTasks.map((task) => {
                    const deadlineStatus = getDeadlineText(task.deadline);
                    const isExpanded = expandedTaskId === task.id;
                    const riskInfo = getTaskRiskInfo(task, pendingCount);
                    
                    // Progress calculating
                    const completedCount = task.subtasks.filter(s => s.completed).length;
                    const totalSubtasks = task.subtasks.length;
                    const percent = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
                    const isUrgent = task.priority === 'urgent' && task.status === 'pending';

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl bg-black/60 border transition-all relative overflow-hidden ${
                          task.rescueModeActive
                            ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-gradient-to-b from-rose-950/20 to-black/80'
                            : isUrgent
                            ? 'border-rose-500/30 hover:border-rose-500/50 shadow-[0_4px_12px_rgba(239,68,68,0.05)]'
                            : 'border-white/5 hover:border-cyan-500/20'
                        }`}
                      >
                        {/* Status blinking line for Rescue Mode */}
                        {task.rescueModeActive && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 animate-pulse" />
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {/* Main checkoff */}
                            {task.status === 'pending' ? (
                              <button
                                onClick={() => onUpdateTask({ ...task, status: 'completed' })}
                                className="p-1 mt-0.5 bg-white/5 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-500 transition cursor-pointer"
                                title="Conquer task"
                              >
                                <Square className="w-4.5 h-4.5" />
                              </button>
                            ) : (
                              <div className="p-1 mt-0.5 text-emerald-400">
                                <CheckCircle className="w-4.5 h-4.5" />
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h4 className={`text-xs font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                                  {task.title}
                                </h4>
                                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                  task.priority === 'urgent' ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-slate-400'
                                }`}>
                                  {task.priority}
                                </span>
                                
                                <span className="text-[10px] bg-black text-slate-400 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                                  <Folder className="w-3 h-3 text-cyan-400" />
                                  {task.category}
                                </span>

                                {/* Effort Display Badge */}
                                <span className="text-[10px] bg-slate-900/80 text-cyan-300 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  {task.estimatedEffort || (totalSubtasks > 0 ? (totalSubtasks * 0.75).toFixed(1) : '2.0')}h effort
                                </span>

                                {/* Risk Badge */}
                                <span className={`text-[9px] font-mono font-bold py-0.5 px-2 rounded-full ${riskInfo.color}`}>
                                  {riskInfo.label} ({riskInfo.score}%)
                                </span>

                                {/* Penalty Pledge Badge */}
                                {task.penaltyEnabled && (
                                  <span className={`text-[9px] font-mono font-bold py-0.5 px-2 rounded-full flex items-center gap-1 ${
                                    task.penaltyStatus === 'forfeited'
                                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      : task.status === 'completed' || task.penaltyStatus === 'saved'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse'
                                  }`}>
                                    <span>🔒</span>
                                    <span>
                                      ${(task.penaltyAmount || 5).toFixed(2)} 
                                      {task.penaltyStatus === 'forfeited' 
                                        ? ` Forfeited to ${task.penaltyTarget || 'Target'}` 
                                        : task.status === 'completed' || task.penaltyStatus === 'saved'
                                        ? ' Saved' 
                                        : ' Pledged'}
                                    </span>
                                  </span>
                                )}
                              </div>

                              {/* Context tags, Recurrence, and Scheduled slot */}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {task.contextTags && task.contextTags.map(tag => (
                                  <span key={tag} className="text-[9px] font-mono font-bold bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                                {task.recurrence && task.recurrence !== 'none' && (
                                  <span className="text-[9px] bg-slate-900/60 text-slate-400 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1">
                                    🔄 {task.recurrence}
                                  </span>
                                )}
                                {task.timeSlot && (
                                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1">
                                    📅 Scheduled: {task.timeSlot}
                                  </span>
                                )}
                                {task.priorityScore && (
                                  <span className="text-[9px] bg-slate-900/80 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                                    ⚡ Priority Score: {task.priorityScore}
                                  </span>
                                )}
                                {task.contactEmail && (
                                  <span className="text-[9px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/15 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1">
                                    ✉️ Apology Linked: {task.contactName ? `${task.contactName} (${task.contactEmail})` : task.contactEmail}
                                  </span>
                                )}
                              </div>
                              
                              {task.description && (
                                <p className="text-[11px] text-slate-400 mt-1.5 font-sans">{task.description}</p>
                              )}

                              {/* Coach Tip pill if provided by AI */}
                              {task.coachTip && task.status === 'pending' && !task.rescueModeActive && (
                                <div className="mt-1.5 p-2 bg-cyan-950/20 border border-cyan-500/10 rounded-xl text-[10px] text-cyan-300 leading-normal font-sans flex items-start gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                                  <span>{task.coachTip}</span>
                                </div>
                              )}

                              {/* Inferred link references */}
                              {task.googleDriveFileName && (
                                <p className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                                  🔗 Attached: {task.googleDriveFileName}
                                </p>
                              )}

                              {task.suggestedScheduleTime && (
                                <p className="text-[10px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-400" />
                                  Focus window: {task.suggestedScheduleTime}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end flex-shrink-0 text-right">
                            <p className={`text-[10px] font-mono ${deadlineStatus.color}`}>
                              {deadlineStatus.text}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                              {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Rescue Mode Survival Panel (Extreme focus layout if active) */}
                        {task.rescueModeActive && task.rescuePlan && (
                          <div className="mt-3.5 p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-3 shadow-inner">
                            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                              <span className="text-xs font-mono font-bold text-rose-400 flex items-center gap-1.5">
                                <LifeBuoy className="w-4 h-4 text-rose-500 animate-spin" />
                                EMERGENCY SURVIVAL PROTOCOL
                              </span>
                              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                            </div>

                            <div className="p-3 bg-black/70 border border-rose-500/30 rounded-lg">
                              <span className="text-[9px] font-mono uppercase bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded">Immediate Objective</span>
                              <p className="text-xs font-bold text-white mt-1.5 leading-relaxed font-sans flex items-start gap-1.5">
                                <span className="text-rose-500 flex-shrink-0">🎯</span>
                                {task.rescuePlan.immediateAction}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-[9px] font-mono uppercase text-rose-300">Streamlined Rescue Timeline</span>
                              <div className="space-y-1 bg-black/40 rounded-lg p-2 divide-y divide-rose-950/20 text-[10.5px]">
                                {task.rescuePlan.timeline.map((item, idx) => (
                                  <div key={idx} className="flex gap-2.5 py-1.5 font-mono">
                                    <span className="text-rose-400 font-bold w-24 flex-shrink-0">{item.timeSlot}</span>
                                    <span className="text-slate-300">{item.activity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-2.5 bg-rose-950/15 border border-rose-500/10 rounded-lg text-[10px] text-rose-300 leading-normal font-mono">
                              <span className="font-bold block text-[9.5px] uppercase mb-1">Survival Hacks:</span>
                              <div className="whitespace-pre-line">{task.rescuePlan.tips}</div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => deactivateRescueMode(task)}
                                className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-900 border border-white/5 rounded-lg px-2.5 py-1 hover:bg-rose-950/20 transition cursor-pointer"
                              >
                                Restore standard timeline
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Expandable areas */}
                        <div className="mt-3 border-t border-slate-900/80 pt-2.5">
                          {!task.rescueModeActive && (
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setExpandedTaskId(isExpanded ? null : task.id);
                                    setTaskDetailTab('checklist');
                                  }}
                                  className={`text-[10px] font-mono px-2 py-1 rounded-md transition cursor-pointer ${
                                    isExpanded && taskDetailTab === 'checklist'
                                      ? 'bg-slate-900 text-slate-100 border border-white/5'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Checklist ({completedCount}/{totalSubtasks})
                                </button>
                                {task.executionPlan && (
                                  <button
                                    onClick={() => {
                                      setExpandedTaskId(isExpanded ? null : task.id);
                                      setTaskDetailTab('schedule');
                                    }}
                                    className={`text-[10px] font-mono px-2 py-1 rounded-md transition cursor-pointer ${
                                      isExpanded && taskDetailTab === 'schedule'
                                        ? 'bg-slate-900 text-slate-100 border border-white/5'
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                  >
                                    AI Schedule
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setExpandedTaskId(isExpanded ? null : task.id);
                                    setTaskDetailTab('contact');
                                  }}
                                  className={`text-[10px] font-mono px-2 py-1 rounded-md transition cursor-pointer ${
                                    isExpanded && taskDetailTab === 'contact'
                                      ? 'bg-slate-900 text-slate-100 border border-white/5'
                                      : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Apology Contact {task.contactEmail ? '✓' : ''}
                                </button>
                              </div>
                              
                              {/* Risk rating level indicator bar */}
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-slate-500">Risk Meter</span>
                                <div className="w-20 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                  <div className={`h-full ${riskInfo.barColor}`} style={{ width: `${riskInfo.score}%` }} />
                                </div>
                                <span className="text-[9px] font-mono text-slate-400">{riskInfo.score}%</span>
                              </div>
                            </div>
                          )}

                          {isExpanded && !task.rescueModeActive && (
                            <div className="mt-2.5 pl-2.5 space-y-2">
                              {taskDetailTab === 'checklist' ? (
                                <>
                                  <div className="space-y-1.5">
                                    {task.subtasks.map((sub) => (
                                      <div key={sub.id} className="flex items-center justify-between gap-2 text-xs font-sans group">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => toggleSubtask(task, sub.id)}
                                            className="text-slate-500 hover:text-emerald-400 flex-shrink-0 cursor-pointer"
                                          >
                                            {sub.completed ? (
                                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                              <Square className="w-4 h-4" />
                                            )}
                                          </button>
                                          <span className={`text-[11px] font-medium leading-relaxed ${sub.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                            {sub.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          {sub.estimatedTime && (
                                            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/30 px-1 rounded">
                                              {sub.estimatedTime}
                                            </span>
                                          )}
                                          {sub.priority && (
                                            <span className={`text-[8px] font-mono uppercase px-1 rounded ${
                                              sub.priority === 'high' ? 'text-rose-400 bg-rose-950/30' : 'text-slate-500 bg-slate-900'
                                            }`}>
                                              {sub.priority}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Add manual starter step */}
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const inputNode = e.currentTarget.elements.namedItem('subtaskTitle') as HTMLInputElement;
                                      if (inputNode.value.trim()) {
                                        addManualSubtask(task, inputNode.value);
                                        inputNode.value = '';
                                      }
                                    }}
                                    className="flex gap-2 mt-2 pt-1 border-t border-slate-950"
                                  >
                                    <input
                                      name="subtaskTitle"
                                      placeholder="Insert custom actionable subtask step..."
                                      className="bg-slate-950 border border-slate-900/60 rounded-lg px-2 py-1 text-[10px] text-slate-300 w-full placeholder-slate-600 focus:outline-none"
                                    />
                                  </form>
                                </>
                              ) : taskDetailTab === 'schedule' ? (
                                <div className="space-y-2 bg-slate-950/40 p-3 rounded-lg border border-white/5">
                                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 mb-2">
                                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                    <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400">Tactical Execution Schedule</span>
                                  </div>
                                  <div className="space-y-2 font-mono text-[10.5px]">
                                    {task.executionPlan?.map((planItem, planIdx) => (
                                      <div key={planIdx} className="flex gap-2 text-slate-300">
                                        <span className="text-cyan-400 font-bold w-24 flex-shrink-0">{planItem.timeSlot}</span>
                                        <span>{planItem.activity}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-white/5">
                                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 mb-1.5">
                                    <span>✉️</span>
                                    <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400">Linked Contact Settings</span>
                                  </div>
                                  
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const formData = new FormData(e.currentTarget);
                                      const nameVal = formData.get('inlineContactName') as string;
                                      const emailVal = formData.get('inlineContactEmail') as string;
                                      onUpdateTask({
                                        ...task,
                                        contactName: nameVal.trim() || undefined,
                                        contactEmail: emailVal.trim() || undefined
                                      });
                                      alert('Contact information updated for this task.');
                                    }}
                                    className="space-y-3"
                                  >
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Recipient Name</label>
                                        <input
                                          name="inlineContactName"
                                          defaultValue={task.contactName || ''}
                                          placeholder="e.g. Boss Name"
                                          className="bg-slate-950 border border-slate-900/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 w-full focus:outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Recipient Email</label>
                                        <input
                                          type="email"
                                          name="inlineContactEmail"
                                          defaultValue={task.contactEmail || ''}
                                          placeholder="e.g. boss@corp.com"
                                          className="bg-slate-950 border border-slate-900/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 w-full focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    <button
                                      type="submit"
                                      className="py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] rounded-md transition cursor-pointer"
                                    >
                                      Save Contact Details
                                    </button>
                                  </form>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Task Item Actions Footer block */}
                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-900/60">
                          {/* Left: Emergency Rescue Button */}
                          {task.status === 'pending' && (
                            <button
                              onClick={() => triggerRescueMode(task)}
                              disabled={isRescuingTaskId !== null}
                              className={`p-1 px-2.5 rounded-lg text-[10px] transition font-mono flex items-center gap-1.5 ${
                                task.rescueModeActive
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 border border-rose-500/15'
                              }`}
                            >
                              {isRescuingTaskId === task.id ? (
                                <>
                                  <div className="w-3 h-3 rounded-full border border-rose-400 border-t-transparent animate-spin" />
                                  Composing plan...
                                </>
                              ) : (
                                <>
                                  <LifeBuoy className={`w-3.5 h-3.5 ${task.rescueModeActive ? 'animate-pulse' : ''}`} />
                                  Rescue Me
                                </>
                              )}
                            </button>
                          )}

                          {task.status === 'pending' && new Date(task.deadline).getTime() < Date.now() && task.contactEmail && (
                            <button
                              onClick={() => handleGenerateApology(task)}
                              disabled={isGeneratingApologyTaskId !== null}
                              className="p-1 px-2.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black border border-cyan-500/25 text-cyan-400 rounded-lg text-[10px] transition font-mono flex items-center gap-1.5 cursor-pointer ml-2"
                            >
                              {isGeneratingApologyTaskId === task.id ? (
                                <>
                                  <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" />
                                  Drafting Apology...
                                </>
                              ) : (
                                <>
                                  <span>✉️</span>
                                  Draft Apology (AI)
                                </>
                              )}
                            </button>
                          )}

                          {task.status === 'pending' && new Date(task.deadline).getTime() < Date.now() && !task.contactEmail && (
                            <button
                              onClick={() => {
                                setExpandedTaskId(task.id);
                                setTaskDetailTab('contact');
                              }}
                              className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5 rounded-lg text-[10px] transition font-mono flex items-center gap-1.5 cursor-pointer ml-2"
                            >
                              <span>✉️</span>
                              Link Apology Contact
                            </button>
                          )}

                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this commitment?')) {
                                  onDeleteTask(task.id);
                                }
                              }}
                              className="p-1 px-2.5 bg-slate-900 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 text-[10px] transition cursor-pointer flex items-center gap-1 border border-white/5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* AI Generated Apology Preview Modal */}
      {apologyDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b0f17] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-gradient-to-r from-cyan-950/20 to-black/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">AI Apology Assistant</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Drafted for task: "{apologyDraft.taskTitle}"</p>
                </div>
              </div>
              <button 
                onClick={() => setApologyDraft(null)}
                className="text-slate-500 hover:text-slate-300 transition text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form / Scrollable content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Recipient Email</label>
                <input
                  type="email"
                  value={apologyDraft.contactEmail}
                  onChange={(e) => setApologyDraft({ ...apologyDraft, contactEmail: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Email Subject</label>
                <input
                  type="text"
                  value={apologyDraft.subject}
                  onChange={(e) => setApologyDraft({ ...apologyDraft, subject: e.target.value })}
                  placeholder="Subject Line"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Apology Draft Body</label>
                <textarea
                  value={apologyDraft.body}
                  onChange={(e) => setApologyDraft({ ...apologyDraft, body: e.target.value })}
                  rows={12}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 font-sans leading-relaxed resize-y min-h-[250px]"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-white/5 bg-black/40 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={() => setApologyDraft(null)}
                className="px-4 py-2 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition cursor-pointer"
              >
                Discard Draft
              </button>
              
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(apologyDraft.body);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 ${
                  isCopied 
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/5'
                }`}
              >
                {isCopied ? (
                  <>
                    <span>✓</span> Copied to Clipboard
                  </>
                ) : (
                  <>
                    <span>📋</span> Copy Message Body
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const mailtoUrl = `mailto:${encodeURIComponent(apologyDraft.contactEmail)}?subject=${encodeURIComponent(apologyDraft.subject)}&body=${encodeURIComponent(apologyDraft.body)}`;
                  window.location.href = mailtoUrl;
                }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
              >
                <span>🚀</span> Open in Email Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
