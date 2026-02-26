import { useState } from 'react';

interface SignupProps {
  onClose?: () => void;
}

const Signup = ({ onClose }: SignupProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: ''
    };

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Handle signup logic here
      console.log('Signup attempt:', formData);
      alert('Account created successfully! (This is a demo)');
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-2xl animate-slideUp">
        <div className="p-8 pb-5 text-center border-b border-gray-100 relative">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600 text-sm">Join Ola Cars and start your journey</p>
          {onClose && (
            <button
              className="absolute top-5 right-5 bg-none border-none text-2xl cursor-pointer text-gray-500 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-gray-100 hover:text-gray-700"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>

        <form className="p-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label htmlFor="firstName" className="block mb-2 font-semibold text-gray-800 text-sm">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.firstName ? 'border-red-500' : ''}`}
              />
              {errors.firstName && <span className="block text-red-500 text-xs mt-1">{errors.firstName}</span>}
            </div>

            <div>
              <label htmlFor="lastName" className="block mb-2 font-semibold text-gray-800 text-sm">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.lastName ? 'border-red-500' : ''}`}
              />
              {errors.lastName && <span className="block text-red-500 text-xs mt-1">{errors.lastName}</span>}
            </div>
          </div>

          <div className="mb-5">
            <label htmlFor="email" className="block mb-2 font-semibold text-gray-800 text-sm">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <span className="block text-red-500 text-xs mt-1">{errors.email}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="phone" className="block mb-2 font-semibold text-gray-800 text-sm">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter 10-digit phone number"
              className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && <span className="block text-red-500 text-xs mt-1">{errors.phone}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="block mb-2 font-semibold text-gray-800 text-sm">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.password ? 'border-red-500' : ''}`}
            />
            {errors.password && <span className="block text-red-500 text-xs mt-1">{errors.password}</span>}
          </div>

          <div className="mb-5">
            <label htmlFor="confirmPassword" className="block mb-2 font-semibold text-gray-800 text-sm">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {errors.confirmPassword && <span className="block text-red-500 text-xs mt-1">{errors.confirmPassword}</span>}
          </div>

          <div className="mb-6">
            <label className="flex items-start cursor-pointer text-gray-600 text-sm leading-relaxed">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="hidden"
              />
              <span className={`w-4.5 h-4.5 border-2 border-gray-300 rounded mr-2 relative transition-all duration-300 mt-0.5 flex-shrink-0 ${formData.agreeToTerms ? 'bg-primary border-primary' : ''}`}>
                {formData.agreeToTerms && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">✓</span>
                )}
              </span>
              I agree to the <a href="#" className="text-primary font-medium transition-colors duration-300 hover:text-primary-dark">Terms & Conditions</a> and <a href="#" className="text-primary font-medium transition-colors duration-300 hover:text-primary-dark">Privacy Policy</a>
            </label>
            {errors.agreeToTerms && <span className="block text-red-500 text-xs mt-1">{errors.agreeToTerms}</span>}
          </div>

          <button type="submit" className="w-full py-3 bg-gradient-to-r from-primary to-primary-light text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 mb-5 hover:-translate-y-0.5 hover:shadow-lg">
            Create Account
          </button>
        </form>

        <div className="text-center mb-5 relative">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200"></div>
          <span className="bg-white px-4 text-gray-500 text-sm relative">OR</span>
        </div>

        <div className="px-8 pb-5 flex flex-col gap-2.5">
          <button className="flex items-center justify-center gap-2.5 p-3 border-2 border-gray-200 bg-white rounded-lg font-medium cursor-pointer transition-all duration-300 text-sm hover:bg-gray-50 hover:-translate-y-0.5">
            <span className="text-lg">🔍</span>
            Sign up with Google
          </button>
          <button className="flex items-center justify-center gap-2.5 p-3 border-2 border-gray-200 bg-white rounded-lg font-medium cursor-pointer transition-all duration-300 text-sm hover:bg-gray-50 hover:-translate-y-0.5">
            <span className="text-lg">📘</span>
            Sign up with Facebook
          </button>
        </div>

        <div className="p-5 pt-4 text-center border-t border-gray-100">
          <p className="text-gray-600 text-sm">Already have an account? <a href="#" className="text-primary font-semibold transition-colors duration-300 hover:text-primary-dark">Login</a></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
