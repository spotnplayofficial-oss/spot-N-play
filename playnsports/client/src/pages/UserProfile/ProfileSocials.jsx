const ProfileSocials = ({ playerProfile }) => {
  if (!playerProfile) return null;
  const { instagram, twitter } = playerProfile;
  if (!instagram && !twitter) return null;

  const links = [
    instagram && {
      icon: '📸',
      label: 'Instagram',
      handle: instagram.startsWith('@') ? instagram : `@${instagram}`,
      href: `https://instagram.com/${instagram.replace('@', '')}`,
      color: '#e1306c',
      bg: 'rgba(225,48,108,0.08)',
      border: 'rgba(225,48,108,0.2)',
    },
    twitter && {
      icon: '🐦',
      label: 'Twitter / X',
      handle: twitter.startsWith('@') ? twitter : `@${twitter}`,
      href: `https://twitter.com/${twitter.replace('@', '')}`,
      color: '#1d9bf0',
      bg: 'rgba(29,155,240,0.08)',
      border: 'rgba(29,155,240,0.2)',
    },
  ].filter(Boolean);

  return (
    <div className="up-card up-anim4">
      <p className="up-section-label">Socials</p>
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: l.bg, border: `1px solid ${l.border}`,
              color: l.color, textDecoration: 'none', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <span style={{ fontSize: 18 }}>{l.icon}</span>
            <div>
              <p style={{ fontSize: 10, opacity: 0.7, marginBottom: 1 }}>{l.label}</p>
              <p>{l.handle}</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.6 }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ProfileSocials;
