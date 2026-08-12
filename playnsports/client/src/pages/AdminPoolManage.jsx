import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api/axios';
import Navbar from '../components/Navbar';
import PoolSlotManager from '../components/PoolSlotManager';

// Admin gets exactly the same management surface a pool owner has —
// PoolSlotManager itself doesn't know or care who's driving it, because
// the backend authorizes "owner OR admin" identically on every request.
// This page just adds the venue header + a link back to Admin Panel.
const AdminPoolManage = () => {
  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const { id } = useParams();

  const showMessage = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGround = useCallback(async () => {
    try {
      const { data } = await API.get(`/grounds/${id}`);
      setGround(data);
    } catch {
      showMessage('Failed to load venue', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGround(); }, [fetchGround]);

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#060606] text-gray-900 dark:text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/admin" className="text-xs text-gray-500 hover:text-green-500 mb-4 inline-block">← Back to Admin Panel</Link>

        {loading && <p className="text-gray-500 text-sm">Loading venue…</p>}

        {!loading && ground && ground.venueType !== 'pool' && (
          <p className="text-red-400 text-sm">This venue isn't a pool venue.</p>
        )}

        {!loading && ground && ground.venueType === 'pool' && (
          <>
            <div className="mb-6">
              <h1 className="font-bebas text-4xl tracking-wide">🏊 {ground.name}</h1>
              <p className="text-gray-500 text-sm mt-1">📍 {ground.address}</p>
              <span className={`inline-block mt-2 text-[11px] px-3 py-1 rounded-full border ${ground.venueMode === 'live' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'}`}>
                {ground.venueMode === 'live' ? 'Live' : ground.venueMode || 'Trial'}
              </span>
            </div>

            <PoolSlotManager ground={ground} onRefresh={fetchGround} showMessage={showMessage} />
          </>
        )}

        {toast && (
          <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg z-50 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPoolManage;
