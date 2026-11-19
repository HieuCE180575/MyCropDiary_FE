import { useEffect, useRef, useState } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { useLanguage } from '../i18n/LanguageContext';

/** Load a detail record without presenting a stale list row as the response. */
export function useDetailRequest(scope?: unknown) {
  const { lang } = useLanguage();
  const sequence = useRef(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismiss = () => { sequence.current++; setPending(false); setError(null); };
  useEffect(() => { dismiss(); return () => { sequence.current++; }; }, [scope]);
  const load = async <T,>(fetchDetail: () => Promise<T>, showDetail: (value: T) => void) => {
    const request = ++sequence.current;
    setPending(true); setError(null);
    try {
      const detail = await fetchDetail();
      if (request === sequence.current) showDetail(detail);
    } catch (err) {
      if (request === sequence.current) setError(err instanceof Error ? err.message : (lang === 'en' ? 'Unable to load details.' : 'Không thể tải chi tiết.'));
    } finally {
      if (request === sequence.current) setPending(false);
    }
  };
  const feedback = <Modal open={pending || error !== null} onClose={dismiss} title={lang === 'en' ? 'Record details' : 'Chi tiết bản ghi'}>
    {pending ? <p role="status">{lang === 'en' ? 'Loading details...' : 'Đang tải chi tiết...'}</p> : <p role="alert">{error}</p>}
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button className={'ui-close-action'} onClick={dismiss}>{lang === 'en' ? 'Close' : 'Đóng'}</Button></div>
  </Modal>;
  return { load, feedback };
}
