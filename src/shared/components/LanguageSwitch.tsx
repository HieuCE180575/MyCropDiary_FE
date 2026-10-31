import { useLanguage } from '../i18n/LanguageContext';

interface LanguageSwitchProps {
  className?: string;
  variant?: 'header' | 'menu-item' | 'mobile';
}

export function LanguageSwitch({ className = '', variant = 'header' }: LanguageSwitchProps) {
  const { lang, toggleLang } = useLanguage();

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        className={`account-menu-item lang-switch-menu-item ${className}`}
        onClick={toggleLang}
        title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          background: 'transparent',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#334155',
          fontSize: '13px',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }} aria-hidden="true">🌐</span>
          <span>{lang === 'en' ? 'Language: English' : 'Ngôn ngữ: Tiếng Việt'}</span>
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            background: '#d1fae5',
            color: '#065f46',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {lang === 'en' ? 'EN' : 'VI'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`header-translate-btn ${className}`}
      onClick={toggleLang}
      title={lang === 'en' ? 'Switch to Vietnamese (Chuyển sang Tiếng Việt)' : 'Switch to English (Chuyển sang Tiếng Anh)'}
      aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        padding: '0 12px',
        borderRadius: '20px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontSize: '13px',
        fontWeight: 650,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        lineHeight: 1,
        transition: 'all 0.15s ease-in-out',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#10b981';
        e.currentTarget.style.backgroundColor = '#f0fdf4';
        e.currentTarget.style.color = '#047857';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.backgroundColor = '#ffffff';
        e.currentTarget.style.color = '#1e293b';
      }}
    >
      <span style={{ fontSize: '15px' }} aria-hidden="true">🌐</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: lang === 'en' ? '#059669' : '#94a3b8', fontWeight: lang === 'en' ? 800 : 500 }}>EN</span>
        <span style={{ color: '#cbd5e1', fontSize: '11px' }}>|</span>
        <span style={{ color: lang === 'vi' ? '#059669' : '#94a3b8', fontWeight: lang === 'vi' ? 800 : 500 }}>VI</span>
      </span>
    </button>
  );
}
