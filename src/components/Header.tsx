import React from 'react';
import { Lock, PlusCircle, Inbox } from 'lucide-react';

interface HeaderProps {
  isAdminLoggedIn: boolean;
  onOpenAdminModal: () => void;
  onOpenPublicAddModal: () => void;
  onLogout: () => void;
  onScrollToSection: (id: string) => void;
  pendingInboxCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdminLoggedIn,
  onOpenAdminModal,
  onOpenPublicAddModal,
  onLogout,
  onScrollToSection,
  pendingInboxCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DECE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          className="text-xl md:text-2xl font-bold tracking-tight text-[#2C2724] font-display whitespace-nowrap shrink-0 hover:text-[#C86446] transition-colors"
        >
          Foodie Jewdie
        </a>

        {/* Zone 2: Navigation Links including Add Location */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#524B43]">
          <button
            onClick={() => onScrollToSection('map-section')}
            className="hover:text-[#C86446] transition-colors whitespace-nowrap shrink-0"
          >
            Interactive Map
          </button>
          <button
            onClick={() => onScrollToSection('filter-section')}
            className="hover:text-[#C86446] transition-colors whitespace-nowrap shrink-0"
          >
            Distance Filter
          </button>
          <button
            onClick={() => onScrollToSection('directory-section')}
            className="hover:text-[#C86446] transition-colors whitespace-nowrap shrink-0"
          >
            All Locations
          </button>
          <button
            onClick={onOpenPublicAddModal}
            className="text-[#C86446] hover:text-[#A84F35] font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 bg-[#C86446]/10 px-3 py-1.5 rounded-xl border border-[#C86446]/25 hover:bg-[#C86446]/15"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        </nav>

        {/* Zone 3: Actions in the Corner */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Public Mobile Add Location button */}
          <button
            onClick={onOpenPublicAddModal}
            className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#C86446] hover:bg-[#A84F35] rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Location</span>
          </button>

          {isAdminLoggedIn ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenAdminModal}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2C2724] hover:bg-[#1A1817] rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0"
                title="Admin Portal & Inbox"
              >
                <Inbox className="w-3.5 h-3.5 text-[#C86446]" />
                <span>Admin Portal</span>
                {pendingInboxCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#C86446] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {pendingInboxCount}
                  </span>
                )}
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-[#7B7268] hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                title="Log Out (Admin Active)"
                aria-label="Log Out"
              >
                <Lock className="w-4 h-4 text-emerald-700" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminModal}
              className="p-2 text-[#524B43] hover:text-[#C86446] bg-white hover:bg-[#FAF7F2] border border-[#E5DECE] hover:border-[#C86446]/50 rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center relative"
              title="Admin Login"
              aria-label="Admin Login"
            >
              <Lock className="w-4 h-4 text-[#C86446]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
