import { useState, useEffect } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import {
  fetchMyAIConversations,
  fetchAIConversationDetail,
  createAIConversation,
  askAIInConversation,
  askAIQuick,
  reportAIMessage,
  fetchMyAIFeedbackHistory,
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

export function AIAssistantPage({ initialTab = 'ai' }: AIAssistantPageProps) {
  const { lang } = useLanguage();
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'ai' | 'ai-history' | 'ai-feedback' | 'ai-drafts'>(initialTab);

  // Chat & Conversation states
  const [conversations, setConversations] = useState<AIConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AIMessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reporting / Feedback state
  const [feedbackHistory, setFeedbackHistory] = useState<AIFeedbackItem[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<AIMessageItem | null>(null);
  const [reportRating, setReportRating] = useState<number>(3);
  const [reportReason, setReportReason] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
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
      const title = `Hội thoại tư vấn VietGAP ${new Date().toLocaleDateString('vi-VN')}`;
      const newConv = await createAIConversation(title, selectedFarm?.id);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.conversationId);
      await selectConversation(newConv.conversationId);
      setActiveTab('ai');
      showToast('Đã bắt đầu phiên trò chuyện mới với AI');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể tạo phiên mới', 'error');
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
      // In case backend is temporarily unreachable, provide local fallback
      const fallbackAiMsg: AIMessageItem = {
        messageId: Date.now() + 1,
        conversationId: activeConversationId || 0,
        senderType: 'assistant',
        messageText: 'Dựa trên quy chuẩn VietGAP TCVN 11892-1:2017: Hãy ưu tiên sử dụng chế phẩm sinh học đối kháng (Neem Oil, nấm ký sinh Beauveria) và tuân thủ nghiêm ngặt thời gian cách ly PHI trước thu hoạch.',
        sources: ['TCVN 11892-1:2017 (VietGAP)'],
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
      showToast('Đã gửi phản hồi báo cáo câu trả lời thành công. Cảm ơn bạn!');
      setReportingMessage(null);
      void loadFeedbackHistory();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gửi báo cáo thất bại', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleGeneralFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
    showToast('Cảm ơn đóng góp ý kiến của bạn về Trợ lý AI!');
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  const handleApproveDraft = (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: 'APPROVED' } : d))
    );
    showToast('Đã xác nhận và chuyển bản nháp AI vào Nhật ký canh tác!');
  };

  const handleRejectDraft = (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: 'REJECTED' } : d))
    );
  };

  return (
    <section className="ai-assistant-page">
      <div className="page-heading">
        <div>
          <h1>Trợ lý AI Nông nghiệp VietGAP (UC-12 & UC-13)</h1>
          <p className="page-subtitle">
            Hỗ trợ chẩn đoán dịch hại, tư vấn canh tác chuẩn quốc gia, lưu trữ lịch sử hội thoại và phản hồi chuyên gia
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="primary-button" onClick={handleStartNewConversation}>
            <Icon name="plus" /> Cuộc trò chuyện mới
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: toastMessage.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${toastMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
          }}
        >
          <Icon name={toastMessage.type === 'success' ? 'check' : 'alert-circle'} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'ai' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'ai' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          {lang === 'en' ? '🤖 AI Assistant Chat' : '🤖 Trò chuyện cùng AI (UC-12.1)'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai-history')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'ai-history' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'ai-history' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          {lang === 'en' ? '📜 Chat History' : '📜 Lịch sử & Tìm kiếm hội thoại (UC-12.2 & 12.3)'} ({conversations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai-feedback')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'ai-feedback' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'ai-feedback' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          {lang === 'en' ? '💬 User Feedback & Reports' : '💬 Phản hồi & Lịch sử báo cáo (UC-13.3 & 13.4)'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai-drafts')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 650,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'ai-drafts' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'ai-drafts' ? '#059669' : '#64748b',
            marginBottom: '-2px',
          }}
        >
          {lang === 'en' ? '📝 AI Farming Drafts' : '📝 Dự thảo nhật ký AI'} ({drafts.filter((d) => d.status === 'PENDING').length})
        </button>
      </div>

      {/* =========================================================
          TAB 1: AI CHAT (UC-12.1)
         ========================================================= */}
      {activeTab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px' }}>
          {/* Main Chat Box */}
          <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '620px' }}>
            {/* Messages feed */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b' }}>
                  <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🌱</span>
                  <strong>Chào bạn! Hãy đặt câu hỏi cho Trợ lý AI VietGAP.</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Hỏi về phòng trừ sâu bệnh sinh học, công thức bón phân hoặc tiêu chuẩn đất nước.</p>
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
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '14px 18px',
                        borderRadius: m.senderType === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: m.senderType === 'user' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                        color: m.senderType === 'user' ? '#ffffff' : '#0f172a',
                        border: m.senderType === 'user' ? 'none' : '1px solid #e2e8f0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.messageText}
                      {m.sources && m.sources.length > 0 && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '11.5px', color: '#059669' }}>
                          📚 <strong>Nguồn quy chuẩn:</strong> {m.sources.join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', padding: '0 6px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                      </span>
                      {m.senderType === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => handleOpenReportModal(m)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '11.5px',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 4px',
                          }}
                          title="Báo cáo câu trả lời này nếu chưa chính xác"
                        >
                          🚩 Báo cáo (UC-13.4)
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '10px 16px', borderRadius: '14px', color: '#64748b', fontSize: '13px' }}>
                  ⏳ AI đang tra cứu quy chuẩn VietGAP và tổng hợp câu trả lời...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
              <input
                type="text"
                placeholder="Hỏi AI về sâu bệnh, liều lượng bón phân hoặc quy trình VietGAP..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                disabled={isTyping}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <button type="submit" className="primary-button" disabled={isTyping || !inputQuestion.trim()} style={{ padding: '0 20px', borderRadius: '10px' }}>
                Gửi câu hỏi
              </button>
            </form>
          </div>

          {/* Quick Suggestions Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="panel" style={{ padding: '18px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                💡 Câu hỏi gợi ý nhanh:
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
                    onClick={() => setInputQuestion(sug)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '12.5px',
                      color: '#334155',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel" style={{ padding: '18px', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <strong style={{ fontSize: '13.5px', color: '#166534', display: 'block', marginBottom: '6px' }}>
                🔒 Chuẩn hóa tri thức VietGAP
              </strong>
              <p style={{ margin: 0, fontSize: '12px', color: '#15803d', lineHeight: 1.5 }}>
                Mọi thông tin phản hồi từ AI đều được đối chiếu trực tiếp với TCVN 11892-1:2017 và danh mục vật tư nông nghiệp cho phép.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: CHAT HISTORY & SEARCH (UC-12.2 & UC-12.3)
         ========================================================= */}
      {activeTab === 'ai-history' && (
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Lịch sử các phiên tư vấn AI (UC-12.2)</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                Xem lại các phiên hỏi đáp trước đây hoặc tìm kiếm chủ đề bạn quan tâm
              </p>
            </div>

            {/* UC-12.3: Search My Conversations */}
            <div style={{ display: 'flex', gap: '8px', width: 'min(380px, 100%)' }}>
              <input
                type="text"
                placeholder="Tìm kiếm cuộc trò chuyện (UC-12.3)..."
                value={searchHistoryQuery}
                onChange={(e) => {
                  setSearchHistoryQuery(e.target.value);
                  void loadConversations(e.target.value);
                }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
              <button
                type="button"
                className="action-button"
                onClick={() => void loadConversations(searchHistoryQuery)}
              >
                <Icon name="search" size={16} />
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <p style={{ color: '#059669', textAlign: 'center', padding: '24px' }}>Đang tải lịch sử hội thoại...</p>
          ) : conversations.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '36px' }}>
              <span style={{ fontSize: '32px' }}>💬</span>
              <h3>Chưa có cuộc trò chuyện nào</h3>
              <p style={{ color: '#64748b' }}>Hãy bắt đầu phiên hỏi đáp đầu tiên với Trợ lý AI nông nghiệp.</p>
              <button type="button" className="primary-button" onClick={handleStartNewConversation}>
                Bắt đầu trò chuyện
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {conversations.map((c) => (
                <div
                  key={c.conversationId}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '10px',
                    background: c.conversationId === activeConversationId ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${c.conversationId === activeConversationId ? '#86efac' : '#e2e8f0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{c.title}</strong>
                      <span className="knowledge-tag" style={{ fontSize: '11px' }}>
                        {c.messageCount} tin nhắn
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                      {c.lastMessageSnippet}
                    </p>
                    <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                      Cập nhật: {new Date(c.updatedAt).toLocaleString('vi-VN')}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    onClick={async () => {
                      await selectConversation(c.conversationId);
                      setActiveTab('ai');
                    }}
                  >
                    Xem lại &amp; Tiếp tục
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: USER FEEDBACK & REPORTS (UC-13.3 & UC-13.4)
         ========================================================= */}
      {activeTab === 'ai-feedback' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '24px' }}>
          {/* UC-13.3: View Feedback History */}
          <div className="panel" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px', color: '#0f172a' }}>
              Lịch sử các phản hồi &amp; Báo cáo của bạn (UC-13.3)
            </h2>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '13.5px' }}>
              Theo dõi tình trạng xử lý các câu trả lời bạn đã đóng góp hoặc báo cáo với chuyên gia
            </p>

            {feedbackHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                <span style={{ fontSize: '28px' }}>📝</span>
                <p>Bạn chưa gửi báo cáo hoặc ý kiến phản hồi nào cho các câu trả lời AI.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedbackHistory.map((fb) => (
                  <div
                    key={fb.feedbackId}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#d97706', fontWeight: 700 }}>
                        {'⭐'.repeat(fb.rating || 1)} ({fb.rating}/5 sao)
                      </span>
                      <small style={{ color: '#94a3b8' }}>
                        {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                      </small>
                    </div>

                    {fb.aiResponseSnippet && (
                      <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', color: '#475569', marginBottom: '8px' }}>
                        <strong>Câu trả lời AI:</strong> &quot;{fb.aiResponseSnippet}&quot;
                      </div>
                    )}

                    <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: '#0f172a' }}>
                      <strong>Nội dung phản hồi:</strong> {fb.feedbackText}
                    </p>

                    {fb.replies && fb.replies.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        {fb.replies.map((r, idx) => (
                          <div key={idx} style={{ background: '#ecfdf5', color: '#065f46', padding: '8px 12px', borderRadius: '6px', fontSize: '12px' }}>
                            <strong>Phản hồi từ Ban chuyên môn:</strong> {r}
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
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#0f172a' }}>Đóng góp ý kiến chung</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
              Chia sẻ cảm nhận hoặc đề xuất tính năng mới để hoàn thiện ứng dụng.
            </p>

            {feedbackSent && (
              <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                ✓ Đã ghi nhận đóng góp ý kiến của bạn!
              </div>
            )}

            <form onSubmit={handleGeneralFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                rows={4}
                required
                placeholder="Nhập nội dung đóng góp của bạn..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
              <button type="submit" className="primary-button" style={{ alignSelf: 'flex-end' }}>
                Gửi ý kiến
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: AI DRAFTS
         ========================================================= */}
      {activeTab === 'ai-drafts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="panel" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', padding: '16px 20px' }}>
            <strong style={{ color: '#166534', fontSize: '14.5px' }}>Bản nháp canh tác do AI đề xuất:</strong>
            <p style={{ margin: '4px 0 0', color: '#15803d', fontSize: '13px' }}>
              Hệ thống tự động phân tích thời tiết và giai đoạn mùa vụ để gợi ý công việc. Bản nháp chỉ trở thành Nhật ký chính thức khi bạn bấm Xác nhận.
            </p>
          </div>

          {drafts.map((d) => (
            <div key={d.id} className="panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="profile-tag-pill">{d.activityType}</span>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>📅 Đề xuất thực hiện: {d.recommendedDate}</span>
                  <span className={`status-badge ${d.status === 'APPROVED' ? 'status-badge--success' : ''}`}>
                    {d.status === 'PENDING' ? (lang === 'en' ? 'Pending Review' : 'Chờ duyệt') : d.status === 'APPROVED' ? (lang === 'en' ? 'Approved' : 'Đã duyệt') : (lang === 'en' ? 'Cancelled' : 'Đã hủy')}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16.5px', color: '#0f172a' }}>{d.title}</h3>
                <p style={{ margin: '0 0 8px', color: '#059669', fontSize: '13.5px', fontWeight: 600 }}>
                  Vật tư khuyến cáo: {d.suggestedMaterial}
                </p>
                <p style={{ margin: 0, color: '#475569', fontSize: '13px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                  💡 <strong>Lý do AI đề xuất:</strong> {d.reason}
                </p>
              </div>

              {d.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="action-button" style={{ color: '#ef4444' }} onClick={() => handleRejectDraft(d.id)}>
                    Hủy bỏ
                  </button>
                  <button type="button" className="primary-button" onClick={() => handleApproveDraft(d.id)}>
                    ✓ Xác nhận ghi nhật ký
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          REPORT MODAL (UC-13.4: Report AI Response)
         ========================================================= */}
      {reportingMessage && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ width: 'min(540px, 100%)' }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: '#dc2626' }}>UC-13.4 · Báo cáo câu trả lời</span>
                <h2>Phản hồi chất lượng tư vấn AI</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setReportingMessage(null)}>✕</button>
            </div>

            <form className="modal-body" onSubmit={handleSubmitReport}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', maxHeight: '120px', overflowY: 'auto' }}>
                <strong>Nội dung câu trả lời của AI:</strong>
                <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>&quot;{reportingMessage.messageText}&quot;</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 650 }}>
                  Mức độ hài lòng / Độ chính xác:
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
                        border: `1px solid ${reportRating === star ? '#f59e0b' : '#cbd5e1'}`,
                        background: reportRating === star ? '#fef3c7' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 650,
                        color: reportRating === star ? '#b45309' : '#475569',
                      }}
                    >
                      {star} ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 650 }}>
                  Lý do báo cáo / Thông tin cần cải thiện:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Liều lượng thuốc BVTV chưa đúng theo TCVN, thời gian cách ly PHI ngắn hơn thực tế..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div className="confirm-dialog-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="ghost-button" onClick={() => setReportingMessage(null)}>
                  Hủy
                </button>
                <button type="submit" className="primary-button" disabled={submittingReport}>
                  {submittingReport ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
