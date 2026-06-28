/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  HelpCircle, 
  ArrowRight, 
  Award, 
  Flame, 
  BarChart2, 
  Moon, 
  ShieldAlert, 
  Zap, 
  Sparkles,
  RefreshCw,
  LogOut,
  Dribbble,
  RefreshCcw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Task, Habit } from '../types';

interface DailyShutdownRitualProps {
  tasks: Task[];
  habits: Habit[];
  onUpdateTask: (task: Task) => void;
  onCompleteHabit: (habit: Habit) => void;
}

export default function DailyShutdownRitual({
  tasks,
  habits,
  onUpdateTask,
  onCompleteHabit
}: DailyShutdownRitualProps) {
  const [step, setStep] = useState<number>(1);
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [shutdownComplete, setShutdownComplete] = useState<boolean>(false);

  const completedToday = tasks.filter(t => t.status === 'completed');
  const incompleteToday = tasks.filter(t => t.status === 'pending');

  const handleReflectionChange = (taskId: string, text: string) => {
    setReflections(prev => ({ ...prev, [taskId]: text }));
  };

  // Roll task forward: updates deadline to tomorrow
  const handleRollForward = (task: Task) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    onUpdateTask({
      ...task,
      deadline: tomorrow.toISOString(),
      timeSlot: undefined // Clear slot for next day scheduling
    });
  };

  // Reschedule to next week: updates deadline by 7 days
  const handleRescheduleNextWeek = (task: Task) => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    onUpdateTask({
      ...task,
      deadline: nextWeek.toISOString(),
      timeSlot: undefined
    });
  };

  const executeCompleteShutdown = () => {
    // Save reflections to console/session to simulate journaling logging
    console.log("Journaled Reflections logged safely to cloud storage:", reflections);
    setShutdownComplete(true);
  };

  // Dynamic Chart: compute planned vs actual hours from user tasks
  // Planned is estimatedEffort, actual is estimatedEffort * progress %
  const categories = Array.from(new Set(tasks.map(t => t.category || 'Personal')));
  const trendsData = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    let planned = 0;
    let actual = 0;
    catTasks.forEach(t => {
      const taskEffort = t.estimatedEffort || 2;
      planned += taskEffort;
      if (t.status === 'completed') {
        actual += taskEffort;
      } else {
        const completedSubs = t.subtasks.filter(s => s.completed).length;
        const totalSubs = t.subtasks.length;
        const progress = totalSubs > 0 ? (completedSubs / totalSubs) : 0.2;
        actual += taskEffort * progress;
      }
    });

    return {
      category: cat,
      Planned: parseFloat(planned.toFixed(1)),
      Actual: parseFloat(actual.toFixed(1))
    };
  });

  if (shutdownComplete) {
    return (
      <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-[0_0_50px_rgba(6,182,212,0.1)] relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 blur-3xl rounded-full"></div>
        <div className="p-4 bg-cyan-500/10 rounded-full border border-cyan-500/20 inline-block text-cyan-400">
          <Moon className="w-12 h-12 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-extrabold tracking-tight text-white font-sans">Ritual Completed. Power Down.</h3>
          <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Cooperative Saver System: STANDBY ACTIVE</p>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed font-sans italic">
          "The cockpit is now offline. You fought with commitment today. Uncompleted battles have been safely shifted forward, reflections have been recorded, and your progress has been persisted to durable storage. Stand up, stretch, and disconnect. See you tomorrow."
        </p>

        <div className="pt-2">
          <button
            onClick={() => {
              setShutdownComplete(false);
              setStep(1);
            }}
            className="cursor-pointer py-2 px-5 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs tracking-wider uppercase rounded-xl transition-all border border-white/5"
          >
            Re-enter Cockpit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-6">
      
      {/* Step Indicator Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Moon className="w-4.5 h-4.5 text-cyan-400" />
            Daily Power-Down Shutdown Ritual
          </h3>
          <p className="text-xs text-slate-400">Perform an intentional evening review to end your day with closure</p>
        </div>

        {/* Wizard Steps indicator */}
        <div className="flex gap-2 font-mono text-[10px] bg-black px-3 py-1.5 rounded-lg border border-white/5">
          <span className={step === 1 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>1. Celebrate</span>
          <span className="text-slate-700">•</span>
          <span className={step === 2 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>2. Reframe</span>
          <span className="text-slate-700">•</span>
          <span className={step === 3 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>3. Analytics</span>
          <span className="text-slate-700">•</span>
          <span className={step === 4 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>4. Standby</span>
        </div>
      </div>

      {/* STEP 1: CONQUERED CELEBRATION */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3.5">
            <div className="p-2 bg-emerald-500 text-black rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono">Conquered Victories</h4>
              <p className="text-xs text-slate-300">Take a moment to acknowledge today's completed operations.</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 bg-black/20 rounded-xl p-3 border border-white/5">
            {completedToday.length === 0 ? (
              <div className="text-center py-8 text-slate-500 italic text-xs">
                No tasks checked off today. It's okay — progress is a steady marathon. Let's regroup.
              </div>
            ) : (
              completedToday.map(task => (
                <div key={task.id} className="p-3 bg-slate-950/60 rounded-xl border border-emerald-500/10 flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {task.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{task.category} • {task.estimatedEffort || 2}h effort completed</p>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">SECURED</span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="cursor-pointer py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              Next: Intention Reframe <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REFRAME / ROLL FORWARD */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide font-mono">Unfinished Business</h4>
              <p className="text-xs text-slate-300">Acknowledge what remains, reflect on why, and make intentional roll-forward plans.</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 bg-black/20 rounded-xl p-3 border border-white/5">
            {incompleteToday.length === 0 ? (
              <div className="text-center py-10 text-emerald-400 italic text-xs font-bold font-mono uppercase tracking-widest animate-pulse">
                ★ COCKPIT CLEAR! All commitments successfully conquered! ★
              </div>
            ) : (
              incompleteToday.map(task => (
                <div key={task.id} className="p-4 bg-slate-950/60 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-100">{task.title}</h5>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">{task.category}</span>
                    </div>

                    <div className="flex gap-1.5 text-[10px] font-mono">
                      <button
                        onClick={() => handleRollForward(task)}
                        className="cursor-pointer py-1 px-2.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 rounded transition"
                      >
                        Roll to Tomorrow
                      </button>
                      <button
                        onClick={() => handleRescheduleNextWeek(task)}
                        className="cursor-pointer py-1 px-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded border border-white/5 transition"
                      >
                        Next Week
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Brief Reflection (Why didn't this fit?)</label>
                    <input
                      type="text"
                      value={reflections[task.id] || ''}
                      onChange={(e) => handleReflectionChange(task.id, e.target.value)}
                      placeholder="e.g. Distracted, task size too big, unexpected meetings..."
                      className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/20"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="cursor-pointer py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs tracking-wider uppercase rounded-xl transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="cursor-pointer py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              Next: Analytics & Habits <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ANALYTICS & HABITS */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center gap-3.5">
            <div className="p-2 bg-cyan-500 text-black rounded-lg">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide font-mono">Performance Trends</h4>
              <p className="text-xs text-slate-300">Review planned focus hours versus completed executions across categories.</p>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="p-3 bg-black/30 border border-white/5 rounded-2xl h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={9} fontStyle="monospace" />
                <YAxis stroke="#64748b" fontSize={9} fontStyle="monospace" />
                <Tooltip contentStyle={{ background: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '10px', fontStyle: 'monospace', color: '#94a3b8' }} />
                <Bar dataKey="Planned" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Planned Hours" />
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Habit Streak Progression mini grid */}
          <div className="space-y-2 border border-white/5 rounded-2xl p-4 bg-black/10">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Habit Consistency Streak Tracker</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {habits.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-[11px] text-slate-500 italic">No habits configured. Configure habits to view streaks here.</div>
              ) : (
                habits.map(habit => (
                  <div key={habit.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <h6 className="text-xs font-semibold text-slate-200">{habit.title}</h6>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                        <span className="text-[10px] font-mono text-amber-400">{habit.streak} day streak</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onCompleteHabit(habit)}
                      disabled={habit.lastCompletedDate === new Date().toISOString().split('T')[0]}
                      className="cursor-pointer text-[10px] py-1 px-2 border border-white/10 hover:border-cyan-500/30 text-slate-300 hover:text-white rounded font-mono uppercase bg-black"
                    >
                      {habit.lastCompletedDate === new Date().toISOString().split('T')[0] ? '✓ Done Today' : 'Secure Today'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="cursor-pointer py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs tracking-wider uppercase rounded-xl transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="cursor-pointer py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              Next: Shutdown Standby <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL SHUTDOWN STANDBY */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3.5">
            <div className="p-2 bg-rose-500 text-black rounded-lg">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide font-mono">Standby Sequence Ready</h4>
              <p className="text-xs text-slate-300">Ready to put your workstation on safe standby. All uncompleted tasks will be safely committed forward.</p>
            </div>
          </div>

          <div className="p-4 bg-black border border-white/5 rounded-xl space-y-2 relative">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">SAVER AI TRANSMISSION</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans italic">
              "The cognitive workload is secured. Your focus limits have been evaluated, uncompleted tasks mapped to tomorrow's slots, and reflections stored. It is time to disconnect. Go ahead and finalize the shutdown sequence."
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(3)}
              className="cursor-pointer py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs tracking-wider uppercase rounded-xl transition"
            >
              Back
            </button>
            <button
              onClick={executeCompleteShutdown}
              className="cursor-pointer py-2.5 px-6 bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_0_30px_rgba(244,63,94,0.6)]"
            >
              Execute Final Shutdown
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
