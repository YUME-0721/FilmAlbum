import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUpload, type UploadSession, type FileStatus } from '../src/context/UploadContext';
import { CloudUpload, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { useTranslation } from '../src/hooks/useTranslation';

export default function UploadManager() {
  const { sessions, clearSession } = useUpload();
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const activeSessions = Object.values(sessions) as UploadSession[];
  if (activeSessions.length === 0) return null;

  const totalProgress = activeSessions.reduce((acc: number, s: UploadSession) => acc + (s.current / s.total), 0) / activeSessions.length;
  const isAllCompleted = activeSessions.every((s: UploadSession) => s.isCompleted);

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="w-80 bg-surface-container-lowest/90 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <CloudUpload size={18} className="text-primary" />
                <span className="text-sm font-bold text-on-surface">{t('common.uploading') || '上传中'}</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant"
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            </div>

            {/* Session List */}
            <div className="max-h-96 overflow-y-auto no-scrollbar">
              {activeSessions.map((session: UploadSession) => (
                <div key={session.rollId} className="border-b border-white/5 last:border-0">
                  <div 
                    className="px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandedSession(expandedSession === session.rollId ? null : session.rollId)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-on-surface truncate pr-4">{session.rollTitle}</span>
                      <span className="text-[10px] font-mono text-on-surface-variant opacity-60">
                        {session.current} / {session.total}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(session.current / session.total) * 100}%` }}
                        className={`h-full ${session.isCompleted ? 'bg-success' : 'bg-primary'}`}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2">
                       <span className="text-[10px] text-on-surface-variant">
                         {session.isCompleted ? (
                           <span className="text-success flex items-center gap-1"><Check size={12}/>{t('common.completed') || '已完成'}</span>
                         ) : (
                           <span className="animate-pulse">{t('common.processing') || '处理中...'}</span>
                         )}
                       </span>
                       {session.isCompleted && (
                         <button 
                           onClick={(e: React.MouseEvent) => { e.stopPropagation(); clearSession(session.rollId); }}
                           className="text-[10px] text-primary font-bold hover:underline"
                         >
                           {t('common.clear') || '清除'}
                         </button>
                       )}
                    </div>
                  </div>

                  {/* Detailed File List */}
                  <AnimatePresence>
                    {expandedSession === session.rollId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-black/20 overflow-hidden"
                      >
                        <div className="px-5 py-3 space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                          {session.files.map((file: FileStatus, idx: number) => (
                            <div key={idx} className="flex items-center justify-between gap-3">
                              <span className="text-[10px] text-on-surface-variant truncate flex-1">{file.name}</span>
                              <div className="shrink-0">
                                {file.status === 'uploading' && <Loader2 size={12} className="animate-spin text-primary" />}
                                {file.status === 'success' && <CheckCircle2 size={12} className="text-success" />}
                                {file.status === 'error' && <XCircle size={12} className="text-error" />}
                                {file.status === 'pending' && <div className="w-3 h-3 rounded-full border border-white/20" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Bubble */}
      <AnimatePresence>
        {isMinimized && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center relative pointer-events-auto hover:scale-110 transition-transform"
          >
             <CloudUpload size={24} />
             {/* Progress Ring */}
             <svg className="absolute inset-0 w-full h-full -rotate-90">
               <circle
                 cx="28" cy="28" r="24"
                 fill="none" stroke="currentColor" strokeWidth="3"
                 strokeDasharray={2 * Math.PI * 24}
                 strokeDashoffset={2 * Math.PI * 24 * (1 - totalProgress)}
                 className="opacity-40"
               />
             </svg>
             {isAllCompleted && (
               <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-surface flex items-center justify-center">
                 <Check size={12} className="text-white" />
               </div>
             )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
