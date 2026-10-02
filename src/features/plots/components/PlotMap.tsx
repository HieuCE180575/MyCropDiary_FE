import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";

interface PlotMapProps {
    boundary?: [number, number][];
    onBoundaryChange?: (boundary: [number, number][]) => void;
}

function DrawingControls({
    onBoundaryChange,
}: {
    onBoundaryChange?: (boundary: [number, number][]) => void;
}) {
    const map = useMap();

    useEffect(() => {
        // Add Geoman controls
        map.pm.addControls({
            position: "topleft",

            drawText: false,
            drawCircle: false,
            drawCircleMarker: false,
            drawMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawPolygon: true,

            editMode: true,
            dragMode: false,
            cutPolygon: false,
            removalMode: true,
        });

        // Polygon created
        const handleCreate = (e: any) => {
            const layer = e.layer;

            const latLngs = layer.getLatLngs()[0] as L.LatLng[];

            const boundary: [number, number][] = latLngs.map(
                (point: L.LatLng) => [point.lat, point.lng]
            );

            console.log("New boundary:", boundary);

            onBoundaryChange?.(boundary);
        };

        // Polygon edited
        const handleEdit = () => {
            map.eachLayer((layer: any) => {
                if (layer instanceof L.Polygon) {
                    const latLngs = layer.getLatLngs()[0] as L.LatLng[];

                    const boundary: [number, number][] = latLngs.map(
                        (point: L.LatLng) => [point.lat, point.lng]
                    );

                    console.log("Updated boundary:", boundary);

                    onBoundaryChange?.(boundary);
                }
            });
        };

        map.on("pm:create", handleCreate);
        map.on("pm:edit", handleEdit);

        return () => {
            map.off("pm:create", handleCreate);
            map.off("pm:edit", handleEdit);
        };
    }, [map, onBoundaryChange]);

    return null;
}

function PlotMap({
    boundary,
    onBoundaryChange,
}: PlotMapProps) {
    const center: [number, number] =
        boundary && boundary.length > 0
            ? boundary[0]
            : [10.0452, 105.7469];

    return (
        <MapContainer
            center={center}
            zoom={17}
            style={{
                height: "500px",
                width: "100%",
            }}
        >
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Existing plot */}
            {boundary && boundary.length > 0 && (
                <Polygon positions={boundary} />
            )}

            {/* Drawing controls */}
            <DrawingControls
                onBoundaryChange={onBoundaryChange}
            />
        </MapContainer>
    );
}

export default PlotMap;