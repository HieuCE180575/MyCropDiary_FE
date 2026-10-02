import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlotForm } from '../features/plots/components/PlotForm';
import { createPlot, fetchPlotById, updatePlot } from '../features/plots/plotService';
import type { Plot, PlotFormValues } from '../features/plots/types';

interface PlotFormPageProps {
  mode: 'create' | 'edit';
}

function plotToFormValues(plot: Plot): PlotFormValues {
  return {
    plotName: plot.plotName,
    areaValue: String(plot.areaHectares),
    areaUnit: 'ha',
    locationDescription: plot.locationDescription,
    soilType: plot.soilType ?? '',
    status: plot.status === 'archived' ? 'active' : plot.status,
    notes: plot.notes ?? '',
    coverImage: null,
  };
}

export function PlotFormPage({ mode }: PlotFormPageProps) {
  const { plotId } = useParams<{ plotId: string }>();
  const navigate = useNavigate();

  const [plot, setPlot] = useState<Plot | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !plotId) return;
    let ignore = false;
    setLoading(true);

    fetchPlotById(plotId)
      .then((data) => {
        if (ignore) return;
        if (!data) setLoadError('Không tìm thấy lô đất.');
        setPlot(data);
      })
      .catch(() => {
        if (!ignore) setLoadError('Không thể tải thông tin lô đất.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [mode, plotId]);

  async function handleSubmit(values: PlotFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = mode === 'edit' && plotId ? await updatePlot(plotId, values) : await createPlot(values);
      navigate(`/land-plots/${saved.plotId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Lưu lô đất thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'edit' && loading) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin lô đất...</h2>
        </div>
      </section>
    );
  }

  if (mode === 'edit' && (loadError || !plot)) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>{loadError ?? 'Không tìm thấy lô đất.'}</h2>
        </div>
      </section>
    );
  }

  return (
    <section>
      <PlotForm
        title={mode === 'edit' ? 'Chỉnh sửa lô đất' : 'Thêm lô đất'}
        breadcrumbLabel={mode === 'edit' && plot ? `Chỉnh sửa` : 'Thêm lô đất'}
        initialValues={mode === 'edit' && plot ? plotToFormValues(plot) : undefined}
        initialCoverImageUrl={plot?.coverImageUrl}
        submitting={submitting}
        submitError={submitError}
        submitLabel={mode === 'edit' ? 'Lưu thay đổi' : 'Lưu lô đất'}
        cancelHref={mode === 'edit' && plotId ? `/land-plots` : '/land-plots'}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
