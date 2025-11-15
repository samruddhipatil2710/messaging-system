import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import './NewLoginTheme.css';

const Login = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login(mobile, password);

    if (result.success) {
      // Navigate to the appropriate dashboard based on user role
      const roleRoutes = {
        'main_admin': '/main-admin',
        'super_admin': '/super-admin',
        'admin': '/admin',
        'user': '/user'
      };
      navigate(roleRoutes[result.user.role] || '/login');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Left Side - Branding */}
        <div className="left-panel">
          <div className="branding-content">
            <h1 className="brand-name">Messaging-System</h1>
            <p className="greeting">Nice to see you again</p>
            <h2 className="welcome-text">WELCOME BACK</h2>
            <div className="divider"></div>
            <p className="description">
              Welcome to Messaging-System Admin Panel - Manage districts, talukas, cities, and send messages to people in your area.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="right-panel">
          <div className="login-form-wrapper">
            <div className="logo-container">
              <div className="logo-circle">
                <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                  <path d="M30 10 L42 28 L30 38 L18 28 Z" fill="#2563eb"/>
                  <path d="M30 28 L42 40 L30 50 L18 40 Z" fill="#06b6d4"/>
                </svg>
              </div>
              <div className="logo-text">
                <span className="logo-main">Messaging</span>
                <span className="logo-sub">SYSTEM</span>
              </div>
            </div>

            <h2 className="login-title">Admin Login</h2>
            <p className="login-subtitle">Hello, welcome back to Messaging-System</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <input
                type="tel"
                placeholder="Mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="input-field"
                required
              />

              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />

              <button type="submit" className="login-button">
                LOGIN
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;