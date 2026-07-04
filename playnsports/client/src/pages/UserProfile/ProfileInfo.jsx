const cmToFtIn = (cm) => {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches % 12);
  return `${ft}′${inch}″`;
};

const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="up-info-row">
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div className="min-w-0">
        <p className="up-info-label">{label}</p>
        <p className="up-info-value truncate">{value}</p>
      </div>
    </div>
  );
};

const ProfileInfo = ({ user, playerProfile }) => {
  const heightStr = playerProfile?.height
    ? `${playerProfile.height} cm (${cmToFtIn(playerProfile.height)})`
    : null;
  const weightStr = playerProfile?.weight ? `${playerProfile.weight} kg` : null;

  const dob = user.dateOfBirth
    ? new Date(user.dateOfBirth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const rows = [
    { icon: '📞', label: 'Phone', value: user.phone },
    { icon: '🌏', label: 'Country', value: user.country },
    { icon: '🗓️', label: 'Date of Birth', value: dob },
    { icon: '⚧️', label: 'Gender', value: user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : null },
    ...(playerProfile ? [
      { icon: '📐', label: 'Height', value: heightStr },
      { icon: '⚖️', label: 'Weight', value: weightStr },
    ] : []),
  ].filter(r => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="up-card up-anim2">
      <p className="up-section-label">Info</p>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => <InfoRow key={i} {...r} />)}
      </div>
    </div>
  );
};

export default ProfileInfo;
