const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      id="contact"
      className="relative pt-20 pb-8 overflow-hidden"
      style={{ background: '#0A0A0A', borderTop: '1px solid #2A2A2A' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[200px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(200,230,0,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 relative z-10">

        {/* CTA Banner */}
        <div
          className="rounded-3xl p-10 mb-16 text-center reveal overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, rgba(200,230,0,0.12) 0%, rgba(200,230,0,0.04) 100%)',
            border: '1px solid rgba(200,230,0,0.2)',
          }}
        >
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(200,230,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(200,230,0,0.5) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <h3 className="text-3xl md:text-4xl font-black text-white mb-3 relative z-10">
            Ready to hit the road?
          </h3>
          <p className="text-gray-400 mb-7 relative z-10">
            Join 50,000+ happy drivers across India. Book your perfect car in under 2 minutes.
          </p>
          <button
            className="btn-primary text-base px-10 py-4 relative z-10"
          >
            Get Started Free →
          </button>
        </div>

        {/* Main footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14 reveal delay-200">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
                style={{ background: '#C8E600', color: '#0A0A0A' }}
              >
                OC
              </div>
              <span className="text-2xl font-black text-white">
                Ola <span style={{ color: '#C8E600' }}>Cars</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs">
              Your trusted partner for premium car rental services across India. Drive with confidence, style, and value.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {['📘', '🐦', '📷', '💼'].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid #2A2A2A',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#C8E600';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#C8E600';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2A2A2A';
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { href: '#home', label: 'Home' },
                { href: '#services', label: 'Services' },
                { href: '#products', label: 'Our Fleet' },
                { href: '#about', label: 'About Us' },
                { href: '#contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-gray-500 text-sm transition-all duration-200 hover:pl-1"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#C8E600'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = ''; }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">Services</h4>
            <ul className="space-y-3">
              {['Daily Rentals', 'Airport Transfers', 'Business Travel', 'Self-Drive', 'Corporate Leasing'].map((s) => (
                <li key={s}>
                  <a
                    href="#services"
                    className="text-gray-500 text-sm transition-all duration-200 hover:pl-1"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#C8E600'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = ''; }}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & App */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-widest mb-5">Contact Us</h4>
            <div className="space-y-3 mb-6">
              {[
                { icon: '📍', text: '123 MG Road, Bangalore 560001' },
                { icon: '📞', text: '+91 98765 43210' },
                { icon: '✉️', text: 'support@olacars.com' },
                { icon: '⏰', text: '24/7 Support Available' },
              ].map((item) => (
                <div key={item.icon} className="flex items-start gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-gray-500 text-xs leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>

            {/* App download */}
            <div className="flex flex-col gap-2">
              {[
                { icon: '📱', sub: 'Download on the', title: 'App Store' },
                { icon: '🤖', sub: 'Get it on', title: 'Google Play' },
              ].map((app) => (
                <button
                  key={app.title}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer transition-all duration-200 border"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: '#2A2A2A' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,230,0,0.3)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2A2A';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  <span className="text-xl">{app.icon}</span>
                  <div>
                    <small className="text-gray-500 text-xs block">{app.sub}</small>
                    <strong className="text-white text-xs">{app.title}</strong>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-lime" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6">
          <p className="text-gray-600 text-xs">© {year} Ola Cars. All rights reserved.</p>
          <div className="flex gap-6 flex-wrap justify-center">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Sitemap'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-gray-600 text-xs transition-colors duration-200"
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#C8E600'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = ''; }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
