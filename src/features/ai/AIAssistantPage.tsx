import { useState } from 'react';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { Icon } from '../../shared/components/Icon';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: string[];
}

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
  const { selectedFarm } = useFarmWorkspace();
  const [activeTab, setActiveTab] = useState<'ai' | 'ai-history' | 'ai-feedback' | 'ai-drafts'>(initialTab);

  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'ai',
      text: `Xin chào! Tôi là Trợ lý AI nông nghiệp VietGAP. Tôi có thể hỗ trợ bạn chẩn đoán sâu bệnh, tư vấn danh mục thuốc BVTV sinh học, quy trình bón phân và tự động soạn thảo nhật ký canh tác cho trang trại ${selectedFarm?.farmName || ''}. Bạn cần hỗ trợ gì hôm nay?`,
      timestamp: 'Vừa xong',
      sources: ['Quy chuẩn Quốc gia TCVN 11892-1:2017', 'Cẩm nang BVTV Cục Trồng trọt'],
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Drafts state
  const [drafts, setDrafts] = useState<AIDraft[]>([
    {
      id: 'df-1',
      activityType: 'Bón phân',
      title: 'Bón thúc đợt 3 phân hữu cơ kali sinh học đón quả',
      recommendedDate: '2026-03-31',
      suggestedMaterial: 'Phân hữu cơ khoáng Kali hữu cơ 0.2kg/gốc',
      reason: 'Cây dưa lưới đang bước vào giai đoạn tạo ngọt (Brix), cần bổ sung kali tự nhiên để quả chắc và thơm.',
      status: 'PENDING',
    },
    {
      id: 'df-2',
      activityType: 'Tưới nước',
      title: 'Giảm lượng nước tưới trước thu hoạch 5 ngày',
      recommendedDate: '2026-04-02',
      suggestedMaterial: 'Nước lọc tinh khiết không pha phân',
      reason: 'Giảm độ ẩm gốc để tránh nứt quả và cô đọng lượng đường trong quả dưa.',
      status: 'PENDING',
    },
  ]);

  // Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: inputQuestion.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = 'Dựa trên quy chuẩn VietGAP, bạn nên tuân thủ thời gian cách ly PHI và ưu tiên các chế phẩm sinh học đối kháng.';
      const q = userMsg.text.toLowerCase();
      if (q.includes('sâu') || q.includes('bọ trĩ') || q.includes('rầy')) {
        aiReply = 'Đối với bọ trĩ và rầy mềm trên dưa lưới, giải pháp VietGAP khuyến nghị: 1) Phun tinh dầu Neem Oil nồng độ 0.2% vào lúc chiều mát. 2) Dùng nấm ký sinh Beauveria bassiana. Thời gian cách ly an toàn chỉ từ 3-5 ngày, không để lại dư lượng độc hại.';
      } else if (q.includes('bón') || q.includes('phân')) {
        aiReply = 'Quy trình bón phân VietGAP yêu cầu: Ngừng bón phân đạm (N) trước thu hoạch 15 ngày để kiểm soát dư lượng Nitrate (NO3-). Nên bổ sung phân bón hữu cơ hoai mục hoặc trùn quế đã ủ nấm đối kháng Trichoderma.';
      } else if (q.includes('nước') || q.includes('tưới')) {
        aiReply = 'Nước tưới cho trang trại phải đạt chuẩn QCVN 39:2011/BTNMT. Không được dùng nước kênh rạch chưa qua lắng lọc cát. Với dưa lưới, duy trì EC từ 1.2 - 1.5 mS/cm và pH 6.0 - 6.5.';
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        sources: ['TCVN 11892-1:2017', 'Danh mục thuốc BVTV sinh học được phép sử dụng tại VN'],
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleApproveDraft = (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: 'APPROVED' } : d))
    );
    alert('Đã xác nhận và chuyển bản nháp AI vào Nhật ký canh tác!');
  };

  const handleRejectDraft = (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: 'REJECTED' } : d))
    );
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  return (
    <section className="ai-assistant-page">
      <div className="page-heading">
        <div>
          <h1>Trợ lý AI Nông nghiệp VietGAP</h1>
          <p className="page-subtitle">
            Hỗ trợ chẩn đoán dịch hại, tư vấn canh tác chuẩn quốc gia và tự động khởi tạo dự thảo nhật ký
          </p>
        </div>
      </div>

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
          🤖 Trò chuyện cùng AI
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
          📝 Bản nháp canh tác AI ({drafts.filter((d) => d.status === 'PENDING').length})
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
          📜 Lịch sử hội thoại
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
          💬 Đóng góp ý kiến
        </button>
      </div>

      {activeTab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px' }}>
          {/* Main Chat Box */}
          <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '600px' }}>
            {/* Messages feed */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '14px 18px',
                      borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: m.sender === 'user' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                      color: m.sender === 'user' ? '#ffffff' : '#0f172a',
                      border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                    }}
                  >
                    {m.text}
                    {m.sources && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '11.5px', color: '#059669' }}>
                        📚 <strong>Nguồn trích dẫn:</strong> {m.sources.join(', ')}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', padding: '0 6px' }}>
                    {m.timestamp}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '10px 16px', borderRadius: '14px', color: '#64748b', fontSize: '13px' }}>
                  AI đang tra cứu quy chuẩn VietGAP...
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
                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
              <button type="submit" className="primary-button" style={{ padding: '0 20px', borderRadius: '10px' }}>
                Gửi câu hỏi
              </button>
            </form>
          </div>

          {/* Quick Suggestions Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="panel" style={{ padding: '18px' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '10px' }}>
                💡 Câu hỏi gợi ý:
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Bọ trĩ trên dưa lưới trị bằng thuốc sinh học gì?',
                  'Quy định thời gian cách ly trước thu hoạch VietGAP?',
                  'Công thức bón phân đón quả cho dưa lưới?',
                  'Tiêu chuẩn nước tưới đạt chuẩn QCVN 39?',
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
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel" style={{ padding: '18px', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <strong style={{ fontSize: '13.5px', color: '#166534', display: 'block', marginBottom: '6px' }}>
                🔒 An toàn dữ liệu AI
              </strong>
              <p style={{ margin: 0, fontSize: '12px', color: '#15803d', lineHeight: 1.5 }}>
                AI chỉ tư vấn trong phạm vi dữ liệu đã phê duyệt của VietGAP và không gửi dữ liệu trang trại ra ngoài.
              </p>
            </div>
          </div>
        </div>
      )}

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
                    {d.status === 'PENDING' ? 'Chờ duyệt' : d.status === 'APPROVED' ? 'Đã duyệt' : 'Đã hủy'}
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

      {activeTab === 'ai-history' && (
        <div className="panel" style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#0f172a' }}>Lịch sử các phiên tư vấn</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px 18px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>Hỏi về phòng trừ bọ trĩ trên dưa lưới bằng dầu Neem</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12.5px' }}>22/03/2026 · Đã lưu trong phiên</p>
              </div>
              <button type="button" className="action-button" style={{ fontSize: '12.5px' }}>Xem lại</button>
            </div>
            <div style={{ padding: '14px 18px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>Kiểm soát chỉ số Nitrate trong rau ăn lá VietGAP</strong>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12.5px' }}>18/03/2026 · Đã lưu trong phiên</p>
              </div>
              <button type="button" className="action-button" style={{ fontSize: '12.5px' }}>Xem lại</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-feedback' && (
        <div className="panel" style={{ padding: '24px', maxWidth: '640px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0f172a' }}>Đóng góp ý kiến về Trợ lý AI</h2>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13.5px' }}>
            Ý kiến phản hồi của bạn giúp chuyên gia VietGAP hoàn thiện độ chính xác của tri thức nông nghiệp.
          </p>

          {feedbackSent && (
            <div className="notification-popover" style={{ marginBottom: '16px', position: 'static', background: '#ecfdf5', color: '#065f46' }}>
              ✓ Cảm ơn bạn! Ý kiến phản hồi đã được gửi tới Ban quản trị hệ thống.
            </div>
          )}

          <form onSubmit={handleSendFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13.5px', fontWeight: 650, color: '#334155' }}>
                Nội dung câu trả lời chưa chuẩn xác hoặc cần cải thiện:
              </label>
              <textarea
                rows={4}
                required
                placeholder="Mô tả chi tiết câu trả lời bạn thấy chưa phù hợp..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="primary-button">
                Gửi phản hồi
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
