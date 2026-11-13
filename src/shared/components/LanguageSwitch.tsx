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
          color: 'var(--color-body)',
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
            background: 'var(--color-success-bg)',
            color: 'var(--color-primary-text)',
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
      title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}
      aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        padding: '0 12px',
        borderRadius: '20px',
        border: '1px solid var(--color-input-border)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-text)',
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
        e.currentTarget.style.borderColor = 'var(--color-primary-text)';
        e.currentTarget.style.backgroundColor = 'var(--color-success-bg)';
        e.currentTarget.style.color = 'var(--color-primary-text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-input-border)';
        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
    >
      <span style={{ fontSize: '15px' }} aria-hidden="true">🌐</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: lang === 'en' ? 'var(--color-primary-text)' : 'var(--color-muted)', fontWeight: lang === 'en' ? 800 : 500 }}>EN</span>
        <span style={{ color: 'var(--color-input-border)', fontSize: '11px' }}>|</span>
        <span style={{ color: lang === 'vi' ? 'var(--color-primary-text)' : 'var(--color-muted)', fontWeight: lang === 'vi' ? 800 : 500 }}>VI</span>
      </span>
    </button>
  );
}
