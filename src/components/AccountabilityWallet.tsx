import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  HeartCrack, 
  Coins, 
  Award, 
  Plus, 
  HelpCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Task } from '../types';

interface AccountabilityWalletProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

export default function AccountabilityWallet({
  tasks,
  onUpdateTask
}: AccountabilityWalletProps) {
  // Global activation flag - persisted in localStorage
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('accountability_enabled');
    return stored === null ? true : stored === 'true';
  });

  // Base deposit balance - persisted in localStorage
  const [balance, setBalance] = useState<number>(() => {
    const stored = localStorage.getItem('accountability_balance');
    return stored ? parseFloat(stored) : 120.00;
  });

  // Top up amount
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());

  // Create a primitive fingerprint of the tasks array to safely use in dependency arrays
  const tasksFingerprint = tasks
    .map(t => `${t.id}:${t.status}:${t.penaltyEnabled}:${t.penaltyStatus || 'active'}:${t.deadline}`)
    .join('|');

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('accountability_enabled', String(globalEnabled));
  }, [globalEnabled]);

  useEffect(() => {
    localStorage.setItem('accountability_balance', String(balance));
  }, [balance]);

  // Periodically check for overshot (overdue) tasks that have active pledges
  useEffect(() => {
    if (!globalEnabled) return;

    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        // Must be pending, has penalty enabled, penaltyStatus is active or undefined, and deadline has passed
        if (
          task.status === 'pending' &&
          task.penaltyEnabled &&
          (!task.penaltyStatus || task.penaltyStatus === 'active') &&
          new Date(task.deadline) < now
        ) {
          // Task deadline overshot! Deduct money and mark forfeited
          const amount = task.penaltyAmount || 5;
          setBalance(prev => Math.max(0, prev - amount));
          
          onUpdateTask({
            ...task,
            penaltyStatus: 'forfeited'
          });

          // Show browser notification or in-app alert simulation
          console.warn(`[LiveYourDay Penalty] "${task.title}" overshot deadline! $${amount.toFixed(2)} deducted.`);
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [tasksFingerprint, globalEnabled, onUpdateTask]);

  // Handle a manual checkout of overdue tasks on load / render immediately
  useEffect(() => {
    if (!globalEnabled) return;
    const now = new Date();
    let balanceImpact = 0;
    let tasksToUpdate: Task[] = [];

    tasks.forEach(task => {
      if (
        task.status === 'pending' &&
        task.penaltyEnabled &&
        (!task.penaltyStatus || task.penaltyStatus === 'active') &&
        new Date(task.deadline) < now
      ) {
        balanceImpact += task.penaltyAmount || 5;
        tasksToUpdate.push({
          ...task,
          penaltyStatus: 'forfeited'
        });
      } else if (
        task.status === 'completed' &&
        task.penaltyEnabled &&
        (!task.penaltyStatus || task.penaltyStatus === 'active')
      ) {
        tasksToUpdate.push({
          ...task,
          penaltyStatus: 'saved'
        });
      }
    });

    if (tasksToUpdate.length > 0) {
      if (balanceImpact > 0) {
        setBalance(prev => Math.max(0, prev - balanceImpact));
      }
      tasksToUpdate.forEach(t => onUpdateTask(t));
    }
  }, [tasksFingerprint, globalEnabled]);

  // Derive metrics
  const activePledges = tasks.filter(
    t => t.status === 'pending' && t.penaltyEnabled && t.penaltyStatus !== 'forfeited'
  );
  const totalOnTheLine = activePledges.reduce((sum, t) => sum + (t.penaltyAmount || 0), 0);

  const forfeitedTasks = tasks.filter(t => t.penaltyEnabled && t.penaltyStatus === 'forfeited');
  const totalForfeited = forfeitedTasks.reduce((sum, t) => sum + (t.penaltyAmount || 0), 0);

  const savedTasks = tasks.filter(t => t.penaltyEnabled && (t.status === 'completed' || t.penaltyStatus === 'saved'));
  const totalSaved = savedTasks.reduce((sum, t) => sum + (t.penaltyAmount || 0), 0);

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(topUpAmount);
    if (isNaN(val) || val <= 0) return;
    setBalance(prev => prev + val);
    setTopUpAmount('');
  };

  return (
    <div className="bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Header with Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-rose-400" />
          <h3 className="font-semibold text-slate-100 font-sans text-sm">Accountability Wallet</h3>
        </div>
        <button
          onClick={() => setGlobalEnabled(!globalEnabled)}
          className="text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
          title={globalEnabled ? "Turn off Accountability Rules" : "Turn on Accountability Rules"}
        >
          {globalEnabled ? (
            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              ACTIVE
              <ToggleRight className="w-5 h-5 text-rose-400" />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-white/5">
              PAUSED
              <ToggleLeft className="w-5 h-5 text-slate-500" />
            </div>
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 leading-normal font-sans">
        Lock real monetary pledges to your task timelines. Complete them before the deadline to save your funds; fail, and the pledge is forfeited and deducted.
      </p>

      {/* Cybernetic Bank Card */}
      <div className="relative bg-gradient-to-br from-rose-950/40 via-slate-900 to-black border border-rose-500/20 rounded-2xl p-4 overflow-hidden shadow-lg group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-xl rounded-full -mr-10 -mt-10 pointer-events-none" />
        
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 font-bold block">
              COMMITMENT ASSURANCE CARDS
            </span>
            <div className="flex items-baseline mt-1">
              <span className="text-2xl font-bold font-mono text-white">${balance.toFixed(2)}</span>
              <span className="text-[10px] font-mono text-slate-500 ml-1.5">mock balance</span>
            </div>
          </div>
          <Coins className="w-8 h-8 text-rose-400/30 group-hover:text-rose-400/50 transition duration-300" />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-3.5 border-t border-white/5 font-mono text-[10px]">
          <div>
            <span className="text-slate-500 block uppercase text-[8px]">On the Line</span>
            <span className="text-cyan-300 font-bold">${totalOnTheLine.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase text-[8px]">Saved Pool</span>
            <span className="text-emerald-400 font-bold">${totalSaved.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {globalEnabled && (
        <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 p-2 rounded-xl text-center">
          <div className="p-1">
            <span className="text-[8px] font-mono uppercase text-slate-500 block">Total Forfeited</span>
            <div className="text-xs font-bold font-mono text-rose-400 flex items-center justify-center gap-0.5 mt-0.5">
              <HeartCrack className="w-3.5 h-3.5" />
              -${totalForfeited.toFixed(2)}
            </div>
          </div>
          <div className="p-1 border-l border-white/5">
            <span className="text-[8px] font-mono uppercase text-slate-500 block">Deadlines Saved</span>
            <div className="text-xs font-bold font-mono text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5">
              <Award className="w-3.5 h-3.5" />
              {savedTasks.length} Done
            </div>
          </div>
        </div>
      )}

      {/* Top Up Form */}
      {globalEnabled && (
        <form onSubmit={handleTopUp} className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="Deposit mock funds..."
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-rose-500/40"
            />
          </div>
          <button
            type="submit"
            className="px-3 bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}

      {/* Alerts / History segment */}
      {globalEnabled && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono uppercase text-slate-500 block font-bold">Accountability Ledgers</span>
          
          {forfeitedTasks.length === 0 && savedTasks.length === 0 ? (
            <p className="text-[10px] text-slate-500 italic text-center py-2 bg-black/10 border border-white/2 rounded-xl">
              No penalty transactions recorded. Pledge your first task deadline!
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900 pr-1">
              {[...forfeitedTasks, ...savedTasks]
                .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())
                .slice(0, 6)
                .map((t, idx) => {
                  const isForfeited = t.penaltyStatus === 'forfeited';
                  return (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-xl border text-[10px] flex items-center justify-between gap-2 ${
                        isForfeited 
                          ? 'bg-rose-950/15 border-rose-500/10 text-rose-300' 
                          : 'bg-emerald-950/15 border-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <span className="font-bold block truncate">{t.title}</span>
                        <span className="text-[8px] text-slate-500">
                          To: {t.penaltyTarget || 'The Black Hole'}
                        </span>
                      </div>
                      <div className="flex items-center font-mono font-bold shrink-0">
                        {isForfeited ? (
                          <>
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                            <span>-${(t.penaltyAmount || 5).toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>+${(t.penaltyAmount || 5).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
