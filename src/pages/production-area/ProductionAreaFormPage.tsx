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
    areaName: productionArea.areaName,
    areaHectares: String(productionArea.areaHectares),
    locationDescription: productionArea.locationDescription ?? '',
  };
}

export function ProductionAreaFormPage({ mode }: ProductionFormPageProps) {
  const { productionAreaId } = useParams<{ productionAreaId: string }>();
  const navigate = useNavigate();

  const [productionArea, setProductionArea] = useState<ProductionArea | null>(null);
  const [loading, setLoading] = useState(mode === 'edit');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !productionAreaId) return;
    let ignore = false;
    setLoading(true);

    fetchProductionAreaById(productionAreaId)
      .then((data) => {
        if (ignore) return;
        if (!data) setLoadError('Không tìm thấy khu sản xuất.');
        setProductionArea(data);
      })
      .catch(() => {
        if (!ignore) setLoadError('Không thể tải thông tin khu sản xuất.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [mode, productionAreaId]);

  async function handleSubmit(values: ProductionAreaFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = mode === 'edit' && productionAreaId ? await updateProductionArea(productionAreaId, values) : await createProductionArea(values);
      navigate(`/production-areas/${saved.productionAreaId}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Lưu khu sản xuất thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'edit' && loading) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Đang tải thông tin khu sản xuất...</h2>
        </div>
      </section>
    );
  }

  if (mode === 'edit' && (loadError || !productionArea)) {
    return (
      <section>
        <div className="panel empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>{loadError ?? 'Không tìm thấy khu sản xuất đất.'}</h2>
        </div>
      </section>
    );
  }

  return (
    <section>
      <ProductionAreaForm
        title={mode === 'edit' ? 'Chỉnh sửa khu sản xuất' : 'Thêm khu sản xuất'}
        breadcrumbLabel={mode === 'edit' && productionArea ? `Chỉnh sửa` : 'Thêm khu sản xuất'}
        initialValues={mode === 'edit' && productionArea ? productionAreaToFormValues(productionArea) : undefined}
        // initialCoverImageUrl={productionArea?.coverImageUrl}
        submitting={submitting}
        submitError={submitError}
        submitLabel={mode === 'edit' ? 'Lưu thay đổi' : 'Lưu khu sản xuất'}
        cancelHref={mode === 'edit' && productionArea ? `/production-areas` : '/production-areas'}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
