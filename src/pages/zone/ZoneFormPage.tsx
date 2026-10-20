import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductionAreaForm } from '../../features/production/components/ProductionAreaForm';
import { createProductionArea, fetchProductionAreaById, updateProductionArea } from '../../features/production/productionAreaService';
import type { ProductionArea, ProductionAreaFormValues } from '../../features/production/types';

interface ProductionFormPageProps {
  mode: 'create' | 'edit';
}

function productionAreaToFormValues(productionArea: ProductionArea): ProductionAreaFormValues {
  return {
    areaName: productionArea.areaName || productionArea.zoneName || '',
    areaHectares: String(productionArea.areaHectares ?? productionArea.areaValue ?? 0),
    locationDescription: productionArea.locationDescription ?? productionArea.description ?? '',
  };
}

export function ZoneFormPage({ mode }: ProductionFormPageProps) {
  const { zoneId: paramZoneId, productionAreaId } = useParams<{ zoneId?: string; productionAreaId?: string }>();
  const targetId = paramZoneId || productionAreaId;
  const navigate = useNavigate();

  const [productionArea, setProductionArea] = useState<ProductionArea | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !targetId) return;
    let ignore = false;
    setLoading(true);

    fetchProductionAreaById(targetId)
      .then((data) => {
        if (ignore) return;
        if (!data) setLoadError('Không tìm thấy phân khu sản xuất.');
        setProductionArea(data);
      })
      .catch(() => {
        if (!ignore) setLoadError('Không thể tải thông tin phân khu sản xuất.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [mode, targetId]);

  async function handleSubmit(values: ProductionAreaFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = mode === 'edit' && targetId ? await updateProductionArea(targetId, values) : await createProductionArea(values);
      navigate(`/zones/${saved.productionAreaId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Lưu phân khu thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'edit' && loading) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin phân khu sản xuất...</h2>
        </div>
      </section>
    );
  }

  if (mode === 'edit' && (loadError || !productionArea)) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>{loadError ?? 'Không tìm thấy phân khu sản xuất.'}</h2>
        </div>
      </section>
    );
  }

  return (
    <section>
      <ProductionAreaForm
        title={mode === 'edit' ? 'Chỉnh sửa phân khu (Zone)' : 'Thêm phân khu mới (Zone)'}
        breadcrumbLabel={mode === 'edit' && productionArea ? `Chỉnh sửa` : 'Thêm phân khu'}
        initialValues={mode === 'edit' && productionArea ? productionAreaToFormValues(productionArea) : undefined}
        submitting={submitting}
        submitError={submitError}
        submitLabel={mode === 'edit' ? 'Lưu thay đổi' : 'Lưu phân khu'}
        cancelHref={mode === 'edit' && productionArea ? `/zones` : '/zones'}
        onSubmit={handleSubmit}
      />
    </section>
  );
}

export const ProductionAreaFormPage = ZoneFormPage;

