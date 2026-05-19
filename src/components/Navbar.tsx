import React, { useEffect, useRef, useState } from 'react';
import { Film, Search, Menu, X, Monitor, Moon, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.tsx';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const ThemeIcon = theme === 'auto' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;
  const themeLabel = theme === 'auto' ? `Auto (${resolvedTheme})` : theme;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery)}`);
    }

    // If search is used from the mobile menu, close it.
    setIsMenuOpen(false);
  };

  const navItems = [
    { label: 'Movies', path: '/movies' },
    { label: 'Top Rated', path: '/top-rated' },
    { label: 'Coming Soon', path: '/coming-soon' },
    { label: 'Watchlist', path: '/watchlist' },
  ];

  const cycleTheme = () => {
    setTheme((currentTheme) => {
      if (currentTheme === 'auto') return 'light';
      if (currentTheme === 'light') return 'dark';
      return 'auto';
    });
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    // NOTE: menuWrapRef is used only for click-outside / Escape handling.
    // Styling-only change; no business logic or animation timing elsewhere is touched.

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const el = menuWrapRef.current;
      if (!el) return;
      if (event.target instanceof Node && el.contains(event.target)) return;
      setIsMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [isMenuOpen]);

  const renderThemeButton = () => (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Theme: ${themeLabel}`}
      title={`Theme: ${themeLabel}`}
      className="text-zinc-300 hover:text-white bg-zinc-900/80 p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
    >
      <ThemeIcon className="w-5 h-5" />
    </button>
  );

  return (
    <nav className="bg-black/70 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover-glow">
            <Film className="w-8 h-8 text-yellow-500" />
            <span className="text-xl font-bold text-glow">MovieDB</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies..."
                className="bg-zinc-900/80 backdrop-blur-md text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 w-64 transition-all"
              />
            </form>
            <div className="flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="text-zinc-300 hover:text-white transition-colors hover-glow"
                >
                  {item.label}
                </Link>
              ))}
              {renderThemeButton()}
            </div>
          </div>

          <button
            type="button"
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden" ref={menuWrapRef}>
            {/* Slide-down animation without changing any existing Framer Motion logic elsewhere */}
            <div className="py-4"> 
              <div className="flex flex-col gap-4">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="bg-white absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-600 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies..."
                    className="bg-zinc-900/80 backdrop-blur-md text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 w-full"
                  />
                </form>

                <div className="flex flex-col">
                  {navItems.map((item, idx) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-zinc-300 hover:text-white transition-colors min-h-[48px] flex items-center px-0 border-b border-zinc-800 last:border-b-0"
                    >
                      <span className="w-full py-2">{item.label}</span>
                    </Link>
                  ))}
                </div>

                <div>{renderThemeButton()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
