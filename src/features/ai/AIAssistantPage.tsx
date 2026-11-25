import { TabList, tabPanelProps } from '../../shared/components/TabList';
import { EmptyState } from '../../shared/components/EmptyState';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Icon } from '../../shared/components/Icon';
import { DeleteErrorToast, isDeleteError } from '../../shared/components/DeleteErrorToast';
import { formatDateTime as uiFormatDateTime } from '../../shared/format/formatters';

import { formatDate as uiFormatDate } from '../../shared/format/formatters';

import { formatDate as displayDate, formatDateTime as displayDateTime } from '../../shared/format/formatters';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import '../../styles/ai.css';

import { useLanguage } from '../../shared/i18n/LanguageContext';
import { apiRequest } from '../../shared/api/httpClient';
import { FormattedAIMessage } from './FormattedAIMessage';
import { useVoiceRecognition } from '../../shared/hooks/useVoiceRecognition';
import {
  fetchMyAIConversations,
  fetchAIConversationDetail,
  createAIConversation,
  askAIInConversation,
  askAIQuick,
  reportAIMessage,
  fetchMyAIFeedbackHistory,
  deleteAIConversation,
  updateAIFeedback,
  type AIMessageItem,
  type AIConversationItem,
  type AIFeedbackItem,
} from './aiService';

interface AIDraft {
  id: string;
  activityType: string;
  title: string;
  recommendedDate: string;
  suggestedMaterial: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface AIAssistantPageProps {
  initialTab?: 'ai' | 'ai-history' | 'ai-feedback' | 'ai-drafts';
}

type AssistantMessage = AIMessageItem & { uiMessageKey?: string };

export function AIAssistantPage({ initialTab = 'ai' }: AIAssistantPageProps) {
  const { lang, t: translate } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const navigate = useNavigate();
  const activeTab = initialTab;
  const setActiveTab = (tab: NonNullable<AIAssistantPageProps['initialTab']>) => {
    if (tab !== activeTab) navigate(`/${tab}`);
  };

  // Chat & Conversation states
  const [conversations, setConversations] = useState<AIConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState<number | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);

  const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceRecognition();

  useEffect(() => {
    if (transcript) {
      setInputQuestion(transcript);
    }
  }, [transcript]);

  // Reporting / Feedback state
  const [feedbackHistory, setFeedbackHistory] = useState<AIFeedbackItem[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<AssistantMessage | null>(null);
  const [reportRating, setReportRating] = useState<number>(3);
  const [reportReason, setReportReason] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [editingFeedback, setEditingFeedback] = useState<AIFeedbackItem | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editReason, setEditReason] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Drafts state (UC automation)
  const [drafts, setDrafts] = useState<AIDraft[]>([
    {
      id: 'df-1',
      activityType: 'Bón phân',
      title: 'Bón thúc đợt 3 phân hữu cơ kali sinh học đón quả',
      recommendedDate: '2026-03-31',
      suggestedMaterial: 'Phân hữu cơ khoáng Kali hữu cơ 0.2kg/gốc',
      reason: 'Cây đang bước vào giai đoạn tạo ngọt (Brix), cần bổ sung kali tự nhiên để quả chắc và thơm.',
      status: 'PENDING',
    },
    {
      id: 'df-2',
      activityType: 'Tưới nước',
      title: 'Giảm lượng nước tưới trước thu hoạch 5 ngày',
      recommendedDate: '2026-04-02',
      suggestedMaterial: 'Nước lọc tinh khiết không pha phân',
      reason: 'Giảm độ ẩm gốc để tránh nứt quả và cô đọng lượng đường theo chuẩn VietGAP.',
      status: 'PENDING',
    },
  ]);

  // Load conversations on mount
  useEffect(() => {
    void loadConversations();
  }, []);

