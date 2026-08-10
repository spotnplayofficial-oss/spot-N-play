import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet + react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to center map on geolocation if coordinates not provided
const MapCenterer = ({ center, setCenter, setAddress }) => {
  const map = useMap();
  useEffect(() => {
    if (!center) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setCenter([lat, lon]);
          map.flyTo([lat, lon], 14);
          fetchAddress(lat, lon, setAddress);
        },
        () => {
          // Default to India Center if geolocation denied
          const defaultCenter = [20.5937, 78.9629];
          setCenter(defaultCenter);
          map.flyTo(defaultCenter, 5);
        }
      );
    } else {
        map.flyTo(center, 14);
    }
  }, [map]);
  return null;
};

// Re-centers the map whenever `target` changes (used by the explicit
// "Use My Location" button, since MapCenterer only runs once on mount).
const FlyToHandler = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 15);
  }, [target, map]);
  return null;
};

// Component to handle clicks on the map to place a pin
const MapClickHandler = ({ setCenter, setAddress }) => {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      setCenter([lat, lon]);
      fetchAddress(lat, lon, setAddress);
    },
  });
  return null;
};

const fetchAddress = async (lat, lon, setAddress) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data && data.display_name) {
      setAddress(data.display_name);
    }
  } catch (err) {
    console.error("Geocoding failed", err);
  }
};

const MapLocationPicker = ({ initialCoordinates, initialAddress, onConfirm, onClose }) => {
  const [center, setCenter] = useState(initialCoordinates && initialCoordinates.length === 2 ? [initialCoordinates[1], initialCoordinates[0]] : null);
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState(null);

  const handleConfirm = () => {
    if (!center) return;
    // Nominatim uses [lon, lat] for geoJSON typically, so we return lon, lat.
    // `address` here is the reverse-geocoded label for the pinned point —
    // it's a hint, not the venue's official address (that's a separate,
    // always-manually-typed field on the parent form).
    onConfirm([center[1], center[0]], address);
  };

  // Explicit "use my location" trigger — separate from the passive
  // on-mount geolocation in MapCenterer, so the owner can re-detect at any
  // time (e.g. after having dragged/clicked the pin somewhere else).
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCenter([lat, lon]);
        setFlyTo([lat, lon]);
        fetchAddress(lat, lon, setAddress);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#060606] border border-black/10 dark:border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col shadow-2xl relative" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/2">
          <div>
            <h3 className="font-bebas text-2xl text-gray-900 dark:text-white tracking-wide">Pin Your Location</h3>
            <p className="text-gray-500 text-xs mt-0.5">Click the map to place the pin — this only sets where you show up on the map</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors">
            ✕
          </button>
        </div>

        <div className="h-[400px] w-full bg-gray-100 dark:bg-gray-900 relative">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="absolute z-[400] top-3 right-3 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/15 shadow-lg rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 hover:border-green-400/40 disabled:opacity-60"
          >
            {locating ? '📡 Locating…' : '📍 Use My Current Location'}
          </button>
          <MapContainer 
            center={center || [20.5937, 78.9629]} 
            zoom={center ? 14 : 5} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {center && <Marker position={center} draggable={false} />}
            <MapCenterer center={center} setCenter={setCenter} setAddress={setAddress} />
            <MapClickHandler setCenter={setCenter} setAddress={setAddress} />
            <FlyToHandler target={flyTo} />
          </MapContainer>
        </div>

        <div className="p-5 bg-white dark:bg-[#060606] flex flex-col gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-semibold">Detected Address (reference only)</label>
            <div className="bg-gray-50 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white min-h-[44px] flex items-center">
              {address ? address : <span className="text-gray-400 italic">Click on the map to detect address...</span>}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This is only a rough label for the pin — it won't overwrite your typed address, since map lookups often miss floor/landmark details. Coordinates{center ? `: ${center[0].toFixed(6)}, ${center[1].toFixed(6)}` : ''}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleConfirm} 
              disabled={!center} 
              className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 text-black font-bold text-sm transition-colors shadow-lg shadow-green-500/20"
            >
              Confirm Pin ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLocationPicker;
