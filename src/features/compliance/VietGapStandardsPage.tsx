import { useState, useMemo } from 'react';
import { PageHeading } from '../../shared/components/PageHeading';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import {
  VIETGAP_33_STANDARDS,
  VIETGAP_STANDARD_CATEGORIES,
  VietGapStandardItem,
} from './vietgapStandardsData';

export function VietGapStandardsPage() {
  const { lang } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filter logic
  const filteredCriteria = useMemo(() => {
    return VIETGAP_33_STANDARDS.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchKeyword =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.titleVi.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        item.requirementVi.toLowerCase().includes(q) ||
        item.clause.toLowerCase().includes(q) ||
        item.evidenceVi.toLowerCase().includes(q) ||
        item.checkpointsVi.some((cp) => cp.toLowerCase().includes(q));

      const matchCategory = selectedCategory === 'ALL' || item.categoryCode === selectedCategory;
      const matchPriority = selectedPriority === 'ALL' || item.priority === selectedPriority;
      const matchMethod = selectedMethod === 'ALL' || item.evalMethod === selectedMethod;

      return matchKeyword && matchCategory && matchPriority && matchMethod;
    });
  }, [searchTerm, selectedCategory, selectedPriority, selectedMethod]);

  // Grouped by Category for Cards view
  const groupedCategories = useMemo(() => {
    return VIETGAP_STANDARD_CATEGORIES.map((cat) => {
      const items = filteredCriteria.filter((item) => item.categoryCode === cat.code);
      return {
        ...cat,
        items,
      };
    }).filter((group) => group.items.length > 0);
  }, [filteredCriteria]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = VIETGAP_33_STANDARDS.length;
    const must = VIETGAP_33_STANDARDS.filter((i) => i.priority === 'MUST').length;
    const major = VIETGAP_33_STANDARDS.filter((i) => i.priority === 'MAJOR').length;
    const rec = VIETGAP_33_STANDARDS.filter((i) => i.priority === 'RECOMMENDED').length;
    const auto = VIETGAP_33_STANDARDS.filter((i) => i.evalMethod === 'AUTO').length;
    const manual = VIETGAP_33_STANDARDS.filter((i) => i.evalMethod === 'MANUAL').length;
    return { total, must, major, rec, auto, manual };
  }, []);

  const hasActiveFilters = searchTerm || selectedCategory !== 'ALL' || selectedPriority !== 'ALL' || selectedMethod !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedPriority('ALL');
    setSelectedMethod('ALL');
  };

  return (
    <section className="vietgap-standards-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Page Heading */}
      <PageHeading
        title={lang === 'en' ? 'VietGAP Crop Standards (TCVN 11892-1:2017)' : 'Bộ Tiêu chuẩn VietGAP Trồng trọt (TCVN 11892-1:2017)'}
        description={
          lang === 'en'
            ? 'National Good Agricultural Practices framework · 33 standardized criteria for inspection, compliance evidence, and internal audits'
            : 'Quy chuẩn thực hành sản xuất nông nghiệp tốt quốc gia · 33 tiêu chí chuẩn hóa phục vụ tự đánh giá, lưu trữ minh chứng và cấp chứng nhận'
        }
      />

      {/* 2. Executive KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Tổng số tiêu chí */}
        <div className="panel" style={{ padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'TCVN CRITERIA' : 'TỔNG TIÊU CHÍ VIETGAP'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="book" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {stats.total}
          </div>
          <small style={{ color: '#64748b', fontSize: '12.5px' }}>
            {lang === 'en' ? 'Across 6 agricultural topics' : 'Bao phủ 6 chuyên đề canh tác quốc gia'}
          </small>
        </div>

        {/* Card 2: Bắt buộc MUST */}
        <div className="panel" style={{ padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'MUST (100% PASS)' : 'BẮT BUỘC (MUST · 100%)'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="shield" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>
            {stats.must}
          </div>
          <small style={{ color: '#64748b', fontSize: '12.5px' }}>
            {lang === 'en' ? 'Strict compliance required' : 'Bắt buộc đạt 100% để duy trì chứng chỉ'}
          </small>
        </div>

        {/* Card 3: Quan trọng MAJOR */}
        <div className="panel" style={{ padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#b45309', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'MAJOR (≥90% PASS)' : 'QUAN TRỌNG (MAJOR · ≥90%)'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {stats.major}
          </div>
          <small style={{ color: '#64748b', fontSize: '12.5px' }}>
            {lang === 'en' ? 'Pass rate ≥ 90% required' : 'Tối thiểu 90% đạt chuẩn theo quy định'}
          </small>
        </div>

        {/* Card 4: Tự đối soát ⚡ */}
        <div className="panel" style={{ padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#047857', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              {lang === 'en' ? 'AUTO-VERIFIED ⚡' : 'TỰ ĐỐI SOÁT CSDL ⚡'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="zap" size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#047857', margin: '4px 0' }}>
            {stats.auto} <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>/ {stats.total}</span>
          </div>
          <small style={{ color: '#64748b', fontSize: '12.5px' }}>
            {lang === 'en' ? '48.5% automated from farm database' : 'Tự động kiểm tra nhật ký, kho và kiểm nghiệm'}
          </small>
        </div>
      </div>

      {/* 3. Unified Clean Card Container: Filter, Mode Toggle & List */}
      <div className="zone-clean-card">
        {/* Clean Filter Bar in ONE line matching SaaS standard */}
        <div className="zone-clean-filter-bar" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="zone-clean-search" style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <span className="search-icon" aria-hidden="true">
              <Icon name="search" size={17} />
            </span>
            <input
              className="ui-input"
              type="search"
              placeholder={lang === 'en' ? 'Search criteria code, clause, keyword (e.g. VG-HS-01, PHI)...' : 'Tìm mã tiêu chí, tên, điều khoản (ví dụ: VG-HS-01, PHI)...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={lang === 'en' ? 'Search criteria' : 'Tìm kiếm tiêu chuẩn'}
            />
          </div>

          {/* Category Filter */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '180px' }}>
            <select
              className="ui-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label={lang === 'en' ? 'Filter by topic' : 'Lọc theo chuyên đề'}
            >
              <option value="ALL">{lang === 'en' ? 'All 6 Topics (33)' : 'Tất cả 6 chuyên đề (33)'}</option>
              {VIETGAP_STANDARD_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {lang === 'en' ? c.nameEn : c.nameVi} ({c.count})
                </option>
              ))}
            </select>
            <span className="select-arrow" aria-hidden="true">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Priority Filter */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '160px' }}>
            <select
              className="ui-select"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              aria-label={lang === 'en' ? 'Filter by priority' : 'Lọc theo mức độ'}
            >
              <option value="ALL">{lang === 'en' ? 'All Priorities' : 'Tất cả mức độ'}</option>
              <option value="MUST">{lang === 'en' ? 'Bắt buộc (MUST · 23)' : 'Bắt buộc (MUST · 23)'}</option>
              <option value="MAJOR">{lang === 'en' ? 'Quan trọng (MAJOR · 8)' : 'Quan trọng (MAJOR · 8)'}</option>
              <option value="RECOMMENDED">{lang === 'en' ? 'Khuyến khích (REC · 2)' : 'Khuyến khích (REC · 2)'}</option>
            </select>
            <span className="select-arrow" aria-hidden="true">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Method Filter */}
          <div className="zone-clean-select-wrap" style={{ minWidth: '170px' }}>
            <select
              className="ui-select"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              aria-label={lang === 'en' ? 'Filter by evaluation method' : 'Lọc theo cơ chế'}
            >
              <option value="ALL">{lang === 'en' ? 'All Evaluation Methods' : 'Tất cả cơ chế kiểm tra'}</option>
              <option value="AUTO">{lang === 'en' ? '⚡ Auto-Verified (16)' : '⚡ Tự đối soát CSDL (16)'}</option>
              <option value="MANUAL">{lang === 'en' ? '📷 Field Evidence (17)' : '📷 Ảnh hiện trường (17)'}</option>
            </select>
            <span className="select-arrow" aria-hidden="true">
              <Icon name="chevron" size={16} />
            </span>
          </div>

          {/* Reset Filter Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetFilters}
              style={{ height: '38px', padding: '0 12px', fontSize: '13px' }}
            >
              {lang === 'en' ? '✕ Reset' : '✕ Đặt lại'}
            </Button>
          )}

          {/* View Mode Toggle */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: viewMode === 'cards' ? 700 : 500,
                border: 'none',
                background: viewMode === 'cards' ? '#ffffff' : 'transparent',
                color: viewMode === 'cards' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon name="grid" size={14} />
              <span>{lang === 'en' ? 'Detailed Cards' : 'Thẻ chi tiết'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: viewMode === 'table' ? 700 : 500,
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon name="list" size={14} />
              <span>{lang === 'en' ? 'Comparison Table' : 'Bảng đối chiếu'}</span>
            </button>
          </div>
        </div>

        {/* Category Quick Pills */}
        <div style={{ padding: '10px 20px', background: '#ffffff', display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: selectedCategory === 'ALL' ? 700 : 500,
              background: selectedCategory === 'ALL' ? '#059669' : '#f1f5f9',
              color: selectedCategory === 'ALL' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {lang === 'en' ? 'All 33 Criteria' : 'Tất cả 33 tiêu chí'}
          </button>
          {VIETGAP_STANDARD_CATEGORIES.map((cat) => (
            <button
              key={cat.code}
              type="button"
              onClick={() => setSelectedCategory(cat.code)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: selectedCategory === cat.code ? 700 : 500,
                background: selectedCategory === cat.code ? '#059669' : '#f1f5f9',
                color: selectedCategory === cat.code ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {lang === 'en' ? cat.nameEn : cat.nameVi} ({cat.count})
            </button>
          ))}
        </div>

        {/* Header Results Bar */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              {lang === 'en' ? 'Standards List' : 'Danh mục tiêu chí TCVN'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
              ({filteredCriteria.length} / 33 {lang === 'en' ? 'criteria' : 'tiêu chí'})
            </span>
          </div>
          {hasActiveFilters && (
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {lang === 'en' ? 'Filters currently applied' : 'Đang áp dụng bộ lọc tùy chỉnh'}
            </span>
          )}
        </div>

        {/* Content Body */}
        {filteredCriteria.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
              <Icon name="search" size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              {lang === 'en' ? 'No criteria match your search filters' : 'Không tìm thấy tiêu chí nào phù hợp'}
            </h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13.5px' }}>
              {lang === 'en' ? 'Try adjusting your search keyword or clearing the filters.' : 'Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'}
            </p>
            <Button type="button" variant="secondary" onClick={handleResetFilters}>
              {lang === 'en' ? 'Reset Filters' : 'Đặt lại bộ lọc'}
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* View Mode 2: Comparison Table */
          <div className="ui-table-scroll zone-table-wrap" tabIndex={0}>
            <table className="ui-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', fontWeight: 700 }}>
                  <th scope="col" style={{ padding: '12px 14px', width: '12%' }}>
                    {lang === 'en' ? 'CODE & CLAUSE' : 'MÃ & ĐIỀU KHOẢN'}
                  </th>
                  <th scope="col" style={{ padding: '12px 14px', width: '15%' }}>
                    {lang === 'en' ? 'TOPIC' : 'CHUYÊN ĐỀ'}
                  </th>
                  <th scope="col" style={{ padding: '12px 14px', width: '33%' }}>
                    {lang === 'en' ? 'TITLE & REQUIREMENT' : 'TÊN TIÊU CHÍ & YÊU CẦU CHUẨN'}
                  </th>
                  <th scope="col" style={{ padding: '12px 14px', width: '12%', textAlign: 'center' }}>
                    {lang === 'en' ? 'PRIORITY' : 'MỨC ĐỘ'}
                  </th>
                  <th scope="col" style={{ padding: '12px 14px', width: '12%', textAlign: 'center' }}>
                    {lang === 'en' ? 'METHOD' : 'CƠ CHẾ'}
                  </th>
                  <th scope="col" style={{ padding: '12px 14px', width: '16%' }}>
                    {lang === 'en' ? 'REQUIRED EVIDENCE' : 'MINH CHỨNG BẮT BUỘC'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCriteria.map((item) => {
                  const isMust = item.priority === 'MUST';
                  const isMajor = item.priority === 'MAJOR';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Mã & Điều khoản */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', fontFamily: 'ui-monospace, monospace', display: 'block' }}>
                          {item.id}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {item.clause}
                        </span>
                      </td>

                      {/* Chuyên đề */}
                      <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#475569' }}>
                        {lang === 'en' ? item.categoryNameEn : item.categoryNameVi}
                      </td>

                      {/* Tên & Yêu cầu */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px', marginBottom: '4px' }}>
                          {lang === 'en' ? item.titleEn : item.titleVi}
                        </div>
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: 1.45 }}>
                          {lang === 'en' ? item.requirementEn : item.requirementVi}
                        </p>
                      </td>

                      {/* Mức độ */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isMust ? '#fee2e2' : isMajor ? '#fef3c7' : '#eff6ff',
                            color: isMust ? '#b91c1c' : isMajor ? '#b45309' : '#1d4ed8',
                            border: `1px solid ${isMust ? '#fecaca' : isMajor ? '#fde68a' : '#bfdbfe'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isMust ? 'MUST (100%)' : isMajor ? 'MAJOR (≥90%)' : 'REC'}
                        </span>
                      </td>

                      {/* Cơ chế */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: item.evalMethod === 'AUTO' ? '#ecfdf5' : '#f8fafc',
                            color: item.evalMethod === 'AUTO' ? '#047857' : '#475569',
                            border: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.evalMethod === 'AUTO' ? (lang === 'en' ? '⚡ Auto' : '⚡ Tự đối soát') : (lang === 'en' ? '📷 Photo' : '📷 Hiện trường')}
                        </span>
                      </td>

                      {/* Minh chứng */}
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#334155' }}>
                        {item.evidenceVi}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* View Mode 1: Detailed Cards by Grouped Categories */
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {groupedCategories.map((group) => (
              <div key={group.code} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Category Header Banner */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={group.icon} size={16} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 750, color: '#0f172a' }}>
                        {lang === 'en' ? group.nameEn : group.nameVi}
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        {group.descriptionVi}
                      </p>
                    </div>
                  </div>

                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '12px' }}>
                    {group.items.length} {lang === 'en' ? 'criteria' : 'tiêu chí'}
                  </span>
                </div>

                {/* Criteria Cards Grid within Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.items.map((crit: VietGapStandardItem) => {
                    const isMust = crit.priority === 'MUST';
                    const isMajor = crit.priority === 'MAJOR';

                    return (
                      <div
                        key={crit.id}
                        className="panel"
                        style={{
                          padding: '18px 20px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                        }}
                      >
                        {/* Header line: Code, Clause, Priority & Method badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                              {crit.id}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                              {crit.clause}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Priority Badge */}
                            <span
                              style={{
                                padding: '3px 9px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isMust ? '#fee2e2' : isMajor ? '#fef3c7' : '#eff6ff',
                                color: isMust ? '#b91c1c' : isMajor ? '#b45309' : '#1d4ed8',
                                border: `1px solid ${isMust ? '#fecaca' : isMajor ? '#fde68a' : '#bfdbfe'}`,
                              }}
                            >
                              {isMust ? 'BẮT BUỘC (MUST · 100%)' : isMajor ? 'QUAN TRỌNG (MAJOR · ≥90%)' : 'KHUYẾN KHÍCH (REC)'}
                            </span>

                            {/* Evaluation Method Badge */}
                            <span
                              style={{
                                padding: '3px 9px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 650,
                                background: crit.evalMethod === 'AUTO' ? '#ecfdf5' : '#f8fafc',
                                color: crit.evalMethod === 'AUTO' ? '#047857' : '#475569',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {crit.evalMethod === 'AUTO'
                                ? (lang === 'en' ? '⚡ Auto-Verified CSDL' : '⚡ Tự đối soát CSDL')
                                : (lang === 'en' ? '📷 Field Photo Required' : '📷 Ảnh hiện trường bắt buộc')}
                            </span>
                          </div>
                        </div>

                        {/* Title & Standard Requirement */}
                        <div>
                          <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 750, color: '#0f172a' }}>
                            {lang === 'en' ? crit.titleEn : crit.titleVi}
                          </h4>
                          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
                            {lang === 'en' ? crit.requirementEn : crit.requirementVi}
                          </p>
                        </div>

                        {/* Two Columns: Inspection Checkpoints & Required Evidence */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px', marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                          {/* Checkpoints */}
                          <div style={{ fontSize: '12.5px', color: '#475569' }}>
                            <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                              <Icon name="check" size={14} style={{ color: '#059669' }} />
                              <span>{lang === 'en' ? 'Practical Checkpoints:' : 'Nội dung kiểm tra thực tế:'}</span>
                            </strong>
                            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
                              {crit.checkpointsVi.map((cp, idx) => (
                                <li key={idx} style={{ marginBottom: '3px' }}>{cp}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Evidence */}
                          <div style={{ fontSize: '12.5px', color: '#475569' }}>
                            <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                              <Icon name="shield" size={14} style={{ color: '#2563eb' }} />
                              <span>{lang === 'en' ? 'Mandatory Stored Evidence:' : 'Minh chứng lưu trữ bắt buộc:'}</span>
                            </strong>
                            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#1e293b', lineHeight: 1.45 }}>
                              {crit.evidenceVi}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
