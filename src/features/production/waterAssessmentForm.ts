import type { CreateWaterAssessmentPayload, WaterAssessmentBackendResp } from './zoneBlockService';

export function waterAssessmentForm(record?: WaterAssessmentBackendResp) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    assessedAt: record?.assessedAt?.slice(0, 10) || today,
    waterSourceName: record?.waterSourceName || '',
    waterSourceType: record?.waterSourceType || '',
    waterPh: record?.waterPh == null ? '' : String(record.waterPh),
    temperatureC: record?.temperatureC == null ? '' : String(record.temperatureC),
    qualityStatus: record?.qualityStatus || 'CHO_KIEM_DINH',
    notes: record?.notes || '',
    imageUrl: record?.imageUrl || '',
    labTestReportUrl: record?.labTestReportUrl || '',
  };
}

export type WaterAssessmentForm = ReturnType<typeof waterAssessmentForm>;

export function waterAssessmentPayload(form: WaterAssessmentForm, record?: WaterAssessmentBackendResp | null): CreateWaterAssessmentPayload {
  return {
    waterSourceId: record?.waterSourceId ?? undefined,
    waterSourceName: form.waterSourceName.trim(),
    waterSourceType: form.waterSourceType.trim(),
    waterPh: form.waterPh === '' ? undefined : Number(form.waterPh),
    temperatureC: form.temperatureC === '' ? undefined : Number(form.temperatureC),
    qualityStatus: form.qualityStatus,
    notes: form.notes.trim(),
    imageUrl: form.imageUrl.trim(),
    labTestReportUrl: form.labTestReportUrl.trim(),
    assessedAt: form.assessedAt ? new Date(`${form.assessedAt}T00:00:00`).toISOString() : undefined,
  };
}
