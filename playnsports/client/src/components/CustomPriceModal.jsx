import React, { useState, useEffect } from 'react';
import API from '../api/axios';

/**
 * CustomPriceModal
 * Dedicated venue owner modal for configuring:
 * - Section 1: Hourly Pricing (editable hours, editable prices, "+ Add Hour Tier", [Set Price] button)
 * - Section 2: Subscription Pricing (default 1m, 3m, 6m, yearly with editable prices, dropdown 1-12 months with editable prices, [Set Prices] button)
 *
 * Strictly visible and operable only by venue owners / authorized admins.
 */
const CustomPriceModal = ({ isOpen, onClose, ground, onSaveSuccess, showMessage }) => {
  const [activeTab, setActiveTab] = useState('both'); // 'hourly' | 'subscription' | 'both'
  const [preference, setPreference] = useState('custom');

  // ── Section 1: Hourly State ──
  const [hourlyTiers, setHourlyTiers] = useState([
    { hours: 1, price: 500, label: '1 Hour (Standard Base Rate)' },
    { hours: 2, price: 950, label: '2 Hours' },
    { hours: 3, price: 1400, label: '3 Hours' },
    { hours: 4, price: 1800, label: '4 Hours' },
  ]);
  const [newHourInput, setNewHourInput] = useState(5);
  const [newHourPriceInput, setNewHourPriceInput] = useState('');
  const [savingHourly, setSavingHourly] = useState(false);
  const [hourlySuccess, setHourlySuccess] = useState('');

  // ── Section 2: Subscription State ──
  const [defaultSubs, setDefaultSubs] = useState({
    oneMonth: 2999,
    threeMonths: 7999,
    sixMonths: 14999,
    yearly: 26999,
  });
  const [customMonthsList, setCustomMonthsList] = useState([]);
  const [selectedDropdownMonth, setSelectedDropdownMonth] = useState(1);
  const [dropdownMonthPrice, setDropdownMonthPrice] = useState('');
  const [savingSub, setSavingSub] = useState(false);
  const [subSuccess, setSubSuccess] = useState('');

  // Initialize or re-sync when ground changes
  useEffect(() => {
    if (!ground) return;
    setPreference(ground.pricingPreference || 'custom');

    // Section 1: Load Hourly Tiers
    if (ground.customHourlyPricing && ground.customHourlyPricing.length > 0) {
      setHourlyTiers(ground.customHourlyPricing.map((item) => ({
        hours: item.hours,
        price: item.price,
        label: item.label || `${item.hours} Hour${item.hours > 1 ? 's' : ''}`,
      })));
    } else {
      const base = ground.customPricePerHour || ground.pricePerHour || 500;
      setHourlyTiers([
        { hours: 1, price: base, label: '1 Hour (Standard Base Rate)' },
        { hours: 2, price: Math.round(base * 1.9), label: '2 Hours' },
        { hours: 3, price: Math.round(base * 2.8), label: '3 Hours' },
        { hours: 4, price: Math.round(base * 3.6), label: '4 Hours' },
      ]);
    }

    // Section 2: Load Subscriptions
    const sub = ground.customSubscriptionPricing;
    if (sub) {
      setDefaultSubs({
        oneMonth: sub.oneMonth !== undefined ? sub.oneMonth : 2999,
        threeMonths: sub.threeMonths !== undefined ? sub.threeMonths : 7999,
        sixMonths: sub.sixMonths !== undefined ? sub.sixMonths : 14999,
        yearly: sub.yearly !== undefined ? sub.yearly : 26999,
      });
      if (Array.isArray(sub.customMonths)) {
        setCustomMonthsList(sub.customMonths);
      }
    } else {
      setDefaultSubs({
        oneMonth: 2999,
        threeMonths: 7999,
        sixMonths: 14999,
        yearly: 26999,
      });
      setCustomMonthsList([]);
    }
  }, [ground, isOpen]);

  if (!isOpen || !ground) return null;

  // ── Handlers: Section 1 (Hourly) ──
  const handleHourlyTierChange = (index, field, value) => {
    const updated = [...hourlyTiers];
    updated[index] = {
      ...updated[index],
      [field]: field === 'price' || field === 'hours' ? Math.max(0, Number(value) || 0) : value,
    };
    setHourlyTiers(updated);
  };

  const handleAddHourTier = () => {
    const hoursNum = Number(newHourInput);
    const priceNum = Math.max(0, Number(newHourPriceInput) || 0);
    if (!hoursNum || hoursNum < 1) return;

    const existingIdx = hourlyTiers.findIndex((t) => t.hours === hoursNum);
    if (existingIdx !== -1) {
      const updated = [...hourlyTiers];
      updated[existingIdx].price = priceNum;
      setHourlyTiers(updated);
    } else {
      const newTiers = [
        ...hourlyTiers,
        { hours: hoursNum, price: priceNum, label: `${hoursNum} Hours` },
      ].sort((a, b) => a.hours - b.hours);
      setHourlyTiers(newTiers);
    }
    setNewHourPriceInput('');
  };

  const handleRemoveHourTier = (index) => {
    if (hourlyTiers.length <= 1) return;
    setHourlyTiers(hourlyTiers.filter((_, i) => i !== index));
  };

  const handleSaveHourlySection = async () => {
    setSavingHourly(true);
    setHourlySuccess('');
    try {
      const oneHourTier = hourlyTiers.find((t) => t.hours === 1);
      const customPricePerHour = oneHourTier ? oneHourTier.price : (hourlyTiers[0]?.price || 0);

      const { data } = await API.patch(`/grounds/${ground._id}/pricing`, {
        pricingPreference: 'custom',
        customPricePerHour,
        customHourlyPricing: hourlyTiers,
      });

      setHourlySuccess('Hourly price set successfully! ✅');
      if (showMessage) showMessage('Section 1: Hourly prices updated successfully! ✅', 'success');
      if (onSaveSuccess) onSaveSuccess(data.ground);
      setTimeout(() => setHourlySuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save hourly pricing';
      if (showMessage) showMessage(msg, 'error');
    } finally {
      setSavingHourly(false);
    }
  };

  // ── Handlers: Section 2 (Subscription) ──
  const handleDefaultSubChange = (field, value) => {
    setDefaultSubs((prev) => ({
      ...prev,
      [field]: Math.max(0, Number(value) || 0),
    }));
  };

  const handleAddDropdownMonth = () => {
    const monthNum = Number(selectedDropdownMonth);
    const priceNum = Math.max(0, Number(dropdownMonthPrice) || 0);
    if (!monthNum || monthNum < 1 || monthNum > 12) return;

    const existingIdx = customMonthsList.findIndex((item) => item.months === monthNum);
    if (existingIdx !== -1) {
      const updated = [...customMonthsList];
      updated[existingIdx].price = priceNum;
      setCustomMonthsList(updated);
    } else {
      const updated = [
        ...customMonthsList,
        { months: monthNum, price: priceNum },
      ].sort((a, b) => a.months - b.months);
      setCustomMonthsList(updated);
    }
    setDropdownMonthPrice('');
  };

  const handleCustomMonthPriceChange = (index, newPrice) => {
    const updated = [...customMonthsList];
    updated[index] = {
      ...updated[index],
      price: Math.max(0, Number(newPrice) || 0),
    };
    setCustomMonthsList(updated);
  };

  const handleRemoveCustomMonth = (index) => {
    setCustomMonthsList(customMonthsList.filter((_, i) => i !== index));
  };

  const handleSaveSubscriptionSection = async () => {
    setSavingSub(true);
    setSubSuccess('');
    try {
      const payload = {
        customSubscriptionPricing: {
          oneMonth: defaultSubs.oneMonth,
          threeMonths: defaultSubs.threeMonths,
          sixMonths: defaultSubs.sixMonths,
          yearly: defaultSubs.yearly,
          customMonths: customMonthsList,
        },
      };

      const { data } = await API.patch(`/grounds/${ground._id}/pricing`, payload);
      setSubSuccess('Subscription prices set successfully! ✅');
      if (showMessage) showMessage('Section 2: subscription prices updated successfully! ✅', 'success');
      if (onSaveSuccess) onSaveSuccess(data.ground);
      setTimeout(() => setSubSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save subscription pricing';
      if (showMessage) showMessage(msg, 'error');
    } finally {
      setSavingSub(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#121212] border border-[#2e2e2e] rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl text-gray-200 overflow-hidden animate-scaleUp">

        {/* ── MODAL HEADER ── */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-black to-emerald-500/10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center text-xl font-black border border-amber-400/30 shadow-inner">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Custom Prices Configuration
                </h3>
                <span className="text-[10px] bg-amber-400 text-black px-2 py-0.5 rounded font-black tracking-wider uppercase">
                  Owner Only
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Set and manage custom hourly rates & subscription packages for <span className="text-amber-300 font-semibold">{ground.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Filter Switcher */}
            <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('hourly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'hourly' ? 'bg-amber-400 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
              >
                ⏱️Hourly
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'subscription' ? 'bg-emerald-400 text-black shadow' : 'text-gray-400 hover:text-white'
                  }`}
              >
                💳subscription
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'both' ? 'bg-white/20 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
              >
                🗂️ View Both
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-base transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── MODAL BODY (SCROLLABLE) ── */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 1: HOURLY
          ══════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'hourly' || activeTab === 'both') && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/25 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
                      HOURLY
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Configure hours and custom prices. All hours and prices are editable by you as the venue owner.
                  </p>
                </div>

                {hourlySuccess && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20 animate-fadeIn">
                    {hourlySuccess}
                  </span>
                )}
              </div>

              {/* Editable Hours & Prices Table/List */}
              <div className="space-y-3 mb-5">
                <div className="grid grid-cols-12 gap-3 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <span className="col-span-4 sm:col-span-3">Duration (Hours)</span>
                  <span className="col-span-5 sm:col-span-6">Custom Price (₹)</span>
                  <span className="col-span-3 sm:col-span-3 text-right">Action</span>
                </div>

                {hourlyTiers.map((tier, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-black/40 border border-white/5 hover:border-amber-400/30 transition-all"
                  >
                    {/* Editable Hours */}
                    <div className="col-span-4 sm:col-span-3 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={tier.hours}
                        onChange={(e) => handleHourlyTierChange(index, 'hours', e.target.value)}
                        className="w-16 bg-black/60 border border-white/15 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm text-center outline-none"
                      />
                      <span className="text-xs text-gray-400 font-semibold">
                        {tier.hours === 1 ? 'hr (base)' : 'hrs'}
                      </span>
                    </div>

                    {/* Editable Price */}
                    <div className="col-span-5 sm:col-span-6">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={tier.price}
                          onChange={(e) => handleHourlyTierChange(index, 'price', e.target.value)}
                          placeholder="Price in INR"
                          className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-lg pl-7 pr-3 py-1.5 text-amber-300 font-bold text-sm outline-none"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-2">
                      {tier.hours === 1 ? (
                        <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded font-bold">
                          Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveHourTier(index)}
                          className="text-xs text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors"
                          title="Remove tier"
                        >
                          ✕ Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Hour Tier Bar */}
              <div className="p-3 rounded-xl bg-black/30 border border-dashed border-white/15 flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-300">Add Hour Tier:</span>
                  <select
                    value={newHourInput}
                    onChange={(e) => setNewHourInput(e.target.value)}
                    className="bg-black/60 border border-white/15 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24].map((h) => (
                      <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Rate"
                      value={newHourPriceInput}
                      onChange={(e) => setNewHourPriceInput(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 focus:border-amber-400 rounded-lg pl-6 pr-2 py-1 text-white text-xs font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!newHourPriceInput}
                  onClick={handleAddHourTier}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  + Add Hour Tier
                </button>
              </div>

              {/* Section 1 Footer: [Set Price] Button */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="text-[11px] text-gray-400">
                  💡 Clicking <strong>Set Price</strong> saves these hourly rates and activates custom pricing for standard slots.
                </div>
                <button
                  type="button"
                  disabled={savingHourly}
                  onClick={handleSaveHourlySection}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-400/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{savingHourly ? 'Saving...' : '⚡ Set Price'}</span>
                </button>
              </div>
            </div>
          )}


          {/* ══════════════════════════════════════════════════════════════════
              SECTION 2: SUBSCRIPTION
          ══════════════════════════════════════════════════════════════════ */}
          {(activeTab === 'subscription' || activeTab === 'both') && (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-emerald-500/25 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-emerald-400/20 text-emerald-400 border border-emerald-400/30">
                      SUBSCRIPTION
                    </span>

                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Set prices for default durations (1m, 3m, 6m, yearly) and select from the 1–12 month dropdown for custom plans.
                  </p>
                </div>

                {subSuccess && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20 animate-fadeIn">
                    {subSuccess}
                  </span>
                )}
              </div>

              {/* Sub-Part A: Default Subscription Options */}
              <div className="mb-6">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <span>📌 Default Month Options (Editable Prices)</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1 Month */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-400/30 transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                        1 Month Plan
                      </span>
                      <p className="text-xs text-gray-300 font-semibold mt-1.5">1 Month</p>
                    </div>
                    <div className="mt-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={defaultSubs.oneMonth}
                        onChange={(e) => handleDefaultSubChange('oneMonth', e.target.value)}
                        placeholder="Price"
                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-7 pr-3 py-1.5 text-emerald-300 font-bold text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* 3 Months */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-400/30 transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                        3 Months Plan
                      </span>
                      <p className="text-xs text-gray-300 font-semibold mt-1.5">3 Months</p>
                    </div>
                    <div className="mt-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={defaultSubs.threeMonths}
                        onChange={(e) => handleDefaultSubChange('threeMonths', e.target.value)}
                        placeholder="Price"
                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-7 pr-3 py-1.5 text-emerald-300 font-bold text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* 6 Months */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-400/30 transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                        6 Months Plan
                      </span>
                      <p className="text-xs text-gray-300 font-semibold mt-1.5">6 Months</p>
                    </div>
                    <div className="mt-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={defaultSubs.sixMonths}
                        onChange={(e) => handleDefaultSubChange('sixMonths', e.target.value)}
                        placeholder="Price"
                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-7 pr-3 py-1.5 text-emerald-300 font-bold text-sm outline-none"
                      />
                    </div>
                  </div>

                  {/* Yearly (12 Months) */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-400/30 transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        Yearly Pass
                      </span>
                      <p className="text-xs text-gray-300 font-semibold mt-1.5">12 Months (Yearly)</p>
                    </div>
                    <div className="mt-3 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={defaultSubs.yearly}
                        onChange={(e) => handleDefaultSubChange('yearly', e.target.value)}
                        placeholder="Price"
                        className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-7 pr-3 py-1.5 text-amber-300 font-bold text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Part B: Dropdown of Months (1 to 12) & Editable Prices */}
              <div className="mb-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <span>📅 Dropdown of Months (Ranging 1 to 12) & Editable Prices</span>
                </h5>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3 flex-wrap">
                    <label className="text-xs font-semibold text-gray-300 whitespace-nowrap">
                      Select Month:
                    </label>
                    <select
                      value={selectedDropdownMonth}
                      onChange={(e) => setSelectedDropdownMonth(Number(e.target.value))}
                      className="bg-black/80 border border-white/20 text-white font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <option key={m} value={m}>
                          {m} Month{m > 1 ? 's' : ''} {m === 12 ? '(Yearly)' : ''}
                        </option>
                      ))}
                    </select>

                    <div className="relative w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Set price for month"
                        value={dropdownMonthPrice}
                        onChange={(e) => setDropdownMonthPrice(e.target.value)}
                        className="w-full bg-black/80 border border-white/20 focus:border-emerald-400 rounded-xl pl-7 pr-3 py-2 text-white font-bold text-xs outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!dropdownMonthPrice}
                    onClick={handleAddDropdownMonth}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all disabled:opacity-40"
                  >
                    + Add / Update Month Price
                  </button>
                </div>

                {/* List of active custom month packages if added */}
                {customMonthsList.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {customMonthsList.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-bold text-gray-200">
                          {item.months} Month{item.months > 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-[11px] font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleCustomMonthPriceChange(idx, e.target.value)}
                              className="w-full bg-black/60 border border-white/15 focus:border-emerald-400 rounded-lg pl-6 pr-2 py-1 text-xs text-emerald-300 font-bold outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomMonth(idx)}
                            className="text-red-400 hover:text-red-300 text-xs p-1"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2 Footer: [Set Prices] Button */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="text-[11px] text-gray-400">
                  💡 Clicking <strong>Set Prices</strong> saves the subscription tiers for this venue.
                </div>
                <button
                  type="button"
                  disabled={savingSub}
                  onClick={handleSaveSubscriptionSection}
                  className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-400/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{savingSub ? 'Saving...' : '💳 Set Prices'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Venue: <strong className="text-white">{ground.name}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors ml-auto"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomPriceModal;
