import type { SoilAssessmentBackendResp } from './zoneBlockService';

export function soilNutrients(value?: string | null): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** Missing API fields stay missing; never manufacture test results or sample codes. */
export function soilAssessmentRecord(record: SoilAssessmentBackendResp, blockName = '') {
  const nutrients = soilNutrients(record.nutrientData);
  const text = (key: string) => typeof nutrients[key] === 'string' ? nutrients[key] as string : '';
  const numeric = (key: string): number | '' => typeof nutrients[key] === 'number' ? nutrients[key] as number : '';
  return {
    ...record,
    blockName: record.blockName || blockName,
    assessedAt: record.assessedAt?.slice(0, 10) || '',
    sampleCode: text('sampleCode'),
    phLevel: record.soilPh ?? '',
    organicMatterPct: numeric('organicMatterPct'),
    heavyMetalResult: text('heavyMetalResult'),
    microbialStatus: text('microbialStatus'),
    laboratoryName: text('laboratoryName'),
    conclusion: text('conclusion'),
    recordedByName: record.conductedByName || '',
  };
}

export type ApiSoilAssessmentRecord = ReturnType<typeof soilAssessmentRecord>;
