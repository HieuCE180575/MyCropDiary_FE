import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
import { useLanguage } from '../../../shared/i18n/LanguageContext';
import type { KnowledgeCategory } from '../types';

interface KnowledgeDynamicBannerProps {
  onSelectCategory: (category: KnowledgeCategory | 'all') => void;
}

interface BannerSlide {
  id: string;
  tag: string;
  category: KnowledgeCategory | 'all';
  title: string;
  description: string;
  badge: string;
  stats: { label: string; value: string }[];
  primaryAction: {
    label: string;
    actionType: 'category' | 'link';
    targetCategory?: KnowledgeCategory | 'all';
    linkTo?: string;
    icon: string;
  };
  floatingItems: {
    icon: string;
    text: string;
    positionClass: string;
  }[];
}

function getBannerSlides(lang: 'en' | 'vi'): BannerSlide[] {
  return [
    {
      id: 'vietgap-standard',
      tag: lang === 'en' ? 'CLEAN AGRICULTURE STANDARD 2026' : 'TIÊU CHUẨN NÔNG NGHIỆP SẠCH 2026',
      category: 'regulation',
      title: lang === 'en' ? 'National Standard VietGAP Practical Handbook' : 'Cẩm Nang Thực Hành VietGAP Chuẩn Quốc Gia',
      description: lang === 'en'
        ? 'Master 4 mandatory criteria groups: Cultivation land assessment, water source control, input material logging, and internal audit prior to certification.'
        : 'Nắm vững 4 nhóm tiêu chí bắt buộc: Đánh giá vùng đất canh tác, kiểm soát nguồn nước, nhật ký vật tư và tự đánh giá nội bộ trước kỳ cấp chứng nhận.',
      badge: lang === 'en' ? '🌾 VietGAP Standards' : '🌾 Tiêu Chuẩn VietGAP',
      stats: [
        { label: lang === 'en' ? 'Criteria Groups' : 'Nhóm chỉ tiêu', value: lang === 'en' ? '4 Core Groups' : '4 Nhóm lớn' },
        { label: lang === 'en' ? 'Mandatory Criteria' : 'Chỉ tiêu bắt buộc', value: lang === 'en' ? '100% Pass' : '100% Đạt' },
        { label: lang === 'en' ? 'Validity Period' : 'Thời hạn hiệu lực', value: lang === 'en' ? '03 Years' : '03 Năm' },
      ],
      primaryAction: {
        label: lang === 'en' ? 'Explore General Regulations' : 'Khám phá Quy định chung',
        actionType: 'category',
        targetCategory: 'regulation',
        icon: 'arrow',
      },
      floatingItems: [
        { icon: 'shield', text: lang === 'en' ? 'Food Safety Certified' : 'Đạt chuẩn an toàn VSTP', positionClass: 'float-top-right' },
        { icon: 'check', text: lang === 'en' ? '100% Mandatory Class A Criteria' : '100% Tiêu chí bắt buộc loại A', positionClass: 'float-bottom-right' },
      ],
    },
    {
      id: 'soil-water',
      tag: lang === 'en' ? 'SOIL & WATER RESOURCES' : 'TÀI NGUYÊN ĐẤT & NGUỒN NƯỚC',
      category: 'soil-water',
      title: lang === 'en' ? 'Soil, Water Source & Buffer Zone Management Techniques' : 'Kỹ Thuật Quản Lý Đất, Nguồn Nước & Vùng Đệm',
      description: lang === 'en'
        ? 'Periodic laboratory testing of soil samples, remediation of salinity/acidity, and establishment of secure ecological buffer zones to prevent contamination.'
        : 'Phân tích xét nghiệm mẫu đất định kỳ, khử phèn mặn và thiết lập vành đai cách ly an toàn khỏi các nguồn ô nhiễm sinh học và kim loại nặng.',
      badge: lang === 'en' ? '💧 Water & Soil Safety' : '💧 An Toàn Nước & Đất',
      stats: [
        { label: lang === 'en' ? 'Testing Frequency' : 'Lấy mẫu kiểm tra', value: lang === 'en' ? '2 Times/Year' : '2 Lần/năm' },
        { label: lang === 'en' ? 'Heavy Metals' : 'Kim loại nặng', value: lang === 'en' ? 'Complies QCVN' : 'Đạt QCVN' },
        { label: lang === 'en' ? 'Buffer Zones' : 'Vùng đệm ly sinh', value: lang === 'en' ? 'Strictly Safe' : 'An toàn tuyệt đối' },
      ],
      primaryAction: {
        label: lang === 'en' ? 'View Soil & Water' : 'Xem Đất & Nguồn nước',
        actionType: 'category',
        targetCategory: 'soil-water',
        icon: 'drop',
      },
      floatingItems: [
        { icon: 'drop', text: lang === 'en' ? 'Irrigation meets QCVN 39' : 'Nguồn nước tưới đạt QCVN 39', positionClass: 'float-top-right' },
        { icon: 'plots', text: lang === 'en' ? 'Ecological buffer isolation zone' : 'Vùng đệm sinh thái cách ly', positionClass: 'float-bottom-right' },
      ],
    },
    {
      id: 'fertilizer-pesticide',
      tag: lang === 'en' ? 'INPUT SUPPLIES & PRE-HARVEST INTERVAL' : 'QUẢN LÝ VẬT TƯ & THỜI GIAN CÁCH LY',
      category: 'fertilizer-pesticide',
      title: lang === 'en' ? 'The 4-Right Principle & Pre-Harvest Interval (PHI)' : 'Nguyên Tắc 4 Đúng & Thời Gian Cách Ly (PHI)',
      description: lang === 'en'
        ? 'Use only approved organic fertilizers and biological pest controls. Log input usages within 24 hours and strictly enforce pre-harvest safety intervals.'
        : 'Chỉ sử dụng phân bón hữu cơ và thuốc BVTV sinh học thuộc danh mục cho phép. Ghi chép nhật ký trong 24 giờ và tuân thủ thời gian cách ly nghiêm ngặt.',
      badge: lang === 'en' ? '🛡️ PHI Residue Control' : '🛡️ Kiểm Soát Dư Lượng PHI',
      stats: [
        { label: lang === 'en' ? 'Golden Principle' : 'Nguyên tắc vàng', value: lang === 'en' ? '4 Rights' : '4 Đúng' },
        { label: lang === 'en' ? 'Approved List' : 'Danh mục cho phép', value: lang === 'en' ? '100% Compliant' : '100% Chuẩn' },
        { label: lang === 'en' ? 'Usage Logging' : 'Ghi nhật ký', value: lang === 'en' ? '< 24 Hours' : '< 24 Giờ' },
      ],
      primaryAction: {
        label: lang === 'en' ? 'View Fertilizer & Pest Control' : 'Xem Phân bón & Thuốc BVTV',
        actionType: 'category',
        targetCategory: 'fertilizer-pesticide',
        icon: 'leaf',
      },
      floatingItems: [
        { icon: 'leaf', text: lang === 'en' ? 'Strict PHI quarantine compliance' : 'Tuyệt đối tuân thủ thời gian PHI', positionClass: 'float-top-right' },
        { icon: 'box', text: lang === 'en' ? 'Dedicated secure chemical storage' : 'Kho bảo quản vật tư riêng biệt', positionClass: 'float-bottom-right' },
      ],
    },
    {
      id: 'ai-assistant',
      tag: lang === 'en' ? 'MYCROPDIARY AI AGRO-ASSISTANT' : 'TRỢ LÝ THÔNG MINH MYCROPDIARY',
      category: 'all',
      title: lang === 'en' ? '24/7 Farming Technique Consultation with AI Assistant' : 'Hỏi Đáp Kỹ Thuật Canh Tác Với Trợ Lý AI 24/7',
      description: lang === 'en'
        ? 'Fast lookup of biological pest remedies, nutrient calculation by growth stage, and step-by-step guidance on VietGAP self-assessment checklists.'
        : 'Tra cứu nhanh cách phòng trị sâu rầy sinh học, tính toán liều lượng dinh dưỡng theo giai đoạn sinh trưởng và hướng dẫn checklist đánh giá VietGAP.',
      badge: lang === 'en' ? '🤖 Agricultural AI Assistant' : '🤖 Trợ Lý AI Nông Nghiệp',
      stats: [
        { label: lang === 'en' ? 'Response Time' : 'Thời gian phản hồi', value: lang === 'en' ? 'Instant' : 'Tức thì' },
        { label: lang === 'en' ? 'Knowledge Base' : 'Kho kiến thức', value: lang === 'en' ? 'VietGAP Standard' : 'Chuẩn VietGAP' },
        { label: lang === 'en' ? 'Farmer Support' : 'Hỗ trợ nhà nông', value: lang === 'en' ? '24/7 Free' : '24/7 Miễn phí' },
      ],
      primaryAction: {
        label: lang === 'en' ? 'Ask AI Assistant' : 'Hỏi đáp với Trợ lý AI',
        actionType: 'link',
        linkTo: '/ai',
        icon: 'bot',
      },
      floatingItems: [
        { icon: 'bot', text: lang === 'en' ? 'Pest diagnosis & prevention' : 'Nhận diện & phòng ngừa sâu bệnh', positionClass: 'float-top-right' },
        { icon: 'check', text: lang === 'en' ? 'Farm self-assessment checklist' : 'Checklist tự đánh giá trang trại', positionClass: 'float-bottom-right' },
      ],
    },
  ];
}

