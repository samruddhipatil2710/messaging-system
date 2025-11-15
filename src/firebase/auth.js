import { getUserByEmail, getUserByMobile } from './firestore';

/**
 * Login with email (No Firebase Auth - just Firestore check)
 */
export const loginWithEmail = async (email, password) => {
  try {
    const result = await getUserByEmail(email);
    
    if (!result.success) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = result.data;
    
    // Check password
    if (userData.password !== password) {
      return { success: false, error: 'Invalid password' };
    }
    
    return { success: true, user: userData };
  } catch (error) {
    console.error('Error signing in:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Login with mobile number (No Firebase Auth - just Firestore check)
 */
export const loginWithMobile = async (mobile, password) => {
  try {
    // Find user by mobile in Firestore
    const result = await getUserByMobile(mobile);
    
    if (!result.success) {
      console.log('❌ User not found with mobile:', mobile);
      return { success: false, error: 'Invalid mobile number or password' };
    }
    
    const userData = result.data;
    console.log('🔍 Found user:', { 
      name: userData.name, 
      email: userData.email,
      storedPassword: userData.password,
      providedPassword: password,
      passwordMatch: userData.password === password
    });
    
    // Check password
    if (userData.password !== password) {
      console.log('❌ Password mismatch!');
      return { success: false, error: 'Invalid password' };
    }
    
    console.log('✅ Login successful');
    // Return user data
    return { 
      success: true, 
      user: userData
    };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Logout (no Firebase Auth needed)
 */
export const logout = async () => {
  return { success: true };
};

/**
 * Auth state listener (no Firebase Auth)
 */
export const onAuthChange = (callback) => {
  // No Firebase Auth listener needed
  callback(null);
  return () => {};
};

/**
 * Get current user (no Firebase Auth)
 */
export const getCurrentUser = () => {
  return null;
};
