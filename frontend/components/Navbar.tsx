import { Search, Calendar, Filter } from "lucide-react";

const Navbar = () => {
  return (
    <header className="h-20 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md sticky top-0 z-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Campaigns</span>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-medium">Analytics</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600" size={18} />
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-[#F3F4F6] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-gray-200 outline-none transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 border px-1.5 py-0.5 rounded uppercase font-bold">⌘ /</span>
        </div>

        {/* Date Selector */}
        <button className="flex items-center gap-2 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
          <Calendar size={18} className="text-gray-500" />
          <span>Select Dates</span>
        </button>

        {/* Filter Button */}
        <button className="flex items-center gap-2 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
          <Filter size={18} className="text-gray-500" />
          <span>Filter</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;