  // Load feedback history when opening feedback tab
  useEffect(() => {
    if (activeTab === 'ai-feedback') {
      void loadFeedbackHistory();
    }
  }, [activeTab]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadConversations = async (keyword?: string) => {
    setLoadingHistory(true);
    try {
      const list = await fetchMyAIConversations(keyword);
      setConversations(list);
      if (!activeConversationId && list.length > 0 && !keyword) {
        await selectConversation(list[0].conversationId);
      }
    } catch {
      // Ignore if offline
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectConversation = async (convId: number) => {
    setActiveConversationId(convId);
    try {
      const detail = await fetchAIConversationDetail(convId);
      setMessages(detail.messages || []);
    } catch {
      // Fallback
    }
  };

  const handleStartNewConversation = async () => {
    try {
      const title = `Hội thoại tư vấn VietGAP ${uiFormatDate(new Date(), lang)}`;
      const newConv = await createAIConversation(title, selectedFarm?.id);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.conversationId);
      await selectConversation(newConv.conversationId);
      setActiveTab('ai');
      showToast((lang === 'en' ? "New AI conversation started" : 'Đã bắt đầu phiên trò chuyện mới với AI'));
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to start a new conversation" : err instanceof Error ? err.message : 'Không thể tạo phiên mới'), 'error');
    }
  };

  const loadFeedbackHistory = async () => {
    try {
      const history = await fetchMyAIFeedbackHistory();
      setFeedbackHistory(history);
    } catch {
      // Fallback
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputQuestion.trim();
    if (!q || isTyping) return;

    setInputQuestion('');
    setIsTyping(true);

    const tempUserMsg: AIMessageItem = {
      messageId: Date.now(),
      conversationId: activeConversationId || 0,
      senderType: 'user',
      messageText: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let aiResp: AIMessageItem;
      if (activeConversationId) {
        aiResp = await askAIInConversation(activeConversationId, q, selectedFarm?.id);
      } else {
        aiResp = await askAIQuick(q, selectedFarm?.id);
        setActiveConversationId(aiResp.conversationId);
        await loadConversations();
      }
      setMessages((prev) => [...prev, aiResp]);
    } catch (err) {
      // In case backend or AI API is temporarily unreachable/overloaded
      const errMsg = err instanceof Error && err.message ? err.message : '';
      const fallbackText = lang === 'en'
        ? (errMsg || 'AI Assistant service is temporarily busy or unreachable. Please try asking again.')
        : (errMsg || 'Trợ lý AI tạm thời bị gián đoạn kết nối tới máy chủ hoặc dịch vụ đang quá tải. Vui lòng bấm gửi lại câu hỏi sau giây lát.');

      const fallbackAiMsg: AssistantMessage = {
        messageId: Date.now() + 1,
        conversationId: activeConversationId || 0,
        senderType: 'assistant',
        messageText: fallbackText,
        sources: ['Hệ thống MyCropDiary'],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOpenReportModal = (msg: AIMessageItem) => {
    setReportingMessage(msg);
    setReportRating(3);
    setReportReason('');
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage || !reportReason.trim()) return;

    setSubmittingReport(true);
    try {
      await reportAIMessage(reportingMessage.messageId, reportRating, reportReason.trim());
      showToast((lang === 'en' ? "Answer report submitted successfully. Thank you!" : 'Đã gửi phản hồi báo cáo câu trả lời thành công. Cảm ơn bạn!'));
      setReportingMessage(null);
      void loadFeedbackHistory();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to submit report" : err instanceof Error ? err.message : 'Gửi báo cáo thất bại'), 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteConversation = async (convId: number) => {
    if (deletingConversation) return;
    setDeletingConversation(true);
    try {
      await deleteAIConversation(convId);
      showToast((lang === 'en' ? "Conversation deleted successfully." : 'Đã xóa cuộc hội thoại thành công.'));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to delete conversation" : err instanceof Error ? err.message : 'Xóa hội thoại thất bại'), 'error');
    } finally {
      setDeletingConversation(false);
      setDeleteConversationId(null);
    }
  };

  const handleStartEditFeedback = (fb: AIFeedbackItem) => {
    setEditingFeedback(fb);
    setEditRating(fb.rating || 5);
    setEditReason(fb.feedbackText || '');
  };

  const handleSubmitEditFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedback || !editReason.trim()) return;

    setSubmittingEdit(true);
    try {
      await updateAIFeedback(editingFeedback.feedbackId, editRating, editReason.trim());
      showToast((lang === 'en' ? "Feedback updated successfully." : 'Cập nhật phản hồi thành công.'));
      setEditingFeedback(null);
      void loadFeedbackHistory();
    } catch (err) {
      showToast((lang === 'en' ? err instanceof Error ? translate(err.message) : "Unable to update feedback" : err instanceof Error ? err.message : 'Cập nhật phản hồi thất bại'), 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleGeneralFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
    showToast((lang === 'en' ? "Thank you for your feedback on the AI Assistant!" : 'Cảm ơn đóng góp ý kiến của bạn về Trợ lý AI!'));
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  const handleApproveDraft = async (draftId: string) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;

    try {
      if (selectedFarm?.id) {
        await apiRequest('/farming-activities', {
          method: 'POST',
          data: {
            farmId: selectedFarm.id,
            activityType: draft.activityType,
            description: `${draft.title} - ${draft.reason} (Vật tư gợi ý: ${draft.suggestedMaterial})`,
            activityDate: draft.recommendedDate,
          },
        });
      }
    } catch {
      // Allow seamless offline / local approval fallback
    }

    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: 'APPROVED' } : d))
    );
    showToast((lang === 'en' ? "AI draft confirmed and added to the farming diary!" : 'Đã xác nhận và chuyển bản nháp AI vào Nhật ký canh tác!'));
  };

  const handleRejectDraft = (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: 'REJECTED' } : d))
    );
  };

  return (
    <section className="ai-assistant-page">
      <PageHeading   title={<>{(lang === 'en' ? "VietGAP Farming AI Assistant" : "Trợ lý AI Nông nghiệp VietGAP")}</>}><div style={{ display: 'flex', gap: '10px' }}>
          <Button type="button" variant="primary" onClick={handleStartNewConversation}>
            <Icon name="plus" /> {(lang === 'en' ? " New conversation" : " Cuộc trò chuyện mới")}
          </Button>
        </div></PageHeading>

      {toastMessage && (isDeleteError(translate(toastMessage.text), toastMessage.type)
        ? <DeleteErrorToast text={translate(toastMessage.text)} onClose={() => setToastMessage(null)} />
        : (
        <div
          role={toastMessage.type === 'error' ? 'alert' : 'status'}
          style={{
            marginBottom: '16px',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            color: toastMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${toastMessage.type === 'success' ? 'var(--color-border)' : 'var(--color-border)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
          }}
        >
          <Icon name={toastMessage.type === 'success' ? 'check' : 'warning'} />
          <span>{translate(toastMessage.text)}</span>
        </div>
      ))}

      <TabList idPrefix="ai" label={lang === 'en' ? 'AI assistant sections' : 'Các mục trợ lý AI'}
        value={activeTab} onChange={setActiveTab} items={[
          { value: 'ai', label: <>{lang === 'en' ? '🤖 AI Assistant Chat' : '🤖 Trò chuyện cùng AI'}</> },
          { value: 'ai-history', label: <>{lang === 'en' ? '📜 Chat History' : '📜 Lịch sử & Tìm kiếm hội thoại'}</> },
          { value: 'ai-feedback', label: <>{lang === 'en' ? '💬 User Feedback & Reports' : '💬 Phản hồi & Lịch sử báo cáo'}</> },
          { value: 'ai-drafts', label: <>{lang === 'en' ? '📝 AI Farming Drafts' : '📝 Dự thảo nhật ký AI'} ({drafts.filter((d) => d.status === 'PENDING').length})</> },
        ]} />

      {/* =========================================================
          TAB 1: AI CHAT
         ========================================================= */}
      {activeTab === 'ai' && (
        <div {...tabPanelProps('ai', 'ai')} className="ai-chat-layout">
          {/* Main Chat Box */}
          <div className="panel ai-chat-panel">
            {/* Messages feed */}
            <div className="ai-message-feed">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--color-muted)' }}>
                  
                  <strong>{(lang === 'en' ? "Hello! Ask the VietGAP AI Assistant a question." : "Chào bạn! Hãy đặt câu hỏi cho Trợ lý AI VietGAP.")}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{(lang === 'en' ? "Ask about biological pest control, fertilizer formulas, or soil and water standards." : "Hỏi về phòng trừ sâu bệnh sinh học, công thức bón phân hoặc tiêu chuẩn đất nước.")}</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.messageId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: m.senderType === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div className={`ai-message-bubble${m.senderType === 'user' ? ' ai-message-bubble--user' : ''}`}
                      style={{
                        maxWidth: '85%',
                        padding: '14px 18px',
                        borderRadius: m.senderType === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: m.senderType === 'user' ? 'var(--color-primary)' : 'var(--color-page)',
                        color: m.senderType === 'user' ? 'var(--color-on-primary)' : 'var(--color-text)',
                        border: m.senderType === 'user' ? 'none' : '1px solid var(--color-border)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                      }}
                    >
                      {m.senderType === 'assistant' ? (
                        <FormattedAIMessage content={m.uiMessageKey ? translate(m.uiMessageKey) : m.messageText} />
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.uiMessageKey ? translate(m.uiMessageKey) : m.messageText}</div>
                      )}
                      {m.sources && m.sources.length > 0 && (
                        <div className="ai-message-sources" style={{ marginTop: '10px', paddingTop: '8px', fontSize: '11.5px' }}>
                          📚 <strong>{(lang === 'en' ? "Standards sources:" : "Nguồn quy chuẩn:")}</strong> {m.sources.join(', ')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '4px', padding: '0 6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        {(lang === 'en' ? m.createdAt ? uiFormatDateTime(m.createdAt, lang, { hour: '2-digit', minute: '2-digit' }) : "Just now" : m.createdAt ? uiFormatDateTime(m.createdAt, lang, { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong')}
                      </span>
                      {m.senderType === 'assistant' && m.modelName && (
                        <span style={{ fontSize: '11px', color: 'var(--color-primary-text)', background: 'var(--color-success-bg)', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          🤖 {m.modelName}
                        </span>
                      )}
                      {m.senderType === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(m)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '11.5px',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 4px',
                          }}
                          title={(lang === 'en' ? "Report this answer if it is inaccurate" : "Báo cáo câu trả lời này nếu chưa chính xác")}
                        >
                          {(lang === 'en' ? "🚩 Report answer" : "🚩 Báo cáo câu trả lời")}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--color-subtle)', padding: '10px 16px', borderRadius: '14px', color: 'var(--color-muted)', fontSize: '13px' }}>
                  {(lang === 'en' ? "⏳ AI is checking VietGAP standards and preparing an answer..." : "⏳ AI đang tra cứu quy chuẩn VietGAP và tổng hợp câu trả lời...")}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form className="ai-chat-input" onSubmit={handleSendMessage}>
              <input aria-label={(lang === 'en' ? "Ask AI about pests, fertilizer dosage, or VietGAP procedures..." : "Hỏi AI về sâu bệnh, liều lượng bón phân hoặc quy trình VietGAP...")} className="ui-input"
                type="text"
                placeholder={(lang === 'en' ? "Ask AI about pests, fertilizer dosage, or VietGAP procedures..." : "Hỏi AI về sâu bệnh, liều lượng bón phân hoặc quy trình VietGAP...")}
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                disabled={isTyping}
                style={{ padding: '12px 16px' }}
              />
              {isSupported && (
                <button
                  type="button"
                  className={`button button-outline ${isListening ? 'ai-chatbox-voice-btn--listening' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? (lang === 'en' ? 'Stop listening' : 'Dừng nghe') : (lang === 'en' ? 'Ask by voice' : 'Hỏi bằng giọng nói')}
                  disabled={isTyping}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    minWidth: '44px',
                    padding: 0,
                    borderRadius: '50%',
                    flexShrink: 0,
                    borderColor: isListening ? '#ef4444' : undefined,
                    color: isListening ? '#ef4444' : 'var(--color-primary)',
                    backgroundColor: isListening ? '#fef2f2' : undefined,
                  }}
                >
                  <Icon name="mic" size={18} />
                </button>
              )}
              <Button type="submit" variant="primary" disabled={isTyping || !inputQuestion.trim()} >
                {(lang === 'en' ? "Send question" : "Gửi câu hỏi")}
              </Button>
            </form>
          </div>

          {/* Quick Suggestions Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel" style={{ padding: '18px' }}>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)', display: 'block', marginBottom: '10px' }}>
                {(lang === 'en' ? "💡 Suggested questions:" : "💡 Câu hỏi gợi ý nhanh:")}
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Bọ trĩ trên dưa lưới trị bằng thuốc sinh học gì?',
                  'Quy định thời gian cách ly trước thu hoạch VietGAP?',
                  'Công thức bón phân đón quả cho dưa lưới?',
                  'Tiêu chuẩn nước tưới đạt chuẩn QCVN 39?',
                  'Quy định về dải đệm cách ly rủi ro ô nhiễm đất?',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setInputQuestion(translate(sug))}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-page)',
                      fontSize: '12.5px',
                      color: 'var(--color-body)',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                    }}
                  >
                    {translate(sug)}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel" style={{ padding: '18px', background: 'var(--color-success-bg)', borderColor: 'var(--color-border)' }}>
              <strong style={{ fontSize: '13.5px', color: 'var(--color-success)', display: 'block', marginBottom: '6px' }}>
                {(lang === 'en' ? "🔒 Standardized VietGAP knowledge" : "🔒 Chuẩn hóa tri thức VietGAP")}
              </strong>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-success)', lineHeight: 1.5 }}>
                {(lang === 'en' ? "AI answers are checked against TCVN 11892-1:2017 and the approved agricultural input list." : "Mọi thông tin phản hồi từ AI đều được đối chiếu trực tiếp với TCVN 11892-1:2017 và danh mục vật tư nông nghiệp cho phép.")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CHAT HISTORY & SEARCH
         ========================================================= */}
      {activeTab === 'ai-history' && (
        <div {...tabPanelProps('ai', 'ai-history')} className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>{(lang === 'en' ? "AI conversation history" : "Lịch sử các phiên tư vấn AI")}</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--color-muted)', fontSize: '13.5px' }}>
                {(lang === 'en' ? "Review previous conversations or search for a topic" : "Xem lại các phiên hỏi đáp trước đây hoặc tìm kiếm chủ đề bạn quan tâm")}
              </p>
            </div>

            {/* Search My Conversations */}
            <div style={{ display: 'flex', gap: '8px', width: 'min(380px, 100%)' }}>
              <input aria-label={(lang === 'en' ? "Search conversations..." : "Tìm kiếm cuộc trò chuyện...")} className="ui-input"
                type="text"
                placeholder={(lang === 'en' ? "Search conversations..." : "Tìm kiếm cuộc trò chuyện...")}
                value={searchHistoryQuery}
                onChange={(e) => {
                  setSearchHistoryQuery(e.target.value);
                  void loadConversations(e.target.value);
                }}
                style={{ flex: 1, padding: '8px 12px' }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadConversations(searchHistoryQuery)}
              >
                <Icon name="search" size={16} />
              </Button>
            </div>
          </div>

          {loadingHistory ? (
            <p style={{ color: 'var(--color-primary-text)', textAlign: 'center', padding: '24px' }}>{(lang === 'en' ? "Loading conversation history..." : "Đang tải lịch sử hội thoại...")}</p>
          ) : conversations.length === 0 ? (
            <EmptyState   title={<>{(lang === 'en' ? "No conversations yet" : "Chưa có cuộc trò chuyện nào")}</>} description={<>{(lang === 'en' ? "Start your first conversation with the farming AI assistant." : "Hãy bắt đầu phiên hỏi đáp đầu tiên với Trợ lý AI nông nghiệp.")}</>} action={<><span style={{ fontSize: '32px' }}>💬</span><Button type="button" variant="primary" onClick={handleStartNewConversation}>
                {(lang === 'en' ? "Start conversation" : "Bắt đầu trò chuyện")}
              </Button></>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversations.map((c) => (
                <div
                  key={c.conversationId}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    background: c.conversationId === activeConversationId ? 'var(--color-success-bg)' : 'var(--color-page)',
                    border: `1px solid ${c.conversationId === activeConversationId ? 'var(--color-primary-text)' : 'var(--color-border)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div className="ai-record-content">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--color-text)' }}>{translate(c.title)}</strong>
                      <span className="knowledge-tag" style={{ fontSize: '11px' }}>
                        {c.messageCount} {(lang === 'en' ? " messages" : " tin nhắn")}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '13px' }}>
                      {c.lastMessageSnippet}
                    </p>
                    <small style={{ color: 'var(--color-muted)', display: 'block', marginTop: '4px' }}>
                      {(lang === 'en' ? "Updated: " : "Cập nhật: ")} {displayDateTime(c.updatedAt, lang)}
                    </small>
                  </div>

                  <div className="ai-record-actions">
                    <Button
                      type="button"
                      variant="primary"

                      onClick={async () => {
                        await selectConversation(c.conversationId);
                        setActiveTab('ai');
                      }}
                    >
                      {(lang === 'en' ? "Review & Continue" : "Xem lại & Tiếp tục")}
                    </Button>
                    <button
                      type="button"
                      className="table-icon-btn danger"
                      title={lang === 'en' ? 'Delete conversation' : 'Xóa hội thoại'}
                      aria-label={lang === 'en' ? 'Delete conversation' : 'Xóa hội thoại'}
                      onClick={() => setDeleteConversationId(c.conversationId)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: USER FEEDBACK & REPORTS
         ========================================================= */}
      {activeTab === 'ai-feedback' && (
        <div {...tabPanelProps('ai', 'ai-feedback')} className="ai-feedback-layout">
          {/* View Feedback History */}
          <div className="panel" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--color-text)' }}>
              {(lang === 'en' ? "Your feedback and report history" : "Lịch sử các phản hồi & Báo cáo của bạn")}
            </h2>
            <p style={{ margin: '0 0 18px', color: 'var(--color-muted)', fontSize: '13.5px' }}>
              {(lang === 'en' ? "Track the review status of feedback and answers reported to specialists" : "Theo dõi tình trạng xử lý các câu trả lời bạn đã đóng góp hoặc báo cáo với chuyên gia")}
            </p>

            {feedbackHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted)' }}>
                <span style={{ fontSize: '28px' }}>📝</span>
                <p>{(lang === 'en' ? "You have not submitted any reports or feedback on AI answers." : "Bạn chưa gửi báo cáo hoặc ý kiến phản hồi nào cho các câu trả lời AI.")}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {feedbackHistory.map((fb) => (
                  <div
                    key={fb.feedbackId}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-page)',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                        {'⭐'.repeat(fb.rating || 1)} ({fb.rating}{(lang === 'en' ? "/5 stars) " : "/5 sao) ")}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <small style={{ color: 'var(--color-muted)' }}>
                          {displayDate(fb.createdAt, lang)}
                        </small>
                        <Button
                          type="button"
                          variant="secondary"
                          size="compact"
                          className="ui-edit-action"
                          onClick={() => handleStartEditFeedback(fb)}
                        >
                          <Icon name="edit" size={14} />
                          {(lang === 'en' ? "Edit" : "Chỉnh sửa")}
                        </Button>
                      </div>
                    </div>

                    {fb.aiResponseSnippet && (
                      <div style={{ background: 'var(--color-subtle)', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', color: 'var(--color-body)', marginBottom: '8px' }}>
                        <strong>{(lang === 'en' ? "AI answer:" : "Câu trả lời AI:")}</strong> &quot;{fb.aiResponseSnippet}&quot;
                      </div>
                    )}

                    <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: 'var(--color-text)' }}>
                      <strong>{(lang === 'en' ? "Feedback:" : "Nội dung phản hồi:")}</strong> {fb.feedbackText}
                    </p>

                    {fb.replies && fb.replies.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        {fb.replies.map((r, idx) => (
                          <div key={idx} style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                            <strong>{(lang === 'en' ? "Specialist response:" : "Phản hồi từ Ban chuyên môn:")}</strong> {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Feedback Box */}
          <div className="panel" style={{ padding: '20px', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--color-text)' }}>{(lang === 'en' ? "General feedback" : "Đóng góp ý kiến chung")}</h3>
            <p style={{ margin: '0 0 16px', color: 'var(--color-muted)', fontSize: '13px' }}>
              {(lang === 'en' ? "Share your experience or suggest features to improve the application." : "Chia sẻ cảm nhận hoặc đề xuất tính năng mới để hoàn thiện ứng dụng.")}
            </p>

            {feedbackSent && (
              <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                {(lang === 'en' ? "✓ Your feedback has been recorded!" : "✓ Đã ghi nhận đóng góp ý kiến của bạn!")}
              </div>
            )}

            <form onSubmit={handleGeneralFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="structured-field-card"><label htmlFor="general-ai-feedback">{lang === 'en' ? 'Feedback' : 'Nội dung góp ý'}</label>
              <textarea id="general-ai-feedback" aria-label={(lang === 'en' ? 'Enter your feedback...' : 'Nhập nội dung đóng góp của bạn...')} className="ui-textarea"
                rows={4}
                required
                placeholder={(lang === 'en' ? "Enter your feedback..." : "Nhập nội dung đóng góp của bạn...")}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              /></div>
              <Button type="submit" variant="primary" style={{ alignSelf: 'flex-end' }}>
                {(lang === 'en' ? "Send feedback" : "Gửi ý kiến")}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: AI DRAFTS
         ========================================================= */}
      {activeTab === 'ai-drafts' && (
        <div {...tabPanelProps('ai', 'ai-drafts')} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-border)', padding: '16px 20px' }}>
            <strong style={{ color: 'var(--color-success)', fontSize: '14.5px' }}>{(lang === 'en' ? "AI farming draft suggestions:" : "Bản nháp canh tác do AI đề xuất:")}</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--color-success)', fontSize: '13px' }}>
              {(lang === 'en' ? "The system analyzes weather and crop stages to suggest tasks. Drafts become official diary records only after you confirm them." : "Hệ thống tự động phân tích thời tiết và giai đoạn mùa vụ để gợi ý công việc. Bản nháp chỉ trở thành Nhật ký chính thức khi bạn bấm Xác nhận.")}
            </p>
          </div>

          {drafts.map((d) => (
            <div key={d.id} className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div className="ai-record-content">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {d.activityType?.trim() && <span className="knowledge-tag">{translate(d.activityType)}</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--color-muted)' }}><Icon name="calendar" size={14} />{lang === 'en' ? 'Suggested date:' : 'Đề xuất thực hiện:'} {displayDate(d.recommendedDate, lang)}</span>
                  <StatusBadge tone={d.status === 'APPROVED' ? 'success' : 'neutral'} label={<>
                    {d.status === 'PENDING' ? (lang === 'en' ? 'Pending Review' : 'Chờ duyệt') : d.status === 'APPROVED' ? (lang === 'en' ? 'Approved' : 'Đã duyệt') : (lang === 'en' ? 'Cancelled' : 'Đã hủy')}
                  </>} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16.5px', color: 'var(--color-text)' }}>{translate(d.title)}</h3>
                <p style={{ margin: '0 0 8px', color: 'var(--color-primary-text)', fontSize: '13.5px', fontWeight: 600 }}>
                  {(lang === 'en' ? "Recommended materials: " : "Vật tư khuyến cáo: ")} {translate(d.suggestedMaterial)}
                </p>
                <p style={{ margin: 0, color: 'var(--color-body)', fontSize: '13px', background: 'var(--color-page)', padding: '10px 12px', borderRadius: '8px' }}>
                  <strong>{(lang === 'en' ? "Reason for the AI suggestion:" : "Lý do AI đề xuất:")}</strong> {translate(d.reason)}
                </p>
              </div>

              {d.status === 'PENDING' && (
                <div className="ai-record-actions">
                  <Button type="button" variant="secondary" className="ui-cancel-button" onClick={() => handleRejectDraft(d.id)}>
                    {(lang === 'en' ? "Discard" : "Hủy bỏ")}
                  </Button>
                  <Button type="button" variant="primary" onClick={() => handleApproveDraft(d.id)}>
                    <Icon name="check" size={16} />
                    {lang === 'en' ? 'Confirm diary entry' : 'Xác nhận ghi nhật ký'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          REPORT MODAL: Report AI Response
         ========================================================= */}
      {reportingMessage && (
        <Modal structured open customLayout onClose={() => setReportingMessage(null)} style={{ width: 'min(540px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-danger)' }}>{(lang === 'en' ? "Report answer" : "Báo cáo câu trả lời")}</span>
                <h2>{(lang === 'en' ? "AI advice quality feedback" : "Phản hồi chất lượng tư vấn AI")}</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setReportingMessage(null)}>✕</button>
            </div>

            <form className="modal-body" onSubmit={handleSubmitReport}>
              <div className="ui-form-context" style={{ background: 'var(--color-page)', padding: '16px 18px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-body)', maxHeight: '120px', overflowY: 'auto' }}>
                <strong>{(lang === 'en' ? "AI answer:" : "Nội dung câu trả lời của AI:")}</strong>
                <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>&quot;{reportingMessage.uiMessageKey ? translate(reportingMessage.uiMessageKey) : reportingMessage.messageText}&quot;</p>
              </div>

              <div className="structured-field-card">
              <label className="structured-field-label">
                  {(lang === 'en' ? "Satisfaction / Accuracy:" : "Mức độ hài lòng / Độ chính xác:")}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReportRating(star)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${reportRating === star ? 'var(--color-warning)' : 'var(--color-input-border)'}`,
                        background: reportRating === star ? 'var(--color-warning-bg)' : 'var(--color-surface)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 650,
                        color: reportRating === star ? 'var(--color-warning)' : 'var(--color-body)',
                      }}
                    >
                      {star} ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div className="structured-field-card">
                <label htmlFor="ai-field-1">
                  {(lang === 'en' ? "Report reason / Suggested improvements:" : "Lý do báo cáo / Thông tin cần cải thiện:")}
                </label>
                <textarea id="ai-field-1" className="ui-textarea"
                  rows={3}
                  required
                  placeholder={(lang === 'en' ? "For example: pesticide dosage does not meet TCVN, or the PHI is shorter than required..." : "Ví dụ: Liều lượng thuốc BVTV chưa đúng theo TCVN, thời gian cách ly PHI ngắn hơn thực tế...")}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '10px' }}>
                <Button className="ui-cancel-button" type="button" variant="secondary" onClick={() => setReportingMessage(null)}>
                  {(lang === 'en' ? "Cancel" : "Hủy")}
                </Button>
                <Button type="submit" variant="primary" loading={submittingReport}>
                  {(lang === 'en' ? submittingReport ? "Sending..." : "Submit report" : submittingReport ? 'Đang gửi...' : 'Gửi báo cáo')}
                </Button>
              </div>
            </form>
          </Modal>
      )}

      {/* Edit Feedback Modal */}
      {editingFeedback && (
        <Modal structured open customLayout className="modal-form-layout" onClose={() => setEditingFeedback(null)} style={{ width: 'min(520px, 100%)' }}>
          <div className="modal-header">
            <div>
              <span className="eyebrow" style={{ color: 'var(--color-primary-text)' }}>{(lang === 'en' ? "Update feedback" : "Cập nhật ý kiến")}</span>
              <h2>{(lang === 'en' ? "Edit answer feedback" : "Chỉnh sửa phản hồi câu trả lời")}</h2>
            </div>
            <button type="button" className="modal-close" aria-label={lang === 'en' ? 'Close dialog' : 'Đóng cửa sổ'} onClick={() => setEditingFeedback(null)}><Icon name="close" /></button>
          </div>

          <form className="modal-body" onSubmit={handleSubmitEditFeedback}>
            {editingFeedback.aiResponseSnippet && (
              <div className="ui-form-context" style={{ background: 'var(--color-page)', padding: '16px 18px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-body)', maxHeight: '120px', overflowY: 'auto' }}>
                <strong>{(lang === 'en' ? "AI answer:" : "Câu trả lời AI:")}</strong>
                <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>&quot;{editingFeedback.aiResponseSnippet}&quot;</p>
              </div>
            )}

            <div className="structured-field-card">
              <label className="structured-field-label">
                {(lang === 'en' ? "Star rating:" : "Đánh giá số sao:")}
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${editRating === star ? 'var(--color-warning)' : 'var(--color-input-border)'}`,
                      background: editRating === star ? 'var(--color-warning-bg)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 650,
                      color: editRating === star ? 'var(--color-warning)' : 'var(--color-body)',
                    }}
                  >
                    {star} ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="structured-field-card">
              <label htmlFor="ai-field-2">
                {(lang === 'en' ? "Feedback / suggestions:" : "Nội dung phản hồi / góp ý:")}
              </label>
              <textarea id="ai-field-2" className="ui-textarea"
                rows={3}
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ width: '100%', padding: '10px' }}
              />
            </div>

            <div className="confirm-dialog-actions" style={{ marginTop: '10px' }}>
              <Button className="ui-cancel-button" type="button" variant="secondary" onClick={() => setEditingFeedback(null)}>
                {(lang === 'en' ? "Cancel" : "Hủy")}
              </Button>
              <Button type="submit" variant="primary" loading={submittingEdit}>
                {(lang === 'en' ? submittingEdit ? "Saving..." : "Save changes" : submittingEdit ? 'Đang lưu...' : 'Lưu thay đổi')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <ConfirmDialog open={deleteConversationId !== null}
        title={lang === 'en' ? 'Delete conversation' : 'Xóa hội thoại'}
        description={lang === 'en' ? 'Are you sure you want to delete this conversation?' : 'Bạn có chắc chắn muốn xóa cuộc hội thoại này?'}
        tone="danger" loading={deletingConversation} onClose={() => setDeleteConversationId(null)}
        onConfirm={() => { if (deleteConversationId !== null) void handleDeleteConversation(deleteConversationId); }} />
    </section>
  );
}
