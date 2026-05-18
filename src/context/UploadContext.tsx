import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { uploadImage } from '../api/upload';
import { addFrames, type FrameItem } from '../api/rolls';

export interface FileStatus {
  name: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
}

export interface UploadSession {
  rollId: string;
  rollTitle: string;
  current: number;
  total: number;
  files: FileStatus[];
  isCompleted: boolean;
}

interface UploadContextType {
  sessions: Record<string, UploadSession>;
  startUpload: (rollId: string, rollTitle: string, files: FileList, baseSortOrder: number, onFrameAdded?: (frame: FrameItem) => void) => Promise<void>;
  clearSession: (rollId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, UploadSession>>({});
  const sessionsRef = useRef(sessions);
  
  // Keep ref in sync for async callbacks
  sessionsRef.current = sessions;

  const updateSession = useCallback((rollId: string, updates: Partial<UploadSession>) => {
    setSessions(prev => ({
      ...prev,
      [rollId]: { ...prev[rollId], ...updates }
    }));
  }, []);

  const updateFileStatus = useCallback((rollId: string, fileIndex: number, updates: Partial<FileStatus>) => {
    setSessions(prev => {
      const session = prev[rollId];
      if (!session) return prev;
      const newFiles = [...session.files];
      newFiles[fileIndex] = { ...newFiles[fileIndex], ...updates };
      return {
        ...prev,
        [rollId]: { ...session, files: newFiles }
      };
    });
  }, []);

  const startUpload = useCallback(async (rollId: string, rollTitle: string, files: FileList, baseSortOrder: number, onFrameAdded?: (frame: FrameItem) => void) => {
    const fileList = Array.from(files);
    const initialFiles: FileStatus[] = fileList.map(f => ({
      name: f.name,
      status: 'pending',
      progress: 0
    }));

    const session: UploadSession = {
      rollId,
      rollTitle,
      current: 0,
      total: fileList.length,
      files: initialFiles,
      isCompleted: false
    };

    setSessions(prev => ({ ...prev, [rollId]: session }));

    const CONCURRENCY_LIMIT = 1;
    let currentIdx = 0;
    
    const uploadWorker = async () => {
      while (currentIdx < fileList.length) {
        const i = currentIdx++;
        const file = fileList[i];
        
        updateFileStatus(rollId, i, { status: 'uploading' });

        try {
          // NOTE: uploadImage handles compression and strategy selection
          const uploadResult = await uploadImage(file, rollId, 'frame');
          
          const newFrame: any = {
            imageUrl: uploadResult.url,
            previewUrl: uploadResult.previewUrl,
            fileSize: file.size,
            fileFormat: file.type,
          };

          const addResponse = await addFrames(rollId, [{
            ...newFrame,
            sortOrder: baseSortOrder + i,
            frameNumber: (baseSortOrder + i + 1).toString().padStart(2, '0')
          }]);
          if (addResponse.success && addResponse.data?.[0]) {
            updateFileStatus(rollId, i, { status: 'success', progress: 100 });
            // Update session current count
            setSessions(prev => {
              const s = prev[rollId];
              if (!s) return prev;
              return { ...prev, [rollId]: { ...s, current: s.current + 1 } };
            });
            onFrameAdded?.(addResponse.data[0]);
          } else {
            throw new Error('Failed to add frame record');
          }
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
          updateFileStatus(rollId, i, { status: 'error' });
          // Still increment current count even on error to show progress
          setSessions(prev => {
            const s = prev[rollId];
            if (!s) return prev;
            return { ...prev, [rollId]: { ...s, current: s.current + 1 } };
          });
        }
      }
    };

    // Start workers
    const workers = Array(Math.min(CONCURRENCY_LIMIT, fileList.length))
      .fill(null)
      .map(() => uploadWorker());

    await Promise.all(workers);
    updateSession(rollId, { isCompleted: true });
  }, [updateSession, updateFileStatus]);

  const clearSession = useCallback((rollId: string) => {
    setSessions(prev => {
      const newSessions = { ...prev };
      delete newSessions[rollId];
      return newSessions;
    });
  }, []);

  return (
    <UploadContext.Provider value={{ sessions, startUpload, clearSession }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
