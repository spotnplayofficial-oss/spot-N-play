import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Post Graduate'];

// Registration-form gate shown before joining events that enable
// formConfig (e.g. National Sports Day). Name / email / phone are
// prefilled from the signed-in account but fully editable; college
// registration number & year are collected per the event's config and
// saved against the booking's ticket.
const RegistrationFormModal = ({ event, onClose, onSubmit }) => {
  const cfg = event.formConfig || {};
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    collegeRegNo: '',
    year: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e?.preventDefault?.();
    setError('');
    if (!form.name.trim()) return setError('Please enter your name');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Please enter a valid email');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit phone number');
    if (cfg.collectCollegeRegNo && !form.collegeRegNo.trim()) return setError('College registration number is required');
    if (cfg.collectYear && !form.year) return setError('Please select your year');

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        ...(cfg.collectCollegeRegNo ? { collegeRegNo: form.collegeRegNo.trim() } : {}),
        ...(cfg.collectYear ? { year: form.year } : {}),
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rf-fixed rf-inset-0 rf-z-[999] rf-flex rf-items-center rf-justify-center rf-p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <form
        className="rf-w-full rf-max-w-md rf-rounded-3xl rf-p-6"
        style={{ background: 'var(--glass-bg, #101010)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', color: 'inherit' }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="rf-text-lg rf-font-bold rf-mb-1" style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: 1 }}>
          REGISTER FOR {event.title?.toUpperCase()}
        </h2>
        <p className="rf-text-xs rf-mb-4" style={{ color: '#9ca3af' }}>
          Your details are pre-filled from your account — edit anything if needed.
        </p>

        {error && (
          <div className="rf-rounded-xl rf-px-3 rf-py-2 rf-mb-4 rf-text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>⚠️ {error}</div>
        )}

        <div className="rf-flex rf-flex-col rf-gap-3">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your name', required: true },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', required: true },
            { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '10-digit mobile number', required: true },
            ...(cfg.collectCollegeRegNo ? [{ key: 'collegeRegNo', label: 'College Registration Number', type: 'text', placeholder: 'e.g. 12345678', required: true }] : []),
          ].map((f) => (
            <label className="rf-block" key={f.key}>
              <span className="rf-text-[10px] rf-uppercase rf-tracking-widest" style={{ color: '#9ca3af' }}>{f.label}</span>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                required={f.required}
                className="rf-input"
              />
            </label>
          ))}

          {cfg.collectYear && (
            <label className="rf-block">
              <span className="rf-text-[10px] rf-uppercase rf-tracking-widest" style={{ color: '#9ca3af' }}>Year</span>
              <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} required className="rf-input">
                <option value="">Select your year</option>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          )}

          <button type="submit" disabled={loading} className="rf-btn">
            {loading ? 'Registering…' : 'Confirm Registration 🎟️'}
          </button>
        </div>
      </form>

      <style>{`
        .rf-input {
          width: 100%; margin-top: 6px; padding: 10px 12px; border-radius: 12px; font-size: 13px;
          outline: none; color: inherit; font-family: 'DM Sans', sans-serif;
          background: rgba(127,127,127,0.08); border: 1px solid rgba(127,127,127,0.22);
        }
        .rf-input:focus { border-color: rgba(74,222,128,0.55); box-shadow: 0 0 0 3px rgba(74,222,128,0.08); }
        .rf-btn {
          width: 100%; margin-top: 6px; padding: 12px; border-radius: 14px; font-weight: 700; font-size: 14px;
          background: linear-gradient(135deg, #4ade80, #16a34a); color: #052e12; font-family: 'DM Sans', sans-serif;
          cursor: pointer;
        }
        .rf-btn:disabled { opacity: 0.6; }
        .rf-flex { display: flex; } .rf-flex-col { flex-direction: column; }
        .rf-fixed { position: fixed; } .rf-inset-0 { inset: 0; } .rf-z-\\[999\\] { z-index: 999; }
        .rf-items-center { align-items: center; } .rf-justify-center { justify-content: center; }
        .rf-p-4 { padding: 16px; } .rf-p-6 { padding: 24px; }
        .rf-w-full { width: 100%; } .rf-max-w-md { max-width: 28rem; }
        .rf-rounded-3xl { border-radius: 24px; } .rf-rounded-xl { border-radius: 14px; }
        .rf-gap-3 { gap: 12px; } .rf-mb-1 { margin-bottom: 4px; } .rf-mb-4 { margin-bottom: 16px; }
        .rf-text-lg { font-size: 18px; } .rf-text-xs { font-size: 12px; }
        .rf-font-bold { font-weight: 700; } .rf-block { display: block; }
        .rf-text-\\[10px\\] { font-size: 10px; } .rf-uppercase { text-transform: uppercase; } .rf-tracking-widest { letter-spacing: 0.12em; }
        .rf-px-3 { padding-left: 12px; padding-right: 12px; } .rf-py-2 { padding-top: 8px; padding-bottom: 8px; }
      `}</style>
    </div>
  );
};

export default RegistrationFormModal;
