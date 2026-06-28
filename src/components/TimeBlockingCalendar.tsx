/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Zap, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  Coffee,
  HelpCircle,
  Activity
} from 'lucide-react';
import { Task } from '../types';

interface TimeBlockingCalendarProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

const HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", 
  "18:00", "19:00", "20:00", "21:00"
];

// Focus/Energy classification by hour
const getEnergyZone = (hourStr: string) => {
  const hour = parseInt(hourStr.split(':')[0]);
  if (hour >= 8 && hour <= 11) {
    return { name: "Morning Peak Focus", icon: Zap, color: "text-amber-400 bg-amber-400/5 border-amber-500/10", label: "⚡ High Energy" };
  }
  if (hour >= 13 && hour <= 15) {
    return { name: "Afternoon Slump", icon: Coffee, color: "text-slate-400 bg-slate-400/5 border-slate-500/10", label: "☕ Lower Energy" };
  }
  if (hour >= 18 && hour <= 21) {
    return { name: "Evening Sprint", icon: Zap, color: "text-cyan-400 bg-cyan-400/5 border-cyan-500/10", label: "⚡ Peak Focus" };
  }
  return { name: "Routine Blocks", icon: Clock, color: "text-slate-500 bg-slate-500/5 border-white/5", label: "⚙️ Steady Focus" };
};

