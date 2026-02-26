import { Car, Activity, DollarSign, Calendar } from 'lucide-react';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';

const ExecutiveDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* Header Area */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Executive Dashboard</h1>
                    <p className="text-gray-400 text-sm">Welcome back. Here is your system overview.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-gray-300">
                        <Calendar size={16} /> 02/03/2023
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-gray-300">
                        Active notifications <span className="text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center ml-1 pb-px">4</span>
                    </button>
                </div>
            </div>

            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Fleet Total"
                    title="registered"
                    value="100"
                    icon={<><Car size={14} /> 100</>}
                    color="#148F85" // Teal
                />
                <StatCard
                    superTitle="Active Vehicles"
                    title="Assigned & operating"
                    value="86"
                    icon={<><Activity size={14} /> 86</>}
                    color="#116A5A" // Dark Green
                />
                <StatCard
                    superTitle="Collections (Week)"
                    title="collected this week"
                    value="$21840"
                    subValue="+ 11%"
                    icon={<><DollarSign size={14} /></>}
                    color="#1F2937" // Dark Gray
                />

                {/* Alerts Side Block */}
                <div className="grid grid-cols-2 gap-3">
                    <AlertCard
                        title="Total alerts"
                        count={25}
                        desc=""
                        color="#EF4444" // Red
                    />
                    <AlertCard
                        title="Overdue Maintenance"
                        count={6}
                        desc="!!! "
                        color="#F97316" // Orange
                    />
                </div>
            </div>

            {/* Trend & Data Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Graph Area (Left 2 cols) */}
                <div className="lg:col-span-2 bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-6 shadow-lg">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">94% Collection Trend</p>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400 text-sm font-bold bg-green-400/10 px-2 py-1 rounded">+2% week over week</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">$21,840</h3>
                            <p className="text-gray-500 text-xs">Last 12 months</p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">$29,880</h3>
                            <p className="text-orange-500 text-xs">+11% vs Origin anterior</p>
                        </div>
                    </div>

                    <div className="bg-[#15171e] rounded-xl border border-[#2A2A2A] p-5 h-[300px] flex flex-col justify-between relative overflow-hidden">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-semibold text-white">Collections Trend</h3>
                            <div className="flex bg-[#1E232E] rounded-lg p-1">
                                {['1W', '1M', '3M', '1Y'].map(t => (
                                    <button key={t} className={`px-3 py-1 rounded-md text-xs font-bold ${t === '1Y' ? 'bg-[#148F85] text-white' : 'text-gray-400'} border-none`}>{t}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-8 mb-6 relative z-10">
                            <div>
                                <span className="text-xs text-[#148F85] flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#148F85]"></div> Collected</span>
                                <h4 className="text-xl font-bold text-white">$842,120</h4>
                            </div>
                            <div>
                                <span className="text-xs text-blue-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Plan</span>
                                <h4 className="text-xl font-bold text-white">$872,000</h4>
                            </div>
                        </div>

                        {/* Placeholder for actual Chart.js / Recharts */}
                        <div className="flex-1 w-full border-t border-b border-[#2A2A2A]/50 relative mt-4">
                            {/* Fake SVG line representing the chart */}
                            <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path d="M0,80 Q20,75 40,65 T80,30 T100,10" fill="none" stroke="#148F85" strokeWidth="2" strokeLinecap="round" />
                                <path d="M0,85 Q20,80 40,70 T80,45 T100,20" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Right Side Info column */}
                <div className="space-y-6">
                    {/* Task Overview */}
                    <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-5 shadow-lg">
                        <h4 className="font-bold text-white mb-4">Task Overview</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                <span className="text-red-500 font-bold block bg-white rounded-full w-5 h-5 mx-auto mb-1 text-xs leading-5">!</span>
                                <h3 className="text-xl font-bold text-white">18</h3>
                                <p className="text-xs text-gray-400">Overdue</p>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                                <div className="w-5 h-5 bg-orange-500 rounded-full mx-auto mb-1"></div>
                                <h3 className="text-xl font-bold text-white">11</h3>
                                <p className="text-xs text-gray-400">Upcoming</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                                <div className="text-green-500 bg-white rounded-full w-5 h-5 mx-auto mb-1 text-xs leading-5">✓</div>
                                <h3 className="text-xl font-bold text-white">7</h3>
                                <p className="text-xs text-gray-400">Assigned</p>
                            </div>
                        </div>
                    </div>

                    {/* General Info */}
                    <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-5 shadow-lg">
                        <h4 className="font-bold text-white mb-4">General Info</h4>
                        <div className="flex justify-between items-center text-center">
                            <div>
                                <span className="text-xl font-bold text-white">92</span>
                                <p className="text-xs text-gray-400">Chauffeurs</p>
                            </div>
                            <div className="w-px h-8 bg-[#2A2A2A]"></div>
                            <div>
                                <span className="text-xl font-bold text-white text-green-400">97</span>
                                <p className="text-xs text-gray-400">GPS Online</p>
                            </div>
                            <div className="w-px h-8 bg-[#2A2A2A]"></div>
                            <div>
                                <span className="text-xl font-bold text-white">1,284</span>
                                <p className="text-xs text-gray-400">SKUs</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Tabs/Table Placeholder */}
            <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg overflow-hidden">
                <div className="flex border-b border-[#2A2A2A] px-4">
                    {['Overview', 'Vehicles & Drivers', 'Collections', 'Risk & Maintenance'].map((tab, i) => (
                        <button
                            key={tab}
                            className={`px-6 py-4 text-sm font-semibold border-b-2 bg-transparent ${i === 0 ? 'text-[#148F85] border-[#148F85]' : 'text-gray-500 border-transparent hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="p-6 flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Total Vehicles</p>
                        <h2 className="text-4xl text-[#148F85] font-bold">100</h2>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Active Vehicles</p>
                        <h2 className="text-4xl text-white font-bold">86</h2>
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-bold">+2% this week</span>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Assigned Vehicles</p>
                        <h2 className="text-4xl text-[#148F85] font-bold">86</h2>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Unassigned Vehicles</p>
                        <h2 className="text-4xl text-white font-bold">8 <span className="text-xs text-gray-500 font-normal">Monthly Target</span></h2>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default ExecutiveDashboard;
