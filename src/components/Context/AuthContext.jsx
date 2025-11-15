import { createContext, useState, useContext, useEffect } from 'react';
import { loginWithMobile, logout as firebaseLogout, onAuthChange } from '../../firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in sessionStorage
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate that user object has required fields
        if (parsedUser && parsedUser.email && parsedUser.role) {
          setUser(parsedUser);
          console.log('✅ Restored user session:', parsedUser.email);
        } else {
          console.warn('⚠️ Invalid user data in session, clearing...');
          sessionStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (mobile, password) => {
    try {
      // Trim whitespace from inputs
      const trimmedMobile = mobile.trim();
      const trimmedPassword = password.trim();
      
      console.log('Login attempt:', { mobile: trimmedMobile });
      
      // Main Admin - No Firebase authentication required
      const mainAdmin = {
        id: 'main_admin_1', 
        role: 'main_admin', 
        name: 'Main Admin', 
        email: 'mainadmin@demo.com', 
        mobile: '9991100001', 
        phone: '9991100001', 
        password: 'password', 
        status: 'Active', 
        createdAt: new Date().toISOString() 
      };
      
      // Check if it's Main Admin login (no Firebase required)
      if ((mainAdmin.email.toLowerCase() === trimmedMobile.toLowerCase() || 
           mainAdmin.mobile === trimmedMobile || 
           mainAdmin.phone === trimmedMobile) &&
          mainAdmin.password === trimmedPassword) {
        console.log('✅ Main Admin login (no Firebase auth):', { 
          name: mainAdmin.name, 
          email: mainAdmin.email, 
          role: mainAdmin.role 
        });
        setUser(mainAdmin);
        sessionStorage.setItem('currentUser', JSON.stringify(mainAdmin));
        return { success: true, user: mainAdmin };
      }
      
      // For all other users, use Firebase authentication
      const result = await loginWithMobile(trimmedMobile, trimmedPassword);
      
      if (result.success) {
        console.log('Login successful:', { 
          name: result.user.name, 
          email: result.user.email, 
          role: result.user.role 
        });
        setUser(result.user);
        sessionStorage.setItem('currentUser', JSON.stringify(result.user));
        return { success: true, user: result.user };
      } else {
        console.log('Login failed:', result.error);
        return { success: false, message: result.error || 'Invalid mobile number or password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'An error occurred during login' };
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
      setUser(null);
      
      // Clear all session data
      sessionStorage.removeItem('currentUser');
      sessionStorage.clear(); // Clear everything to be safe
      
      // Also clear localStorage if anything was stored there
      localStorage.removeItem('currentUser');
      
      console.log('✅ User logged out and all sessions cleared');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};