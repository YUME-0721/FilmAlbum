import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFrameDetail, type RollDetail, type FrameItem } from '../src/api/rolls.ts';
import PhotoViewer from '../components/PhotoViewer';
import { useTranslation } from '../src/hooks/useTranslation';

export default function FrameView() {
  const { frameId } = useParams<{ frameId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [roll, setRoll] = useState<RollDetail | null>(null);
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFrameDetail = async () => {
      if (!frameId) return;
      
      // 检查当前状态，避免重复加载
      if (roll && frames.some(f => f.id === frameId)) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await getFrameDetail(frameId);
        if (isMounted) {
          if (response.success && response.data) {
            setRoll(response.data);
            setFrames(response.data.frames || []);
          } else {
            console.error('Failed to load frame detail:', response.error);
          }
        }
      } catch (error) {
        console.error('加载底片详情异常:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchFrameDetail();
    return () => { isMounted = false; };
  }, [frameId]); // 仅在 frameId 变化时触发，内部通过状态判断是否需要请求

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!roll || frames.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  const initialIndex = frames.findIndex(f => f.id === frameId);
  const safeIndex = initialIndex === -1 ? 0 : initialIndex;

  return (
    <PhotoViewer 
      roll={roll}
      frames={frames}
      initialIndex={safeIndex}
      onClose={() => navigate(`/roll/${roll.id}`)}
      onFrameChange={(index) => {
        const targetFrame = frames[index];
        if (targetFrame) {
          navigate(`/frame/${targetFrame.id}?frame=${index + 1}`, { replace: true });
        }
      }}
      onUpdateFrames={(newFrames) => setFrames(newFrames)}
    />
  );
}
