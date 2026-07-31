const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const updateStreak = async (user) => {
  if (!user) return user;

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  if (!user.activeDays) user.activeDays = [];
  if (!user.bookedDays) user.bookedDays = [];

  if (user.lastLoginDate === todayStr) {
    let modified = false;
    if (!user.activeDays.includes(todayStr)) {
      user.activeDays.push(todayStr);
      modified = true;
    }
    if (!user.loginStreak || user.loginStreak === 0) {
      user.loginStreak = 1;
      if (user.loginStreak > (user.longestStreak || 0)) {
        user.longestStreak = user.loginStreak;
      }
      modified = true;
    }
    if (modified) {
      await user.save();
    }
    return user;
  }

  if (user.lastLoginDate === yesterdayStr) {
    user.loginStreak = (user.loginStreak || 0) + 1;
  } else {
    user.loginStreak = 1;
  }

  if (user.loginStreak > (user.longestStreak || 0)) {
    user.longestStreak = user.loginStreak;
  }

  user.lastLoginDate = todayStr;
  if (!user.activeDays.includes(todayStr)) {
    user.activeDays.push(todayStr);
  }

  await user.save();
  return user;
};
