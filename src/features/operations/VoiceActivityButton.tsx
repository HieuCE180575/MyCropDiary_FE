import { useState, useEffect } from 'react';
import { Icon } from '../../shared/components/Icon';
import { useVoiceRecognition } from '../../shared/hooks/useVoiceRecognition';
import { parseVoiceFarmingActivity, type VoiceParsedActivity } from '../ai/aiService';
import { useLanguage } from '../../shared/i18n/LanguageContext';

interface VoiceActivityButtonProps {
  availableBlocks: string[];
  onParsed: (result: VoiceParsedActivity) => void;
}

export function VoiceActivityButton({ availableBlocks, onParsed }: VoiceActivityButtonProps) {
  const { lang } = useLanguage();
  const { isListening, transcript, error, startListening, stopListening, isSupported } = useVoiceRecognition();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Khi người dùng dừng nói và đã có transcript
  useEffect(() => {
    if (!isListening && transcript.trim() && !isProcessing) {
      void (async () => {
        setIsProcessing(true);
        setStatusMsg(lang === 'en' ? 'AI analyzing...' : 'AI đang phân tích...');
        try {
          const parsed = await parseVoiceFarmingActivity(transcript, availableBlocks);
          onParsed(parsed);
          setStatusMsg(lang === 'en' ? 'Auto-filled successfully!' : 'Đã tự động điền form!');
          setTimeout(() => setStatusMsg(null), 3000);
        } catch {
          setStatusMsg(lang === 'en' ? 'Could not parse voice.' : 'Không thể bóc tách âm thanh.');
          setTimeout(() => setStatusMsg(null), 3000);
        } finally {
          setIsProcessing(false);
        }
      })();
    }
  }, [isListening, transcript]);

  if (!isSupported) {
    return null;
  }

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setStatusMsg(lang === 'en' ? 'Listening... Speak now' : 'Đang lắng nghe... Hãy nói hoạt động');
      startListening();
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isProcessing}
        title={lang === 'en' ? 'Fill form by voice' : 'Điền form nhanh bằng giọng nói'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '9999px',
          border: '1.5px solid',
          borderColor: isListening ? '#ef4444' : '#10b981',
          background: isListening ? '#fef2f2' : '#ecfdf5',
          color: isListening ? '#dc2626' : '#059669',
          fontSize: '12.5px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          animation: isListening ? 'ai-voice-pulse 1.2s infinite' : 'none',
        }}
      >
        <Icon name={isListening ? 'mic' : 'mic'} size={15} style={{ color: isListening ? '#dc2626' : '#059669' }} />
        <span>
          {isListening
            ? (lang === 'en' ? 'Listening...' : 'Đang nghe...')
            : isProcessing
            ? (lang === 'en' ? 'AI parsing...' : 'AI đang xử lý...')
            : (lang === 'en' ? 'Voice Auto-Fill' : 'Đọc để điền')}
        </span>
      </button>

      {statusMsg && (
        <span style={{ fontSize: '12px', color: isListening ? '#dc2626' : '#059669', fontWeight: 500 }}>
          {statusMsg}
        </span>
      )}
      {error && !statusMsg && (
        <span style={{ fontSize: '12px', color: '#dc2626' }}>
          {error}
        </span>
      )}

      <style>{`
        @keyframes ai-voice-pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
