import { useState, useEffect } from 'react';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import MapLocationPicker from '../components/MapLocationPicker';
import SportCourtManager from '../components/SportCourtManager';
import { dataStore } from '../utils/dataStore';
import SearchableSportSelect from '../components/SearchableSportSelect';
import DashboardStatCard from '../components/DashboardStatCard';
import CustomPriceModal from '../components/CustomPriceModal';

const GroundOwnerDashboard = () => {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState([]);
  const [selectedGround, setSelectedGround] = useState(null);
  const [groundBookings, setGroundBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('grounds');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroundId, setEditingGroundId] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const EMPTY_GROUND_FORM = {
    name: '', sport: 'cricket', venueType: 'ground', address: '',
    pricePerHour: '', customPricePerHour: '', pricingPreference: 'normal',
    customPricingTypes: { hourly: true, subscription: true },
    customSubscriptionPricing: { oneMonth: '', threeMonths: '', sixMonths: '', yearly: '' },
    description: '', amenities: [], coordinates: [], isSocial: false, images: [],
  };

  const handleVenueTypeChange = (type) => {
    let updatedSport = groundForm.sport;
    if (type === 'gym') updatedSport = 'gym';
    if (type === 'pool') updatedSport = 'swimming';

    setGroundForm((prev) => ({
      ...prev,
      venueType: type,
      isSocial: type === 'social',
      pricePerHour: type === 'social' ? 0 : prev.pricePerHour,
      sport: updatedSport,
    }));
  };
  const [groundForm, setGroundForm] = useState(EMPTY_GROUND_FORM);
  const [amenityInput, setAmenityInput] = useState('');
  const PRESET_AMENITIES = ['Parking', 'Washroom', 'Drinking Water', 'Floodlights', 'Seating', 'Changing Room', 'First Aid', 'Equipment Rental'];

  // Custom Pricing Modal & Toggle State
  const [customPriceModalOpen, setCustomPriceModalOpen] = useState(false);
  const [selectedPricingGround, setSelectedPricingGround] = useState(null);
  const [updatingPricing, setUpdatingPricing] = useState(false);

  // Toggle Pricing Preference (Normal vs Custom)
  const handleTogglePricingPreference = async (ground, newPref) => {
    const targetPref = newPref || (ground.pricingPreference === 'custom' ? 'normal' : 'custom');
    if (targetPref === 'custom' && (!ground.customPricePerHour || ground.customPricePerHour <= 0)) {
      setSelectedPricingGround(ground);
      setCustomPriceModalOpen(true);
      return;
    }
    setUpdatingPricing(true);
    try {
      const { data } = await API.patch(`/grounds/${ground._id}/pricing`, {
        pricingPreference: targetPref,
      });
      showMessage(`Pricing preference set to ${targetPref === 'custom' ? 'Custom Price' : 'Normal Price'}! 🏷️`);
      setGrounds((prev) => prev.map((g) => (g._id === ground._id ? { ...g, ...data.ground } : g)));
      if (selectedGround?._id === ground._id) {
        setSelectedGround((prev) => ({ ...prev, ...data.ground }));
      }
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to update pricing preference', 'error');
    } finally {
      setUpdatingPricing(false);
    }
  };

  const handleOpenCustomPriceModal = (ground) => {
    setSelectedPricingGround(ground);
    setCustomPriceModalOpen(true);
  };

  const handlePricingSaveSuccess = (updatedGround) => {
    setGrounds((prev) => prev.map((g) => (g._id === updatedGround._id ? { ...g, ...updatedGround } : g)));
    if (selectedGround?._id === updatedGround._id) {
      setSelectedGround((prev) => ({ ...prev, ...updatedGround }));
    }
    setSelectedPricingGround(updatedGround);
  };

  // Leads (trial claims / interest signals) for whichever ground is
  // selected — only fetched/shown when that ground isn't 'live' yet, since
  // admin can now put ANY venue type into trial/interest mode, not just
  // gym/pool.
  const [venueLeads, setVenueLeads] = useState([]);
  const [checkinTicket, setCheckinTicket] = useState('');
  const [checkinBusy, setCheckinBusy] = useState(false);

  const fetchVenueLeads = async () => {
    try {
      const { data } = await API.get('/venues/my/leads');
      setVenueLeads(data);
    } catch {
      setVenueLeads([]);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedGround || !checkinTicket.trim()) return;
    setCheckinBusy(true);
    try {
      const { data } = await API.patch(`/venues/${selectedGround._id}/checkin`, { ticketId: checkinTicket.trim() });
      showMessage(data.message);
      setCheckinTicket('');
      fetchVenueLeads();
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Check-in failed', 'error');
    } finally {
      setCheckinBusy(false);
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
      .font-bebas { font-family: 'Bebas Neue', cursive !important; }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shimmer {
        from { background-position: -200% center; }
        to { background-position: 200% center; }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(16px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

      .animate-fadeUp-1 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards; opacity: 0; }
      .animate-fadeUp-2 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s forwards; opacity: 0; }
      .animate-fadeUp-3 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; opacity: 0; }
      .animate-fadeUp-4 { animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s forwards; opacity: 0; }
      .animate-cardIn { animation: cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      .animate-slideIn { animation: slideIn 0.3s ease forwards; }
      .animate-spin { animation: spin 1s linear infinite; }

      .shimmer-text {
        background: linear-gradient(90deg, #4ade80, #86efac, #4ade80);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: shimmer 3s linear infinite;
      }

      .grid-dots {
        background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 28px 28px;
      }

      .glass-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 24px;
        padding: 24px;
      }

      .stat-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .stat-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .stat-card:hover::before { opacity: 1; }
      .stat-card:hover { border-color: rgba(74,222,128,0.15); transform: translateY(-3px); }
      .stat-green::before { background: linear-gradient(90deg, transparent, #4ade80, transparent); }
      .stat-blue::before { background: linear-gradient(90deg, transparent, #60a5fa, transparent); }
      .stat-orange::before { background: linear-gradient(90deg, transparent, #fb923c, transparent); }
      .stat-purple::before { background: linear-gradient(90deg, transparent, #a78bfa, transparent); }

      .tab-btn {
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        white-space: nowrap;
        cursor: pointer;
      }
      .tab-active {
        background: rgba(74,222,128,0.12);
        color: #4ade80;
        border: 1px solid rgba(74,222,128,0.2);
      }
      .tab-inactive {
        background: transparent;
        color: #6b7280;
        border: 1px solid transparent;
      }
      .tab-inactive:hover { color: #9ca3af; }

      .input-field {
        width: 100%;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 12px 14px;
        color: inherit;
        font-size: 14px;
        outline: none;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        box-sizing: border-box;
      }
      .input-field:focus {
        border-color: rgba(74,222,128,0.4);
        box-shadow: 0 0 0 3px rgba(74,222,128,0.06);
      }
      .input-field::placeholder { color: #6b7280; opacity: 0.7; }
      .input-field option { background: #111; }

      .label {
        font-size: 11px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 6px;
        display: block;
      }

      .btn-primary {
        background: linear-gradient(135deg, #4ade80, #22c55e);
        color: black;
        font-weight: 700;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 14px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        border: none;
      }
      .btn-primary::before {
        content: '';
        position: absolute;
        top: 0; left: -100%;
        width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
        transition: left 0.4s ease;
      }
      .btn-primary:hover::before { left: 100%; }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
      .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

      .btn-secondary {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: #9ca3af;
        font-weight: 500;
        border-radius: 12px;
        padding: 10px 18px;
        font-size: 13px;
        transition: all 0.3s ease;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .btn-secondary:hover {
        background: rgba(255,255,255,0.06);
        border-color: #9ca3af;
        color: white;
      }

      .btn-danger {
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.15);
        color: rgba(239,68,68,0.7);
        font-weight: 600;
        border-radius: 12px;
        padding: 10px 18px;
        font-size: 13px;
        transition: all 0.2s ease;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
      }
      .btn-danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }

      .ground-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 20px;
        padding: 20px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        cursor: pointer;
      }
      .ground-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .ground-card:hover::before { opacity: 1; }
      .ground-card:hover { border-color: rgba(74,222,128,0.15); }
      .ground-card.selected {
        border-color: rgba(74,222,128,0.3);
        background: rgba(74,222,128,0.03);
      }
      .ground-card.selected::before { opacity: 1; }

      .booking-card {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 14px;
        padding: 14px;
        transition: all 0.2s ease;
      }
      .booking-card:hover { border-color: rgba(74,222,128,0.1); }

      .status-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 100px;
      }

      .slot-pill {
        background: rgba(74,222,128,0.06);
        border: 1px solid rgba(74,222,128,0.12);
        color: #6b7280;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 100px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .slot-pill.booked {
        background: rgba(239,68,68,0.06);
        border-color: rgba(239,68,68,0.12);
        color: rgba(239,68,68,0.6);
      }

      .progress-bar {
        height: 4px;
        background: rgba(255,255,255,0.06);
        border-radius: 100px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4ade80, #22c55e);
        border-radius: 100px;
        transition: width 0.5s ease;
      }

      .revenue-card {
        background: rgba(74,222,128,0.04);
        border: 1px solid rgba(74,222,128,0.1);
        border-radius: 16px;
        padding: 16px;
      }

      /* Light mode overrides */
      @media (prefers-color-scheme: light) {
        .input-field { color: #111; }
        .input-field option { background: #fff; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const cached = dataStore.get('dashboard:owner:grounds');
    if (cached.status === 'ready') {
      setGrounds(cached.data);
      return;
    }
    fetchGrounds();
  }, []);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (groundForm.images.length + files.length > 6) {
      showMessage('Up to 6 images total', 'error');
      return;
    }
    setUploadingImages(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const { data } = await API.post('/upload/venue', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGroundForm((f) => ({ ...f, images: [...f.images, ...data.fileUrls] }));
    } catch (err) {
      showMessage(err?.response?.data?.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = (url) => {
    setGroundForm((f) => ({ ...f, images: f.images.filter((i) => i !== url) }));
  };

  const fetchGrounds = async () => {
    try {
      const { data } = await API.get('/grounds/my');
      setGrounds(data);
      dataStore.set('dashboard:owner:grounds', data);
      // If a ground was selected, refresh it from fresh data
      if (selectedGround) {
        const refreshed = data.find(g => g._id === selectedGround._id);
        if (refreshed) setSelectedGround(refreshed);
      }
    } catch (err) {
      console.error('fetchGrounds error:', err);
      setGrounds([]);
    }
  };

  const fetchGroundBookings = async (groundId) => {
    try {
      const { data } = await API.get(`/bookings/grounds/${groundId}`);
      setGroundBookings(data);
    } catch { setGroundBookings([]); }
  };

  const handleSelectGround = (ground) => {
    if (selectedGround?._id === ground._id) {
      setSelectedGround(null);
      setGroundBookings([]);
    } else {
      setSelectedGround(ground);
      if (ground.venueMode === 'live' || !ground.venueMode) {
        fetchGroundBookings(ground._id);
        setActiveTab('bookings');
      } else {
        fetchVenueLeads();
        setActiveTab('grounds');
      }
    }
  };

  const handleAddAmenity = (val) => {
    const trimmed = val.trim();
    if (trimmed && !groundForm.amenities.includes(trimmed)) {
      setGroundForm({ ...groundForm, amenities: [...groundForm.amenities, trimmed] });
    }
    setAmenityInput('');
  };

  const handleRemoveAmenity = (val) => {
    setGroundForm({ ...groundForm, amenities: groundForm.amenities.filter(a => a !== val) });
  };

  const handleCreateGround = async (e) => {
    e.preventDefault();

    if (!groundForm.coordinates || groundForm.coordinates.length < 2 || isNaN(groundForm.coordinates[0]) || isNaN(groundForm.coordinates[1])) {
      showMessage('Please pin your venue location on the map 📍', 'error');
      setShowMapPicker(true);
      return;
    }

    setLoading(true);
    try {
      const isSocialVenue = groundForm.venueType === 'social' || groundForm.isSocial;
      const isCustomPricing = groundForm.pricingPreference === 'custom';
      const customPrice = Math.max(0, Number(groundForm.customPricePerHour) || 0);
      const normalPrice = isSocialVenue ? 0 : (Number(groundForm.pricePerHour) || (isCustomPricing ? customPrice : 0));

      const payload = {
        name: groundForm.name,
        sport: groundForm.sport,
        venueType: groundForm.venueType || (isSocialVenue ? 'social' : 'ground'),
        address: groundForm.address,
        pricePerHour: normalPrice,
        customPricePerHour: isCustomPricing && customPrice > 0 ? customPrice : (Number(groundForm.customPricePerHour) || 0),
        pricingPreference: groundForm.pricingPreference || 'normal',
        customPricingTypes: groundForm.customPricingTypes || { hourly: true, subscription: true },
        customSubscriptionPricing: {
          oneMonth: Math.max(0, Number(groundForm.customSubscriptionPricing?.oneMonth) || (customPrice > 0 ? Math.round(customPrice * 10) : 0)),
          threeMonths: Math.max(0, Number(groundForm.customSubscriptionPricing?.threeMonths) || (customPrice > 0 ? Math.round(customPrice * 27) : 0)),
          sixMonths: Math.max(0, Number(groundForm.customSubscriptionPricing?.sixMonths) || (customPrice > 0 ? Math.round(customPrice * 50) : 0)),
          yearly: Math.max(0, Number(groundForm.customSubscriptionPricing?.yearly) || (customPrice > 0 ? Math.round(customPrice * 90) : 0)),
          customMonths: [],
        },
        description: groundForm.description?.trim() || '',
        amenities: groundForm.amenities,
        longitude: groundForm.coordinates[0],
        latitude: groundForm.coordinates[1],
        isSocial: isSocialVenue,
        images: groundForm.images,
      };

      if (isEditing) {
        const { data } = await API.put(`/grounds/${editingGroundId}`, payload);
        showMessage('Ground updated successfully! 🏟️');
        setSelectedGround(data);
      } else {
        await API.post('/grounds', payload);
        showMessage('Ground created successfully! 🏟️');
      }

      setGroundForm(EMPTY_GROUND_FORM);
      setIsEditing(false);
      setEditingGroundId(null);
      await fetchGrounds();
      setActiveTab('grounds');
    } catch (err) {
      showMessage(err.response?.data?.message || (isEditing ? 'Failed to update ground' : 'Failed to create ground'), 'error');
    } finally { setLoading(false); }
  };

  const handleEditGround = (ground) => {
    const isSocialVenue = ground.isSocial || ground.venueType === 'social';
    setGroundForm({
      name: ground.name || '',
      sport: ground.sport || 'cricket',
      venueType: ground.venueType || (isSocialVenue ? 'social' : 'ground'),
      address: ground.address || '',
      pricePerHour: ground.pricePerHour ?? '',
      customPricePerHour: ground.customPricePerHour ?? '',
      pricingPreference: ground.pricingPreference || 'normal',
      customPricingTypes: ground.customPricingTypes || { hourly: true, subscription: true },
      customSubscriptionPricing: ground.customSubscriptionPricing ? {
        oneMonth: ground.customSubscriptionPricing.oneMonth || '',
        threeMonths: ground.customSubscriptionPricing.threeMonths || '',
        sixMonths: ground.customSubscriptionPricing.sixMonths || '',
        yearly: ground.customSubscriptionPricing.yearly || '',
      } : {
        oneMonth: '',
        threeMonths: '',
        sixMonths: '',
        yearly: '',
      },
      description: ground.description || '',
      amenities: ground.amenities || [],
      coordinates: ground.location?.coordinates ? [ground.location.coordinates[0], ground.location.coordinates[1]] : [],
      isSocial: isSocialVenue,
      images: ground.images || [],
    });
    setEditingGroundId(ground._id);
    setIsEditing(true);
    setActiveTab('create');
  };

  const handleDeleteGround = async (groundId) => {
    if (!window.confirm('Delete this ground permanently?')) return;
    try {
      await API.delete(`/grounds/${groundId}`);
      showMessage('Ground deleted');
      setSelectedGround(null);
      setGroundBookings([]);
      fetchGrounds();
    } catch { showMessage('Failed to delete', 'error'); }
  };

  // Called by SportCourtManager after adding/removing a sport, court, or slot — refresh ground data
  const handleSlotRefresh = async () => {
    await fetchGrounds();
  };

    const [togglingRequests, setTogglingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState('all');

  const handleToggleBookingRequests = async (ground) => {
    if (!ground?._id) return;
    if (ground.venueType === 'pool') {
      showMessage('Booking requests are not available for swimming pool venues', 'error');
      return;
    }
    setTogglingRequests(true);
    try {
      const nextVal = !ground.bookingRequestsEnabled;
      const { data } = await API.patch(`/grounds/${ground._id}/booking-requests-toggle`, {
        bookingRequestsEnabled: nextVal,
      });
      showMessage(data.message || (nextVal ? 'Booking requests turned ON (6 Stages)' : 'Booking requests turned OFF (5 Stages Normal)'));
      setSelectedGround((prev) => prev ? { ...prev, bookingRequestsEnabled: data.bookingRequestsEnabled } : prev);
      setGrounds((prev) => prev.map((g) => g._id === ground._id ? { ...g, bookingRequestsEnabled: data.bookingRequestsEnabled } : g));
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to toggle booking requests', 'error');
    } finally {
      setTogglingRequests(false);
    }
  };

  const [respondingBookingId, setRespondingBookingId] = useState(null);
  const activeGround = selectedGround || grounds.find((g) => g.venueType !== 'pool') || grounds[0] || null;

  // Auto-fetch bookings when activeGround changes or when opening requests tab
  useEffect(() => {
    if (activeGround?._id && (activeTab === 'requests' || activeTab === 'bookings' || activeTab === 'grounds')) {
      if (activeGround.venueType !== 'pool' && (activeGround.venueMode === 'live' || !activeGround.venueMode)) {
        fetchGroundBookings(activeGround._id);
      }
    }
  }, [activeGround?._id, activeTab]);
  const handleRespondBookingRequest = async (booking, action) => {
    const groundId = selectedGround?._id || booking.ground?._id || booking.ground;
    if (!groundId) return;
    setRespondingBookingId(booking._id);
    try {
      const { data } = await API.patch(`/xl/${groundId}/booking-requests/${booking._id}/respond`, { action });
      showMessage(data.message || (action === 'accept' ? 'Booking request accepted! ✅' : 'Booking request declined.'));
      if (selectedGround?._id) {
        fetchGroundBookings(selectedGround._id);
      }
    } catch (err) {
      showMessage(err.response?.data?.message || `Failed to ${action} booking request`, 'error');
    } finally {
      setRespondingBookingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending_approval: { label: 'Pending Approval', color: 'bg-purple-400/10 text-purple-400 border border-purple-400/20' },
      advance_pending: { label: 'Advance Pending', color: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' },
      advance_paid: { label: 'Advance Paid', color: 'bg-blue-400/10 text-blue-400 border border-blue-400/20' },
      completed: { label: 'Completed 🎉', color: 'bg-green-400/10 text-green-400 border border-green-400/20' },
      refunded: { label: 'Refunded', color: 'bg-gray-400/10 text-gray-400 border border-gray-400/20' },
      cancelled: { label: 'Cancelled', color: 'bg-red-400/10 text-red-400 border border-red-400/20' },
    };
    return map[status] || { label: status, color: 'bg-white/10 text-white' };
  };

  const getSportEmoji = (sport) => {
    const map = { football: '⚽', cricket: '🏏', basketball: '🏀', tennis: '🎾', badminton: '🏸', volleyball: '🏐', boxing: '🥊', hockey: '🏑', kabaddi: '🤼', Kabbadi: '🤼', 'kho kho': '🏃', pickleball: '🏓', 'table tennis': '🏓', squash: '🎾', handball: '🤾', futsal: '⚽', rugby: '🏉', athletics: '🏃', wrestling: '🤼', weightlifting: '🏋️', yoga: '🧘', skating: '⛸️', chess: '♟️', carrom: '🎯', archery: '🏹', shooting: '🎯', cycling: '🚴', 'box cricket': '🏏', 'box football': '⚽', gym: '🏋️', swimming: '🏊', esports: '🎮' };
    return map[sport] || map[sport?.toLowerCase?.()] || '🏆';
  };

  const totalRevenue = grounds.reduce((sum, g) => {
    return sum + ((g.slots?.filter((s) => s.isBooked)?.length || 0) * (g.pricePerHour || 0));
  }, 0);
  const totalSlots = grounds.reduce((sum, g) => sum + (g.slots?.length || 0), 0);
  const bookedSlots = grounds.reduce((sum, g) => sum + (g.slots?.filter((s) => s.isBooked)?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="fixed inset-0 grid-dots pointer-events-none opacity-30" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-green-400/20 to-transparent pointer-events-none" />

      <Navbar />

      {showMapPicker && (
        <MapLocationPicker
          initialCoordinates={groundForm.coordinates}
          initialAddress={groundForm.address}
          onConfirm={(coords, addr) => {
            // Coordinates always update; the manually-typed address is only
            // prefilled from the map's detected label if it's still empty —
            // it never overwrites something the owner already typed, since
            // map lookups often miss floor/landmark detail.
            setGroundForm((f) => ({ ...f, coordinates: coords, address: f.address ? f.address : addr }));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {message && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slideIn px-5 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 shadow-2xl whitespace-nowrap ${
          messageType === 'success'
            ? 'bg-green-400/15 border border-green-400/25 text-green-400'
            : 'bg-red-400/15 border border-red-400/25 text-red-400'
        }`}>
          {messageType === 'success' ? '✅' : '⚠️'} {message}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="animate-fadeUp-1 flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-green-400 text-xs uppercase tracking-[0.3em] mb-1">Ground Owner</p>
            <h1 className="font-bebas text-5xl tracking-wide shimmer-text">
              {user?.name?.split(' ')[0]}'S DASHBOARD
            </h1>
            <p className="text-gray-600 text-sm mt-1">Manage your grounds and track bookings 🏟️</p>
          </div>
          <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden border border-black/10 dark:border-white/10 hover:border-green-400/30 transition-colors flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-green-400/10 flex items-center justify-center text-green-400 font-bold text-sm">
                {user?.name?.charAt(0)}
              </div>
            )}
          </Link>
        </div>

        {/* Stats */}
        <div className="animate-fadeUp-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <DashboardStatCard
            icon="calendar"
            label="My Grounds"
            value={grounds.length}
            subtitle="Registered venues"
            color="green"
            onClick={() => setActiveTab('grounds')}
          />
          <DashboardStatCard
            icon="calendar"
            label="Total Slots"
            value={totalSlots}
            subtitle="Configured slots"
            color="blue"
            onClick={() => setActiveTab('grounds')}
          />
          <DashboardStatCard
            icon="completed"
            label="Slots Booked"
            value={bookedSlots}
            subtitle="Player reservations"
            color="orange"
            onClick={() => setActiveTab('bookings')}
          />
          <DashboardStatCard
            icon="money"
            label="Est. Revenue"
            value={`₹${totalRevenue.toLocaleString('en-IN')}`}
            subtitle="From active booked slots"
            color="purple"
            onClick={() => setActiveTab('bookings')}
          />
        </div>

        <div className="animate-fadeUp-3 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — My Grounds List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bebas text-2xl tracking-wide text-gray-900 dark:text-white">MY GROUNDS</h2>
              <button onClick={() => { setIsEditing(false); setEditingGroundId(null); setGroundForm(EMPTY_GROUND_FORM); setActiveTab('create'); }} className="btn-secondary text-xs py-2 px-3">
                + New Ground
              </button>
            </div>

            {grounds.length === 0 ? (
              <div className="glass-card text-center py-10">
                <span className="text-4xl block mb-3">🏟️</span>
                <p className="text-gray-500 text-sm">No grounds yet</p>
                <button onClick={() => setActiveTab('create')} className="btn-primary mt-4 text-sm px-6 py-2.5">
                  Create First Ground
                </button>
              </div>
            ) : grounds.map((ground, i) => {
              const available = ground.slots?.filter(s => !s.isBooked).length || 0;
              const booked = ground.slots?.filter(s => s.isBooked).length || 0;
              const total = ground.slots?.length || 0;
              const fillPct = total > 0 ? (booked / total) * 100 : 0;
              const isSelected = selectedGround?._id === ground._id;

              return (
                <div
                  key={ground._id}
                  onClick={() => handleSelectGround(ground)}
                  className={`ground-card animate-cardIn ${isSelected ? 'selected' : ''}`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                      {getSportEmoji(ground.sport)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-semibold text-sm truncate flex items-center gap-2">
                        {ground.name}
                        {ground.isSocial && <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold tracking-widest leading-none">SOCIAL</span>}
                        {ground.venueMode === 'trial' && <span className="text-[10px] bg-orange-400/15 border border-orange-400/25 text-orange-400 px-1.5 py-0.5 rounded-full font-bold leading-none">TRIAL</span>}
                        {ground.venueMode === 'interest' && <span className="text-[10px] bg-blue-400/15 border border-blue-400/25 text-blue-400 px-1.5 py-0.5 rounded-full font-bold leading-none">INTEREST</span>}
                      </p>
                      <p className="text-gray-600 text-xs truncate">📍 {ground.address}</p>
                    </div>
                    {isSelected && (
                      <span className="text-green-400 text-xs font-semibold flex-shrink-0">✓</span>
                    )}
                  </div>

                  {ground.venueMode && ground.venueMode !== 'live' ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {ground.venueMode === 'trial' ? `🎟️ ${ground.trialLeadCount ?? 0} trial claim(s)` : `👀 ${ground.interestLeadCount ?? 0} interested`}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs mb-2 items-center">
                        <span className="text-gray-600">{booked}/{total} booked</span>
                        <span className="font-semibold flex items-center gap-1">
                          {ground.pricingPreference === 'custom' && ground.customPricePerHour > 0 ? (
                            <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[11px] font-bold">
                              ⚡ ₹{ground.customPricePerHour}/hr <span className="text-[9px] opacity-80 font-normal">Custom</span>
                            </span>
                          ) : ground.isSocial ? (
                            <span className="text-emerald-400">Free</span>
                          ) : (
                            <span className="text-emerald-400">₹{ground.pricePerHour}/hr <span className="text-[10px] opacity-70 font-normal">Normal</span></span>
                          )}
                        </span>
                      </div>

                      <div className="progress-bar mb-3">
                        <div className="progress-fill" style={{ width: `${fillPct}%` }} />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 flex-wrap items-center">
                    {ground.approvalStatus === 'pending' && (
                      <span className="text-[10px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-semibold">⏳ Pending Approval</span>
                    )}
                    {ground.approvalStatus === 'rejected' && (
                      <span className="text-[10px] bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-0.5 rounded-full font-semibold">❌ Rejected</span>
                    )}
                    {ground.approvalStatus === 'approved' && (
                      <>
                        <span className="slot-pill">✅ {available} free</span>
                        <span className="slot-pill booked">🔴 {booked} booked</span>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditGround(ground); }}
                      className="ml-auto text-xs bg-blue-400/10 text-blue-400 border border-blue-400/20 px-3 py-1 rounded-full hover:bg-blue-400/20 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — Tabs Panel */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'grounds', label: '📋 Overview' },
                {
                  id: 'requests',
                  label: `📨 Booking Requests${
                    groundBookings.filter((b) => b.status === 'pending_approval').length > 0
                      ? ` (${groundBookings.filter((b) => b.status === 'pending_approval').length})`
                      : ''
                  }`,
                },
                ...(!selectedGround || selectedGround.venueMode === 'live' || !selectedGround.venueMode ? [
                  { id: 'bookings', label: `📅 Bookings${selectedGround ? ` (${groundBookings.length})` : ''}` },
                  { id: 'slots', label: '🗓️ Manage Slots' },
                ] : [
                  { id: 'leads', label: `${selectedGround.venueMode === 'interest' ? '👀' : '🎟️'} Leads (${venueLeads.filter(l => l.venue?._id === selectedGround._id).length})` },
                ]),
                { id: 'create', label: isEditing ? '✏️ Edit Ground' : '🏟️ New Ground' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'grounds' && (
              <div className="flex flex-col gap-4">
                {selectedGround ? (
                  <>
                    <div className="glass-card animate-cardIn">
                      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                        <div>
                          <h3 className="font-bebas text-2xl text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {selectedGround.name}
                            {selectedGround.isSocial && <span className="bg-yellow-400 text-black text-xs px-2 py-0.5 rounded font-bold tracking-wider">SOCIAL</span>}
                            {selectedGround.venueMode === 'trial' && <span className="bg-orange-400/15 border border-orange-400/25 text-orange-400 text-xs px-2 py-0.5 rounded-full font-bold">🎟️ TRIAL</span>}
                            {selectedGround.venueMode === 'interest' && <span className="bg-blue-400/15 border border-blue-400/25 text-blue-400 text-xs px-2 py-0.5 rounded-full font-bold">👀 INTEREST ONLY</span>}
                          </h3>
                          <p className="text-gray-500 text-sm">📍 {selectedGround.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditGround(selectedGround)} className="btn-secondary text-xs py-2">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteGround(selectedGround._id)} className="btn-danger text-xs py-2">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      <div className="revenue-card mb-4">
                        {selectedGround.approvalStatus !== 'approved' && (
                          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                            selectedGround.approvalStatus === 'pending'
                              ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400'
                              : 'bg-red-400/10 border border-red-400/20 text-red-400'
                          }`}>
                            {selectedGround.approvalStatus === 'pending' ? '⏳ Awaiting admin approval — ground is not visible to players yet' : `❌ Rejected${selectedGround.rejectionReason ? `: ${selectedGround.rejectionReason}` : ''}`}
                          </div>
                        )}
                        {selectedGround.approvalStatus === 'approved' && selectedGround.venueMode !== 'live' && (
                          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${selectedGround.venueMode === 'trial' ? 'bg-orange-400/10 border border-orange-400/20 text-orange-400' : 'bg-blue-400/10 border border-blue-400/20 text-blue-400'}`}>
                            {selectedGround.venueMode === 'trial'
                              ? '🎟️ This ground is in trial mode — players claim a 2-day free trial instead of booking real slots. Check the Leads tab.'
                              : '👀 This ground is in interest-only mode — players just tell us they\'d book here. Check the Leads tab. Real booking opens once admin sets it live.'}
                          </div>
                        )}
                        {/* ── VENUE OWNER BOOKING REQUESTS CONTROL ── */}
                        {selectedGround.venueType !== 'pool' && (
                          <div className="p-4 rounded-xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 mb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500 text-white uppercase tracking-wider">
                                    📨 Booking Requests
                                  </span>
                                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                    {selectedGround.bookingRequestsEnabled ? (
                                      <span className="text-purple-400 font-bold">⚡ Active (6 Stages in User Portal)</span>
                                    ) : (
                                      <span className="text-gray-400">Normal Direct Payment (5 Stages in User Portal)</span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500">
                                  {selectedGround.bookingRequestsEnabled
                                    ? 'Users send requests to book (Stage 5) and wait for your confirmation before paying (Stage 6).'
                                    : 'Normal direct payment active. Users book and pay directly in 5 stages.'}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  disabled={togglingRequests}
                                  onClick={() => handleToggleBookingRequests(selectedGround)}
                                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                                    selectedGround.bookingRequestsEnabled
                                      ? 'bg-purple-500 hover:bg-purple-400 text-white'
                                      : 'bg-black/20 dark:bg-white/10 hover:bg-black/30 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {togglingRequests ? 'Updating…' : selectedGround.bookingRequestsEnabled ? '✓ Requests ON' : 'Turn ON Requests'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('requests')}
                                  className="px-3.5 py-1.5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 text-xs font-semibold text-purple-400 transition-all flex items-center gap-1.5"
                                >
                                  <span>View Requests</span>
                                  {groundBookings.filter((b) => b.status === 'pending_approval').length > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                                      {groundBookings.filter((b) => b.status === 'pending_approval').length}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── VENUE OWNER PRICING CONTROLS (TOGGLE & CUSTOM PRICE BUTTON) ── */}
                        <div className="p-4 rounded-xl bg-black/10 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400 text-black uppercase tracking-wider">
                                  👑 Venue Owner Pricing
                                </span>
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                  {selectedGround.pricingPreference === 'custom' ? (
                                    <span className="text-amber-400">⚡ Custom Price Active</span>
                                  ) : (
                                    <span className="text-emerald-400">Standard Normal Price Active</span>
                                  )}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500">
                                Toggle your pricing preference or set a custom rate. Players will book at your selected active price.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Toggle Button: Normal Price vs Custom Price */}
                              <div className="flex items-center p-1 bg-black/20 dark:bg-black/40 rounded-xl border border-black/10 dark:border-white/10 text-xs">
                                <button
                                  type="button"
                                  disabled={updatingPricing}
                                  onClick={() => handleTogglePricingPreference(selectedGround, 'normal')}
                                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    (selectedGround.pricingPreference || 'normal') === 'normal'
                                      ? 'bg-emerald-500 text-black shadow-md'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  Normal Price
                                </button>
                                <button
                                  type="button"
                                  disabled={updatingPricing}
                                  onClick={() => handleTogglePricingPreference(selectedGround, 'custom')}
                                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                    selectedGround.pricingPreference === 'custom'
                                      ? 'bg-amber-400 text-black shadow-md'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  Custom Price
                                </button>
                              </div>

                              {/* Button named Custom Price */}
                              <button
                                type="button"
                                onClick={() => handleOpenCustomPriceModal(selectedGround)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                              >
                                <span>⚡ Custom Price</span>
                                {selectedGround.customPricePerHour > 0 && (
                                  <span className="text-[10px] bg-black/20 text-black px-1.5 py-0.2 rounded font-black">
                                    ₹{selectedGround.customPricePerHour}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Revenue Breakdown</p>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Pricing Mode</span>
                          <span className="text-gray-900 dark:text-white font-semibold flex items-center gap-1.5">
                            {selectedGround.pricingPreference === 'custom' ? (
                              <span className="text-amber-400 font-bold">Custom (₹{selectedGround.customPricePerHour || 0}/hr)</span>
                            ) : selectedGround.isSocial ? (
                              'Free (Social)'
                            ) : (
                              `Normal (₹${selectedGround.pricePerHour || 0}/hr)`
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Slots Booked</span>
                          <span className="text-gray-900 dark:text-white font-semibold">
                            {selectedGround.slots?.filter(s => s.isBooked).length || 0}
                          </span>
                        </div>
                        <div className="w-full h-px bg-black/5 dark:bg-white/5 my-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Est. Revenue</span>
                          <span className="text-green-400 font-bold">
                            {selectedGround.isSocial && selectedGround.pricingPreference !== 'custom'
                              ? '—'
                              : `₹${(
                                  (selectedGround.slots?.filter(s => s.isBooked).length || 0) *
                                  (selectedGround.pricingPreference === 'custom' && selectedGround.customPricePerHour > 0
                                    ? selectedGround.customPricePerHour
                                    : (selectedGround.pricePerHour || 0))
                                ).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </div>

                      {selectedGround.amenities?.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Amenities</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedGround.amenities.map((a, i) => (
                              <span key={i} className="text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-500 px-3 py-1 rounded-full">✓ {a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="glass-card animate-cardIn">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-600 uppercase tracking-wider">All Slots ({selectedGround.slots?.length || 0})</p>
                        <button onClick={() => setActiveTab('slots')} className="text-xs text-green-400 hover:underline">
                          Manage Slots →
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {!selectedGround.slots?.length ? (
                          <p className="text-gray-600 text-sm text-center py-4">No slots added yet</p>
                        ) : selectedGround.slots
                            .slice()
                            .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                            .map((slot, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${slot.isBooked ? 'bg-red-400/5 border border-red-400/10' : 'bg-green-400/5 border border-green-400/10'}`}>
                            <span className="text-gray-600 dark:text-gray-400">📅 {slot.date} · {slot.startTime} — {slot.endTime}</span>
                            <span className={slot.isBooked ? 'text-red-400' : 'text-green-400'}>
                              {slot.isBooked ? '🔴 Booked' : '🟢 Free'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass-card text-center py-16 animate-cardIn">
                    <span className="text-5xl block mb-4">👈</span>
                    <p className="text-gray-500">Select a ground from the left to view details</p>
                  </div>
                )}
              </div>
            )}

            {/* LEADS TAB — trial claims / interest signals, only relevant while
                this ground isn't live yet (any venue type can be put into
                trial/interest mode now, not just gym/pool) */}
            {activeTab === 'leads' && selectedGround && (
              <div className="glass-card animate-cardIn">
                <h3 className="font-bebas text-xl text-gray-900 dark:text-white mb-4">
                  {selectedGround.venueMode === 'interest' ? '👀 INTERESTED PLAYERS' : '🎟️ TRIAL LEADS'} — {selectedGround.name}
                </h3>

                {selectedGround.venueMode === 'trial' && (
                  <div className="rounded-2xl border border-black/8 dark:border-white/8 p-4 mb-4 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={checkinTicket}
                      onChange={(e) => setCheckinTicket(e.target.value)}
                      placeholder="Enter ticket ID to check someone in (e.g. SPT-XXXXXXXX)"
                      className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-400/50 uppercase text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleCheckIn}
                      disabled={checkinBusy || !checkinTicket.trim()}
                      className="bg-gradient-to-r from-green-400 to-green-600 text-black font-bold text-sm rounded-xl px-5 py-2.5 disabled:opacity-50 whitespace-nowrap"
                    >
                      {checkinBusy ? 'Checking…' : 'Check In'}
                    </button>
                  </div>
                )}
                {selectedGround.venueMode === 'interest' && (
                  <p className="text-gray-500 text-xs mb-4">
                    These are players who opened this ground's page while it's in interest-only mode — no ticket or check-in involved, just a signal they'd book here.
                  </p>
                )}

                {(() => {
                  const groundLeads = venueLeads.filter((l) => l.venue?._id === selectedGround._id);
                  if (groundLeads.length === 0) {
                    return (
                      <div className="text-center py-16 text-gray-400">
                        <span className="text-4xl">{selectedGround.venueMode === 'interest' ? '👀' : '🎟️'}</span>
                        <p className="text-sm mt-2">No {selectedGround.venueMode === 'interest' ? 'interest signals' : 'trial leads'} yet</p>
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-2xl border border-black/8 dark:border-white/8 overflow-hidden">
                      {groundLeads.map((lead) => (
                        <div key={lead._id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5 last:border-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={lead.user?.avatar || '/favicon.svg'} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lead.user?.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {lead.user?.phone || lead.user?.email}{lead.type === 'trial' ? ` · ${lead.ticketId}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                            lead.status === 'checked_in' ? 'bg-green-400/10 text-green-500 dark:text-green-400 border border-green-400/20'
                            : lead.status === 'expired' ? 'bg-gray-400/10 text-gray-500 border border-gray-400/20'
                            : 'bg-yellow-400/10 text-yellow-500 dark:text-yellow-400 border border-yellow-400/20'
                          }`}>
                            {lead.status === 'checked_in' ? '✅ Checked In' : lead.status === 'expired' ? 'Expired' : lead.type === 'interest' ? '👀 Interested' : '🎟️ Interested'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* BOOKING REQUESTS TAB */}
            {activeTab === 'requests' && (() => {
              if (grounds.length === 0) {
                return (
                  <div className="glass-card animate-cardIn text-center py-12">
                    <span className="text-4xl block mb-3">🏟️</span>
                    <h3 className="font-bebas text-2xl text-gray-900 dark:text-white mb-2">No Grounds Registered Yet</h3>
                    <p className="text-gray-500 text-sm mb-4">You need to register a ground before managing booking requests.</p>
                    <button onClick={() => setActiveTab('create')} className="btn-primary text-sm px-5 py-2.5">
                      Create Your First Ground
                    </button>
                  </div>
                );
              }

              const targetGround = selectedGround || grounds.find((g) => g.venueType !== 'pool') || grounds[0];
              const isPool = targetGround?.venueType === 'pool';

              const allReqs = groundBookings;
              const pendingReqs = allReqs.filter((b) => b.status === 'pending_approval');
              const approvedReqs = allReqs.filter((b) => b.status === 'advance_pending');
              const paidReqs = allReqs.filter((b) => b.status === 'advance_paid' || b.status === 'completed');
              const declinedReqs = allReqs.filter((b) => b.status === 'cancelled');

              const filtered =
                requestFilter === 'pending'
                  ? pendingReqs
                  : requestFilter === 'approved'
                  ? approvedReqs
                  : requestFilter === 'paid'
                  ? paidReqs
                  : requestFilter === 'declined'
                  ? declinedReqs
                  : allReqs;

              return (
                <div className="glass-card animate-cardIn">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="font-bebas text-2xl text-gray-900 dark:text-white flex items-center gap-2">
                        <span>📨 BOOKING REQUESTS</span>
                        {targetGround && <span className="text-gray-500 font-sans text-sm font-normal">— {targetGround.name}</span>}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Review all booking requests sent by players. Enable booking requests to require your approval before payment.
                      </p>
                    </div>
                  </div>

                  {/* VENUE SELECTOR BAR */}
                  {grounds.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider flex-shrink-0">
                        Venue:
                      </span>
                      {grounds.map((g) => {
                        const gPool = g.venueType === 'pool';
                        const isSel = (targetGround?._id === g._id);
                        return (
                          <button
                            key={g._id}
                            type="button"
                            onClick={() => {
                              setSelectedGround(g);
                              if (!gPool) fetchGroundBookings(g._id);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                              isSel
                                ? 'bg-purple-500 text-white shadow-md'
                                : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>🏟️ {g.name}</span>
                            {gPool ? (
                              <span className="text-[10px] opacity-60">Pool</span>
                            ) : (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                  g.bookingRequestsEnabled
                                    ? 'bg-purple-300 text-purple-950'
                                    : 'bg-emerald-400 text-black'
                                }`}
                              >
                                {g.bookingRequestsEnabled ? 'ON (6 Stg)' : 'OFF (5 Stg)'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isPool ? (
                    <div className="text-center py-10 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                      <span className="text-4xl block mb-3">🏊</span>
                      <p className="text-gray-400 text-sm font-semibold">
                        Swimming pool venues operate on automated lane slots. Booking requests are not applicable.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {/* TOGGLE CARD */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-purple-500 text-white shadow-sm">
                              Require Booking Requests
                            </span>
                            <span className="text-xs font-bold">
                              {targetGround.bookingRequestsEnabled ? (
                                <span className="text-purple-400 font-extrabold">⚡ ON (6 Stages in User Portal)</span>
                              ) : (
                                <span className="text-emerald-400 font-extrabold">OFF — Normal Direct Payment (5 Stages in User Portal)</span>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 max-w-xl">
                            {targetGround.bookingRequestsEnabled
                              ? `Users must submit a booking request for your approval (Stage 5) before payment unlocks (Stage 6) for ${targetGround.name}.`
                              : `Normal mode: Users select time slots and pay directly (5 stages) without awaiting approval for ${targetGround.name}.`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            disabled={togglingRequests}
                            onClick={() => handleToggleBookingRequests(targetGround)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                              targetGround.bookingRequestsEnabled
                                ? 'bg-purple-500 hover:bg-purple-400 text-white ring-2 ring-purple-400/40'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black ring-2 ring-emerald-400/40'
                            }`}
                          >
                            {togglingRequests ? (
                              'Updating…'
                            ) : targetGround.bookingRequestsEnabled ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span>Requests ON (Click to turn OFF)</span>
                              </>
                            ) : (
                              <>
                                <span>Turn ON Booking Requests</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* FILTER PILLS */}
                      <div className="flex gap-2 flex-wrap text-xs">
                        {[
                          { id: 'all', label: `All Requests (${allReqs.length})` },
                          { id: 'pending', label: `Pending Approval (${pendingReqs.length})`, highlight: pendingReqs.length > 0 },
                          { id: 'approved', label: `Approved / Awaiting Pay (${approvedReqs.length})` },
                          { id: 'paid', label: `Confirmed / Paid (${paidReqs.length})` },
                          { id: 'declined', label: `Declined (${declinedReqs.length})` },
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setRequestFilter(f.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                              requestFilter === f.id
                                ? 'bg-purple-500 text-white shadow-md'
                                : f.highlight
                                ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400/25'
                                : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white border border-black/5 dark:border-white/5'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* REQUESTS LIST */}
                      {filtered.length === 0 ? (
                        <div className="text-center py-10 rounded-2xl border border-dashed border-black/10 dark:border-white/10">
                          <span className="text-4xl block mb-2">📨</span>
                          <p className="text-gray-500 text-sm font-semibold">
                            {requestFilter === 'all'
                              ? `No booking requests found for ${targetGround.name}.`
                              : `No requests with status "${requestFilter}".`}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            When players submit booking requests, they will appear here for you to accept or decline.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {filtered.map((b) => (
                            <div
                              key={b._id}
                              className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-purple-400/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                                    👤 {b.player?.name || 'Player'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {b.player?.phone ? `· 📞 ${b.player.phone}` : ''}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusBadge(b.status).color}`}>
                                    {getStatusBadge(b.status).label}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap mt-1">
                                  <span>🏆 <strong>{b.sportName || targetGround.sport || 'Sports'}</strong></span>
                                  <span>📅 {b.date}</span>
                                  <span>🕐 {b.startTime} — {b.endTime}</span>
                                  {b.courtName && <span>🏟️ {b.courtName}</span>}
                                  <span>💰 Total: <strong className="text-gray-900 dark:text-white">₹{b.totalPrice || b.amount || 0}</strong></span>
                                  {b.advanceAmount > 0 && (
                                    <span>(Advance: <strong className="text-green-400">₹{b.advanceAmount}</strong>)</span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons for Pending Approval Requests */}
                              {b.status === 'pending_approval' && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    disabled={respondingBookingId === b._id}
                                    onClick={() => handleRespondBookingRequest(b, 'accept')}
                                    className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>✓ Accept</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={respondingBookingId === b._id}
                                    onClick={() => handleRespondBookingRequest(b, 'decline')}
                                    className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>✕ Decline</span>
                                  </button>
                                </div>
                              )}

                              {b.status === 'advance_pending' && (
                                <div className="text-right flex-shrink-0">
                                  <span className="text-xs text-yellow-500 font-semibold block">
                                    Approved ✓ Awaiting Player Payment
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div className="glass-card animate-cardIn">
                <h3 className="font-bebas text-xl text-gray-900 dark:text-white mb-4">
                  {selectedGround ? `BOOKINGS — ${selectedGround.name}` : 'SELECT A GROUND'}
                </h3>
                {!selectedGround ? (
                  <div className="text-center py-10">
                    <span className="text-4xl block mb-3">👈</span>
                    <p className="text-gray-500 text-sm">Click a ground on the left to view its bookings</p>
                  </div>
                ) : groundBookings.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-4xl block mb-3">📅</span>
                    <p className="text-gray-500 text-sm">No bookings yet for this ground</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {groundBookings.map((booking, i) => {
                      const badge = getStatusBadge(booking.status);
                      return (
                        <div key={booking._id} className="booking-card animate-cardIn" style={{ animationDelay: `${i * 0.05}s` }}>
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                            <div>
                              <p className="text-gray-900 dark:text-white font-semibold text-sm">{booking.player?.name}</p>
                              {booking.player?.phone && <p className="text-gray-600 text-xs">📞 {booking.player.phone}</p>}
                            </div>
                            <span className={`status-badge ${badge.color}`}>{badge.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="text-sm">{getSportEmoji(booking.sportName)}</span>
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">{booking.sportName || 'Arena Turf'}</span>
                            {booking.courtName && <span className="text-gray-500">· 🏟️ {booking.courtName}</span>}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                            📅 {booking.date} · 🕐 {booking.startTime} — {booking.endTime}
                          </p>
                          <div className="flex gap-4 text-xs pt-2 border-t border-black/5 dark:border-white/5">
                            <div>
                              <span className="text-gray-600">Total </span>
                              <span className="text-gray-900 dark:text-white font-semibold">₹{booking.totalPrice}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Advance </span>
                              <span className="text-green-400 font-semibold">₹{booking.advancePrice}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Remaining </span>
                              <span className="text-orange-400 font-semibold">₹{booking.remainingPrice}</span>
                            </div>
                          </div>

                          {/* Arena Booking Request Actions for Venue Owner */}
                          {booking.status === 'pending_approval' && (
                            <div className="mt-3 pt-3 border-t border-purple-400/20 flex flex-wrap items-center justify-between gap-2 bg-purple-500/5 -mx-4 -mb-4 p-3 rounded-b-2xl">
                              <div className="text-xs">
                                <span className="font-bold text-purple-400">⚡ Booking Request Awaiting Action</span>
                                <p className="text-gray-500 text-[11px]">Accept to let {booking.player?.name || 'the player'} proceed to payment, or decline.</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRespondBookingRequest(booking, 'accept')}
                                  disabled={respondingBookingId === booking._id}
                                  className="px-3 py-1.5 bg-green-400 hover:bg-green-300 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  {respondingBookingId === booking._id ? '…' : '✅ Accept'}
                                </button>
                                <button
                                  onClick={() => handleRespondBookingRequest(booking, 'decline')}
                                  disabled={respondingBookingId === booking._id}
                                  className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 disabled:opacity-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                >
                                  {respondingBookingId === booking._id ? '…' : '❌ Decline'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SLOTS TAB — Visual Scheduler */}
            {activeTab === 'slots' && (
              <div className="animate-cardIn">
                {selectedGround && selectedGround.approvalStatus !== 'approved' ? (
                  <div className="glass-card text-center py-16">
                    <span className="text-5xl block mb-4">{selectedGround.approvalStatus === 'pending' ? '⏳' : '❌'}</span>
                    <p className="text-gray-500 text-sm font-semibold mb-1">
                      {selectedGround.approvalStatus === 'pending' ? 'Ground Pending Admin Approval' : 'Ground Rejected'}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {selectedGround.approvalStatus === 'pending'
                        ? 'You can add slots once the admin approves your ground.'
                        : selectedGround.rejectionReason || 'Contact admin for more information.'}
                    </p>
                  </div>
                ) : selectedGround && selectedGround.venueMode && selectedGround.venueMode !== 'live' ? (
                  <div className="glass-card text-center py-16">
                    <span className="text-5xl block mb-4">{selectedGround.venueMode === 'trial' ? '🎟️' : '👀'}</span>
                    <p className="text-gray-500 text-sm font-semibold mb-1">
                      This ground is in {selectedGround.venueMode === 'trial' ? 'trial' : 'interest-only'} mode
                    </p>
                    <p className="text-gray-600 text-xs">Slot booking opens once admin sets it live — check the Leads tab meanwhile.</p>
                  </div>
                ) : (
                  <SportCourtManager
                    ground={selectedGround}
                    onRefresh={handleSlotRefresh}
                    showMessage={showMessage}
                  />
                )}
              </div>
            )}

            {/* CREATE / EDIT GROUND TAB */}
            {activeTab === 'create' && (
              <div className="glass-card animate-cardIn">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bebas text-xl text-gray-900 dark:text-white">
                    {isEditing ? 'EDIT GROUND DETAILS' : 'CREATE NEW GROUND'}
                  </h3>
                  {isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingGroundId(null);
                        setGroundForm(EMPTY_GROUND_FORM);
                        setActiveTab('grounds');
                      }}
                      className="text-gray-500 hover:text-red-500 text-xs transition-colors"
                    >
                      Cancel ✕
                    </button>
                  )}
                </div>

                <form onSubmit={handleCreateGround} className="flex flex-col gap-5">
                  {/* Venue Type Selector */}
                  <div>
                    <label className="label">Venue Category / Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'ground', label: 'Ground / Arena', icon: '🏟️', desc: 'Bookable Sports Turf' },
                        { id: 'social', label: 'Social Venue', icon: '🤝', desc: 'Free Community Play' },
                        { id: 'gym', label: 'Gym & Fitness', icon: '🏋️', desc: 'Trial Lead Flow' },
                        { id: 'pool', label: 'Swimming Pool', icon: '🏊', desc: 'Trial & Slot Flow' },
                      ].map((t) => {
                        const active = (groundForm.venueType || (groundForm.isSocial ? 'social' : 'ground')) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleVenueTypeChange(t.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              active
                                ? 'bg-green-400/10 border-green-400 text-green-400 shadow-sm'
                                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-500 hover:border-green-400/30'
                            }`}
                          >
                            <div className="text-xl mb-1">{t.icon}</div>
                            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{t.label}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate">{t.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ground Name</label>
                      <input type="text" value={groundForm.name}
                        onChange={(e) => setGroundForm({ ...groundForm, name: e.target.value })}
                        placeholder="Punjab Cricket Ground" required className="input-field" />
                    </div>
                    <div>
                      <label className="label">Sport</label>
                      {groundForm.venueType === 'gym' ? (
                        <div className="input-field flex items-center gap-2 cursor-default bg-black/5 dark:bg-white/5 opacity-80">
                          <span>🏋️</span>
                          <span className="font-semibold text-gray-900 dark:text-white">Gym & Fitness</span>
                        </div>
                      ) : groundForm.venueType === 'pool' ? (
                        <div className="input-field flex items-center gap-2 cursor-default bg-black/5 dark:bg-white/5 opacity-80">
                          <span>🏊</span>
                          <span className="font-semibold text-gray-900 dark:text-white">Swimming</span>
                        </div>
                      ) : (
                        <SearchableSportSelect value={groundForm.sport} onChange={s => setGroundForm({ ...groundForm, sport: s })} includeAll={false} placeholder="Search sports" />
                      )}
                    </div>
                    {/* ── DYNAMIC PRICING SECTION (NORMAL VS CUSTOM) ── */}
                    <div className="md:col-span-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <div>
                          <label className="label !mb-0 text-gray-800 dark:text-gray-200 font-bold">
                            Pricing Model & Preference
                          </label>
                          <p className="text-[11px] text-gray-500">
                            Select Normal Pricing for standard flat rates or Custom Pricing for hourly tiers & subscriptions.
                          </p>
                        </div>

                        {/* Pricing Preference Toggle */}
                        <div className="flex items-center p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 text-xs self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setGroundForm({ ...groundForm, pricingPreference: 'normal' })}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                              groundForm.pricingPreference === 'normal'
                                ? 'bg-emerald-500 text-black shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>🏷️ Normal Pricing</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setGroundForm({ ...groundForm, pricingPreference: 'custom' })}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                              groundForm.pricingPreference === 'custom'
                                ? 'bg-amber-400 text-black shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>⚡ Custom Pricing</span>
                          </button>
                        </div>
                      </div>

                      {/* ── CASE 1: NORMAL PRICING SECTION ── */}
                      {groundForm.pricingPreference === 'normal' && (
                        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 animate-cardIn">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              🏷️ Normal Flat Pricing Active
                            </span>
                            <span className="text-[10px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded font-semibold">
                              FLAT RATE
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                              <label className="label">Standard Price per Hour (₹)</label>
                              <input
                                type="number"
                                value={groundForm.pricePerHour}
                                onChange={(e) => setGroundForm({ ...groundForm, pricePerHour: e.target.value })}
                                placeholder={groundForm.venueType === 'social' || groundForm.isSocial ? '0 (Free)' : '500'}
                                required={groundForm.venueType !== 'social' && !groundForm.isSocial}
                                disabled={groundForm.venueType === 'social' || groundForm.isSocial}
                                className="input-field"
                              />
                            </div>
                            <div className="text-xs text-gray-500 pt-1">
                              {groundForm.venueType === 'social' || groundForm.isSocial ? (
                                <p className="text-yellow-500 font-semibold">🤝 Free access for community players</p>
                              ) : (
                                <p className="leading-relaxed">
                                  Standard flat rate. Players book courts and slots at this rate per hour (e.g. ₹500/hr).
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── CASE 2: CUSTOM PRICING SECTION ── */}
                      {groundForm.pricingPreference === 'custom' && (
                        <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/30 animate-cardIn">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                ⚡ Custom Pricing Section Active
                              </span>
                              <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded font-black">
                                CUSTOM RATES
                              </span>
                            </div>
                            {isEditing && (
                              <button
                                type="button"
                                onClick={() => handleOpenCustomPriceModal({ ...selectedGround, customPricePerHour: Number(groundForm.customPricePerHour) || 0 })}
                                className="text-xs bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                              >
                                <span>⚙️ Open Custom Price Configurator</span>
                              </button>
                            )}
                          </div>

                          {/* ── 2 CHECKBOXES: 1st Checkbox Hourly, 2nd Checkbox Subscription ── */}
                          <div className="p-3.5 rounded-xl bg-black/20 dark:bg-black/40 border border-amber-400/20 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                                Custom Pricing Types
                              </span>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                Select which pricing types to offer at this venue:
                              </p>
                            </div>

                            <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-xl border border-white/10">
                              {/* 1st Checkbox: Hourly */}
                              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer select-none hover:bg-white/5 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={groundForm.customPricingTypes?.hourly !== false}
                                  onChange={(e) => {
                                    const nextVal = e.target.checked;
                                    if (!nextVal && groundForm.customPricingTypes?.subscription === false) {
                                      showMessage('Please keep at least one pricing option (Hourly or Subscription) selected', 'info');
                                      return;
                                    }
                                    setGroundForm({
                                      ...groundForm,
                                      customPricingTypes: {
                                        ...groundForm.customPricingTypes,
                                        hourly: nextVal,
                                      },
                                    });
                                  }}
                                  className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 border-white/20 bg-black/60 cursor-pointer accent-amber-400"
                                />
                                <span className={`text-xs font-bold ${groundForm.customPricingTypes?.hourly !== false ? 'text-amber-400' : 'text-gray-400'}`}>
                                  ⏱️ Hourly
                                </span>
                              </label>

                              <div className="w-px h-5 bg-white/10" />

                              {/* 2nd Checkbox: Subscription */}
                              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer select-none hover:bg-white/5 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={groundForm.customPricingTypes?.subscription !== false}
                                  onChange={(e) => {
                                    const nextVal = e.target.checked;
                                    if (!nextVal && groundForm.customPricingTypes?.hourly === false) {
                                      showMessage('Please keep at least one pricing option (Hourly or Subscription) selected', 'info');
                                      return;
                                    }
                                    setGroundForm({
                                      ...groundForm,
                                      customPricingTypes: {
                                        ...groundForm.customPricingTypes,
                                        subscription: nextVal,
                                      },
                                    });
                                  }}
                                  className="w-4 h-4 rounded text-emerald-400 focus:ring-emerald-400 border-white/20 bg-black/60 cursor-pointer accent-emerald-400"
                                />
                                <span className={`text-xs font-bold ${groundForm.customPricingTypes?.subscription !== false ? 'text-emerald-400' : 'text-gray-400'}`}>
                                  💳 Subscription
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Status Pill indicating active selection */}
                          <div className="mb-4 px-3 py-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between text-xs text-gray-400">
                            <span>Active Display Mode:</span>
                            {groundForm.customPricingTypes?.hourly !== false && groundForm.customPricingTypes?.subscription !== false && (
                              <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">
                                Showing Both Hourly & Monthly Subscription Plans
                              </span>
                            )}
                            {groundForm.customPricingTypes?.hourly !== false && groundForm.customPricingTypes?.subscription === false && (
                              <span className="text-amber-400 font-bold bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                                Showing Hourly Pricing Only
                              </span>
                            )}
                            {groundForm.customPricingTypes?.hourly === false && groundForm.customPricingTypes?.subscription !== false && (
                              <span className="text-emerald-400 font-bold bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                                Showing Monthly Subscription Plan Only
                              </span>
                            )}
                          </div>

                          {/* ── SECTION 1: HOURLY PRICING (Rendered when Hourly checkbox is selected) ── */}
                          {groundForm.customPricingTypes?.hourly !== false && (
                            <div className="p-4 rounded-xl bg-black/20 dark:bg-black/30 border border-amber-400/20 mb-4 animate-cardIn">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                                  ⏱️ Section 1: Hourly Pricing
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                  <label className="label text-amber-400 font-bold">Custom Base Price per Hour (₹) *</label>
                                  <input
                                    type="number"
                                    value={groundForm.customPricePerHour}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setGroundForm({
                                        ...groundForm,
                                        customPricePerHour: val,
                                        pricePerHour: groundForm.pricePerHour || val,
                                      });
                                    }}
                                    placeholder="e.g. 750"
                                    required={groundForm.pricingPreference === 'custom' && groundForm.customPricingTypes?.hourly !== false}
                                    className="input-field !border-amber-400/50 focus:!border-amber-400 text-amber-300 font-bold"
                                  />
                                  <p className="text-[11px] text-gray-500 mt-1">This is your 1-Hour base rate for custom pricing.</p>
                                </div>

                                <div>
                                  <label className="label">Standard Fallback Price (₹)</label>
                                  <input
                                    type="number"
                                    value={groundForm.pricePerHour}
                                    onChange={(e) => setGroundForm({ ...groundForm, pricePerHour: e.target.value })}
                                    placeholder="e.g. 500"
                                    className="input-field"
                                  />
                                  <p className="text-[11px] text-gray-500 mt-1">Fallback rate if you ever toggle back to Normal Price.</p>
                                </div>
                              </div>

                              {/* Calculated Hourly Tier Preview */}
                              <div className="pt-2 border-t border-amber-400/10">
                                <span className="text-[11px] text-gray-400 font-semibold block mb-2">Hourly Tier Breakdown Preview:</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  {[
                                    { hrs: 1, mult: 1, label: '1 Hour (Base)' },
                                    { hrs: 2, mult: 1.9, label: '2 Hours' },
                                    { hrs: 3, mult: 2.8, label: '3 Hours' },
                                    { hrs: 4, mult: 3.6, label: '4 Hours' },
                                  ].map((tier) => (
                                    <div key={tier.hrs} className="p-2 rounded-lg bg-black/30 border border-amber-400/15">
                                      <span className="text-[10px] text-gray-400 block">{tier.label}</span>
                                      <span className="font-bold text-amber-400 text-xs">
                                        ₹{groundForm.customPricePerHour ? Math.round(Number(groundForm.customPricePerHour) * tier.mult).toLocaleString('en-IN') : '—'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── SECTION 2: SUBSCRIPTION PLAN (Rendered when Subscription checkbox is selected) ── */}
                          {groundForm.customPricingTypes?.subscription !== false && (
                            <div className="p-4 rounded-xl bg-black/20 dark:bg-black/30 border border-emerald-400/20 animate-cardIn">
                              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                  💳 Section 2: Monthly Subscription Plan
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Enter custom plan amounts or leave blank to auto-calculate from base hourly rate
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                {/* 1 Month */}
                                <div className="p-3 rounded-xl bg-black/30 border border-emerald-400/20">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-gray-300 font-bold text-[11px]">1 Month Plan</span>
                                    <span className="text-[10px] text-emerald-400 font-semibold">1m</span>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={groundForm.customSubscriptionPricing?.oneMonth ?? ''}
                                      onChange={(e) => setGroundForm({
                                        ...groundForm,
                                        customSubscriptionPricing: {
                                          ...groundForm.customSubscriptionPricing,
                                          oneMonth: e.target.value,
                                        },
                                      })}
                                      placeholder={groundForm.customPricePerHour ? String(Math.round(Number(groundForm.customPricePerHour) * 10)) : 'e.g. 5000'}
                                      className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-6 pr-2 py-1.5 text-emerald-300 font-bold text-xs outline-none"
                                    />
                                  </div>
                                </div>

                                {/* 3 Months */}
                                <div className="p-3 rounded-xl bg-black/30 border border-emerald-400/20">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-gray-300 font-bold text-[11px]">3 Months Plan</span>
                                    <span className="text-[10px] text-emerald-400 font-semibold">3m</span>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={groundForm.customSubscriptionPricing?.threeMonths ?? ''}
                                      onChange={(e) => setGroundForm({
                                        ...groundForm,
                                        customSubscriptionPricing: {
                                          ...groundForm.customSubscriptionPricing,
                                          threeMonths: e.target.value,
                                        },
                                      })}
                                      placeholder={groundForm.customPricePerHour ? String(Math.round(Number(groundForm.customPricePerHour) * 27)) : 'e.g. 13500'}
                                      className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-6 pr-2 py-1.5 text-emerald-300 font-bold text-xs outline-none"
                                    />
                                  </div>
                                </div>

                                {/* 6 Months */}
                                <div className="p-3 rounded-xl bg-black/30 border border-emerald-400/20">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-gray-300 font-bold text-[11px]">6 Months Plan</span>
                                    <span className="text-[10px] text-emerald-400 font-semibold">6m</span>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={groundForm.customSubscriptionPricing?.sixMonths ?? ''}
                                      onChange={(e) => setGroundForm({
                                        ...groundForm,
                                        customSubscriptionPricing: {
                                          ...groundForm.customSubscriptionPricing,
                                          sixMonths: e.target.value,
                                        },
                                      })}
                                      placeholder={groundForm.customPricePerHour ? String(Math.round(Number(groundForm.customPricePerHour) * 50)) : 'e.g. 25000'}
                                      className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-6 pr-2 py-1.5 text-emerald-300 font-bold text-xs outline-none"
                                    />
                                  </div>
                                </div>

                                {/* 1 Year */}
                                <div className="p-3 rounded-xl bg-black/30 border border-emerald-400/20">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-gray-300 font-bold text-[11px]">1 Year Pass</span>
                                    <span className="text-[10px] text-amber-400 font-semibold">12m</span>
                                  </div>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={groundForm.customSubscriptionPricing?.yearly ?? ''}
                                      onChange={(e) => setGroundForm({
                                        ...groundForm,
                                        customSubscriptionPricing: {
                                          ...groundForm.customSubscriptionPricing,
                                          yearly: e.target.value,
                                        },
                                      })}
                                      placeholder={groundForm.customPricePerHour ? String(Math.round(Number(groundForm.customPricePerHour) * 90)) : 'e.g. 45000'}
                                      className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-6 pr-2 py-1.5 text-amber-300 font-bold text-xs outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Address (type it yourself — most accurate)</label>
                      <input type="text" value={groundForm.address}
                        onChange={(e) => setGroundForm({ ...groundForm, address: e.target.value })}
                        placeholder="Sector 22, Chandigarh" required className="input-field" />
                    </div>

                    {/* Venue Description & Rules */}
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="label !mb-0">Description & Rules (Optional)</label>
                        <span className="text-[11px] text-gray-500">{groundForm.description?.length || 0}/1000</span>
                      </div>
                      <textarea
                        value={groundForm.description}
                        onChange={(e) => setGroundForm({ ...groundForm, description: e.target.value })}
                        placeholder="Share turf guidelines, footwear rules (e.g. non-marking only), parking details, facilities..."
                        rows={3}
                        maxLength={1000}
                        className="input-field resize-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="label">Photos ({groundForm.images.length}/6)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {groundForm.images.map((url) => (
                        <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeImage(url)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center">✕</button>
                        </div>
                      ))}
                      {groundForm.images.length < 6 && (
                        <label className="w-20 h-20 rounded-xl border border-dashed border-black/15 dark:border-white/15 flex items-center justify-center text-gray-400 text-xs cursor-pointer hover:border-green-400/40">
                          {uploadingImages ? '…' : '+ Add'}
                          <input type="file" accept="image/*" multiple hidden onChange={handleImagePick} disabled={uploadingImages} />
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">Cover photo first, ideally 16:9 (1200×675px+). These show up on the ground's card in the Venues tab and on the detail page.</p>
                  </div>

                  {/* Amenities */}
                  <div>
                    <label className="label">Amenities</label>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}>
                      {groundForm.amenities.map((amenity, idx) => (
                        <span key={idx} style={{
                          background: 'rgba(74,222,128,0.1)',
                          color: '#4ade80',
                          border: '1px solid rgba(74,222,128,0.2)',
                          padding: '4px 10px',
                          borderRadius: 100,
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          {amenity}
                          <button type="button" onClick={() => handleRemoveAmenity(amenity)}
                            style={{ color: 'inherit', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}>
                            ✕
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={amenityInput}
                        onChange={(e) => setAmenityInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(amenityInput); } }}
                        placeholder={groundForm.amenities.length === 0 ? 'Type an amenity & hit Enter' : 'Add more...'}
                        style={{
                          flex: 1, minWidth: 120, background: 'transparent', outline: 'none',
                          border: 'none', fontSize: 14, color: 'inherit', fontFamily: 'DM Sans, sans-serif',
                        }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500 py-1">Suggestions:</span>
                      {PRESET_AMENITIES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddAmenity(preset)}
                          disabled={groundForm.amenities.includes(preset)}
                          className="text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setShowMapPicker(true)} className={`btn-secondary flex items-center gap-2 ${groundForm.coordinates.length === 2 ? '!border-green-400/40 !text-green-400' : '!border-amber-400/30 !text-amber-400'}`}>
                        📍 {groundForm.coordinates.length > 0 ? 'Location Pinned ✅' : 'Pin Location on Map'}
                      </button>
                      {groundForm.coordinates.length === 2 ? (
                        <span className="text-xs text-green-400 flex items-center gap-1 font-medium">
                          ✓ [{groundForm.coordinates[1].toFixed(4)}, {groundForm.coordinates[0].toFixed(4)}]
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          ⚠️ Pin location required
                        </span>
                      )}
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (isEditing ? '💾 Save Changes' : '🏟️ Create Ground')}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── CUSTOM PRICE MODAL (SECTION 1: HOURLY & SECTION 2: SUBSCRIPTION) ── */}
      <CustomPriceModal
        isOpen={customPriceModalOpen}
        onClose={() => setCustomPriceModalOpen(false)}
        ground={selectedPricingGround || selectedGround}
        onSaveSuccess={handlePricingSaveSuccess}
        showMessage={showMessage}
      />
    </div>
  );
};

export default GroundOwnerDashboard;