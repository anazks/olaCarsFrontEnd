import { Bell, Search, Settings } from 'lucide-react';

const TopBar = () => {
    return (
        <header
            className="flex items-center justify-between px-6 py-4 h-20 flex-shrink-0"
            style={{
                background: '#151515',
                borderBottom: '1px solid #2A2A2A'
            }}
        >
            {/* Search Bar */}
            <div className="flex-1 max-w-lg">
                <div
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                    style={{ background: '#111111', border: '1px solid #2A2A2A' }}
                >
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500"
                    />
                    <div className="flex items-center justify-center px-1.5 py-0.5 rounded textxs font-medium" style={{ background: '#1C1C1C', color: '#6B7280', border: '1px solid #2A2A2A' }}>
                        ⌘K
                    </div>
                </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-5 ml-4">
                <button
                    className="relative flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-gray-400 hover:text-white"
                >
                    <Bell size={20} />
                    <span
                        className="absolute top-1 right-2 w-2 h-2 rounded-full"
                        style={{ background: '#E74C3C' }}
                    />
                </button>

                <button
                    className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-gray-400 hover:text-white"
                >
                    <Settings size={20} />
                </button>

                {/* Profile Divider */}
                <div className="w-px h-8" style={{ background: '#2A2A2A' }} />

                {/* User Profile */}
                <div className="flex items-center gap-3 cursor-pointer group">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-white group-hover:text-lime transition-colors">Admin User</p>
                        <p className="text-xs text-gray-500">System Access</p>
                    </div>
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #0d0d0d 100%)', border: '1px solid #2A2A2A', color: '#C8E600' }}
                    >
                        AU
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
