import LeadVenueDashboard from '../components/LeadVenueDashboard';

const PoolOwnerDashboard = () => (
  <LeadVenueDashboard
    venueType="pool"
    title="Pool Owner"
    subtitle="Manage your venue profile and free-trial leads"
    icon="🏊"
    namePlaceholder="e.g. Blue Wave Swimming Pool"
    descriptionPlaceholder="Pool size, lanes, timings, coaching, safety staff..."
    emptyLeadsHint="No leads yet — they'll show up here as soon as someone claims a trial or shows interest."
  />
);

export default PoolOwnerDashboard;
