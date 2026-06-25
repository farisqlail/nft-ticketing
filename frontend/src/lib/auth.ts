const ADMIN_PASSCODE = 'lailtix2026';
const ADMIN_SESSION_KEY = 'lailtix_admin_session';

/**
 * Checks if the Web2 admin session is active in localStorage
 */
export const isAdminSessionActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
};

/**
 * Authenticates the admin using a passcode
 */
export const loginWithPasscode = (passcode: string): boolean => {
  if (typeof window === 'undefined') return false;
  if (passcode.trim() === ADMIN_PASSCODE) {
    localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return true;
  }
  return false;
};

/**
 * Clears the admin session from localStorage
 */
export const logoutAdmin = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

/**
 * Checks if a given address is the contract owner or admin
 */
export const isAddressAdmin = (
  userAddress?: string,
  contractOwnerAddress?: string
): boolean => {
  if (!userAddress) return false;
  
  // 1. If contract owner matches connected address, it's admin automatically
  if (contractOwnerAddress && userAddress.toLowerCase() === contractOwnerAddress.toLowerCase()) {
    return true;
  }

  // 2. Check if user is logged in via passcode session
  return isAdminSessionActive();
};
