/**
 * Utility functions for handling premium status and features
 */

import type { UserSubscription, TrialSubscription } from '../types';

/**
 * Determine if a subscription indicates premium status
 */
export function isPremiumSubscription(subscription: UserSubscription | null | undefined, trial?: TrialSubscription | null): boolean {
  // Check for trial subscription first
  if (trial) {
    const expiryDate = new Date(trial.expires_on);
    const now = new Date();
    if (expiryDate > now) return true;
  }

  if (!subscription) return false;
  
  // Check for valid subscription statuses
  if (['active', 'trialing', 'past_due'].includes(subscription.status)) {
    return true;
  }
  
  // Also check if subscription is still within current period
  if (subscription.current_period_end) {
    // Handle Unix timestamp (seconds) or ISO date string
    const endDate = isUnixTimestamp(subscription.current_period_end) 
      ? new Date(Number(subscription.current_period_end) * 1000)
      : new Date(subscription.current_period_end);
    
    if (endDate > new Date()) return true;
  }
  
  return false;
}

// Helper function to check if a value is likely a Unix timestamp in seconds
function isUnixTimestamp(value: string): boolean {
  return !isNaN(Number(value)) && value.length === 10;
}

/**
 * Get maximum number of guests allowed based on subscription status
 */
export function getMaxGuestLimit(subscription: UserSubscription | null | undefined): number {
  return isPremiumSubscription(subscription) ? Number.MAX_SAFE_INTEGER : 80;
}

/**
 * Get maximum number of saved settings allowed based on subscription status
 */
export function getMaxSavedSettingsLimit(subscription: UserSubscription | null | undefined): number {
  return isPremiumSubscription(subscription) ? 50 : 5;
}

/**
 * Check if user can add more guests
 */
export function canAddGuests(subscription: UserSubscription | null | undefined, currentCount: number, addCount: number): boolean {
  const maxLimit = getMaxGuestLimit(subscription);
  return (currentCount + addCount) <= maxLimit;
}

/**
 * Check if user can save more settings
 */
export function canSaveMoreSettings(subscription: UserSubscription | null | undefined, currentCount: number): boolean {
  const maxLimit = getMaxSavedSettingsLimit(subscription);
  return currentCount < maxLimit;
}

/**
 * Check if a saved setting is loadable based on the current subscription
 * Free users cannot load settings with more than 80 guests
 */
export function isSettingLoadable(setting: any, subscription: UserSubscription | null | undefined): boolean {
  if (!setting?.data?.guests) return true;
  
  if (isPremiumSubscription(subscription)) return true;
  
  return setting.data.guests.length <= getMaxGuestLimit(subscription);
}

/**
 * Get message for guest limits
 */
export function getGuestLimitMessage(subscription: UserSubscription | null | undefined, currentCount: number): string {
  const isPremium = isPremiumSubscription(subscription);
  if (isPremium) {
    return `${currentCount} guests`;
  } else {
    return `${currentCount}/80 guests used`;
  }
}

/**
 * Get debug information about subscription
 */
export function getSubscriptionDebugInfo(subscription: UserSubscription | null | undefined): string {
  if (!subscription) return 'No subscription data';
  
  return JSON.stringify({
    id: subscription.id,
    status: subscription.status,
    current_period_end: subscription.current_period_end,
    cancelled: subscription.cancel_at_period_end,
  }, null, 2);
}

/**
 * Get all features based on subscription status
 */
export function getFeatures(subscription: UserSubscription | null | undefined): Record<string, boolean | number> {
  const isPremium = isPremiumSubscription(subscription);
  
  return {
    isPremium,
    maxGuests: getMaxGuestLimit(subscription),
    maxSavedSettings: getMaxSavedSettingsLimit(subscription),
    unlimitedExports: isPremium,
    prioritySupport: isPremium,
    advancedConstraints: isPremium
  };
}