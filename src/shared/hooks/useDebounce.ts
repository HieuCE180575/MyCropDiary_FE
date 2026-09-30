import { useEffect, useState } from 'react';

/**
 * Trả về giá trị đã "trễ" (debounced) sau `delayMs` mili-giây không có thay đổi mới.
 * Dùng cho ô tìm kiếm để tránh gọi API/lọc dữ liệu trên mỗi ký tự gõ vào.
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
