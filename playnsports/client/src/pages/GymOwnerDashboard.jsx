import LeadVenueDashboard from '../components/LeadVenueDashboard';

const GymOwnerDashboard = () => (
  <LeadVenueDashboard
    venueType="gym"
    title="Gym Owner"
    subtitle="Manage your venue profile and free-trial leads"
    icon="🏋️"
    namePlaceholder="e.g. Fitness Edge"
    descriptionPlaceholder="Equipment, trainers, timings, specialties..."
    emptyLeadsHint="No leads yet — they'll show up here as soon as someone claims a trial."
  />
);

export default GymOwnerDashboard;
