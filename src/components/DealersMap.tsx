import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../services/api'
import type { DealerSearchResult } from '../services/api'
import { getCityCoords } from './canadianCities'

// Province coordinates for cluster markers
const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  AB: { lat: 53.9, lng: -116.6 },
  BC: { lat: 53.7, lng: -127.6 },
  MB: { lat: 53.8, lng: -98.8 },
  NB: { lat: 46.5, lng: -66.2 },
  NL: { lat: 53.1, lng: -57.7 },
  NS: { lat: 44.7, lng: -63.7 },
  NT: { lat: 64.3, lng: -119.4 },
  NU: { lat: 70.3, lng: -86.6 },
  ON: { lat: 51.3, lng: -85.3 },
  PE: { lat: 46.5, lng: -63.4 },
  QC: { lat: 52.9, lng: -73.5 },
  SK: { lat: 52.9, lng: -106.5 },
  YT: { lat: 64.3, lng: -135.1 },
}

interface ProvinceSummary {
  province: string
  count: number
}

interface DealersMapProps {
  onSelectDealer: (dealerId: string) => void
  externalDealers?: DealerSearchResult[]
}

interface LocatedDealer extends DealerSearchResult {
  lat: number
  lng: number
}

// Creates a circular div icon with count text
function createClusterIcon(count: number, province: string): L.DivIcon {
  const size = Math.min(Math.max(Math.sqrt(count) * 8, 40), 80)
  return L.divIcon({
    className: 'dealer-cluster-icon',
    html: `<div style="width:${size}px;height:${size}px;" class="cluster-bubble"><span class="cluster-count">${count}</span><span class="cluster-label">${province}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Creates a small dealer pin icon
function createDealerIcon(): L.DivIcon {
  return L.divIcon({
    className: 'dealer-pin-icon',
    html: `<div class="dealer-pin"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

const ZOOM_THRESHOLD = 6

// Place dealers on map using static city coordinates
function locateDealers(dealers: DealerSearchResult[]): LocatedDealer[] {
  const result: LocatedDealer[] = []
  const cityCounters: Record<string, number> = {}

  for (const d of dealers) {
    const coords = getCityCoords(d.city || '', d.provState || '')
    if (!coords) continue

    // Slight jitter for multiple dealers in same city so they don't stack
    const key = `${(d.city || '').toLowerCase()},${(d.provState || '').toLowerCase()}`
    cityCounters[key] = (cityCounters[key] || 0) + 1
    const n = cityCounters[key]
    const jitterLat = coords.lat + (Math.sin(n * 2.4) * 0.003 * n)
    const jitterLng = coords.lng + (Math.cos(n * 2.4) * 0.003 * n)

    result.push({ ...d, lat: jitterLat, lng: jitterLng })
  }
  return result
}

// Inner component that reacts to map events
function MapContent({ onSelectDealer, externalDealers }: DealersMapProps) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  const [provinceSummary, setProvinceSummary] = useState<ProvinceSummary[]>([])
  const [locatedDealers, setLocatedDealers] = useState<LocatedDealer[]>([])
  const [isLoadingDealers, setIsLoadingDealers] = useState(false)
  const fetchRef = useRef(0)

  // When external dealers come in, show them on map and fit bounds
  useEffect(() => {
    if (externalDealers && externalDealers.length > 0) {
      const located = locateDealers(externalDealers)
      setLocatedDealers(located)
      if (located.length > 0) {
        const bounds = L.latLngBounds(located.map(d => [d.lat, d.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      }
    }
  }, [externalDealers, map])

  // Load province summary on mount
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const provinces = Object.keys(PROVINCE_COORDS)
        const summaryPromises = provinces.map(async (prov) => {
          const result = await api.getDealersPaged({
            page: 1,
            pageSize: 1,
            status: 'A',
            province: prov,
            excludeDemo: true,
          })
          return { province: prov, count: result.totalCount }
        })
        const results = await Promise.all(summaryPromises)
        setProvinceSummary(results.filter(r => r.count > 0))
      } catch (err) {
        console.error('Failed to load province summary:', err)
      }
    }
    loadSummary()
  }, [])

  // Fetch dealers when zoomed in
  const fetchVisibleDealers = useCallback(async () => {
    // Don't auto-fetch if showing external results
    if (externalDealers && externalDealers.length > 0) return
    if (zoom < ZOOM_THRESHOLD) {
      setLocatedDealers([])
      return
    }
    const bounds = map.getBounds()
    const fetchId = ++fetchRef.current
    setIsLoadingDealers(true)
    try {
      const result = await api.getDealersPaged({
        page: 1,
        pageSize: 200,
        status: 'A',
        excludeDemo: true,
        province: getProvinceForBounds(bounds),
      })
      if (fetchId !== fetchRef.current) return
      setLocatedDealers(locateDealers(result.items))
    } catch (err) {
      console.error('Failed to load dealers for map:', err)
    } finally {
      if (fetchId === fetchRef.current) setIsLoadingDealers(false)
    }
  }, [map, zoom])

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => {
      if (map.getZoom() >= ZOOM_THRESHOLD) {
        fetchVisibleDealers()
      }
    },
  })

  useEffect(() => {
    if (externalDealers && externalDealers.length > 0) return
    if (zoom >= ZOOM_THRESHOLD) {
      fetchVisibleDealers()
    } else {
      setLocatedDealers([])
    }
  }, [zoom, fetchVisibleDealers, externalDealers])

  // If showing external results, always show individual markers
  if (externalDealers && externalDealers.length > 0) {
    return (
      <>
        {locatedDealers.map(dealer => (
          <Marker
            key={dealer.dealerId}
            position={[dealer.lat, dealer.lng]}
            icon={createDealerIcon()}
            eventHandlers={{
              click: () => onSelectDealer(dealer.dealerId),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{dealer.dbaName}</strong><br />
              {dealer.dealerId} — {dealer.city}, {dealer.provState}
            </Tooltip>
          </Marker>
        ))}
      </>
    )
  }

  // Province cluster markers (show when zoomed out)
  if (zoom < ZOOM_THRESHOLD) {
    return (
      <>
        {provinceSummary.map(({ province, count }) => {
          const coords = PROVINCE_COORDS[province]
          if (!coords) return null
          return (
            <Marker
              key={province}
              position={[coords.lat, coords.lng]}
              icon={createClusterIcon(count, province)}
              eventHandlers={{
                click: () => {
                  map.setView([coords.lat, coords.lng], ZOOM_THRESHOLD + 1)
                },
              }}
            />
          )
        })}
      </>
    )
  }

  // Individual dealer markers at city coordinates
  return (
    <>
      {isLoadingDealers && (
        <div className="map-loading-overlay">Loading dealers...</div>
      )}
      {locatedDealers.map(dealer => (
        <Marker
          key={dealer.dealerId}
          position={[dealer.lat, dealer.lng]}
          icon={createDealerIcon()}
          eventHandlers={{
            click: () => onSelectDealer(dealer.dealerId),
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <strong>{dealer.dbaName}</strong><br />
            {dealer.dealerId} — {dealer.city}, {dealer.provState}
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}

// Determine likely province from map bounds center
function getProvinceForBounds(bounds: L.LatLngBounds): string | undefined {
  const center = bounds.getCenter()
  let closest = ''
  let minDist = Infinity
  for (const [prov, coords] of Object.entries(PROVINCE_COORDS)) {
    const dist = Math.sqrt(
      Math.pow(center.lat - coords.lat, 2) + Math.pow(center.lng - coords.lng, 2)
    )
    if (dist < minDist) {
      minDist = dist
      closest = prov
    }
  }
  return minDist < 10 ? closest : undefined
}

export default function DealersMap({ onSelectDealer, externalDealers }: DealersMapProps) {
  return (
    <MapContainer
      center={[56.0, -96.0]}
      zoom={4}
      className="dealers-leaflet-map"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapContent onSelectDealer={onSelectDealer} externalDealers={externalDealers} />
    </MapContainer>
  )
}
