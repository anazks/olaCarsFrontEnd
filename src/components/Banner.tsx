const Banner = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #111111 50%, #0a1a00 100%)' }}
    >
      {/* Decorative orbs */}
      <div
        className="orb orb-lime"
        style={{ width: 500, height: 500, top: '-100px', left: '-150px', animationDuration: '8s' }}
      />
      <div
        className="orb orb-lime"
        style={{ width: 300, height: 300, bottom: '0px', right: '-80px', animationDuration: '6s', animationDelay: '2s' }}
      />
      <div className="hero-noise" />

      {/* Grid lines overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,230,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,230,0,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 relative z-10 pt-28 pb-20 w-full">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest mb-6 animate-fadeInUp"
              style={{
                background: 'rgba(200,230,0,0.12)',
                border: '1px solid rgba(200,230,0,0.3)',
                color: '#C8E600',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-lime inline-block animate-pulse" />
              Premium Car Rentals · India's #1
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-[1.05] mb-6 text-white animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              Drive Your
              <br />
              <span className="text-gradient-lime">Dreams</span>
              <br />
              <span className="text-white">with Ola Cars</span>
            </h1>

            <p
              className="text-base md:text-lg text-gray-400 leading-relaxed mb-10 max-w-lg animate-fadeInUp"
              style={{ animationDelay: '0.25s' }}
            >
              Premium, insured vehicles at your fingertips. Daily commute, weekend getaways,
              or luxury occasions — we have the perfect car for every journey.
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mb-10 animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
              {[
                { value: '500+', label: 'Premium Cars' },
                { value: '50K+', label: 'Happy Drivers' },
                { value: '24/7', label: 'Support' },
              ].map((stat) => (
                <div key={stat.label}>
                  <h3 className="text-3xl font-black" style={{ color: '#C8E600' }}>
                    {stat.value}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 animate-fadeInUp" style={{ animationDelay: '0.45s' }}>
              <button className="btn-primary text-base px-9 py-4">
                Start Driving →
              </button>
              <button className="btn-secondary text-base px-9 py-4">
                View Fleet
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 mt-8 animate-fadeInUp" style={{ animationDelay: '0.55s' }}>
              {['✓ Fully Insured', '✓ GPS Tracking', '✓ Instant Booking'].map((badge) => (
                <span
                  key={badge}
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#9ca3af',
                  }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Right — vehicle cards */}
          <div className="hidden md:flex flex-col gap-4 animate-slideInRight" style={{ animationDelay: '0.6s' }}>
            {[
              { icon: '🚗', name: 'Premium Sedan', tagline: 'From ₹299/day', highlight: true },
              { icon: '🚙', name: 'SUV', tagline: 'From ₹499/day', highlight: false },
              { icon: '🏎️', name: 'Luxury', tagline: 'From ₹999/day', highlight: false },
            ].map((car, i) => (
              <div
                key={car.name}
                className="flex items-center gap-4 rounded-2xl px-6 py-4 cursor-pointer transition-all duration-300 group"
                style={{
                  background: car.highlight
                    ? 'rgba(200,230,0,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: car.highlight
                    ? '1px solid rgba(200,230,0,0.35)'
                    : '1px solid rgba(255,255,255,0.08)',
                  transform: car.highlight ? 'scale(1.04)' : 'scale(1)',
                  backdropFilter: 'blur(12px)',
                  animationDelay: `${0.65 + i * 0.15}s`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05) translateX(-6px)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,230,0,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = car.highlight ? 'scale(1.04)' : 'scale(1)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = car.highlight
                    ? 'rgba(200,230,0,0.35)'
                    : 'rgba(255,255,255,0.08)';
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{
                    background: car.highlight
                      ? 'rgba(200,230,0,0.2)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                >
                  {car.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm">{car.name}</h4>
                  <p className="text-xs mt-0.5" style={{ color: '#C8E600' }}>{car.tagline}</p>
                </div>
                {car.highlight && (
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                  >
                    Popular
                  </span>
                )}
              </div>
            ))}

            {/* floating card stat */}
            <div
              className="rounded-2xl px-6 py-5 mt-2 animate-floatY"
              style={{
                background: 'rgba(28,28,28,0.9)',
                border: '1px solid #2A2A2A',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-gray-400 text-xs mb-1">Average savings vs. traditional rental</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black" style={{ color: '#C8E600' }}>35%</span>
                <span className="text-green-400 text-sm font-medium mb-1">↑ more affordable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block' }}>
          <path
            d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
            fill="#1C1C1C"
          />
        </svg>
      </div>
    </section>
  );
};

export default Banner;
