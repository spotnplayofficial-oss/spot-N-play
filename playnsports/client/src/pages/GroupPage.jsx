import Navbar from '../components/Navbar';
import GroupsSection from '../components/GroupsSection';

const GroupPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-800 dark:text-gray-200 transition-colors">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <GroupsSection />
      </div>
    </div>
  );
};

export default GroupPage;