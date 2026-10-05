import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../shared/components/Icon';
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

const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'vietgap-standard',
    tag: 'TIÊU CHUẨN NÔNG NGHIỆP SẠCH 2026',
    category: 'regulation',
    title: 'Cẩm Nang Thực Hành VietGAP Chuẩn Quốc Gia',
    description: 'Nắm vững 4 nhóm tiêu chí bắt buộc: Đánh giá vùng đất canh tác, kiểm soát nguồn nước, nhật ký vật tư và tự đánh giá nội bộ trước kỳ cấp chứng nhận.',
    badge: '🌾 Tiêu Chuẩn VietGAP',
    stats: [
      { label: 'Nhóm chỉ tiêu', value: '4 Nhóm lớn' },
      { label: 'Chỉ tiêu bắt buộc', value: '100% Đạt' },
      { label: 'Thời hạn hiệu lực', value: '03 Năm' },
    ],
    primaryAction: {
      label: 'Khám phá Quy định chung',
      actionType: 'category',
      targetCategory: 'regulation',
      icon: 'arrow',
    },
    floatingItems: [
      { icon: 'shield', text: 'Đạt chuẩn an toàn VSTP', positionClass: 'float-top-right' },
      { icon: 'check', text: '100% Tiêu chí bắt buộc loại A', positionClass: 'float-bottom-right' },
    ],
  },
  {
    id: 'soil-water',
    tag: 'TÀI NGUYÊN ĐẤT & NGUỒN NƯỚC',
    category: 'soil-water',
    title: 'Kỹ Thuật Quản Lý Đất, Nguồn Nước & Vùng Đệm',
    description: 'Phân tích xét nghiệm mẫu đất định kỳ, khử phèn mặn và thiết lập vành đai cách ly an toàn khỏi các nguồn ô nhiễm sinh học và kim loại nặng.',
    badge: '💧 An Toàn Nước & Đất',
    stats: [
      { label: 'Lấy mẫu kiểm tra', value: '2 Lần/năm' },
      { label: 'Kim loại nặng', value: 'Đạt QCVN' },
      { label: 'Vùng đệm ly sinh', value: 'An toàn tuyệt đối' },
    ],
    primaryAction: {
      label: 'Xem Đất & Nguồn nước',
      actionType: 'category',
      targetCategory: 'soil-water',
      icon: 'drop',
    },
    floatingItems: [
      { icon: 'drop', text: 'Nguồn nước tưới đạt QCVN 39', positionClass: 'float-top-right' },
      { icon: 'plots', text: 'Vùng đệm sinh thái cách ly', positionClass: 'float-bottom-right' },
    ],
  },
  {
    id: 'fertilizer-pesticide',
    tag: 'QUẢN LÝ VẬT TƯ & THỜI GIAN CÁCH LY',
    category: 'fertilizer-pesticide',
    title: 'Nguyên Tắc 4 Đúng & Thời Gian Cách Ly (PHI)',
    description: 'Chỉ sử dụng phân bón hữu cơ và thuốc BVTV sinh học thuộc danh mục cho phép. Ghi chép nhật ký trong 24 giờ và tuân thủ thời gian cách ly nghiêm ngặt.',
    badge: '🛡️ Kiểm Soát Dư Lượng PHI',
    stats: [
      { label: 'Nguyên tắc vàng', value: '4 Đúng' },
      { label: 'Danh mục cho phép', value: '100% Chuẩn' },
      { label: 'Ghi nhật ký', value: '< 24 Giờ' },
    ],
    primaryAction: {
      label: 'Xem Phân bón & Thuốc BVTV',
      actionType: 'category',
      targetCategory: 'fertilizer-pesticide',
      icon: 'leaf',
    },
    floatingItems: [
      { icon: 'leaf', text: 'Tuyệt đối tuân thủ thời gian PHI', positionClass: 'float-top-right' },
      { icon: 'box', text: 'Kho bảo quản vật tư riêng biệt', positionClass: 'float-bottom-right' },
    ],
  },
  {
    id: 'ai-assistant',
    tag: 'TRỢ LÝ THÔNG MINH MYCROPDIARY',
    category: 'all',
    title: 'Hỏi Đáp Kỹ Thuật Canh Tác Với Trợ Lý AI 24/7',
    description: 'Tra cứu nhanh cách phòng trị sâu rầy sinh học, tính toán liều lượng dinh dưỡng theo giai đoạn sinh trưởng và hướng dẫn checklist đánh giá VietGAP.',
    badge: '🤖 Trợ Lý AI Nông Nghiệp',
    stats: [
      { label: 'Thời gian phản hồi', value: 'Tức thì' },
      { label: 'Kho kiến thức', value: 'Chuẩn VietGAP' },
      { label: 'Hỗ trợ nhà nông', value: '24/7 Miễn phí' },
    ],
    primaryAction: {
      label: 'Hỏi đáp với Trợ lý AI',
      actionType: 'link',
      linkTo: '/ai',
      icon: 'bot',
    },
    floatingItems: [
      { icon: 'bot', text: 'Nhận diện & phòng ngừa sâu bệnh', positionClass: 'float-top-right' },
      { icon: 'check', text: 'Checklist tự đánh giá trang trại', positionClass: 'float-bottom-right' },
    ],
  },
];

