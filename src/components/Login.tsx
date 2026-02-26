import { useState } from 'react';

interface LoginProps {
  onClose?: () => void;
}

const Login = ({ onClose }: LoginProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState({
    email: '',
    password: ''
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
      email: '',
      password: ''
    };

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Handle login logic here
      console.log('Login attempt:', formData);
      alert('Login successful! (This is a demo)');
      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-2xl animate-slideUp">
        <div className="p-8 pb-5 text-center border-b border-gray-100 relative">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600 text-sm">Login to access your Ola Cars account</p>
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
            <label htmlFor="password" className="block mb-2 font-semibold text-gray-800 text-sm">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`w-full p-3 border-2 border-gray-200 rounded-lg text-sm transition-all duration-300 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/20 ${errors.password ? 'border-red-500' : ''}`}
            />
            {errors.password && <span className="block text-red-500 text-xs mt-1">{errors.password}</span>}
          </div>

          <div className="flex justify-between items-center mb-6">
            <label className="flex items-center cursor-pointer text-gray-600 text-sm">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="hidden"
              />
              <span className={`w-4.5 h-4.5 border-2 border-gray-300 rounded mr-2 relative transition-all duration-300 ${formData.rememberMe ? 'bg-primary border-primary' : ''}`}>
                {formData.rememberMe && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold">✓</span>
                )}
              </span>
              Remember me
            </label>
            <a href="#" className="text-primary text-sm font-medium transition-colors duration-300 hover:text-primary-dark">Forgot password?</a>
          </div>

          <button type="submit" className="w-full py-3 bg-gradient-to-r from-primary to-primary-light text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all duration-300 mb-5 hover:-translate-y-0.5 hover:shadow-lg">
            Login
          </button>
        </form>

        <div className="text-center mb-5 relative">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200"></div>
          <span className="bg-white px-4 text-gray-500 text-sm relative">OR</span>
        </div>

        <div className="px-8 pb-5 flex flex-col gap-2.5">
          <button className="flex items-center justify-center gap-2.5 p-3 border-2 border-gray-200 bg-white rounded-lg font-medium cursor-pointer transition-all duration-300 text-sm hover:bg-gray-50 hover:-translate-y-0.5">
            <span className="text-lg">🔍</span>
            Continue with Google
          </button>
          <button className="flex items-center justify-center gap-2.5 p-3 border-2 border-gray-200 bg-white rounded-lg font-medium cursor-pointer transition-all duration-300 text-sm hover:bg-gray-50 hover:-translate-y-0.5">
            <span className="text-lg">📘</span>
            Continue with Facebook
          </button>
        </div>

        <div className="p-5 pt-4 text-center border-t border-gray-100">
          <p className="text-gray-600 text-sm">Don't have an account? <a href="#" className="text-primary font-semibold transition-colors duration-300 hover:text-primary-dark">Sign up</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
