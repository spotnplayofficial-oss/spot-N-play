/**
 * UserChip
 * A small clickable avatar + name that navigates to /users/:id/profile
 *
 * Props:
 *   user        — { _id, name, avatar }
 *   size        — 'sm' | 'md' (default 'sm')
 *   className   — extra tailwind classes
 *   style       — extra inline style
 *   stopPropagation — stop click from bubbling (useful inside cards)
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Inject the chip style once globally
if (typeof document !== 'undefined' && !document.getElementById('up-chip-style')) {
  const s = document.createElement('style');
  s.id = 'up-chip-style';
  s.textContent = `.up-user-chip{display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:opacity 0.2s;text-decoration:none}.up-user-chip:hover{opacity:0.7}`;
  document.head.appendChild(s);
}

const UserChip = ({ user, size = 'sm', className = '', style = {}, stopPropagation = false }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  if (!user?._id) return null;

  const avatarSize = size === 'md' ? 32 : 22;
  const fontSize = size === 'md' ? 13 : 11;
  const initFontSize = size === 'md' ? 14 : 10;

  const handleClick = (e) => {
    if (stopPropagation) e.stopPropagation();
    const target = currentUser?._id === user._id?.toString() ? '/profile' : `/users/${user._id}/profile`;
    navigate(target);
  };

  return (
    <span
      className={`up-user-chip ${className}`}
      style={style}
      onClick={handleClick}
      title={`View ${user.name}'s profile`}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <span style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: initFontSize, fontWeight: 700, color: '#4ade80',
        }}>
          {user.name?.charAt(0)}
        </span>
      )}
      <span style={{ fontSize, fontWeight: 500, color: 'inherit' }}>{user.name}</span>
    </span>
  );
};

export default UserChip;
