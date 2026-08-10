import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShieldCheck, Map, Users, Dumbbell, MessageCircle,
  CalendarDays, User, Bell, LogOut, LogIn, ArrowRight, X, Building2,
} from 'lucide-react';

/**
 * Sidebar — permanent on desktop (md+), slide-in hamburger drawer on mobile.
 *
 * Usage: drop <Sidebar /> in the same layout wrapper as <Navbar />.
 * The sidebar injects a CSS variable --sidebar-width so Navbar can offset itself.
 */
const SIDEBAR_WIDTH = 240;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications] = useState([]); // wire up your real notif fetch here

  /* ── close drawer on route change ── */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* ── inject sidebar CSS variable + styles ── */
  useEffect(() => {
    if (document.getElementById('snp-sidebar-styles')) return;
    const style = document.createElement('style');
    style.id = 'snp-sidebar-styles';
    style.textContent = `
      :root { --sidebar-width: ${SIDEBAR_WIDTH}px; }

      @keyframes snpSideSlide {
        from { opacity:0; transform:translateX(-20px); }
        to   { opacity:1; transform:translateX(0); }
      }
      @keyframes snpOverlayIn {
        from { opacity:0; }
        to   { opacity:1; }
      }

      .snp-sidebar-anim  { animation: snpSideSlide  0.28s cubic-bezier(.22,1,.36,1) forwards; }
      .snp-overlay-anim  { animation: snpOverlayIn  0.22s ease forwards; }

      /* nav links */
      .snp-sl {
        display: flex; align-items: center; gap: 11px;
        padding: 10px 13px; border-radius: 11px;
        font-size: 14px; font-weight: 500;
        cursor: pointer; text-decoration: none;
        transition: background 0.16s, color 0.16s;
        color: #9ca3af;              /* gray-400 fallback */
        position: relative;
        white-space: nowrap;
      }
      .dark .snp-sl { color: #9ca3af; }
      .snp-sl:hover {
        background: rgba(74,222,128,0.09);
        color: #4ade80;
      }
      .snp-sl.snp-active {
        background: rgba(74,222,128,0.13);
        color: #4ade80;
      }
      .snp-sl.snp-active::before {
        content: '';
        position: absolute; left: 0; top: 18%; bottom: 18%;
        width: 3px; border-radius: 0 3px 3px 0;
        background: #4ade80;
      }
      .snp-sl.snp-danger:hover {
        background: rgba(239,68,68,0.09);
        color: #f87171;
      }
      .snp-sl-icon { flex-shrink: 0; display: flex; align-items: center; color: currentColor; opacity: 0.85; }

      /* divider */
      .snp-divider {
        height: 1px;
        background: rgba(255,255,255,0.07);
        margin: 6px 4px;
      }
      .light .snp-divider,
      :not(.dark) .snp-divider {
        background: rgba(0,0,0,0.07);
      }

      /* section label */
      .snp-section {
        font-size: 10px; font-weight: 700;
        letter-spacing: 0.12em; text-transform: uppercase;
        padding: 12px 13px 4px;
        color: #6b7280;
      }

      /* scrollbar */
      .snp-scroll::-webkit-scrollbar { width: 3px; }
      .snp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

      /* hamburger */
      .snp-hbg { display:flex; flex-direction:column; gap:5px; padding:8px; cursor:pointer; }
      .snp-hbg span { display:block; width:21px; height:2px; border-radius:2px; transition:all 0.25s ease; }
      .snp-hbg.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .snp-hbg.open span:nth-child(2) { opacity:0; transform:scaleX(0); }
      .snp-hbg.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

      /* On ≥ md: push main content right */
      @media (min-width: 768px) {
        .snp-main-offset { margin-left: ${SIDEBAR_WIDTH}px; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => { logout(); navigate('/login'); };

  /* ── nav items config ── */
  const getDashboardLink = () => {
    if (!user) return null;
    const map = {
      player:       { to: '/player/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
      coach:        { to: '/coach/dashboard',   label: 'Dashboard', icon: LayoutDashboard },
      ground_owner: { to: '/owner/dashboard',   label: 'Dashboard', icon: LayoutDashboard },
      gym_owner:    { to: '/gym/dashboard',     label: 'Dashboard', icon: LayoutDashboard },
      admin:        { to: '/admin',             label: 'Admin',     icon: ShieldCheck },
    };
    return map[user.role] || null;
  };

  const mainLinks = [
    ...(getDashboardLink() ? [getDashboardLink()] : []),
    { to: '/map',     label: 'Map',     icon: Map },
    { to: '/venues',  label: 'Venues',  icon: Building2 },
    { to: '/groups',  label: 'Groups',  icon: Users },
    { to: '/coaches', label: 'Coaches', icon: Dumbbell },
    { to: '/chat',    label: 'Chat',    icon: MessageCircle },
    { to: '/events',  label: 'Events',  icon: CalendarDays },
  ];

  /* ── shared sidebar body ── */
  const SidebarBody = ({ onClose }) => (
    <div
      className="flex flex-col h-full snp-scroll overflow-y-auto"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 flex items-center justify-between">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 bg-green-400 rounded-lg flex items-center justify-center group-hover:bg-green-300 transition-colors duration-200">
            <span className="text-black text-sm font-black">S</span>
          </div>
          <span className="text-lg tracking-widest text-gray-900 dark:text-white group-hover:text-green-400 transition-colors duration-200">
            spotNplay
          </span>
        </Link>

        {/* Close btn on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Main nav */}
      {user && (
        <>
          <div className="snp-section">Menu</div>
          <nav className="flex flex-col gap-1 px-3">
            {mainLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`snp-sl ${isActive(to) ? 'snp-active' : ''}`}
              >
                <span className="snp-sl-icon"><Icon size={17} strokeWidth={1.75} /></span>
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      {user && (
        <div className="px-3 pb-5">
          <div className="snp-divider mb-2" />

          <div className="snp-section" style={{ paddingTop: 8 }}>Account</div>

          {/* Profile */}
          <Link
            to="/profile"
            onClick={onClose}
            className={`snp-sl ${isActive('/profile') ? 'snp-active' : ''}`}
          >
            <span className="snp-sl-icon"><User size={17} strokeWidth={1.75} /></span>
            Profile
          </Link>

          {/* Notifications */}
          <button
            className="snp-sl w-full text-left"
            style={{ background: 'none', border: 'none' }}
          >
            <span className="snp-sl-icon"><Bell size={17} strokeWidth={1.75} /></span>
            <span>Notifications</span>
            {notifications.length > 0 && (
              <span
                className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#4ade80', color: '#000' }}
              >
                {notifications.length}
              </span>
            )}
          </button>

          <div className="snp-divider my-2" />

          {/* Logout */}
          <button
            onClick={() => { handleLogout(); onClose?.(); }}
            className="snp-sl snp-danger w-full text-left"
            style={{ background: 'none', border: 'none' }}
          >
            <span className="snp-sl-icon"><LogOut size={17} strokeWidth={1.75} /></span>
            Logout
          </button>
        </div>
      )}

      {/* Guest bottom */}
      {!user && (
        <div className="px-3 pb-5 flex flex-col gap-1">
          <div className="snp-divider mb-1" />
          <Link to="/login"    onClick={onClose} className="snp-sl"><span className="snp-sl-icon"><LogIn size={17} strokeWidth={1.75} /></span>Login</Link>
          <Link
            to="/register"
            onClick={onClose}
            className="snp-sl"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', marginTop: 4 }}
          >
            <span className="snp-sl-icon"><ArrowRight size={17} strokeWidth={1.75} /></span>Get Started
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop permanent sidebar ── */}
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 bottom-0 z-50"
        style={{
          width: SIDEBAR_WIDTH,
          background: 'var(--tw-bg, white)',
        }}
      >
        {/* Light mode bg */}
        <div
          className="absolute inset-0 bg-white dark:bg-[#0a0a0a] border-r border-black/8 dark:border-white/8"
          style={{ zIndex: -1 }}
        />
        <SidebarBody onClose={null} />
      </aside>

      {/* ── Mobile hamburger button (shown in Navbar area) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`md:hidden snp-hbg fixed top-3 left-4 z-50 ${mobileOpen ? 'open' : ''}`}
        aria-label="Open menu"
      >
        <span className="bg-gray-800 dark:bg-gray-200" />
        <span className="bg-gray-800 dark:bg-gray-200" />
        <span className="bg-gray-800 dark:bg-gray-200" />
      </button>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 snp-overlay-anim"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <aside
          className="md:hidden fixed top-0 left-0 bottom-0 z-50 snp-sidebar-anim"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <div className="absolute inset-0 bg-white dark:bg-[#0a0a0a] border-r border-black/8 dark:border-white/8" style={{ zIndex: -1 }} />
          <SidebarBody onClose={() => setMobileOpen(false)} />
        </aside>
      )}
    </>
  );
};

export default Sidebar;