const QUICK_TOPICS: { label: string; category: KnowledgeCategory }[] = [
  { label: 'Quy định chung', category: 'regulation' },
  { label: 'Đất & nguồn nước', category: 'soil-water' },
  { label: 'Giống & gieo trồng', category: 'seed-cultivation' },
  { label: 'Phân bón & thuốc BVTV', category: 'fertilizer-pesticide' },
  { label: 'Thu hoạch & sau thu hoạch', category: 'harvest-post-harvest' },
  { label: 'Ghi chép & truy xuất nguồn gốc', category: 'record-traceability' },
];

export function KnowledgeDynamicBanner({ onSelectCategory }: KnowledgeDynamicBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slide = BANNER_SLIDES[currentSlide];

  // Auto-play timer (6 seconds per slide)
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, currentSlide]);

  function handlePrev() {
    setCurrentSlide((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
  }

  function handleNext() {
    setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
  }

  function handlePrimaryClick() {
    if (slide.primaryAction.actionType === 'category' && slide.primaryAction.targetCategory) {
      onSelectCategory(slide.primaryAction.targetCategory);
      // Smooth scroll to the filter/search toolbar
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
      aria-label="Tin nổi bật & Cẩm nang VietGAP"
    >
      {/* Background glowing aura & mesh */}
      <div className="banner-mesh-bg" aria-hidden="true" />
      <div className="banner-glow-circle circle-1" aria-hidden="true" />
      <div className="banner-glow-circle circle-2" aria-hidden="true" />

      {/* Main Banner Content */}
      <div className="banner-content-grid">
        {/* Left Column: Text & Stats */}
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

          {/* Key Stat Cards */}
          <div className="banner-stats-row">
            {slide.stats.map((stat, idx) => (
              <div key={idx} className="banner-stat-box">
                <span className="banner-stat-val">{stat.value}</span>
                <span className="banner-stat-lbl">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Banner Action Buttons */}
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
              <span>Hỏi AI về tiêu chuẩn</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Visual illustration with interactive floating cards */}
        <div className="banner-visual-col" aria-hidden="true">
          <div className="banner-graphic-stage">
            {/* Central Animated Botanical Emblem */}
            <div className="banner-center-emblem">
              <div className="emblem-inner-ring">
                <div className="emblem-leaf-box">
                  <Icon name="leaf" className="emblem-leaf-svg" />
                </div>
              </div>
              <div className="emblem-ripple-ring ring-1" />
              <div className="emblem-ripple-ring ring-2" />
            </div>

            {/* Floating Info Cards */}
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

            {/* Guaranteed Trust Stamp */}
            <div className="banner-guarantee-stamp">
              <span className="stamp-icon">
                <Icon name="shield" />
              </span>
              <div className="stamp-text">
                <strong>Chuẩn Quốc Gia</strong>
                <small>Bộ NN&PTNT</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Category Filter Bar at banner bottom */}
      <div className="banner-quick-topics">
        <span className="quick-topics-label">
          <Icon name="search" /> Chủ đề tra cứu nhanh:
        </span>
        <div className="quick-topics-list">
          {QUICK_TOPICS.map((topic) => (
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

      {/* Bottom Controls: Carousel Indicators & Prev/Next */}
      <div className="banner-footer-controls">
        <div className="banner-dots-group">
          {BANNER_SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`banner-dot-btn${idx === currentSlide ? ' is-active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Chuyển tới slide ${idx + 1}: ${s.title}`}
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
            aria-label="Slide trước"
            title="Slide trước"
          >
            <Icon name="arrow-left" />
          </button>
          <span className="banner-slide-counter">
            <strong>{currentSlide + 1}</strong> / {BANNER_SLIDES.length}
          </span>
          <button
            type="button"
            className="banner-arrow-btn"
            onClick={handleNext}
            aria-label="Slide tiếp theo"
            title="Slide tiếp theo"
          >
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </section>
  );
}
