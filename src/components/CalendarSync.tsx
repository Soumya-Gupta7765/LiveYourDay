/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, PlusCircle, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { GoogleCalendarEvent, Task } from '../types';

interface CalendarSyncProps {
  accessToken: string | null;
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onReauthorize?: () => void;
  onInvalidToken?: () => void;
}

export default function CalendarSync({ accessToken, tasks, onTaskUpdated, onReauthorize, onInvalidToken }: CalendarSyncProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedTaskToSchedule, setSelectedTaskToSchedule] = useState<Task | null>(null);
  const [customStartTime, setCustomStartTime] = useState<string>('');
  const [customDuration, setCustomDuration] = useState<number>(1);

  const fetchCalendarEvents = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&maxResults=5&singleEvents=true&orderBy=startTime`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (onInvalidToken) onInvalidToken();
          throw new Error('Google Calendar connection has expired or lacks required permissions. Please reconnect.');
        }
        throw new Error('Failed to fetch events from Google Calendar');
      }

      const data = await res.json();
      setEvents(data.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not read Calendar events. Try reconnecting your Google account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents();
    } else {
      setError(null);
    }
  }, [accessToken]);

  const getDefaultDateTimeString = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0); // Default to next hour
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleInitiateSchedule = (task: Task) => {
    setSelectedTaskToSchedule(task);
    setCustomDuration(task.estimatedEffort || 1);
    setCustomStartTime(getDefaultDateTimeString());
    setError(null);
    setSuccessMsg(null);
  };

  // Actionable Google Calendar Event Creator
  const handleExecuteSchedule = async () => {
    if (!accessToken || !selectedTaskToSchedule) return;

    setSchedulingTaskId(selectedTaskToSchedule.id);
    setError(null);
    setSuccessMsg(null);

    try {
      const focusStart = new Date(customStartTime || getDefaultDateTimeString());
      if (isNaN(focusStart.getTime())) {
        throw new Error('Invalid start time selected. Please choose a valid date and time.');
      }

      // If the scheduled time is in the past, notify the user or handle it nicely
      const focusEnd = new Date(focusStart);
      const effortHours = customDuration || 1;
      focusEnd.setTime(focusEnd.getTime() + Math.ceil(effortHours * 60 * 60 * 1000));

      const eventBody = {
        summary: `🎯 Rescue Block: ${selectedTaskToSchedule.title}`,
        description: `This focus block was scheduled by your Last-Minute Life Saver companion.\n\nConcrete subtasks to tackle:\n${
          selectedTaskToSchedule.subtasks && selectedTaskToSchedule.subtasks.length > 0
            ? selectedTaskToSchedule.subtasks.map((s, idx) => `${idx + 1}. [${s.completed ? 'x' : ' '}] ${s.title}`).join('\n')
            : 'No subtasks recorded.'
        }`,
        start: {
          dateTime: focusStart.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        end: {
          dateTime: focusEnd.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 60 }
          ]
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody),
      });

      if (!res.ok) {
        const errDetails = await res.json().catch(() => ({}));
        const msg = errDetails.error?.message || '';
        if (res.status === 401 || res.status === 403 || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('scope')) {
          if (onInvalidToken) onInvalidToken();
          throw new Error('Google Calendar access is not fully authorized. Please log out and sign in again, making sure to grant/check the permissions to access Google Calendar.');
        }
        throw new Error(msg || 'Failed to communicate with Google Calendar');
      }

      const createdEvent = await res.json();

      // Update Task locally with calendarEventId
      const updatedTask: Task = { ...selectedTaskToSchedule, calendarEventId: createdEvent.id };
      onTaskUpdated(updatedTask);

      setSuccessMsg(`Rescue Block scheduled! Check your Google Calendar for: "${eventBody.summary}"`);
      setSelectedTaskToSchedule(null);
      fetchCalendarEvents();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Call failed');
    } finally {
      setSchedulingTaskId(null);
    }
  };

  const pendingUnscheduledTasks = tasks.filter(t => t.status === 'pending' && !t.calendarEventId);

  return (
    <div id="calendar-sync-container" className="bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Calendar Rescue Sync
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">Lock focus blocks directly onto your schedule</p>
        </div>
        <button
          onClick={fetchCalendarEvents}
          disabled={loading || !accessToken}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition duration-150 disabled:opacity-40 cursor-pointer border border-white/5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          {onReauthorize && (
            <button
              onClick={onReauthorize}
              className="mt-1 self-start py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] uppercase rounded-lg transition-all cursor-pointer"
            >
              Reconnect Google Account
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3 flex items-start gap-2 font-mono">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {!accessToken ? (
        <div className="bg-gradient-to-b from-cyan-950/20 via-[#0a0f18] to-black border border-cyan-500/20 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-4 shadow-[0_10px_30px_rgba(6,182,212,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          
          <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 border border-cyan-500/25 animate-pulse">
            <Calendar className="w-5 h-5" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h4 className="text-sm font-bold text-slate-100">Google Calendar Sync is Offline</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              For your safety, Google limits temporary API sessions to <strong className="text-cyan-400 font-semibold">60 minutes</strong>. Click below to instantly refresh your secure link with a 1-click authorize.
            </p>
          </div>

          {onReauthorize && (
            <button
              onClick={onReauthorize}
              className="py-2.5 px-5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 cursor-pointer flex items-center gap-2"
            >
              1-Click Quick Reconnect
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Upcoming commitments */}
          <div>
            <h4 className="text-xs font-mono text-slate-500 tracking-wide mb-2.5 uppercase">Upcoming Conflicts</h4>
            {loading ? (
              <div className="space-y-2">
                <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
                <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 bg-black/20 border border-white/5 rounded-xl text-center">
                Nothing Scheduled on Google Calendar.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => {
                  const sTime = ev.start.dateTime || ev.start.date || '';
                  const formatted = sTime ? new Date(sTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day';
                  const formattedDate = sTime ? new Date(sTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                  return (
                    <div key={ev.id} className="p-2.5 bg-black/60 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-slate-300 truncate">{ev.summary}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{formattedDate} • {formatted}</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0 shadow-[0_0_8px_rgba(6,182,12,0.8)]" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Autopiloted Time Rescue */}
          <div>
            <h4 className="text-xs font-mono text-slate-500 tracking-wide mb-2.5 uppercase">AI Suggested Blocks</h4>
            {pendingUnscheduledTasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 bg-black/20 border border-white/5 rounded-xl text-center">
                All outstanding tasks scheduled!
              </p>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                {pendingUnscheduledTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="p-2.5 bg-black/60 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-medium text-slate-200 truncate">{task.title}</p>
                      <p className="text-[10px] text-cyan-400 font-mono mt-0.5">Focus Block Proposed</p>
                    </div>
                    <button
                      onClick={() => handleInitiateSchedule(task)}
                      disabled={schedulingTaskId === task.id || (selectedTaskToSchedule !== null && selectedTaskToSchedule.id === task.id)}
                      className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/25 rounded-lg transition duration-150 flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                      title="Schedule Focus Block on Calendar"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom dropdown selector for other pending tasks */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-1.5">Schedule Other Pending Tasks</label>
              <select
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (selectedId) {
                    const t = tasks.find(item => item.id === selectedId);
                    if (t) {
                      handleInitiateSchedule(t);
                    }
                  }
                  e.target.value = ''; // Reset select
                }}
                className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Choose a task to schedule --</option>
                {tasks.filter(t => t.status === 'pending' && !t.calendarEventId).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Custom Inline Confirmation Scheduling Panel */}
      {selectedTaskToSchedule && (
        <div className="mt-5 p-4 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-3.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="overflow-hidden">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Calendar Block Configurator</span>
              <h5 className="text-xs font-bold text-slate-100 truncate mt-0.5">Title: {selectedTaskToSchedule.title}</h5>
            </div>
            <button
              onClick={() => setSelectedTaskToSchedule(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300 bg-white/5 px-2 py-0.5 rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="datetime-local"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 w-full focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Duration (hours)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseFloat(e.target.value) || 1)}
                className="bg-black/60 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 w-full focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={handleExecuteSchedule}
            disabled={schedulingTaskId !== null}
            className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] tracking-wider uppercase rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer disabled:opacity-50"
          >
            {schedulingTaskId !== null ? 'Adding to Google Calendar...' : 'Confirm & Write to Google Calendar'}
          </button>
        </div>
      )}
    </div>
  );
}
