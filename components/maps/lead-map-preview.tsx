'use client'

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'

interface LeadMapPreviewProps {
  lat: number
  lng: number
  heightClassName?: string
}

export function LeadMapPreview({ lat, lng, heightClassName = 'h-36' }: LeadMapPreviewProps) {
  return (
    <div className={`${heightClassName} w-full overflow-hidden rounded-md border border-border`}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={[lat, lng]}
          radius={8}
          pathOptions={{ color: '#6c47ff', fillColor: '#6c47ff', fillOpacity: 0.6 }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            Lead location (dummy)
          </Tooltip>
        </CircleMarker>
      </MapContainer>
    </div>
  )
}
