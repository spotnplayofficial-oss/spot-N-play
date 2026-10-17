import Subscription from '../models/Subscription.js';
import XlMembership from '../models/XlMembership.js';
import Booking from '../models/Booking.js';

/**
 * Normalizes an XlMembership document into the unified subscription shape.
 */
const formatXlMembership = (m) => {
  const now = new Date();
  const expiresAt = new Date(m.expiresAt);
  const isCurrentlyActive = m.status === 'active' && expiresAt > now;
  const msRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
  const daysRemaining = isCurrentlyActive ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0;

  return {
    id: m._id.toString(),
    subscriptionSource: 'xl_arena_membership',
    category: 'arena_membership',
    displayTitle: `XL Arena Membership · ${m.planName || 'Standard'}`,
    planName: m.planName || 'Standard',
    billingCycle: 'monthly',
    price: m.price || 990,
    currency: 'INR',
    ground: m.ground
      ? {
          _id: m.ground._id,
          name: m.ground.name,
          address: m.ground.address,
          sport: m.ground.sport,
          venueType: m.ground.venueType,
          photos: m.ground.photos || [],
        }
      : null,
    startDate: m.purchasedAt || m.createdAt,
    expiresAt,
    isActive: isCurrentlyActive,
    status: isCurrentlyActive ? 'active' : 'expired',
    daysRemaining,
    ticketId: null,
    payment: {
      razorpayOrderId: m.payment?.razorpayOrderId || '',
      razorpayPaymentId: m.payment?.razorpayPaymentId || '',
      paymentStatus: 'paid',
    },
    metadata: {
      type: 'xl_membership',
      notes: 'Unlimited arena access pass according to arena operating rules',
    },
    createdAt: m.createdAt,
  };
};

/**
 * Normalizes a Booking with membershipPlanName (e.g. pool pass) into the unified subscription shape.
 */
