import { 
  Zap, LayoutDashboard, PieChart, MessageSquare, 
  LifeBuoy, Users, Archive, FileText, CheckCircle, 
  AlertCircle, Rocket, Monitor 
} from "lucide-react";

const Sidebar = () => {
  return (
    <aside className="w-72 h-screen bg-[#F8F9FA] border-r border-gray-100 flex flex-col p-6 sticky top-0">
      {/* Logo Section */}
      <div className="flex items-center justify-between mb-10">
        <div className="bg-yellow-400 p-2 rounded-xl shadow-sm">
          <Zap className="text-black fill-black" size={24} />
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          <Monitor size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Favorites Section */}
      <div className="mb-8">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Favorites</p>
        <div className="space-y-1">
          <NavItem icon={<FileText size={18} />} label="Technical Docs" />
          <NavItem icon={<CheckCircle size={18} />} label="Campaign Guideliness" />
          <NavItem icon={<AlertCircle size={18} />} label="Important Rules" />
          <NavItem icon={<Rocket size={18} />} label="Onboarding" />
        </div>
      </div>

      {/* Main Menu Section */}
      <div className="flex-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Main Menu</p>
        <div className="space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem icon={<PieChart size={18} />} label="Campaigns" active />
          <NavItem icon={<MessageSquare size={18} />} label="Chat" />
          <NavItem icon={<LifeBuoy size={18} />} label="Support Center" />
          <NavItem icon={<Users size={18} />} label="Leads" />
          <NavItem icon={<Archive size={18} />} label="Archive" />
        </div>
      </div>

      {/* Bottom Promo Card (Chrome Extension) */}
      <div className="mt-auto bg-gradient-to-br from-green-100 to-yellow-100 p-4 rounded-2xl flex items-center gap-3">
        <div className="bg-white p-2 rounded-lg shadow-sm">
          <img src="https://www.google.com/s2/favicons?domain=google.com&sz=32" alt="chrome" className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800">Get the extension</p>
          <p className="text-[10px] text-gray-500 underline cursor-pointer">Install Now</p>
        </div>
      </div>
    </aside>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <div className={`
    flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200
    ${active 
      ? 'bg-white shadow-sm text-gray-900 font-semibold border border-gray-100' 
      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
  `}>
    <span className={active ? "text-gray-900" : "text-gray-400"}>{icon}</span>
    <span className="text-[14px]">{label}</span>
  </div>
);

export default Sidebar;