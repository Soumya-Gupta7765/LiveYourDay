/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  CheckCircle, 
  Zap, 
  Award, 
  AlertCircle,
  Volume2,
  VolumeX,
  ListTodo,
  Lock,
  Unlock,
  Maximize2,
  ShieldAlert
} from 'lucide-react';
import { Task, SubTask } from '../types';

interface PomodoroTimerProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

type TimerMode = 'work' | 'break';

export default function PomodoroTimer({
  tasks,
  onUpdateTask
}: PomodoroTimerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [mode, setMode] = useState<TimerMode>('work');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [completedSessions, setCompletedSessions] = useState<number>(0);
  
  // Custom durations (minutes)
  const [workDuration, setWorkDuration] = useState<number>(25);
  const [breakDuration, setBreakDuration] = useState<number>(5);

  // Extreme lockdown & security features
  const [extremeLockEnabled, setExtremeLockEnabled] = useState<boolean>(true);
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);
  const [focusViolations, setFocusViolations] = useState<number>(0);
  const [showViolationOverlay, setShowViolationOverlay] = useState<boolean>(false);
  const [emergencyHoldTime, setEmergencyHoldTime] = useState<number>(0);
  const emergencyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const activeTask = tasks.find(t => t.id === selectedTaskId);

  // Set default selected task if none is selected
  useEffect(() => {
    if (!selectedTaskId && pendingTasks.length > 0) {
      setSelectedTaskId(pendingTasks[0].id);
    }
  }, [pendingTasks, selectedTaskId]);

  // Audio completion cue utilizing Web Audio API Synthesizer (iframe safe!)
  const triggerAlarmSynth = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playBeep(523.25, now, 0.15); // C5
      playBeep(659.25, now + 0.18, 0.15); // E5
      playBeep(783.99, now + 0.36, 0.3); // G5
    } catch (e) {
      console.log('Web Audio Synth play failed:', e);
    }
  };

  // Acoustic Violation Warning Tone
  const triggerViolationSynth = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, audioCtx.currentTime); // Low disruptive frequency buzz
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log('Violation Synth failed:', e);
    }
  };

  // Main countdown timer interval loop
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleTimerExpiry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, workDuration, breakDuration]);

  // Fullscreen event listener to track focus compliance
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreenActive(isCurrentlyFullscreen);
      
      // If user manually exits fullscreen during a work sprint under extreme lock mode
      if (!isCurrentlyFullscreen && isRunning && mode === 'work' && extremeLockEnabled) {
        setShowViolationOverlay(true);
        triggerViolationSynth();
        setFocusViolations(prev => prev + 1);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isRunning, mode, extremeLockEnabled]);

  // Document tab switch or window focus loss listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isRunning && mode === 'work' && extremeLockEnabled) {
        // Tab changed/minimized - intercept distraction
        triggerViolationSynth();
        setFocusViolations(prev => prev + 1);
        setShowViolationOverlay(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && mode === 'work' && extremeLockEnabled) {
        e.preventDefault();
        e.returnValue = 'Focus block in progress! Leaving now will abort your streak.';
        return e.returnValue;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning, mode, extremeLockEnabled]);

  const handleTimerExpiry = () => {
    triggerAlarmSynth();
    
    // Automatically release browser Fullscreen when sprint ends
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
    setShowViolationOverlay(false);

    if (mode === 'work') {
      setCompletedSessions(prev => prev + 1);
      setMode('break');
      setSecondsLeft(breakDuration * 60);
    } else {
      setMode('work');
      setSecondsLeft(workDuration * 60);
    }
  };

  const reengageFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenActive(true);
      setShowViolationOverlay(false);
    } catch (err) {
      console.warn('Re-engage fullscreen request failed:', err);
      // Fallback: clear the screen overlay anyway if request failed due to permissions
      setShowViolationOverlay(false);
    }
  };

  const toggleStartPause = async () => {
    if (!isRunning) {
      // Starting Focus Timer
      setIsRunning(true);
      if (mode === 'work' && extremeLockEnabled) {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            setIsFullscreenActive(true);
          }
          setShowViolationOverlay(false);
        } catch (err) {
          console.warn('Fullscreen entry rejected or deferred:', err);
        }
      }
    } else {
      // Pausing timer (Releases fullscreen)
      setIsRunning(false);
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.log(err);
        }
      }
    }
  };

  // Emergency quit abort - user has to hold for 3 seconds
  const startEmergencyHold = () => {
    setEmergencyHoldTime(0);
    emergencyTimerRef.current = setInterval(() => {
      setEmergencyHoldTime(prev => {
        if (prev >= 100) {
          clearInterval(emergencyTimerRef.current!);
          emergencyTimerRef.current = null;
          handleEmergencyQuit();
          return 100;
        }
        return prev + 5; // 2 seconds total hold
      });
    }, 100);
  };

  const stopEmergencyHold = () => {
    if (emergencyTimerRef.current) {
      clearInterval(emergencyTimerRef.current);
      emergencyTimerRef.current = null;
    }
    setEmergencyHoldTime(0);
  };

  const handleEmergencyQuit = () => {
    setIsRunning(false);
    setShowViolationOverlay(false);
    setEmergencyHoldTime(0);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft((mode === 'work' ? workDuration : breakDuration) * 60);
    setShowViolationOverlay(false);
  };

  const handleDurationChange = (type: TimerMode, mins: number) => {
    const validMins = Math.max(1, Math.min(180, mins));
    if (type === 'work') {
      setWorkDuration(validMins);
      if (mode === 'work') setSecondsLeft(validMins * 60);
    } else {
      setBreakDuration(validMins);
      if (mode === 'break') setSecondsLeft(validMins * 60);
    }
    setIsRunning(false);
  };

  const handleToggleSubtask = (subId: string) => {
    if (!activeTask) return;
    const updated = activeTask.subtasks.map(s => 
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    onUpdateTask({ ...activeTask, subtasks: updated });
  };

  const handleMarkTaskCompleted = () => {
    if (!activeTask) return;
    onUpdateTask({ ...activeTask, status: 'completed' });
    setSelectedTaskId('');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSecondsAllocated = (mode === 'work' ? workDuration : breakDuration) * 60;
  const progressPercent = ((totalSecondsAllocated - secondsLeft) / totalSecondsAllocated) * 100;

  // Immersive Lockdown Overlay render trigger condition
  const showImmersiveLockdown = isRunning && mode === 'work' && extremeLockEnabled && isFullscreenActive && !showViolationOverlay;

  return (
    <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-6">
      
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
            Empathetic Focus Engine
          </h3>
          <p className="text-xs text-slate-400">Lock distractions out and execute modular sprints</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active extreme lockdown lock visualization badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[10px] font-mono font-bold text-cyan-400">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Lock Mode Active
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? "Mute alert sounds" : "Unmute alert sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Extreme Lock toggle configurations */}
      <div className="p-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Extreme Fullscreen Lock
          </span>
          <p className="text-[10px] text-slate-400">Forces full screen, penalizes tab switches, and blocks surrounding page noise.</p>
        </div>
        <button
          onClick={() => setExtremeLockEnabled(!extremeLockEnabled)}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase tracking-wider font-extrabold cursor-pointer transition-all ${
            extremeLockEnabled
              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.35)]'
              : 'bg-black/40 border-white/10 text-slate-500'
          }`}
        >
          {extremeLockEnabled ? 'Armed' : 'Disarmed'}
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Visual Timer Module (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-black/30 rounded-2xl border border-white/5 relative overflow-hidden">
          
          <div className="text-center space-y-2 relative z-10 w-full">
            <span className={`inline-block text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              mode === 'work' 
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 animate-pulse' 
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            }`}>
              {mode === 'work' ? '🔥 Focus Sprint Block' : '☕ Recharge Interval'}
            </span>

            {/* Glowing Big Timer */}
            <div className={`text-5xl font-mono font-extrabold tracking-tight select-none my-4 ${
              mode === 'work' ? 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]'
            }`}>
              {formatTime(secondsLeft)}
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${mode === 'work' ? 'bg-cyan-400' : 'bg-emerald-400'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3 pt-3">
              <button
                onClick={toggleStartPause}
                className={`p-3 rounded-xl cursor-pointer font-bold transition flex items-center justify-center gap-2 ${
                  isRunning 
                    ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                }`}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="text-xs uppercase font-mono tracking-wider">{isRunning ? 'Pause' : 'Focus'}</span>
              </button>

              <button
                onClick={handleReset}
                title="Reset timer"
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/20 text-slate-300 hover:text-white cursor-pointer transition flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Sessions Counters */}
            <div className="flex justify-center gap-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-500">
              <span>Completed Sprints: <strong className="text-cyan-400">{completedSessions}</strong></span>
              {focusViolations > 0 && (
                <span className="text-amber-500">Violations: <strong>{focusViolations}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Task Binder & Step Checklist (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Active Focus Target
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/30 cursor-pointer"
            >
              <option value="" disabled>-- Bind focus timer to an active task --</option>
              {pendingTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.priority})</option>
              ))}
            </select>
          </div>

          {activeTask ? (
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4 animate-fade-in">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    {activeTask.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans">{activeTask.description || 'No notes defined'}</p>
                </div>

                <button
                  onClick={handleMarkTaskCompleted}
                  className="cursor-pointer py-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] font-mono rounded uppercase transition"
                >
                  CONQUER
                </button>
              </div>

              {/* Subtasks listing inside timer */}
              {activeTask.subtasks.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Decomposed Steps checklist:</span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {activeTask.subtasks.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleToggleSubtask(sub.id)}
                        className="w-full text-left p-2.5 bg-black/60 hover:bg-black border border-white/5 hover:border-cyan-500/10 rounded-lg flex items-center justify-between gap-3 text-xs transition cursor-pointer"
                      >
                        <span className={`font-medium ${sub.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                          {sub.title}
                        </span>
                        <div className={`p-0.5 rounded-md border ${sub.completed ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-white/10 text-slate-600'}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-black/30 border border-white/5 rounded-lg text-center">
                  <p className="text-[10px] text-slate-500 italic">No checklist items. Decompose this commitment using AI Autopilot to reveal steps!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-black/20 border border-white/5 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2">
              <ListTodo className="w-8 h-8 text-slate-600 animate-pulse" />
              <p className="text-xs text-slate-500 italic">Choose or register a pending commitment to activate deep step execution inside your session</p>
            </div>
          )}

          {/* Quick config options with Manual Inputs */}
          <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-mono">
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Focus Duration</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[25, 50].map(mins => (
                  <button
                    key={mins}
                    onClick={() => handleDurationChange('work', mins)}
                    className={`px-2 py-1 rounded border text-[10px] transition cursor-pointer ${
                      workDuration === mins 
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold' 
                        : 'bg-black/60 border-white/5 text-slate-400'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={workDuration}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 25;
                      handleDurationChange('work', v);
                    }}
                    className="w-11 bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500 font-mono text-center"
                    title="Enter custom focus duration in minutes"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">min</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Break Duration</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10].map(mins => (
                  <button
                    key={mins}
                    onClick={() => handleDurationChange('break', mins)}
                    className={`px-2 py-1 rounded border text-[10px] transition cursor-pointer ${
                      breakDuration === mins 
                        ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300 font-bold' 
                        : 'bg-black/60 border-white/5 text-slate-400'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={breakDuration}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 5;
                      handleDurationChange('break', v);
                    }}
                    className="w-11 bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-500 font-mono text-center"
                    title="Enter custom break duration in minutes"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">min</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 🌟 1. IMMERSIVE FULL-SCREEN SPRINT ROOM OVERLAY */}
      {showImmersiveLockdown && (
        <div className="fixed inset-0 bg-slate-950 z-[99999] flex flex-col justify-between p-6 select-none overflow-y-auto animate-fade-in text-slate-200 font-sans">
          
          {/* Header section of full screen room */}
          <div className="flex justify-between items-center w-full max-w-4xl mx-auto border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">Extreme Lockdown Active</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="hidden sm:inline">Completed: <strong className="text-cyan-400">{completedSessions}</strong></span>
              {focusViolations > 0 ? (
                <span className="text-amber-400 font-bold bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg">Infractions: {focusViolations}</span>
              ) : (
                <span className="text-emerald-400">Compliance Rate: 100%</span>
              )}
            </div>
          </div>

          {/* Central Module */}
          <div className="flex-1 flex flex-col lg:flex-row gap-8 items-center justify-center w-full max-w-4xl mx-auto py-8">
            
            {/* Visual HUD Timer Display */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 bg-black/50 border border-white/5 rounded-3xl space-y-4">
              <span className="text-xs font-mono text-cyan-500/70 tracking-widest uppercase">Time Remaining</span>
              
              <div className="text-7xl sm:text-8xl font-mono font-extrabold text-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.45)] select-none animate-pulse">
                {formatTime(secondsLeft)}
              </div>

              {/* Huge Custom Visual Circle Progress indicator */}
              <div className="w-full max-w-xs pt-4">
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2">
                  <span>START</span>
                  <span>{Math.round(progressPercent)}% ELAPSED</span>
                  <span>COMPLETE</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={toggleStartPause}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-mono uppercase tracking-wider rounded-xl cursor-pointer transition shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  Pause Lock
                </button>
              </div>
            </div>

            {/* Locked Task Details & Decomposed subtasks */}
            <div className="w-full lg:w-1/2 space-y-4 text-left">
              {activeTask ? (
                <div className="p-6 bg-black/40 border border-white/5 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono font-bold rounded uppercase tracking-wider">{activeTask.priority}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Active focus directive</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      {activeTask.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">{activeTask.description || 'Focus on completing this single high priority task. No multitasking permitted.'}</p>
                  </div>

                  {activeTask.subtasks && activeTask.subtasks.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block border-b border-white/5 pb-1">Surgical Checklist Steps:</span>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                        {activeTask.subtasks.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleToggleSubtask(sub.id)}
                            className="w-full text-left p-3 bg-black/50 hover:bg-black/80 border border-white/5 hover:border-cyan-500/15 rounded-xl flex items-center justify-between gap-3 text-xs transition cursor-pointer"
                          >
                            <span className={`font-medium ${sub.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {sub.title}
                            </span>
                            <div className={`p-0.5 rounded-md border ${sub.completed ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300' : 'border-white/10 text-slate-600'}`}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-black/20 rounded-xl text-center border border-white/5 border-dashed">
                      <p className="text-xs text-slate-500 italic">No checklist elements. Keep working on the main task until completed.</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleMarkTaskCompleted}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    >
                      🏆 TASK FULLY CONQUERED (FINISH)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-black/50 rounded-3xl text-center border border-dashed border-white/5 space-y-2">
                  <ListTodo className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-400">No specific task bound. Focus fully on your workspace schedule and block distractions.</p>
                </div>
              )}
            </div>

          </div>

          {/* Footer of full screen room with emergency escape hold button */}
          <div className="w-full max-w-4xl mx-auto pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-[10px] font-mono text-slate-500 text-center sm:text-left">
              🔒 Ambient tab guardian active. Straying from this window sounds an alarm & registers infraction.
            </span>

            {/* Emergency Abort button requiring 2 seconds hold to prevent accidental quits */}
            <div className="relative flex flex-col items-end">
              <button
                onMouseDown={startEmergencyHold}
                onMouseUp={stopEmergencyHold}
                onMouseLeave={stopEmergencyHold}
                onTouchStart={startEmergencyHold}
                onTouchEnd={stopEmergencyHold}
                className="px-4 py-2 bg-red-950/40 hover:bg-red-900/50 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer relative overflow-hidden"
              >
                {emergencyHoldTime > 0 ? `Aborting (${Math.round(emergencyHoldTime)}%)` : 'Hold to Emergency Exit'}
                {emergencyHoldTime > 0 && (
                  <div 
                    className="absolute bottom-0 left-0 h-[2px] bg-red-500 transition-all"
                    style={{ width: `${emergencyHoldTime}%` }}
                  />
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 🚨 2. FULLSCREEN FOCUS VIOLATION RED LOCK overlay */}
      {showViolationOverlay && (
        <div className="fixed inset-0 bg-black/95 z-[999999] flex flex-col items-center justify-center p-6 text-center text-slate-100 select-none animate-fade-in font-mono">
          <div className="max-w-md w-full p-8 bg-red-950/25 border border-red-500/30 rounded-3xl space-y-6 shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden">
            
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-red-400 tracking-wider">🚨 FOCUS BREACH INTERCEPTED</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                You strayed from your focus window, exited fullscreen, or switched applications. Your extreme focus lock has logged this infraction.
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl flex items-center justify-around gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Total Breaches</span>
                <span className="text-red-400 text-lg font-bold">{focusViolations}</span>
              </div>
              <div className="border-r border-white/5 h-8" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Time Saved</span>
                <span className="text-cyan-400 text-lg font-bold">{formatTime(secondsLeft)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={reengageFullscreen}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl transition shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                Re-engage Fullscreen Lock
              </button>

              <button
                onClick={handleEmergencyQuit}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Abort & Penalty Session
              </button>
            </div>

            <p className="text-[9px] text-slate-500 font-sans">
              Focus is built to save you from procrastinating. Stay strong!
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
