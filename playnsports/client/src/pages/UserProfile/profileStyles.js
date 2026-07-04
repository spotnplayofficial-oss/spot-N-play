export const PROFILE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  .font-bebas { font-family: 'Bebas Neue', cursive !important; }

  @keyframes up-fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes up-shimmer { from{background-position:-200% center} to{background-position:200% center} }
  @keyframes up-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes up-cardIn  { from{opacity:0;transform:translateY(12px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes up-blob    { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-50px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }

  .up-anim1 { animation: up-fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
  .up-anim2 { animation: up-fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.12s both; }
  .up-anim3 { animation: up-fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.20s both; }
  .up-anim4 { animation: up-fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) 0.28s both; }
  .up-cardIn { animation: up-cardIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
  .up-blob   { animation: up-blob 7s infinite; }

  .up-shimmer {
    background: linear-gradient(90deg,#4ade80,#22c55e,#86efac,#4ade80);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: up-shimmer 3s linear infinite;
  }

  .up-grid-dots {
    background-image: radial-gradient(circle,rgba(255,255,255,0.04) 1px,transparent 1px);
    background-size: 28px 28px;
  }

  /* card */
  .up-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 20px;
  }
  .light .up-card {
    background: rgba(0,0,0,0.018);
    border-color: rgba(0,0,0,0.07);
  }

  /* section label */
  .up-section-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 700;
    color: #4ade80;
    margin-bottom: 12px;
  }

  /* info row */
  .up-info-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
    transition: border-color 0.2s;
  }
  .up-info-row:hover { border-color: rgba(74,222,128,0.15); }
  .light .up-info-row {
    background: rgba(0,0,0,0.02);
    border-color: rgba(0,0,0,0.06);
  }
  .up-info-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
  .up-info-value { font-size: 13px; font-weight: 500; color: #e5e7eb; }
  .light .up-info-value { color: #111827; }

  /* sport card */
  .up-sport-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    transition: all 0.2s;
  }
  .up-sport-chip:hover { border-color: rgba(74,222,128,0.2); background: rgba(74,222,128,0.03); }
  .light .up-sport-chip { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.06); }

  /* level badge */
  .up-badge {
    font-size: 10px; font-weight: 700;
    padding: 2px 9px; border-radius: 100px; border: 1px solid;
  }
  .up-badge-beg  { background: rgba(234,179,8,0.1);  color: #eab308; border-color: rgba(234,179,8,0.25); }
  .up-badge-int  { background: rgba(59,130,246,0.1);  color: #60a5fa; border-color: rgba(59,130,246,0.25); }
  .up-badge-adv  { background: rgba(74,222,128,0.1);  color: #4ade80; border-color: rgba(74,222,128,0.25); }

  /* role badge */
  .up-role-player  { background:rgba(74,222,128,0.1);  color:#4ade80; border:1px solid rgba(74,222,128,0.22);  border-radius:100px; padding:3px 12px; font-size:11px; font-weight:700; }
  .up-role-coach   { background:rgba(96,165,250,0.1);  color:#60a5fa; border:1px solid rgba(96,165,250,0.22); border-radius:100px; padding:3px 12px; font-size:11px; font-weight:700; }
  .up-role-owner   { background:rgba(251,191,36,0.1);  color:#fbbf24; border:1px solid rgba(251,191,36,0.22); border-radius:100px; padding:3px 12px; font-size:11px; font-weight:700; }
  .up-role-admin   { background:rgba(167,139,250,0.1); color:#a78bfa; border:1px solid rgba(167,139,250,0.22);border-radius:100px; padding:3px 12px; font-size:11px; font-weight:700; }

  /* cert card */
  .up-cert-card {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 16px; border-radius: 14px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    transition: border-color 0.2s;
  }
  .up-cert-card:hover { border-color: rgba(74,222,128,0.2); }
  .light .up-cert-card { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.06); }

  /* achievement chip */
  .up-achievement {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 14px; border-radius: 12px;
    background: rgba(74,222,128,0.04);
    border: 1px solid rgba(74,222,128,0.1);
    font-size: 13px; color: #d1d5db;
  }
  .light .up-achievement { background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.15); color: #374151; }

  /* action button */
  .up-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 12px; font-size: 13px; font-weight: 600;
    transition: all 0.25s; cursor: pointer; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
  }
  .up-btn-primary {
    background: linear-gradient(135deg,#4ade80,#22c55e);
    color: #000; border: none;
  }
  .up-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(74,222,128,0.3); }
  .up-btn-secondary {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: #9ca3af;
  }
  .up-btn-secondary:hover { border-color: rgba(74,222,128,0.3); color: #4ade80; }
  .light .up-btn-secondary { background: rgba(0,0,0,0.03); border-color: rgba(0,0,0,0.1); color: #6b7280; }
  .light .up-btn-secondary:hover { border-color: rgba(74,222,128,0.4); color: #16a34a; }

  /* avatar ring */
  .up-avatar-ring {
    width: 100px; height: 100px; border-radius: 50%; position: relative; flex-shrink: 0;
  }
  .up-avatar-ring::before {
    content: '';
    position: absolute; inset: -3px; border-radius: 50%;
    background: conic-gradient(from 0deg, transparent 0%, #4ade80 50%, transparent 100%);
    animation: up-spin 4s linear infinite;
  }
  .up-avatar-img {
    position: absolute; inset: 3px; border-radius: 50%; object-fit: cover;
    border: 2px solid #060606;
  }
  .light .up-avatar-img { border-color: #ffffff; }

  /* stat box */
  .up-stat-box {
    flex: 1; min-width: 80px;
    padding: 14px 10px; border-radius: 14px; text-align: center;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .light .up-stat-box { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.06); }
  .up-stat-num { font-family: 'Bebas Neue', cursive; font-size: 28px; color: #4ade80; line-height: 1; }
  .up-stat-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

  /* clickable user chip (used in map/groups/events) */
  .up-user-chip {
    display: inline-flex; align-items: center; gap: 6px;
    cursor: pointer; transition: opacity 0.2s;
    text-decoration: none;
  }
  .up-user-chip:hover { opacity: 0.75; }
`;
