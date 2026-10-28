import { useEffect, useRef, useState } from 'react';
import {
  calculatePolygonAreaM2,
  findProvinceOption,
  generateSampleFarmPolygon,
  getGoongMaptilesKey,
  geocodeAddress,
  reverseGeocodeGoong,
  type GoongGeocodeResult,
  type LatLngPoint,
} from '../goongMapService';

declare global {
  interface Window {
    goongjs?: any;
    L?: any;
  }
}

export interface FarmGoongMapProps {
  farmName?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  latitude?: number | null;
  longitude?: number | null;
  boundary?: LatLngPoint[];
  editable?: boolean;
  height?: number;
  onLocationChange?: (lat: number, lng: number, reverseResult?: GoongGeocodeResult | null) => void;
  onBoundaryChange?: (points: LatLngPoint[]) => void;
}

const DEFAULT_CENTER: LatLngPoint = { lat: 10.045162, lng: 105.746854 }; // TP. Cần Thơ

function isTestEnv(): boolean {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
}

let goongScriptPromise: Promise<boolean> | null = null;
function loadGoongJsSdk(): Promise<boolean> {
  if (isTestEnv()) return Promise.resolve(false);
  if (window.goongjs) return Promise.resolve(true);
  if (goongScriptPromise) return goongScriptPromise;

  goongScriptPromise = new Promise((resolve) => {
    if (!document.getElementById('goong-js-css')) {
      const link = document.createElement('link');
      link.id = 'goong-js-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.goongjs));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return goongScriptPromise;
}

let leafletScriptPromise: Promise<boolean> | null = null;
function loadLeafletSdk(): Promise<boolean> {
  if (isTestEnv()) return Promise.resolve(false);
  if (window.L) return Promise.resolve(true);
  if (leafletScriptPromise) return leafletScriptPromise;

  leafletScriptPromise = new Promise((resolve) => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.L));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return leafletScriptPromise;
}

export function FarmGoongMap({
  farmName,
  address,
  province,
  district,
  ward,
  latitude,
  longitude,
  boundary = [],
  editable = false,
  height = 380,
  onLocationChange,
  onBoundaryChange,
}: FarmGoongMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const engineTypeRef = useRef<'goong' | 'leaflet' | null>(null);
  const markerRef = useRef<any>(null);
  const vertexMarkersRef = useRef<any[]>([]);
  const leafletPolygonRef = useRef<any>(null);

  const [drawMode, setDrawMode] = useState<'pin' | 'polygon'>('pin');
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  const [resolvedCenter, setResolvedCenter] = useState<LatLngPoint>(() => {
    if (latitude != null && longitude != null) return { lat: latitude, lng: longitude };
    const prov = findProvinceOption(province);
    return prov ? { lat: prov.lat, lng: prov.lng } : DEFAULT_CENTER;
  });
  const [reverseLoading, setReverseLoading] = useState(false);

  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  const editableRef = useRef(editable);
  editableRef.current = editable;
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  const onBoundaryChangeRef = useRef(onBoundaryChange);
  onBoundaryChangeRef.current = onBoundaryChange;

  const activePoint: LatLngPoint =
    latitude != null && longitude != null
      ? { lat: latitude, lng: longitude }
      : resolvedCenter;

  // Khi xem trang trại hoặc chọn Tỉnh/Quận/Phường mà chưa có tọa độ cụ thể -> tự động định vị qua Goong Geocode
  useEffect(() => {
    if (latitude != null && longitude != null) {
      setResolvedCenter({ lat: latitude, lng: longitude });
      return;
    }
    const prov = findProvinceOption(province);
    if (prov && !district && !ward && !address) {
      setResolvedCenter({ lat: prov.lat, lng: prov.lng });
      return;
    }
    if (!province && !district && !ward && !address) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void geocodeAddress(address || '', { province, district, ward }).then((res) => {
        if (!cancelled && res) {
          setResolvedCenter({ lat: res.lat, lng: res.lng });
        } else if (!cancelled && prov) {
          setResolvedCenter({ lat: prov.lat, lng: prov.lng });
        }
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [latitude, longitude, province, district, ward, address]);

  const handleMapClick = async (lat: number, lng: number) => {
    if (!editableRef.current) return;
    const roundedLat = Number(lat.toFixed(6));
    const roundedLng = Number(lng.toFixed(6));

    if (drawModeRef.current === 'polygon') {
      const nextPoints = [...boundaryRef.current, { lat: roundedLat, lng: roundedLng }];
      onBoundaryChangeRef.current?.(nextPoints);
      if (latitude == null || longitude == null) {
        onLocationChangeRef.current?.(roundedLat, roundedLng, null);
      }
    } else {
      setReverseLoading(true);
      onLocationChangeRef.current?.(roundedLat, roundedLng, null);
      try {
        const rev = await reverseGeocodeGoong(roundedLat, roundedLng);
        if (rev) {
          onLocationChangeRef.current?.(roundedLat, roundedLng, rev);
        }
      } finally {
        setReverseLoading(false);
      }
    }
  };

  // Khởi tạo bản đồ (Goong Map JS SDK khi có MapTiles Key, hoặc Leaflet tương thích khi chưa cấu hình key)
  useEffect(() => {
    if (isTestEnv() || !mapContainerRef.current) return;

    let disposed = false;
    const container = mapContainerRef.current;
    const maptilesKey = getGoongMaptilesKey();

    const initMap = async () => {
      // Dọn bản đồ cũ nếu có
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
        engineTypeRef.current = null;
      }
      container.innerHTML = '';

      if (maptilesKey) {
        const goongReady = await loadGoongJsSdk();
        if (disposed) return;
        if (goongReady && window.goongjs) {
          try {
            window.goongjs.accessToken = maptilesKey;
            const styleUrl =
              mapStyle === 'satellite'
                ? 'https://tiles.goong.io/assets/goong_satellite.json'
                : 'https://tiles.goong.io/assets/goong_map_web.json';
            const map = new window.goongjs.Map({
              container,
              style: styleUrl,
              center: [activePoint.lng, activePoint.lat],
              zoom: boundaryRef.current.length > 0 ? 16 : 14,
            });
            map.addControl(new window.goongjs.NavigationControl(), 'top-right');

            map.on('click', (e: any) => {
              if (e?.lngLat) {
                void handleMapClick(e.lngLat.lat, e.lngLat.lng);
              }
            });

            map.on('load', () => {
              if (disposed) return;
              syncMapOverlays(map, 'goong');
            });

            mapInstanceRef.current = map;
            engineTypeRef.current = 'goong';
            return;
          } catch {
            // Nếu key MapTiles lỗi thì tự động chuyển sang chế độ bản đồ dự phòng
          }
        }
      }

      const leafletReady = await loadLeafletSdk();
      if (disposed || !leafletReady || !window.L) return;

      const L = window.L;
      const map = L.map(container, {
        center: [activePoint.lat, activePoint.lng],
        zoom: boundaryRef.current.length > 0 ? 16 : 14,
      });

      if (mapStyle === 'satellite') {
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Esri Satellite',
            maxZoom: 19,
          }
        ).addTo(map);
        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map);
      } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: 'OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
      }

      map.on('click', (e: any) => {
        if (e?.latlng) {
          void handleMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      engineTypeRef.current = 'leaflet';
      syncMapOverlays(map, 'leaflet');
    };

    void initMap();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
        engineTypeRef.current = null;
      }
    };
  }, [mapStyle]);

  // Hàm đồng bộ Marker tâm trang trại và Đa giác ranh giới trang trại (Polygon) lên bản đồ
  const syncMapOverlays = (map: any, engine: 'goong' | 'leaflet') => {
    if (!map) return;

    const displayPolygon =
      boundary.length >= 3
        ? boundary
        : !editable && latitude != null && longitude != null
          ? generateSampleFarmPolygon({ lat: latitude, lng: longitude }, 0.00045)
          : boundary;

    const popupHtml = `
      <div style="font-family: Inter, sans-serif; min-width: 180px; padding: 2px;">
        <strong style="color: #065f46; font-size: 13.5px; display: block; margin-bottom: 3px;">
          🌱 ${farmName || 'Vị trí trang trại'}
        </strong>
        <span style="color: #475569; font-size: 12px; display: block;">
          ${[address, ward, district, province].filter(Boolean).join(', ') || 'Đã ghim tọa độ trên bản đồ'}
        </span>
        <span style="color: #059669; font-size: 11.5px; font-weight: 600; display: block; margin-top: 4px;">
          📍 ${activePoint.lat.toFixed(5)}, ${activePoint.lng.toFixed(5)}
        </span>
      </div>
    `;

    if (engine === 'goong' && window.goongjs) {
      // 1. Marker tâm trang trại
      if (markerRef.current) {
        markerRef.current.remove();
      }
      const popup = new window.goongjs.Popup({ offset: 25 }).setHTML(popupHtml);
      const marker = new window.goongjs.Marker({
        color: '#10b981',
        draggable: editable,
      })
        .setLngLat([activePoint.lng, activePoint.lat])
        .setPopup(popup)
        .addTo(map);

      if (editable) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          if (lngLat) {
            void handleMapClick(lngLat.lat, lngLat.lng);
          }
        });
      }
      markerRef.current = marker;

      // 2. Các điểm đỉnh của đa giác
      vertexMarkersRef.current.forEach((m) => m.remove());
      vertexMarkersRef.current = [];
      displayPolygon.forEach((pt, idx) => {
        const el = document.createElement('div');
        el.style.width = '14px';
        el.style.height = '14px';
        el.style.borderRadius = '50%';
        el.style.background = '#10b981';
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';
        el.style.cursor = editable ? 'grab' : 'pointer';
        el.title = `Điểm mốc #${idx + 1}: ${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`;

        const vm = new window.goongjs.Marker({ element: el, draggable: editable })
          .setLngLat([pt.lng, pt.lat])
          .addTo(map);

        if (editable) {
          vm.on('dragend', () => {
            const pos = vm.getLngLat();
            if (pos) {
              const updated = displayPolygon.map((item, i) =>
                i === idx ? { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) } : item
              );
              onBoundaryChangeRef.current?.(updated);
            }
          });
        }
        vertexMarkersRef.current.push(vm);
      });

      // 3. Vẽ đa giác trang trại (GeoJSON Source & Layer)
      const sourceId = 'farm-boundary-source';
      const fillLayerId = 'farm-boundary-fill';
      const lineLayerId = 'farm-boundary-line';

      const coordinates =
        displayPolygon.length >= 3
          ? [[...displayPolygon.map((p) => [p.lng, p.lat]), [displayPolygon[0].lng, displayPolygon[0].lat]]]
          : [];

      const geojsonData = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates,
        },
      };

      if (map.isStyleLoaded()) {
        const existingSource = map.getSource(sourceId);
        if (existingSource) {
          existingSource.setData(geojsonData);
        } else {
          map.addSource(sourceId, { type: 'geojson', data: geojsonData });
          map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.32,
            },
          });
          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#047857',
              'line-width': 3,
            },
          });
        }
      }
    } else if (engine === 'leaflet' && window.L) {
      const L = window.L;
      if (markerRef.current) {
        markerRef.current.remove();
      }
      const farmIcon = L.divIcon({
        className: 'custom-farm-pin',
        html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#10b981,#047857);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(4,120,87,0.45);border:2px solid #fff;"><span style="transform:rotate(45deg);font-size:15px;">🌱</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([activePoint.lat, activePoint.lng], {
        icon: farmIcon,
        draggable: editable,
      })
        .addTo(map)
        .bindPopup(popupHtml);

      if (editable) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          if (pos) {
            void handleMapClick(pos.lat, pos.lng);
          }
        });
      }
      markerRef.current = marker;

      // Vẽ đa giác ranh giới trang trại
      if (leafletPolygonRef.current) {
        leafletPolygonRef.current.remove();
        leafletPolygonRef.current = null;
      }
      vertexMarkersRef.current.forEach((m) => m.remove());
      vertexMarkersRef.current = [];

      if (displayPolygon.length >= 2) {
        const latlngs = displayPolygon.map((p) => [p.lat, p.lng]);
        leafletPolygonRef.current = L.polygon(latlngs, {
          color: '#047857',
          weight: 3,
          fillColor: '#10b981',
          fillOpacity: 0.32,
          dashArray: displayPolygon.length === 2 ? '6, 6' : undefined,
        }).addTo(map);
      }

      displayPolygon.forEach((pt, idx) => {
        const vertexIcon = L.divIcon({
          className: 'custom-farm-vertex',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.35);" title="Điểm mốc #${idx + 1}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const vm = L.marker([pt.lat, pt.lng], {
          icon: vertexIcon,
          draggable: editable,
        }).addTo(map);

        if (editable) {
          vm.on('dragend', () => {
            const pos = vm.getLatLng();
            if (pos) {
              const updated = displayPolygon.map((item, i) =>
                i === idx ? { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) } : item
              );
              onBoundaryChangeRef.current?.(updated);
            }
          });
        }
        vertexMarkersRef.current.push(vm);
      });
    }
  };

  // Cập nhật vị trí tâm và đa giác khi props thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const engine = engineTypeRef.current;
    if (!map || !engine) return;

    syncMapOverlays(map, engine);

    if (engine === 'goong') {
      try {
        map.flyTo({ center: [activePoint.lng, activePoint.lat], zoom: Math.max(map.getZoom(), 14), duration: 700 });
      } catch {
        // ignore
      }
    } else if (engine === 'leaflet') {
      try {
        map.setView([activePoint.lat, activePoint.lng], Math.max(map.getZoom(), 14), { animate: true });
      } catch {
        // ignore
      }
    }
  }, [activePoint.lat, activePoint.lng, boundary, farmName, address, province, district, ward]);

  const effectivePolygon =
    boundary.length >= 3
      ? boundary
      : !editable && latitude != null && longitude != null
        ? generateSampleFarmPolygon({ lat: latitude, lng: longitude }, 0.00045)
        : boundary;

  const areaM2 = calculatePolygonAreaM2(effectivePolygon);
  const areaHa = (areaM2 / 10000).toFixed(2);

  const handleGenerateSamplePolygon = () => {
    const sample = generateSampleFarmPolygon(activePoint);
    onBoundaryChange?.(sample);
    if (latitude == null || longitude == null) {
      onLocationChange?.(activePoint.lat, activePoint.lng, null);
    }
  };

  const handleUndoVertex = () => {
    if (boundary.length === 0) return;
    onBoundaryChange?.(boundary.slice(0, -1));
  };

  const handleClearPolygon = () => {
    onBoundaryChange?.([]);
  };

  return (
    <div className="farm-goong-map-card" style={{ border: '1px solid #cbd5e1', borderRadius: '14px', overflow: 'hidden', background: '#ffffff', marginTop: '8px' }}>
      {/* Thanh công cụ bản đồ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
            🗺️ Bản đồ tọa độ & Ranh giới trang trại
          </span>
          {areaM2 > 0 && (
            <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '12px', padding: '3px 10px', borderRadius: '999px' }}>
              📐 Diện tích vùng vẽ: {areaM2.toLocaleString('vi-VN')} m² (~{areaHa} ha)
            </span>
          )}
          {reverseLoading && (
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              ⏳ Đang đồng bộ địa chỉ...
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {editable && (
            <>
              <button
                type="button"
                onClick={() => setDrawMode('pin')}
                style={{
                  padding: '6px 11px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: drawMode === 'pin' ? '1px solid #059669' : '1px solid #cbd5e1',
                  background: drawMode === 'pin' ? '#ecfdf5' : '#ffffff',
                  color: drawMode === 'pin' ? '#047857' : '#334155',
                  cursor: 'pointer',
                }}
              >
                📍 Đặt tâm trang trại
              </button>
              <button
                type="button"
                onClick={() => setDrawMode('polygon')}
                style={{
                  padding: '6px 11px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: drawMode === 'polygon' ? '1px solid #059669' : '1px solid #cbd5e1',
                  background: drawMode === 'polygon' ? '#ecfdf5' : '#ffffff',
                  color: drawMode === 'polygon' ? '#047857' : '#334155',
                  cursor: 'pointer',
                }}
              >
                ✏️ Vẽ vùng trang trại ({boundary.length} điểm)
              </button>
              <button
                type="button"
                onClick={handleGenerateSamplePolygon}
                title="Tạo nhanh khung ranh giới trang trại quanh vị trí hiện tại"
                style={{
                  padding: '6px 11px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: '#10b981',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                📐 Tạo khung trang trại mẫu
              </button>
              {boundary.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleUndoVertex}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    ↩️ Hoàn tác
                  </button>
                  <button
                    type="button"
                    onClick={handleClearPolygon}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                      background: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Xóa vùng
                  </button>
                </>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === 'satellite' ? 'street' : 'satellite'))}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            {mapStyle === 'satellite' ? '🗺️ Bản đồ đường phố' : '🛰️ Ảnh vệ tinh'}
          </button>
        </div>
      </div>

      {/* Hướng dẫn thao tác nhanh khi ở chế độ đăng ký/chỉnh sửa */}
      {editable && (
        <div style={{ padding: '8px 16px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5', fontSize: '12.5px', color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span>
            {drawMode === 'pin'
              ? '💡 Mẹo: Chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã hoặc nhấp trực tiếp lên bản đồ để ghim tọa độ tâm trang trại.'
              : '💡 Mẹo: Nhấp lần lượt các điểm trên bản đồ để vẽ đa giác ranh giới trang trại (ít nhất 3 điểm), hoặc bấm "Tạo khung trang trại mẫu" rồi kéo các đỉnh.'}
          </span>
        </div>
      )}

      {/* Khung hiển thị bản đồ */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: `${height}px`,
          position: 'relative',
          background: '#e2e8f0',
        }}
      />

      {/* Thanh thông tin tọa độ chân bản đồ */}
      <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: '#475569' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span>
            <strong>📍 Tọa độ tâm:</strong>{' '}
            {latitude != null && longitude != null
              ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : `${activePoint.lat.toFixed(6)}, ${activePoint.lng.toFixed(6)} (Tự động theo khu vực)`}
          </span>
          <span>
            <strong>🗺️ Ranh giới vẽ trên map:</strong>{' '}
            {effectivePolygon.length >= 3
              ? `Đã vẽ ${effectivePolygon.length} đỉnh (${areaM2.toLocaleString('vi-VN')} m²)`
              : 'Chưa vẽ đa giác ranh giới'}
          </span>
        </div>
        {province && (
          <span style={{ color: '#059669', fontWeight: 600 }}>
            {[ward, district, province].filter(Boolean).join(' • ')}
          </span>
        )}
      </div>
    </div>
  );
}

