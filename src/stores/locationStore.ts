import { create } from 'zustand';
import * as Location from 'expo-location';

interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

interface LocationState {
  coords: LocationCoords | null;
  permissionStatus: Location.PermissionStatus | null;
  isLoading: boolean;
  requestLocationPermission: () => Promise<boolean>;
  fetchLocation: () => Promise<LocationCoords | null>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  permissionStatus: null,
  isLoading: false,

  requestLocationPermission: async () => {
    set({ isLoading: true });
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      set({ permissionStatus: status, isLoading: false });
      return status === Location.PermissionStatus.GRANTED;
    } catch (err) {
      console.error('Error requesting location permission:', err);
      set({ isLoading: false });
      return false;
    }
  },

  fetchLocation: async () => {
    const isGranted = await get().requestLocationPermission();
    if (!isGranted) return null;

    set({ isLoading: true });
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      set({ coords: location.coords, isLoading: false });
      return location.coords;
    } catch (err) {
      console.error('Error fetching current position:', err);
      set({ isLoading: false });
      return null;
    }
  },
}));
