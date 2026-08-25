export default function Page() {
    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-[32px] font-bold text-[#121212] tracking-tight">
                    Settings
                </h1>
                <p className="text-[14px] text-gray-500 font-medium mt-1">
                    This module is currently being built and will be available soon.
                </p>
            </div>
            <div className="bg-[#ffffff] border border-gray-200 rounded-2xl p-16 shadow-sm flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-[#10b981] rounded-full animate-spin"></div>
                </div>
                <h2 className="text-[20px] font-bold text-[#121212] mb-2">Coming Soon</h2>
                <p className="text-gray-500 text-[15px] text-center max-w-md">
                    We are putting the finishing touches on the Settings interface. Check back soon for updates.
                </p>
            </div>
        </div>
    );
}