function getQuickTopics(lang: 'en' | 'vi'): { label: string; category: KnowledgeCategory }[] {
  return [
    { label: lang === 'en' ? 'General Regulations' : 'Quy định chung', category: 'regulation' },
    { label: lang === 'en' ? 'Soil & Water' : 'Đất & nguồn nước', category: 'soil-water' },
    { label: lang === 'en' ? 'Seeds & Cultivation' : 'Giống & gieo trồng', category: 'seed-cultivation' },
    { label: lang === 'en' ? 'Fertilizers & Pesticides' : 'Phân bón & thuốc BVTV', category: 'fertilizer-pesticide' },
    { label: lang === 'en' ? 'Harvest & Post-Harvest' : 'Thu hoạch & sau thu hoạch', category: 'harvest-post-harvest' },
    { label: lang === 'en' ? 'Recordkeeping & Traceability' : 'Ghi chép & truy xuất nguồn gốc', category: 'record-traceability' },
  ];
}

export function KnowledgeDynamicBanner({ onSelectCategory }: KnowledgeDynamicBannerProps) {
  const { lang } = useLanguage();
  const bannerSlides = getBannerSlides(lang);
  const quickTopics = getQuickTopics(lang);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slide = bannerSlides[currentSlide] || bannerSlides[0];

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, currentSlide, bannerSlides.length]);

  function handlePrev() {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  }

  function handleNext() {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  }

  function handlePrimaryClick() {
    if (slide.primaryAction.actionType === 'category' && slide.primaryAction.targetCategory) {
      onSelectCategory(slide.primaryAction.targetCategory);
      const toolbar = document.querySelector('.knowledge-toolbar');
      if (toolbar) {
        toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  return (
    <section
      className="knowledge-dynamic-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label={lang === 'en' ? 'Featured News & VietGAP Handbook' : 'Tin nổi bật & Cẩm nang VietGAP'}
    >
      <div className="banner-mesh-bg" aria-hidden="true" />
      <div className="banner-glow-circle circle-1" aria-hidden="true" />
      <div className="banner-glow-circle circle-2" aria-hidden="true" />

      <div className="banner-content-grid">
        <div className="banner-text-col" key={slide.id}>
          <div className="banner-tag-row">
            <span className="banner-category-tag">
              <span className="banner-pulse-dot" />
              {slide.tag}
            </span>
            <span className="banner-slide-badge">{slide.badge}</span>
          </div>

          <h1 className="banner-main-title">{slide.title}</h1>
          <p className="banner-description">{slide.description}</p>

          <div className="banner-stats-row">
            {slide.stats.map((stat, idx) => (
              <div key={idx} className="banner-stat-box">
                <span className="banner-stat-val">{stat.value}</span>
                <span className="banner-stat-lbl">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="banner-actions-group">
            {slide.primaryAction.actionType === 'link' && slide.primaryAction.linkTo ? (
              <Link to={slide.primaryAction.linkTo} className="banner-btn-primary">
                <Icon name={slide.primaryAction.icon} />
                <span>{slide.primaryAction.label}</span>
                <Icon name="arrow" className="btn-icon-arrow" />
              </Link>
            ) : (
              <button
                type="button"
                className="banner-btn-primary"
                onClick={handlePrimaryClick}
              >
                <Icon name={slide.primaryAction.icon} />
                <span>{slide.primaryAction.label}</span>
                <Icon name="arrow" className="btn-icon-arrow" />
              </button>
            )}

            <Link to="/ai" className="banner-btn-secondary">
              <Icon name="bot" />
              <span>{lang === 'en' ? 'Ask AI about standards' : 'Hỏi AI về tiêu chuẩn'}</span>
            </Link>
          </div>
        </div>

        <div className="banner-visual-col" aria-hidden="true">
          <div className="banner-graphic-stage">
            <div className="banner-center-emblem">
              <div className="emblem-inner-ring">
                <div className="emblem-leaf-box">
                  <Icon name="leaf" className="emblem-leaf-svg" />
                </div>
              </div>
              <div className="emblem-ripple-ring ring-1" />
              <div className="emblem-ripple-ring ring-2" />
            </div>

            {slide.floatingItems.map((item, idx) => (
              <div
                key={`${slide.id}-${idx}`}
                className={`banner-floating-pill ${item.positionClass}`}
              >
                <span className="floating-icon-wrap">
                  <Icon name={item.icon} />
                </span>
                <span className="floating-text">{item.text}</span>
              </div>
            ))}

            <div className="banner-guarantee-stamp">
              <span className="stamp-icon">
                <Icon name="shield" />
              </span>
              <div className="stamp-text">
                <strong>{lang === 'en' ? 'National Standard' : 'Chuẩn Quốc Gia'}</strong>
                <small>{lang === 'en' ? 'MARD Certified' : 'Bộ NN&PTNT'}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="banner-quick-topics">
        <span className="quick-topics-label">
          <Icon name="search" /> {lang === 'en' ? 'Quick Topics:' : 'Chủ đề tra cứu nhanh:'}
        </span>
        <div className="quick-topics-list">
          {quickTopics.map((topic) => (
            <button
              key={topic.category}
              type="button"
              className="quick-topic-btn"
              onClick={() => {
                onSelectCategory(topic.category);
                const toolbar = document.querySelector('.knowledge-toolbar');
                if (toolbar) {
                  toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      <div className="banner-footer-controls">
        <div className="banner-dots-group">
          {bannerSlides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`banner-dot-btn${idx === currentSlide ? ' is-active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={lang === 'en' ? `Go to slide ${idx + 1}: ${s.title}` : `Chuyển tới slide ${idx + 1}: ${s.title}`}
              aria-current={idx === currentSlide ? 'true' : undefined}
            >
              <span className="dot-pill-inner">
                {idx === currentSlide && (
                  <span
                    className="dot-progress-fill"
                    style={{ animationDuration: isPaused ? '0s' : '6s' }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="banner-nav-arrows">
          <button
            type="button"
            className="banner-arrow-btn"
            onClick={handlePrev}
            aria-label={lang === 'en' ? 'Previous slide' : 'Slide trước'}
            title={lang === 'en' ? 'Previous slide' : 'Slide trước'}
          >
            <Icon name="arrow-left" />
          </button>
          <span className="banner-slide-counter">
            <strong>{currentSlide + 1}</strong> / {bannerSlides.length}
          </span>
          <button
            type="button"
            className="banner-arrow-btn"
            onClick={handleNext}
            aria-label={lang === 'en' ? 'Next slide' : 'Slide tiếp theo'}
            title={lang === 'en' ? 'Next slide' : 'Slide tiếp theo'}
          >
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </section>
  );
}
