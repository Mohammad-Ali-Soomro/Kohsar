import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spot } from '../stores/spotsStore';

const FEED_CACHE_KEY = 'kohsar_feed_cache';
const FEED_CACHE_TIME_KEY = 'kohsar_feed_cache_time';
const SAVED_SPOTS_KEY = 'kohsar_saved_spots';
const MAP_PINS_KEY = 'kohsar_map_pins';
const PENDING_QUEUE_KEY = 'kohsar_pending_queue';

const TWO_HOURS = 2 * 60 * 60 * 1000; // in milliseconds

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
  is_explorer_claimed: boolean;
}

export interface PendingAction {
  type: 'save' | 'unsave' | 'visit';
  spotId: string;
  userId: string;
  timestamp: number;
}

export const cache = {
  // Feed Cache
  getFeed: async (): Promise<Spot[] | null> => {
    try {
      const cacheTime = await AsyncStorage.getItem(FEED_CACHE_TIME_KEY);
      if (!cacheTime) return null;

      const timePassed = Date.now() - parseInt(cacheTime, 10);
      if (timePassed > TWO_HOURS) {
        // Cache expired
        return null;
      }

      const cachedData = await AsyncStorage.getItem(FEED_CACHE_KEY);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (err) {
      console.error('Failed to get feed cache:', err);
      return null;
    }
  },

  setFeed: async (spots: Spot[]): Promise<void> => {
    try {
      // Cache last 30 spots
      const spotsToCache = spots.slice(0, 30);
      await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(spotsToCache));
      await AsyncStorage.setItem(FEED_CACHE_TIME_KEY, Date.now().toString());
    } catch (err) {
      console.error('Failed to set feed cache:', err);
    }
  },

  // Saved Spots Cache (full details for offline viewing)
  getSavedSpots: async (): Promise<Spot[]> => {
    try {
      const cached = await AsyncStorage.getItem(SAVED_SPOTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Failed to get saved spots cache:', err);
      return [];
    }
  },

  setSavedSpots: async (spots: Spot[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(SAVED_SPOTS_KEY, JSON.stringify(spots));
    } catch (err) {
      console.error('Failed to set saved spots cache:', err);
    }
  },

  addSavedSpot: async (spot: Spot): Promise<void> => {
    try {
      const current = await cache.getSavedSpots();
      const updated = [spot, ...current.filter((s) => s.id !== spot.id)];
      await cache.setSavedSpots(updated);
    } catch (err) {
      console.error('Failed to add saved spot to cache:', err);
    }
  },

  removeSavedSpot: async (spotId: string): Promise<void> => {
    try {
      const current = await cache.getSavedSpots();
      const updated = current.filter((s) => s.id !== spotId);
      await cache.setSavedSpots(updated);
    } catch (err) {
      console.error('Failed to remove saved spot from cache:', err);
    }
  },

  // Map Pins Cache
  getMapPins: async (): Promise<MapPin[]> => {
    try {
      const cached = await AsyncStorage.getItem(MAP_PINS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Failed to get map pins cache:', err);
      return [];
    }
  },

  setMapPins: async (pins: MapPin[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(MAP_PINS_KEY, JSON.stringify(pins));
    } catch (err) {
      console.error('Failed to set map pins cache:', err);
    }
  },

  // Pending Actions Queue
  getPendingQueue: async (): Promise<PendingAction[]> => {
    try {
      const cached = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Failed to get pending queue:', err);
      return [];
    }
  },

  setPendingQueue: async (queue: PendingAction[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to set pending queue:', err);
    }
  },

  enqueueAction: async (type: 'save' | 'unsave' | 'visit', spotId: string, userId: string): Promise<void> => {
    try {
      const queue = await cache.getPendingQueue();
      // Remove any redundant/opposite action on same spot to prevent unnecessary calls
      let cleanQueue = queue.filter(
        (a) => !(a.spotId === spotId && a.userId === userId && ((a.type === 'save' && type === 'unsave') || (a.type === 'unsave' && type === 'save')))
      );
      
      cleanQueue.push({
        type,
        spotId,
        userId,
        timestamp: Date.now(),
      });
      await cache.setPendingQueue(cleanQueue);
    } catch (err) {
      console.error('Failed to enqueue pending action:', err);
    }
  },

  clearPendingQueue: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(PENDING_QUEUE_KEY);
    } catch (err) {
      console.error('Failed to clear pending queue:', err);
    }
  },
};
