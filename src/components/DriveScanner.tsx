/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText, Download, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { DriveFile, Task } from '../types';

interface DriveScannerProps {
  accessToken: string | null;
  onTaskImportCount: (taskTemplate: Omit<Task, 'id' | 'userId' | 'createdAt' | 'status'>) => void;
  onReauthorize?: () => void;
  onInvalidToken?: () => void;
}

export default function DriveScanner({ accessToken, onTaskImportCount, onReauthorize, onInvalidToken }: DriveScannerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDriveFiles = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      // Query documents and text files that might contain tasks, deadlines, or schedules
      const q = encodeURIComponent(
        "mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or name contains 'syllabus' or name contains 'deadline' or name contains 'meeting' or name contains 'project'"
      );
      const url = `https://www.googleapis.com/drive/v3/files?pageSize=15&q=${q}&fields=files(id,name,mimeType)`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (onInvalidToken) onInvalidToken();
          throw new Error('Google Drive connection has expired or lacks required permissions. Please reconnect.');
        }
        throw new Error('Failed to retrieve files from Google Drive');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not read from Google Drive. Ensure you authorized access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchDriveFiles();
    } else {
      setError(null);
    }
  }, [accessToken]);

  const handleScanFile = async (file: DriveFile) => {
    if (!accessToken) return;
    setAnalyzingFileId(file.id);
    setError(null);
    setSuccessMessage(null);

    try {
      let fileTextContent = '';
      
      // Google Docs must be exported, plain text can be fetched directly with alt=media
      let fetchUrl = '';
      if (file.mimeType === 'application/vnd.google-apps.document') {
        fetchUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
      } else {
        fetchUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      }

      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          if (onInvalidToken) onInvalidToken();
          throw new Error('Google Drive connection has expired or lacks required permissions. Please reconnect.');
        }
        throw new Error('Could not download content of ' + file.name);
      }

      fileTextContent = await res.text();

      // Send content to our backend
      const analyzeRes = await fetch('/api/ai/analyze-drive-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileContent: fileTextContent,
        }),
      });

      if (!analyzeRes.ok) {
        throw new Error('Our AI failed to extract task structures from this document');
      }

      const taskTemplate = await analyzeRes.json();
      
      if (taskTemplate) {
        // Feed file origin so client knows where it came from
        taskTemplate.googleDriveFileId = file.id;
        taskTemplate.googleDriveFileName = file.name;
        
        onTaskImportCount(taskTemplate);
        setSuccessMessage(`Scanned successfully! Imported tasks found related to: "${taskTemplate.title}"`);
      } else {
        throw new Error('No deadline or task markers were identified.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Scan aborted during processing');
    } finally {
      setAnalyzingFileId(null);
    }
  };

  return (
    <div id="drive-scanner-container" className="bg-[#05070A]/60 backdrop-blur border border-white/5 rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Syllabus & Note Scanner
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Scan Drive files for deadlines and checklists</p>
        </div>
        <button
          onClick={fetchDriveFiles}
          disabled={loading || !accessToken}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition duration-150 disabled:opacity-40 cursor-pointer border border-white/5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!accessToken ? (
        <div className="bg-gradient-to-b from-cyan-950/20 via-[#0a0f18] to-black border border-cyan-500/20 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-4 shadow-[0_10px_30px_rgba(6,182,212,0.05)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-500" />
          
          <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 border border-cyan-500/25 animate-pulse">
            <FileText className="w-5 h-5" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h4 className="text-sm font-bold text-slate-100">Syllabus & Notes Scanner is Offline</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              For security, Google temporary credentials expire in <strong className="text-cyan-400 font-semibold">60 minutes</strong>. Click below to reconnect and query your Google Drive documents directly.
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
      ) : loading ? (
        <div className="space-y-2 py-4">
          <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
          <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
          <div className="h-10 bg-white/5 animate-pulse rounded-xl" />
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 animate-pulse" />
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
      ) : files.length === 0 ? (
        <div className="bg-black/40 border border-white/5 rounded-xl p-6 text-center">
          <p className="text-xs text-slate-400">No project, deadline, or syllabus files located in your recent Google Drive folder.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-black/60 rounded-xl border border-white/5 hover:border-cyan-500/20 transition group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/15 text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono scale-95 origin-left">
                    {file.mimeType.split('.').pop() || 'document'}
                  </p>
                </div>
              </div>
              <button
                disabled={analyzingFileId !== null}
                onClick={() => handleScanFile(file)}
                className="text-xs bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1.5 rounded-lg font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)] flex items-center gap-1.5 transition cursor-pointer"
              >
                {analyzingFileId === file.id ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Scanning
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    AI Analyze
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {successMessage && (
        <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-3 flex items-start gap-2">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
