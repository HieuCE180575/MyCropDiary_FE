import { useEffect, useState } from 'react';
import {
  fetchOpenCropSeasonOptions, fetchFarmingActivityOptions,
  type CropSeasonOption, type FarmingActivityOption,
} from './cultivationOptionsApi';

interface FarmingActivityPickerProps {
  farmId: number;
  value: number | '';
  onChange: (id: number | '') => void;
  disabled?: boolean;
}

export function FarmingActivityPicker({ farmId, value, onChange, disabled }: FarmingActivityPickerProps) {
  const [seasons, setSeasons] = useState<CropSeasonOption[]>([]);
  const [seasonId, setSeasonId] = useState<number | ''>('');
  const [activities, setActivities] = useState<FarmingActivityOption[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [seasonsAttempt, setSeasonsAttempt] = useState(0);
  const [activitiesAttempt, setActivitiesAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSeasonsLoading(true);
    setSeasonsError(null);
    void fetchOpenCropSeasonOptions(farmId, controller.signal).then(items => {
      if (!controller.signal.aborted) setSeasons(items);
    }).catch(error => {
      if (!controller.signal.aborted) setSeasonsError(error instanceof Error ? error.message : 'Không tải được mùa vụ.');
    }).finally(() => {
      if (!controller.signal.aborted) setSeasonsLoading(false);
    });
    return () => controller.abort();
  }, [farmId, seasonsAttempt]);

  useEffect(() => {
    if (!seasonId) return;
    const controller = new AbortController();
    setActivitiesLoading(true);
    setActivitiesError(null);
    void fetchFarmingActivityOptions(seasonId, controller.signal).then(items => {
      if (!controller.signal.aborted) setActivities(items);
    }).catch(error => {
      if (!controller.signal.aborted) setActivitiesError(error instanceof Error ? error.message : 'Không tải được hoạt động canh tác.');
    }).finally(() => {
      if (!controller.signal.aborted) setActivitiesLoading(false);
    });
    return () => controller.abort();
  }, [seasonId, activitiesAttempt]);

  return (
    <>
      <div className="mu-field">
      <label htmlFor="usage-season">Mùa vụ *</label>
      <select id="usage-season" required value={seasonId} disabled={disabled || seasonsLoading || Boolean(seasonsError)} onChange={event => {
        setSeasonId(event.target.value ? Number(event.target.value) : '');
        onChange('');
        setActivities([]);
        setActivitiesError(null);
        setActivitiesLoading(Boolean(event.target.value));
      }}>
        <option value="">{seasonsLoading ? 'Đang tải mùa vụ...' : 'Chọn mùa vụ'}</option>
        {seasons.map(season => <option key={season.cropSeasonId} value={season.cropSeasonId}>{season.seasonName}</option>)}
      </select>
      {seasonsError && <div role="alert">{seasonsError} <button type="button" disabled={disabled} onClick={() => setSeasonsAttempt(attempt => attempt + 1)}>Tải lại mùa vụ</button></div>}
      {!seasonsLoading && !seasonsError && seasons.length === 0 && <p role="status">Trang trại chưa có mùa vụ có thể ghi nhận vật tư. Hãy tạo hoặc mở mùa vụ trước.</p>}
      </div>
      <div className="mu-field">
      <label htmlFor="usage-activity">Hoạt động canh tác *</label>
      <select id="usage-activity" required value={value} disabled={disabled || !seasonId || activitiesLoading || Boolean(activitiesError)} onChange={event => {
        const id = Number(event.target.value);
        onChange(activities.some(activity => activity.farmingActivityId === id) ? id : '');
      }}>
        <option value="">{activitiesLoading ? 'Đang tải hoạt động...' : 'Chọn hoạt động canh tác'}</option>
        {activities.map(activity => <option key={activity.farmingActivityId} value={activity.farmingActivityId}>{activity.activityName}</option>)}
      </select>
      {activitiesError && <div role="alert">{activitiesError} <button type="button" disabled={disabled} onClick={() => setActivitiesAttempt(attempt => attempt + 1)}>Tải lại hoạt động</button></div>}
      {seasonId && !activitiesLoading && !activitiesError && activities.length === 0 ? <p role="status">Mùa vụ chưa có hoạt động canh tác. Hãy tạo nhật ký canh tác trước.</p> : null}
      </div>
    </>
  );
}
