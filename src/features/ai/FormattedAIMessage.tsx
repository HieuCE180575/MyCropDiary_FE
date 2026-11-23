import React from 'react';

interface FormattedAIMessageProps {
  content: string;
}

/**
 * Render Markdown đơn giản từ câu trả lời của AI:
 * - Bỏ các dấu sao đậm `**tiêu đề**` và chuyển thành `<strong>` hoặc đề mục rõ ràng
 * - Chuyển `* bullet item` hoặc `- bullet item` thành danh sách đẹp mắt
 * - Giữ các đoạn văn thoáng đãng, dễ đọc
 */
export function FormattedAIMessage({ content }: FormattedAIMessageProps) {
  if (!content) return null;

  // Tách văn bản thành các dòng
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} style={{ margin: '6px 0', paddingLeft: '20px', lineHeight: 1.55 }}>
          {currentList.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px' }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  // Hàm chuyển text in đậm **text** hoặc *text* thành chữ đậm rõ ràng, không còn dấu *
  const renderInline = (text: string): React.ReactNode => {
    // Regex bắt các dạng **nội dung**
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2).trim();
        return (
          <strong key={index} style={{ fontWeight: 700, color: 'var(--color-text, #0f172a)' }}>
            {clean}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        const clean = part.slice(1, -1).trim();
        return (
          <strong key={index} style={{ fontWeight: 650, color: 'var(--color-text, #0f172a)' }}>
            {clean}
          </strong>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Dòng trống
    if (!trimmed) {
      flushList();
      continue;
    }

    // Tiêu đề dạng ### hoặc ##
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      const title = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <h4
          key={`heading-${i}`}
          style={{
            margin: '10px 0 4px',
            fontSize: '14.5px',
            fontWeight: 750,
            color: 'var(--color-primary-text, #047857)',
          }}
        >
          {title}
        </h4>
      );
      continue;
    }

    // Gạch đầu dòng: * item hoặc - item hoặc 1. item
    const bulletMatch = trimmed.match(/^([*\-•]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[2]);
      continue;
    }

    // Dòng thông thường
    flushList();
    elements.push(
      <p key={`p-${i}`} style={{ margin: '4px 0', lineHeight: 1.55 }}>
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="ai-formatted-content">{elements}</div>;
}
