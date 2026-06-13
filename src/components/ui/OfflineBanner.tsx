import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Typography, Brutalism } from '../../constants/theme';
import { cache, PendingAction } from '../../lib/cache';
import { useUIStore } from '../../stores/uiStore';
import { useSpotsStore } from '../../stores/spotsStore';
import { supabase } from '../../lib/supabase';

export const OfflineBanner = () => {
  const insets = useSafeAreaInsets();
  const { showToast } = useUIStore();
  const { loadUserSavesAndVisits } = useSpotsStore();
  const [isOffline, setIsOffline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sync actions from cache pending queue
  const syncPendingQueue = async () => {
    const queue = await cache.getPendingQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    let successCount = 0;
    let failedActions: PendingAction[] = [];

    // Retrieve current session to verify auth
    const { data: { session } } = await supabase.auth.getSession();
    const activeUserId = session?.user?.id;

    for (const action of queue) {
      // Security guard: ensure action userId matches currently logged-in user
      if (activeUserId && action.userId !== activeUserId) {
        continue; // Skip actions belonging to other/stale profiles
      }

      try {
        if (action.type === 'save') {
          const { error } = await supabase
            .from('saves')
            .insert({ user_id: action.userId, spot_id: action.spotId });
          
          if (!error || error.code === '23505') { // 23505 is duplicate key error
            successCount++;
          } else {
            failedActions.push(action);
          }
        } else if (action.type === 'unsave') {
          const { error } = await supabase
            .from('saves')
            .delete()
            .eq('user_id', action.userId)
            .eq('spot_id', action.spotId);

          if (!error) {
            successCount++;
          } else {
            failedActions.push(action);
          }
        } else if (action.type === 'visit') {
          const { error } = await supabase
            .from('visits')
            .insert({ user_id: action.userId, spot_id: action.spotId, review: null });

          if (!error || error.code === '23505') {
            successCount++;
          } else {
            failedActions.push(action);
          }
        }
      } catch (err) {
        console.error('Failed to sync offline action:', err);
        failedActions.push(action);
      }
    }

    // Update queue to keep only failed items
    await cache.setPendingQueue(failedActions);

    if (successCount > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Offline actions synced successfully!`, 'success');
      
      // Reload user saves/visits to reflect newly synced actions in store
      if (activeUserId) {
        loadUserSavesAndVisits(activeUserId);
      }

      // Refresh feed silently to get actual counts
      useSpotsStore.getState().fetchFeed();
    }

    setSyncing(false);
  };

  useEffect(() => {
    // Subscribe to network connection updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? true;
      const wasOffline = isOffline;
      
      setIsOffline(!isConnected);

      // Reconnected! Trigger pending queue sync
      if (isConnected && wasOffline) {
        syncPendingQueue();
      }
    });

    return () => unsubscribe();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          paddingTop: Math.max(insets.top, 12),
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline" size={16} color={Colors.jetBlack} style={styles.icon} />
        <Text style={[Typography.bodyMedium, styles.text]}>
          You're offline — viewing cached content
        </Text>
        {syncing && <ActivityIndicator size="small" color={Colors.jetBlack} style={styles.loader} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.saffron,
    borderBottomWidth: 2,
    borderBottomColor: Colors.jetBlack,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: Colors.jetBlack,
    fontSize: 12,
  },
  loader: {
    marginLeft: 8,
  },
});
