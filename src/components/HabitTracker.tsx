/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Flame, Check, Plus, Trash2, Zap } from 'lucide-react';
import { Habit } from '../types';

interface HabitTrackerProps {
  habits: Habit[];
  onAddHabit: (title: string) => void;
  onCompleteHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
}

export default function HabitTracker({ habits, onAddHabit, onCompleteHabit, onDeleteHabit }: HabitTrackerProps) {
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddHabit(newTitle.trim());
    setNewTitle('');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div id="habit-tracker-container" className="bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Reliability habit Streaks
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Stay consistent to escape the crunch cycle</p>
        </div>
      </div>

      {/* Habits list */}
      <div className="space-y-2 mb-4 max-h-[170px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {habits.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center bg-black/20 rounded-xl border border-white/5">
            No habits configured. Build early habits to secure deadlines!
          </p>
        ) : (
          habits.map((habit) => {
            const completedToday = habit.lastCompletedDate === todayStr;
            return (
              <div
                key={habit.id}
                className="flex items-center justify-between p-2.5 bg-black/60 rounded-xl border border-white/5 hover:border-cyan-500/10 transition"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <button
                    onClick={() => onCompleteHabit(habit)}
                    disabled={completedToday}
                    className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-all duration-150 cursor-pointer ${
                      completedToday
                        ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400'
                        : 'bg-white/5 border-white/10 hover:border-cyan-500/50 hover:text-cyan-400'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <span className={`text-xs font-sans truncate ${completedToday ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}>
                    {habit.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 rounded-full border border-cyan-500/20 text-cyan-400 scale-90">
                    <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                    <span className="text-xs font-bold font-mono">{habit.streak}d</span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Stop tracking custom habit "${habit.title}"?`)) {
                        onDeleteHabit(habit.id);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add custom habit */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New custom habit..."
          className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/30"
        />
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="bg-cyan-500/10 hover:bg-cyan-400 text-cyan-400 hover:text-black border border-cyan-500/30 p-1.5 rounded-xl transition duration-150 disabled:opacity-40 flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
