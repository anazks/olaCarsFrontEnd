const Services = () => {
  const services = [
    {
      icon: '🚗',
      title: 'Daily Rentals',
      description: 'Flexible daily commute options with competitive rates and multiple pickup locations city-wide.',
      features: ['Hourly rates available', 'Multiple pickup points', 'Insurance included'],
      accent: '#C8E600',
    },
    {
      icon: '✈️',
      title: 'Airport Transfers',
      description: 'Hassle-free airport rides with professional drivers, flight tracking, and luggage help.',
      features: ['Meet & greet service', 'Flight tracking', 'Luggage assistance'],
      accent: '#C8E600',
    },
    {
      icon: '💼',
      title: 'Business Travel',
      description: 'Corporate fleet management with premium executive vehicles and dedicated account teams.',
      features: ['Monthly billing', 'Priority support', 'Executive vehicles'],
      accent: '#C8E600',
    },
    {
      icon: '🎉',
      title: 'Special Events',
      description: 'Make every occasion memorable with our luxury fleet and professional chauffeur service.',
      features: ['Wedding packages', 'Event decoration', 'Chauffeur service'],
      accent: '#C8E600',
    },
    {
      icon: '📱',
      title: 'Self-Drive',
      description: 'Freedom to explore at your pace with well-maintained, GPS-equipped self-drive vehicles.',
      features: ['24/7 roadside assistance', 'GPS navigation', 'Flexible durations'],
      accent: '#C8E600',
    },
    {
      icon: '👥',
      title: 'Corporate Leasing',
      description: 'Long-term fleet solutions with customized packages, driver verification, and maintenance.',
      features: ['Fleet management', 'Maintenance included', 'Driver verification'],
      accent: '#C8E600',
    },
  ];

  return (
    <section id="services" className="py-28 relative overflow-hidden" style={{ background: '#1C1C1C' }}>
      {/* Background accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(200,230,0,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 relative z-10">
        {/* Heading */}
        <div className="text-center mb-20 reveal">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(200,230,0,0.1)',
              color: '#C8E600',
              border: '1px solid rgba(200,230,0,0.2)',
            }}
          >
            What We Offer
          </span>
          <h2 className="section-title text-white">Our Premium Services</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
            Comprehensive car rental solutions crafted for every journey, every need, every driver.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className={`reveal rounded-2xl p-8 group cursor-pointer transition-all duration-400 relative overflow-hidden ${index % 3 === 0 ? '' : index % 3 === 1 ? 'delay-200' : 'delay-400'
                }`}
              style={{
                background: '#111111',
                border: '1px solid #2A2A2A',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'rgba(200,230,0,0.4)';
                el.style.transform = 'translateY(-6px)';
                el.style.boxShadow = '0 20px 60px rgba(200,230,0,0.1)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#2A2A2A';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Top lime bar */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, #C8E600, #d8f200)' }}
              />

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 transition-all duration-300 group-hover:scale-110"
                style={{ background: 'rgba(200,230,0,0.1)', border: '1px solid rgba(200,230,0,0.2)' }}
              >
                {service.icon}
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">{service.description}</p>

              <ul className="space-y-2 mb-6">
                {service.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="text-sm font-semibold transition-all duration-300 flex items-center gap-1 group-hover:gap-2"
                style={{ color: '#C8E600', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Learn More <span>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
