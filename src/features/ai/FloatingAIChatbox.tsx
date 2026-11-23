import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth';
import { useFarmWorkspace } from '../farm-management/FarmWorkspace';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { Icon } from '../../shared/components/Icon';
import { FormattedAIMessage } from './FormattedAIMessage';
import { useVoiceRecognition } from '../../shared/hooks/useVoiceRecognition';
import {
  askAIQuick,
  askAIInConversation,
  createAIConversation,
  fetchMyAIConversations,
  fetchAIConversationDetail,
  type AIMessageItem,
} from './aiService';
import '../../styles/ai-widget.css';

export function FloatingAIChatbox() {
  const { user } = useAuth();
  const { selectedFarm } = useFarmWorkspace();
  const { lang } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessageItem[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const { isListening, transcript, startListening, stopListening, isSupported } = useVoiceRecognition();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Khi có kết quả giọng nói, cập nhật vào ô input
  useEffect(() => {
    if (transcript) {
      setInputQuestion(transcript);
    }
  }, [transcript]);

  // Chỉ hiển thị cho các role: USER, OWNER, STAFF (tức người dùng trong hệ thống nông trại, không hiển thị khi chưa đăng nhập)
  // Nếu là ADMIN hệ thống thì trang /admin đã có trang riêng hoặc theo mong muốn của user là: staff, owner, user
  const isEligible = Boolean(user && user.systemRole?.toUpperCase() !== 'ADMIN');

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Load previous messages or setup welcome message on first open
  useEffect(() => {
    if (!isOpen || messages.length > 0) return;

    void (async () => {
      try {
        const convs = await fetchMyAIConversations();
        if (convs.length > 0) {
          const latest = convs[0];
          setConversationId(latest.conversationId);
          const detail = await fetchAIConversationDetail(latest.conversationId);
          if (detail.messages && detail.messages.length > 0) {
            setMessages(detail.messages);
            return;
          }
        }
      } catch {
        // ignore error and show default greeting
      }

      // Default welcome message
      const welcome: AIMessageItem = {
        messageId: Date.now(),
        conversationId: 0,
        senderType: 'assistant',
        messageText:
          lang === 'en'
            ? 'Hello! I am your MyCropDiary AI agricultural assistant. Ask me anything about VietGAP standards, pest control, fertilization, or farming practices!'
            : 'Xin chào! Tôi là Trợ lý AI Nông nghiệp MyCropDiary. Bạn có thể hỏi tôi về quy trình VietGAP, phòng trừ sâu bệnh, liều lượng phân bón hoặc kỹ thuật mùa vụ!',
        createdAt: new Date().toISOString(),
      };
      setMessages([welcome]);
    })();
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isEligible) {
    return null;
  }

  const handleSendMessage = async (customText?: string) => {
    const text = (customText ?? inputQuestion).trim();
    if (!text || isTyping) return;

    if (!customText) {
      setInputQuestion('');
    }
    setIsTyping(true);

    const tempUserMsg: AIMessageItem = {
      messageId: Date.now(),
      conversationId: conversationId || 0,
      senderType: 'user',
      messageText: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let aiResp: AIMessageItem;
      if (conversationId) {
        aiResp = await askAIInConversation(conversationId, text, selectedFarm?.id);
      } else {
        aiResp = await askAIQuick(text, selectedFarm?.id);
        if (aiResp.conversationId) {
          setConversationId(aiResp.conversationId);
        }
      }
      setMessages((prev) => [...prev, aiResp]);
    } catch (err) {
      const errMsg = err instanceof Error && err.message ? err.message : '';
      const fallbackMsg: AIMessageItem = {
        messageId: Date.now() + 1,
        conversationId: conversationId || 0,
        senderType: 'assistant',
        messageText:
          lang === 'en'
            ? errMsg || 'AI Assistant is temporarily busy. Please ask again in a moment.'
            : errMsg || 'Trợ lý AI đang bận xử lý hoặc kết nối gián đoạn. Vui lòng thử lại sau giây lát nhé.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetConversation = async () => {
    if (isTyping) return;
    try {
      const title = `Hội thoại AI ${new Date().toLocaleDateString('vi-VN')}`;
      const newConv = await createAIConversation(title, selectedFarm?.id);
      setConversationId(newConv.conversationId);
      const welcome: AIMessageItem = {
        messageId: Date.now(),
        conversationId: newConv.conversationId,
        senderType: 'assistant',
        messageText:
          lang === 'en'
            ? 'Started a new consultation. How can I help with your crops today?'
            : 'Đã bắt đầu phiên tư vấn mới. Bạn muốn hỏi gì về kỹ thuật canh tác hôm nay?',
        createdAt: new Date().toISOString(),
      };
      setMessages([welcome]);
    } catch {
      setMessages([]);
      setConversationId(null);
    }
  };

  const quickQuestions =
    lang === 'en'
      ? ['VietGAP irrigation rules', 'Control fall armyworm', 'Tomato harvest criteria']
      : ['Quy chuẩn nước tưới VietGAP', 'Phòng trừ sâu keo mùa mưa', 'Tiêu chuẩn thu hoạch cà chua'];

  return (
    <div className="ai-floating-widget">
      {isOpen && (
        <div className="ai-chatbox-window" role="dialog" aria-label="AI Assistant Chatbox">
          <div className="ai-chatbox-header">
            <div className="ai-chatbox-title-wrap">
              <div className="ai-chatbox-avatar">
                <Icon name="bot" size={20} />
              </div>
              <div>
                <div className="ai-chatbox-title">
                  {lang === 'en' ? 'AI Farm Assistant' : 'Trợ lý Nông nghiệp AI'}
                </div>
                <div className="ai-chatbox-subtitle">
                  <span className="ai-chatbox-status-dot" />
                  <span>{lang === 'en' ? 'VietGAP Ready' : 'Tư vấn trực tuyến 24/7'}</span>
                </div>
              </div>
            </div>
            <div className="ai-chatbox-header-actions">
              <button
                type="button"
                className="ai-chatbox-icon-btn"
                title={lang === 'en' ? 'New chat' : 'Bắt đầu cuộc trò chuyện mới'}
                onClick={handleResetConversation}
              >
                <Icon name="refresh" size={15} />
              </button>
              <button
                type="button"
                className="ai-chatbox-icon-btn"
                title={lang === 'en' ? 'Close' : 'Đóng'}
                onClick={() => setIsOpen(false)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>

          <div className="ai-chatbox-chips">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-chatbox-chip"
                onClick={() => handleSendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="ai-chatbox-messages">
            {messages.map((msg) => (
              <div
                key={msg.messageId}
                className={`ai-bubble ${msg.senderType === 'user' ? 'ai-bubble--user' : 'ai-bubble--assistant'}`}
              >
                {msg.senderType === 'assistant' ? (
                  <FormattedAIMessage content={msg.messageText} />
                ) : (
                  <div>{msg.messageText}</div>
                )}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="ai-bubble-sources">
                    <span>{lang === 'en' ? 'Source: ' : 'Nguồn: '}</span>
                    {msg.sources.join(', ')}
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="ai-bubble-typing">
                <div className="ai-typing-dot" />
                <div className="ai-typing-dot" />
                <div className="ai-typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chatbox-footer">
            <form
              className="ai-chatbox-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className="ai-chatbox-input"
                placeholder={
                  isListening
                    ? (lang === 'en' ? 'Listening... Speak your question' : 'Đang lắng nghe... Hãy nói câu hỏi')
                    : lang === 'en'
                    ? 'Ask about crops, pests, VietGAP...'
                    : 'Hỏi về cây trồng, sâu bệnh, VietGAP...'
                }
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
              />

              {isSupported && (
                <button
                  type="button"
                  className={`ai-chatbox-voice-btn ${isListening ? 'ai-chatbox-voice-btn--listening' : ''}`}
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                  title={
                    isListening
                      ? (lang === 'en' ? 'Stop listening' : 'Dừng nghe')
                      : (lang === 'en' ? 'Ask by voice' : 'Hỏi bằng giọng nói')
                  }
                >
                  <Icon name="mic" size={17} />
                </button>
              )}

              <button
                type="submit"
                className="ai-chatbox-send-btn"
                disabled={!inputQuestion.trim() || isTyping}
                title={lang === 'en' ? 'Send' : 'Gửi'}
              >
                <Icon name="arrow" size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        type="button"
        className={`ai-floating-btn ${isOpen ? 'ai-floating-btn--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={lang === 'en' ? 'Chat with AI Assistant' : 'Trò chuyện cùng Trợ lý AI'}
      >
        {isOpen ? (
          <>
            <Icon name="close" size={20} />
            <span>{lang === 'en' ? 'Close' : 'Đóng'}</span>
          </>
        ) : (
          <>
            <Icon name="bot" size={20} />
            <span>{lang === 'en' ? 'Ask AI' : 'Hỏi AI'}</span>
            <span className="ai-floating-btn-badge">AI</span>
          </>
        )}
      </button>
    </div>
  );
}