const formatPoolMembershipBooking = (b) => {
  const now = new Date();
  const createdDate = b.createdAt ? new Date(b.createdAt) : new Date(`${b.date}T${b.startTime || '00:00'}:00`);

  // Compute pass expiry based on plan name semantics
  const planLower = (b.membershipPlanName || '').toLowerCase();
  let validityDays = 30; // default to monthly
  let cycle = 'monthly';

  if (planLower.includes('semester')) {
    validityDays = 120;
    cycle = 'semester';
  } else if (planLower.includes('session') && (planLower.includes('package') || planLower.includes('single'))) {
    validityDays = 30;
    cycle = 'session_package';
  } else if (planLower.includes('year') || planLower.includes('annual')) {
    validityDays = 365;
    cycle = 'annual';
  }

  const expiresAt = new Date(createdDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
  const isCancelled = ['cancelled', 'refunded'].includes(b.status);
  const isCurrentlyActive = !isCancelled && b.status === 'completed' && expiresAt > now;
  const msRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
  const daysRemaining = isCurrentlyActive ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0;

  return {
    id: b._id.toString(),
    subscriptionSource: 'pool_membership',
    category: 'pool_membership',
    displayTitle: `Pool Pass · ${b.membershipPlanName}`,
    planName: b.membershipPlanName,
    billingCycle: cycle,
    price: b.totalPrice || 0,
    currency: 'INR',
    ground: b.ground
      ? {
          _id: b.ground._id,
          name: b.ground.name,
          address: b.ground.address,
          sport: b.ground.sport || 'Swimming',
          venueType: b.ground.venueType || 'pool',
          photos: b.ground.photos || [],
        }
      : null,
    startDate: createdDate,
    expiresAt,
    isActive: isCurrentlyActive,
    status: isCancelled ? 'cancelled' : isCurrentlyActive ? 'active' : 'expired',
    daysRemaining,
    ticketId: b.ticketId || null,
    payment: {
      totalPrice: b.totalPrice,
      advancePrice: b.advancePrice,
      remainingPrice: b.remainingPrice,
      paymentStatus: b.status,
    },
    metadata: {
      poolId: b.poolId,
      poolName: b.poolName,
      slotCategory: b.slotCategory,
      partySize: b.partySize || 1,
      checkedIn: !!b.checkedIn,
      checkedInAt: b.checkedInAt || null,
    },
    createdAt: b.createdAt || createdDate,
  };
};

/**
 * Normalizes a record from the dedicated Subscription model.
 */
const formatDirectSubscription = (s) => {
  const now = new Date();
  const expiresAt = new Date(s.expiresAt);
  const isCurrentlyActive = s.status === 'active' && expiresAt > now;
  const msRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
  const daysRemaining = isCurrentlyActive ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0;

  return {
    id: s._id.toString(),
    subscriptionSource: 'direct_subscription',
    category: s.category || 'general',
    displayTitle: `${s.planName} (${s.billingCycle})`,
    planName: s.planName,
    billingCycle: s.billingCycle,
    price: s.price,
    currency: s.currency || 'INR',
    ground: s.ground
      ? {
          _id: s.ground._id,
          name: s.ground.name,
          address: s.ground.address,
          sport: s.ground.sport,
          venueType: s.ground.venueType,
          photos: s.ground.photos || [],
        }
      : null,
    startDate: s.startDate,
    expiresAt,
    isActive: isCurrentlyActive,
    status: s.status === 'cancelled' ? 'cancelled' : isCurrentlyActive ? 'active' : 'expired',
    daysRemaining,
    ticketId: s.ticketId || null,
    payment: {
      razorpayOrderId: s.payment?.razorpayOrderId || '',
      razorpayPaymentId: s.payment?.razorpayPaymentId || '',
      paymentStatus: s.payment?.paymentStatus || 'paid',
    },
    features: s.features || [],
    metadata: s.metadata || {},
    createdAt: s.createdAt,
  };
};

/**
 * Fetches all subscriptions for a user across all sources (XlMembership, Pool Bookings, Direct Subscriptions).
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<Object>}
 */
export const getMySubscriptions = async (userId) => {
  const [directSubs, xlMemberships, poolMemberships] = await Promise.all([
    // 1. Direct subscriptions in the Subscription collection
    Subscription.find({ user: userId })
      .populate('ground', 'name address sport venueType photos pricePerHour')
      .sort({ createdAt: -1 }),

    // 2. Arena passes in XlMembership
    XlMembership.find({ user: userId })
      .populate('ground', 'name address sport venueType photos pricePerHour')
      .sort({ createdAt: -1 }),

    // 3. Pool passes stored as bookings with membershipPlanName
    Booking.find({
      player: userId,
      membershipPlanName: { $exists: true, $ne: '' },
    })
      .populate('ground', 'name address sport venueType photos pricePerHour')
      .sort({ createdAt: -1 }),
  ]);

  const allItems = [
    ...directSubs.map(formatDirectSubscription),
    ...xlMemberships.map(formatXlMembership),
    ...poolMemberships.map(formatPoolMembershipBooking),
  ];

  // Sort: active subscriptions first (sorted by expiresAt descending), then expired ones
  allItems.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
  });

  const activeSubscriptions = allItems.filter((item) => item.isActive);
  const pastSubscriptions = allItems.filter((item) => !item.isActive);

  return {
    totalCount: allItems.length,
    activeCount: activeSubscriptions.length,
    pastCount: pastSubscriptions.length,
    activeSubscriptions,
    pastSubscriptions,
    subscriptions: allItems,
  };
};

/**
 * Retrieves a single subscription by ID across all sources.
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} subscriptionId
 * @returns {Promise<Object|null>}
 */
export const getSubscriptionById = async (userId, subscriptionId) => {
  // Check direct Subscription model first
  const direct = await Subscription.findOne({ _id: subscriptionId, user: userId })
    .populate('ground', 'name address sport venueType photos pricePerHour');
  if (direct) return formatDirectSubscription(direct);

  // Check XlMembership
  const xl = await XlMembership.findOne({ _id: subscriptionId, user: userId })
    .populate('ground', 'name address sport venueType photos pricePerHour');
  if (xl) return formatXlMembership(xl);

  // Check Booking with membership
  const booking = await Booking.findOne({
    _id: subscriptionId,
    player: userId,
    membershipPlanName: { $exists: true, $ne: '' },
  }).populate('ground', 'name address sport venueType photos pricePerHour');
  if (booking) return formatPoolMembershipBooking(booking);

  return null;
};

/**
 * Creates a new direct subscription.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export const createSubscription = async (data) => {
  const sub = await Subscription.create(data);
  const populated = await Subscription.findById(sub._id).populate('ground', 'name address sport venueType photos');
  return formatDirectSubscription(populated);
};

export default {
  getMySubscriptions,
  getSubscriptionById,
  createSubscription,
};
