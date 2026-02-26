import { useState } from 'react';

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Cars' },
    { id: 'economy', name: 'Economy' },
    { id: 'sedan', name: 'Sedan' },
    { id: 'suv', name: 'SUV' },
    { id: 'luxury', name: 'Luxury' },
  ];

  const cars = [
    { id: 1, name: 'Swift Dzire', category: 'economy', price: 299, image: '🚗', features: ['AC', 'Music System', '5 Seats', 'Manual'], rating: 4.5, available: true },
    { id: 2, name: 'Honda City', category: 'sedan', price: 499, image: '🚙', features: ['AC', 'GPS', '5 Seats', 'Automatic'], rating: 4.7, available: true },
    { id: 3, name: 'Toyota Innova', category: 'suv', price: 799, image: '🚐', features: ['AC', 'GPS', '7 Seats', 'Automatic'], rating: 4.6, available: true },
    { id: 4, name: 'Mercedes C-Class', category: 'luxury', price: 1999, image: '🏎️', features: ['Leather Seats', 'GPS', '5 Seats', 'Automatic'], rating: 4.9, available: false },
    { id: 5, name: 'Maruti Baleno', category: 'economy', price: 349, image: '🚗', features: ['AC', 'Music System', '5 Seats', 'Manual'], rating: 4.4, available: true },
    { id: 6, name: 'Hyundai Creta', category: 'suv', price: 699, image: '🚙', features: ['AC', 'GPS', '5 Seats', 'Automatic'], rating: 4.5, available: true },
  ];

  const filteredCars = selectedCategory === 'all'
    ? cars
    : cars.filter((c) => c.category === selectedCategory);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < Math.floor(rating) ? '#C8E600' : '#3a3a3a' }}>★</span>
    ));

  return (
    <section id="products" className="py-28 relative overflow-hidden" style={{ background: '#111111' }}>
      {/* Background glow */}
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at bottom right, rgba(200,230,0,0.05) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 relative z-10">
        {/* Heading */}
        <div className="text-center mb-16 reveal">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest mb-4 px-4 py-2 rounded-full"
            style={{
              background: 'rgba(200,230,0,0.1)',
              color: '#C8E600',
              border: '1px solid rgba(200,230,0,0.2)',
            }}
          >
            Our Fleet
          </span>
          <h2 className="section-title text-white">Premium Vehicles</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
            Choose from our wide range of well-maintained vehicles for every road and every occasion.
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex justify-center gap-3 mb-14 flex-wrap reveal delay-200">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-6 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition-all duration-300 border"
                style={{
                  background: active ? '#C8E600' : 'transparent',
                  color: active ? '#0A0A0A' : '#9ca3af',
                  borderColor: active ? '#C8E600' : '#2A2A2A',
                  transform: active ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: active ? '0 8px 24px rgba(200,230,0,0.25)' : 'none',
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Car grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredCars.map((car, idx) => (
            <div
              key={car.id}
              className={`reveal rounded-2xl overflow-hidden transition-all duration-400 group ${idx % 3 === 0 ? '' : idx % 3 === 1 ? 'delay-200' : 'delay-400'
                } ${!car.available ? 'opacity-60' : ''}`}
              style={{
                background: '#1C1C1C',
                border: '1px solid #2A2A2A',
              }}
              onMouseEnter={(e) => {
                if (!car.available) return;
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = 'rgba(200,230,0,0.4)';
                el.style.transform = 'translateY(-6px)';
                el.style.boxShadow = '0 24px 60px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#2A2A2A';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Image area */}
              <div
                className="relative h-44 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
                  borderBottom: '1px solid #2A2A2A',
                }}
              >
                <span
                  className="text-7xl select-none transition-transform duration-500 group-hover:scale-110"
                >
                  {car.image}
                </span>

                {!car.available && (
                  <div
                    className="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs font-bold"
                    style={{ background: '#E74C3C' }}
                  >
                    Unavailable
                  </div>
                )}

                {car.available && (
                  <div
                    className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(200,230,0,0.15)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.3)' }}
                  >
                    Available
                  </div>
                )}

                {/* Lime bar on hover */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: '#C8E600' }}
                />
              </div>

              {/* Details */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{car.name}</h3>

                {/* Stars */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-base">{renderStars(car.rating)}</div>
                  <span className="text-xs text-gray-500">({car.rating})</span>
                </div>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {car.features.map((feature, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full font-medium"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid #2A2A2A' }}
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-black" style={{ color: '#C8E600' }}>₹{car.price}</span>
                  <span className="text-sm text-gray-500">/day</span>
                </div>

                {/* CTA */}
                <button
                  disabled={!car.available}
                  className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all duration-300 border-none"
                  style={{
                    background: car.available
                      ? '#C8E600'
                      : 'rgba(255,255,255,0.05)',
                    color: car.available ? '#0A0A0A' : '#6B7280',
                    cursor: car.available ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={(e) => {
                    if (!car.available) return;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(200,230,0,0.35)';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {car.available ? 'Book Now →' : 'Currently Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;
