/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, AlertCircle, Check } from 'lucide-react';
import { Task } from '../types';

interface VoiceAssistantProps {
  onTaskExtracted: (taskTemplate: Omit<Task, 'id' | 'userId' | 'createdAt' | 'status'>) => void;
}

export default function VoiceAssistant({ onTaskExtracted }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      setSuccess(null);
    };

    rec.onresult = (e: any) => {
      const speechToText = e.results[0][0].transcript;
      setTranscript(speechToText);
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setError('Could not record voice. Ensure microphone permissions are active.');
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
  }, []);

  const toggleRecording = () => {
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser mode.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      recognition.start();
    }
  };

  const processSpokenInstructions = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze-drive-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: 'Voice Transcription Intake',
          fileContent: transcript
        })
      });

      if (!res.ok) {
        throw new Error('Our AI was unable to parse actionable task structures from that voice instructions.');
      }

      const taskTemplate = await res.json();
      if (taskTemplate) {
        onTaskExtracted(taskTemplate);
        setSuccess(`Voila! Extracted task: "${taskTemplate.title}"`);
        setTranscript('');
      } else {
        throw new Error('No task could be recognized.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Intake failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="voice-assistant-container" className="bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl">
      <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-2">
        <Mic className="w-5 h-5 text-cyan-400 animate-pulse" />
        Frantic Voice Intake
      </h3>
      <p className="text-xs text-slate-400 mb-4 font-sans">
        Spill your commitments quickly. The AI will parse deadlines, create checklists, and schedule focus blocks.
      </p>

      <div className="flex flex-col items-center justify-center p-4 bg-black/60 rounded-xl border border-white/5 mb-4">
        {/* Animated Soundwave Orb */}
        <button
          onClick={toggleRecording}
          type="button"
          className={`h-16 w-16 rounded-full flex items-center justify-center border transition-all duration-300 relative cursor-pointer ${
            isListening 
              ? 'bg-red-500/10 border-red-500 text-red-500 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
              : 'bg-white/5 border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400'
          }`}
        >
          {isListening ? (
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          ) : null}
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <p className="text-[11px] text-slate-500 font-mono mt-3 uppercase tracking-wider">
          {isListening ? 'Listening... Speak your task now' : 'Click mic to record voice command'}
        </p>

        {/* Text Intake Input */}
        <div className="w-full mt-4">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Or type here: 'History exam tomorrow at 9AM, study flashcards this afternoon...'"
            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 focus:border-cyan-500/40 font-sans resize-none h-14"
          />
        </div>
      </div>

      {transcript.trim() && (
        <button
          onClick={processSpokenInstructions}
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        >
          {loading ? (
            'Parsing content...'
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Convert Spoken Task with AI
            </>
          )}
        </button>
      )}

      {error && (
        <div className="mt-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3 flex items-start gap-2">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
