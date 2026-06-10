import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export type Spot = Database['public']['Tables']['spots']['Row'] & {
  profiles?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  spot_photos?: {
    id: string;
    photo_url: string;
    display_order: number;
  }[];
};

export type NearbySpot = Database['public']['Functions']['get_nearby_spots']['Returns'][number];

interface SpotsState {
  feedSpots: Spot[];
  nearbySpots: NearbySpot[];
  savedSpotIds: Set<string>;
  visitedSpotIds: Set<string>;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  
  fetchFeed: (category?: string | null, search?: string) => Promise<void>;
  loadMoreFeed: (category?: string | null, search?: string) => Promise<void>;
  fetchNearby: (lat: number, lng: number, radiusKm?: number) => Promise<void>;
  saveSpot: (spotId: string) => Promise<void>;
  unsaveSpot: (spotId: string) => Promise<void>;
  markVisited: (spotId: string, review?: string) => Promise<void>;
  submitSpot: (
    spotData: {
      name: string;
      description: string;
      category: 'beach' | 'waterfall' | 'mountain' | 'valley' | 'viewpoint' | 'historical' | 'desert' | 'forest';
      city: string;
      district?: string;
      access_notes?: string;
      best_season?: string;
      difficulty?: 'easy' | 'moderate' | 'hard';
      lat: number;
      lng: number;
      cover_photo_url?: string;
    },
    additionalPhotos?: string[]
  ) => Promise<{ data: Spot | null; error: any }>;
  loadUserSavesAndVisits: (userId: string) => Promise<void>;
  clearUserSavesAndVisits: () => void;
}

const ITEMS_PER_PAGE = 10;

export const useSpotsStore = create<SpotsState>((set, get) => ({
  feedSpots: [],
  nearbySpots: [],
  savedSpotIds: new Set<string>(),
  visitedSpotIds: new Set<string>(),
  isLoading: false,
  hasMore: true,
  currentPage: 0,

  fetchFeed: async (category = null, search = '') => {
    set({ isLoading: true, currentPage: 0, hasMore: true });
    
    let query = supabase
      .from('spots')
      .select('*, profiles(username, full_name, avatar_url), spot_photos(*)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(0, ITEMS_PER_PAGE - 1);

    if (category) {
      query = query.eq('category', category as any);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feed:', error.message);
      set({ isLoading: false, hasMore: false });
      return;
    }

    const spots = (data || []) as Spot[];
    set({
      feedSpots: spots,
      isLoading: false,
      hasMore: spots.length === ITEMS_PER_PAGE,
      currentPage: 0,
    });
  },

  loadMoreFeed: async (category = null, search = '') => {
    const { currentPage, hasMore, feedSpots, isLoading } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    const nextPage = currentPage + 1;
    const startRange = nextPage * ITEMS_PER_PAGE;
    const endRange = startRange + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('spots')
      .select('*, profiles(username, full_name, avatar_url), spot_photos(*)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(startRange, endRange);

    if (category) {
      query = query.eq('category', category as any);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading more feed:', error.message);
      set({ isLoading: false });
      return;
    }

    const newSpots = (data || []) as Spot[];
    set({
      feedSpots: [...feedSpots, ...newSpots],
      isLoading: false,
      hasMore: newSpots.length === ITEMS_PER_PAGE,
      currentPage: nextPage,
    });
  },

  fetchNearby: async (lat, lng, radiusKm = 50) => {
    set({ isLoading: true });
    
    // Call PostGIS RPC function
    const { data, error } = await supabase.rpc('get_nearby_spots', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
      limit_count: 30,
    });

    if (error) {
      console.error('Error fetching nearby spots:', error.message);
      set({ isLoading: false });
      return;
    }

    set({
      nearbySpots: data || [],
      isLoading: false,
    });
  },

  saveSpot: async (spotId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    const newSaved = new Set(get().savedSpotIds);
    newSaved.add(spotId);
    set({ savedSpotIds: newSaved });

    const { error } = await supabase
      .from('saves')
      .insert({ user_id: user.id, spot_id: spotId });

    if (error) {
      console.error('Error saving spot:', error.message);
      // Revert on error
      const revertedSaved = new Set(get().savedSpotIds);
      revertedSaved.delete(spotId);
      set({ savedSpotIds: revertedSaved });
    }
  },

  unsaveSpot: async (spotId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    const newSaved = new Set(get().savedSpotIds);
    newSaved.delete(spotId);
    set({ savedSpotIds: newSaved });

    const { error } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', user.id)
      .eq('spot_id', spotId);

    if (error) {
      console.error('Error unsaving spot:', error.message);
      // Revert on error
      const revertedSaved = new Set(get().savedSpotIds);
      revertedSaved.add(spotId);
      set({ savedSpotIds: revertedSaved });
    }
  },

  markVisited: async (spotId, review = '') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic Update
    const newVisited = new Set(get().visitedSpotIds);
    newVisited.add(spotId);
    set({ visitedSpotIds: newVisited });

    const { error } = await supabase
      .from('visits')
      .insert({
        user_id: user.id,
        spot_id: spotId,
        review: review || null,
      });

    if (error) {
      console.error('Error marking spot visited:', error.message);
      // Revert on error
      const revertedVisited = new Set(get().visitedSpotIds);
      revertedVisited.delete(spotId);
      set({ visitedSpotIds: revertedVisited });
    }
  },

  submitSpot: async (spotData, additionalPhotos = []) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    set({ isLoading: true });

    // Format location as PostGIS POINT geography string
    const pointWkt = `POINT(${spotData.lng} ${spotData.lat})`;

    const { data: spot, error: spotError } = await supabase
      .from('spots')
      .insert({
        ...spotData,
        submitted_by: user.id,
        location: pointWkt,
        is_approved: true, // Default to true as per request, can be moderated later
      })
      .select('*, profiles(username, full_name, avatar_url)')
      .single();

    if (spotError) {
      set({ isLoading: false });
      return { data: null, error: spotError };
    }

    let photoRows: any[] = [];
    if (additionalPhotos.length > 0) {
      const photosToInsert = additionalPhotos.map((url, index) => ({
        spot_id: spot.id,
        photo_url: url,
        uploaded_by: user.id,
        display_order: index,
      }));

      const { data: photoData, error: photoError } = await supabase
        .from('spot_photos')
        .insert(photosToInsert)
        .select();

      if (photoError) {
        console.error('Error uploading secondary photos to database:', photoError.message);
      } else {
        photoRows = photoData || [];
      }
    }

    const fullSpot: Spot = {
      ...spot,
      spot_photos: photoRows,
    };

    // Append to feed list at start
    set((state) => ({
      feedSpots: [fullSpot, ...state.feedSpots],
      isLoading: false,
    }));

    return { data: fullSpot, error: null };
  },

  loadUserSavesAndVisits: async (userId) => {
    // Fetch user saves
    const { data: saves, error: savesError } = await supabase
      .from('saves')
      .select('spot_id')
      .eq('user_id', userId);

    if (savesError) {
      console.error('Error loading saves:', savesError.message);
    } else {
      const savedIds = new Set(saves.map((s) => s.spot_id));
      set({ savedSpotIds: savedIds });
    }

    // Fetch user visits
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select('spot_id')
      .eq('user_id', userId);

    if (visitsError) {
      console.error('Error loading visits:', visitsError.message);
    } else {
      const visitedIds = new Set(visits.map((v) => v.spot_id));
      set({ visitedSpotIds: visitedIds });
    }
  },

  clearUserSavesAndVisits: () => {
    set({
      savedSpotIds: new Set<string>(),
      visitedSpotIds: new Set<string>(),
    });
  },
}));
