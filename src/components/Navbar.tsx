import { useState, useEffect } from 'react';

interface NavbarProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

const Navbar = ({ onLoginClick, onSignupClick }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '#home', label: 'Home' },
    { href: '#services', label: 'Services' },
    { href: '#products', label: 'Our Fleet' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled
          ? 'bg-dark-bg/95 backdrop-blur-xl shadow-[0_4px_32px_rgba(0,0,0,0.6)] border-b border-dark-border'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-5 flex justify-between items-center h-20">

        {/* Logo */}
        <a href="#home" className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-base"
            style={{ background: '#C8E600', color: '#0A0A0A' }}
          >
            OC
          </div>
          <span className="text-xl font-bold text-white">
            Ola <span style={{ color: '#C8E600' }}>Cars</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-gray-300 font-medium text-sm transition-colors duration-300 hover:text-white group"
            >
              {link.label}
              <span
                className="absolute -bottom-1 left-0 h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-full"
                style={{ background: '#C8E600' }}
              />
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            className="px-5 py-2.5 rounded-full font-semibold text-sm border-2 cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
            style={{
              borderColor: '#C8E600',
              color: '#C8E600',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#C8E600';
              (e.currentTarget as HTMLButtonElement).style.color = '#0A0A0A';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#C8E600';
            }}
            onClick={onLoginClick}
          >
            Login
          </button>
          <button
            className="px-5 py-2.5 rounded-full font-semibold text-sm border-none cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(200,230,0,0.4)]"
            style={{ background: '#C8E600', color: '#0A0A0A' }}
            onClick={onSignupClick}
          >
            Sign Up
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 cursor-pointer bg-transparent border-none p-1"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-0.5 bg-white block transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`}
          />
          <span
            className={`w-6 h-0.5 bg-white block transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''
              }`}
          />
          <span
            className={`w-6 h-0.5 bg-white block transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        style={{
          background: 'rgba(17,17,17,0.98)',
          borderTop: '1px solid #2A2A2A',
        }}
      >
        <div className="px-5 py-6 flex flex-col gap-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-300 font-medium text-base hover:text-white transition-colors duration-200"
              style={{ borderBottom: '1px solid #2A2A2A', paddingBottom: '12px' }}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 py-2.5 rounded-full font-semibold text-sm border-2 cursor-pointer transition-all duration-300"
              style={{ borderColor: '#C8E600', color: '#C8E600', background: 'transparent' }}
              onClick={() => { onLoginClick?.(); setIsMenuOpen(false); }}
            >
              Login
            </button>
            <button
              className="flex-1 py-2.5 rounded-full font-semibold text-sm border-none cursor-pointer transition-all duration-300"
              style={{ background: '#C8E600', color: '#0A0A0A' }}
              onClick={() => { onSignupClick?.(); setIsMenuOpen(false); }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
