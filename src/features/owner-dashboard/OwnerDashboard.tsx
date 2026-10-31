import { useCallback, useMemo } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import type { FarmSummary } from '../farm-management/api';
import { useApiData } from '../../shared/hooks/useApiData';
import { Icon } from '../../shared/components/Icon';
import { loadOwnerDashboard } from './dashboardApi';
import { areaInM2, formatArea, makeDashboardDemo } from './dashboardModel';
import { CropAreaChart, DemoTag, EnvironmentPanel, RecentActivityPanel, SeasonProgressPanel, UpcomingTasksPanel } from './OwnerDashboardPanels';
import '../../styles/owner-dashboard.css';

export function OwnerDashboard({ farm }: { farm: FarmSummary }) {
  const { lang } = useLanguage();
  const load = useCallback((signal: AbortSignal) => loadOwnerDashboard(farm.id, signal), [farm.id]);
  const { data, loading, error, retry } = useApiData(load);
  const demo = useMemo(() => makeDashboardDemo(), [farm.id]);
  const usableSeasons = data?.seasons?.filter(season => ['active', 'planned', 'paused'].includes(season.seasonStatus.toLowerCase()));
  const sampleSeasons = !usableSeasons?.length;
  const seasons = sampleSeasons ? demo.seasons : usableSeasons;
  const activeSeasons = sampleSeasons ? demo.seasons.length : data?.seasons?.filter(season => season.seasonStatus.toLowerCase() === 'active').length ?? 0;
  const blocks = data?.blocks ? [...new Map(data.blocks.filter(block => block.status.toLowerCase() !== 'archived').map(block => [block.blockId, block])).values()] : [];
  const areas = blocks.map(block => areaInM2(block.areaValue, block.areaUnit));
  const sampleArea = blocks.length === 0 || areas.some(area => area === null);
  const totalArea = sampleArea ? demo.areaM2 : areas.reduce<number>((sum, area) => sum + (area ?? 0), 0);
  const sampleStaff = data?.staffCount == null || data.staffCount === 0;
  const sampleZones = !data?.zones?.length;
  const sampleCrops = !data?.crops?.length;
  const crops = data?.crops?.length ? data.crops : demo.crops;
  const recentSample = !data?.recent.length;
  const address = data?.farm?.address?.trim() || [farm.district, farm.province].filter(Boolean).join(', ');
  const metadata = [
    { icon: 'map-pin', label: 'Location', value: address || 'Co Do, Can Tho', demo: !address },
    { icon: 'leaf', label: 'Scale', value: formatArea(totalArea), demo: sampleArea },
    { icon: 'sprout', label: 'Main Crop', value: [...new Set(seasons.map(season => season.cropCategoryName).filter(Boolean))].slice(0, 2).join(', ') || 'Not updated', demo: sampleSeasons },
    { icon: 'calendar', label: 'Active Crop Seasons', value: activeSeasons + ' seasons', demo: sampleSeasons },
  ];
  const stats = [
    { icon: 'gauge', label: 'Total Cultivated Area', value: formatArea(totalArea), to: '/production-areas', sample: sampleArea, tone: 'green' },
    { icon: 'sprout', label: 'Active Crop Seasons', value: String(activeSeasons), to: '/crop-seasons', sample: sampleSeasons, tone: 'green' },
    { icon: 'users', label: 'Farm Workers', value: `${sampleStaff ? demo.staffCount : data.staffCount} people`, to: '/workers', sample: sampleStaff, tone: 'blue' },
    { icon: 'plots', label: 'Production Zones & Blocks', value: `${sampleZones ? demo.zonesCount : new Set((data?.zones ?? []).map(zone => zone.zoneId)).size} zones`, to: '/production-areas', sample: sampleZones, tone: 'mint' },
  ];
  return <section className="owner-dashboard" aria-label="Farm Overview">
    <header className="owner-hero">
      <Link to="/farm?edit=1" className="owner-edit-link"><Icon name="edit" size={16} />Edit Farm Information</Link>
      <span className="owner-role-badge">FARM OWNER</span>
      <h1>{farm.farmName}<Icon name="leaf" size={30} /></h1>
      <p className="owner-hero-description">Sustainable farm management, aiming for clean and safe agricultural produce</p>
      <div className="owner-hero-meta">{metadata.map(item => <div className="owner-meta-item" key={item.label}>
        <Icon name={item.icon} size={28} /><div><span>{item.label}</span>{loading ? <span className="owner-skeleton owner-meta-skeleton" /> : <strong>{item.value}{item.demo && <span className="owner-inline-demo">Sample Data</span>}</strong>}</div>
      </div>)}</div>
    </header>
    {(error || data?.issues.length) ? <div className="owner-data-notice" role="status"><Icon name="warning" size={15} /><span>Chưa tải được một số dữ liệu{data?.issues.length ? ': ' + data.issues.join(', ') : ''}. Các khối minh họa có nhãn “Dữ liệu mẫu”.</span><button type="button" onClick={retry}>Thử lại</button></div> : null}
    <div className="owner-stat-grid">{stats.map(stat => <Link to={stat.to} className="owner-stat-card" key={stat.label}>
      <span className={'owner-stat-icon tone-' + stat.tone}><Icon name={stat.icon} size={28} /></span><div><span className="owner-stat-name">{stat.label}</span><div className="owner-stat-value-row">{loading ? <span className="owner-skeleton owner-stat-skeleton" /> : <strong>{stat.value}</strong>}{!loading && stat.sample && <DemoTag />}</div></div>
    </Link>)}</div>
    {loading ? <div className="owner-dashboard-loading" role="status"><span className="owner-sr-only">Đang tải tổng quan trang trại...</span><div className="owner-skeleton" /><div className="owner-skeleton" /></div> : <>
      <div className="owner-middle-grid"><SeasonProgressPanel seasons={seasons} demo={sampleSeasons} /><CropAreaChart crops={crops} demo={sampleCrops} /></div>
      <div className="owner-bottom-grid"><UpcomingTasksPanel tasks={demo.tasks} /><EnvironmentPanel /><RecentActivityPanel records={recentSample ? demo.recent : data.recent} demo={recentSample} /></div>
    </>}
  </section>;
}