export default function TimeBlockingCalendar({
  tasks,
  onUpdateTask
}: TimeBlockingCalendarProps) {
  const [isSmartScheduling, setIsSmartScheduling] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const scheduledTasks = tasks.filter(t => t.status === 'pending' && t.timeSlot);
  const unscheduledTasks = tasks.filter(t => t.status === 'pending' && !t.timeSlot);

  // Calculate total scheduled hours for overload warnings (assume 1 hour per scheduled slot)
  const totalScheduledHours = scheduledTasks.length;
  const isOverloaded = totalScheduledHours > 8;

  // Smart AI Scheduling request
  const runSmartScheduling = async () => {
    if (pendingTasks.length === 0) return;
    setIsSmartScheduling(true);
    try {
      const response = await fetch('/api/ai/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: pendingTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            estimatedEffort: t.estimatedEffort || 2,
            deadline: t.deadline
          })),
          currentLocalTime: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Smart scheduling failed');
      const timeSlotsMapping = await response.json();

      // Update tasks with their assigned slots
      Object.keys(timeSlotsMapping).forEach(taskId => {
        const t = tasks.find(item => item.id === taskId);
        if (t) {
          onUpdateTask({
            ...t,
            timeSlot: timeSlotsMapping[taskId]
          });
        }
      });
    } catch (err) {
      console.error(err);
      // Fallback local schedule heuristic
      const slots = [...HOURS];
      let slotIdx = 1; // start at 09:00
      unscheduledTasks.forEach(t => {
        if (slotIdx < slots.length) {
          onUpdateTask({ ...t, timeSlot: slots[slotIdx] });
          slotIdx += 1;
        }
      });
    } finally {
      setIsSmartScheduling(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, hour: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onUpdateTask({
        ...task,
        timeSlot: hour
      });
    }
    setDraggedTaskId(null);
  };

  const handleRemoveSlot = (task: Task) => {
    onUpdateTask({
      ...task,
      timeSlot: undefined,
      deepWorkBlock: false
    });
  };

  const toggleDeepWork = (task: Task) => {
    onUpdateTask({
      ...task,
      deepWorkBlock: !task.deepWorkBlock
    });
  };

  const handleAssignSlot = (taskId: string, hour: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onUpdateTask({
        ...task,
        timeSlot: hour
      });
    }
  };

  return (
    <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4.5 h-4.5 text-cyan-400" />
            Tactical Time-Blocking Planner
          </h3>
          <p className="text-xs text-slate-400">Lock tasks into active focus slots to commit your focus today</p>
        </div>

        <button
          onClick={runSmartScheduling}
          disabled={isSmartScheduling || pendingTasks.length === 0}
          className="cursor-pointer bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/20 hover:border-cyan-500 px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:hover:bg-cyan-500/10 disabled:hover:text-cyan-400"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          {isSmartScheduling ? 'Calculating Focus Flow...' : 'AI Smart Schedule'}
        </button>
      </div>

      {/* Cognitive Overload Warning */}
      {isOverloaded && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3.5 items-start animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide font-mono">Cognitive Overload Alert</h4>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              You have scheduled <strong>{totalScheduledHours} hours</strong> of intensive focus block today. Human cognitive focus peaks around 4 hours daily. Consider rolling non-critical tasks forward to tomorrow to keep quality optimal.
            </p>
          </div>
        </div>
      )}

      {/* Main Dual Column Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Timeline Grid (8 cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Active Schedule Blocks</span>
            <span className="text-[10px] font-mono text-cyan-400/80 uppercase">{totalScheduledHours} Blocks Locked</span>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {HOURS.map((hour) => {
              const zone = getEnergyZone(hour);
              const ZoneIcon = zone.icon;
              
              // Find task scheduled in this slot
              const slotTask = tasks.find(t => t.status === 'pending' && t.timeSlot === hour);

              return (
                <div 
                  key={hour}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, hour)}
                  className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    slotTask 
                      ? slotTask.deepWorkBlock 
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-cyan-950/15 border-cyan-500/20'
                      : 'bg-black/20 hover:bg-black/40 border-white/5 border-dashed'
                  }`}
                >
                  {/* Time Badge and Energy Indicators */}
                  <div className="flex items-center gap-3">
                    <div className="text-right flex-shrink-0 w-11">
                      <span className="text-xs font-mono font-extrabold text-slate-300 block">{hour}</span>
                      <span className="text-[8px] font-mono text-slate-500 block uppercase">1 hour</span>
                    </div>

                    <div className="h-6 w-px bg-white/10" />

                    {/* Left Column content: Task details or empty slot helper */}
                    {slotTask ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-100">{slotTask.title}</span>
                          <span className="text-[9px] font-mono text-slate-500 uppercase px-1 rounded bg-black">
                            {slotTask.category}
                          </span>
                          {slotTask.deepWorkBlock && (
                            <span className="text-[8px] font-mono bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-0.5">
                              <Lock className="w-2 h-2" /> Protected Deep Work
                            </span>
                          )}
                        </div>
                        {slotTask.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">{slotTask.description}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ZoneIcon className={`w-3.5 h-3.5 ${zone.color.split(' ')[0]}`} />
                        <span className={`text-[10px] font-mono tracking-wide ${zone.color.split(' ')[0]}`}>
                          {zone.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-sans italic">
                          - Drop a commitment here to time-block
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2">
                    {slotTask ? (
                      <>
                        <button
                          onClick={() => toggleDeepWork(slotTask)}
                          title={slotTask.deepWorkBlock ? "Disable deep work protection" : "Enable deep work shield (auto-declines requests)"}
                          className={`p-1.5 rounded-lg border cursor-pointer transition ${
                            slotTask.deepWorkBlock 
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                              : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {slotTask.deepWorkBlock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleRemoveSlot(slotTask)}
                          title="Remove from time slot"
                          className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <select
                        onChange={(e) => handleAssignSlot(e.target.value, hour)}
                        defaultValue=""
                        className="bg-slate-900 border border-white/10 rounded-lg py-1 px-1.5 text-[10px] text-slate-400 focus:outline-none focus:border-cyan-500/30 max-w-28 cursor-pointer"
                      >
                        <option value="" disabled>Quick Assign</option>
                        {unscheduledTasks.map(ut => (
                          <option key={ut.id} value={ut.id}>{ut.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unscheduled Drawer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-white/5 bg-slate-950/60 rounded-2xl p-4.5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold font-mono tracking-wide text-slate-300 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                Unscheduled Queue ({unscheduledTasks.length})
              </h4>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Drag commitments directly onto timeline hour blocks, or use the drop-down selectors to lock down your focus periods.
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {unscheduledTasks.length === 0 ? (
                <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5 p-3">
                  <p className="text-[10px] text-slate-500 italic">No unscheduled tasks left. All system commitments have been time-blocked!</p>
                </div>
              ) : (
                unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="p-3 bg-black/50 border border-white/5 hover:border-cyan-500/20 rounded-xl transition cursor-grab active:cursor-grabbing flex flex-col gap-2 relative group"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition line-clamp-1">{task.title}</span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`text-[8px] font-mono px-1 rounded uppercase font-bold ${
                            task.priority === 'urgent' ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[8px] font-mono text-cyan-400 bg-slate-900 px-1 rounded">
                            {task.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-slate-500">
                          {task.estimatedEffort || 2}h
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
