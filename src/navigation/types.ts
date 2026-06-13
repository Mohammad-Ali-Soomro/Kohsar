import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Discover: undefined;
  Map: undefined;
  Search: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  AuthLanding: undefined;
  Auth: undefined;
  OTPVerify: { email: string };
  UsernameSetup: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  SpotDetails: { spotId: string };
  SubmitSpot: undefined;
  UserProfile: { userId: string };
};

// Aliases for legacy stack parameters to maintain backward compatibility
export type AuthStackParamList = RootStackParamList;
export type AppStackParamList = RootStackParamList;

// Screen props helpers
export type SpotDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'SpotDetails'>;
export type UserProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;
export type OTPVerifyScreenProps = NativeStackScreenProps<RootStackParamList, 'OTPVerify'>;

export type DiscoverNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Discover'>,
  NativeStackNavigationProp<RootStackParamList>
>;
