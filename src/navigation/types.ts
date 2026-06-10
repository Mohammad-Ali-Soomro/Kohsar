import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  Discover: undefined;
  Map: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  OTPVerify: { email: string };
  UsernameSetup: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  SpotDetails: { spotId: string };
  SubmitSpot: undefined;
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  AppStack: NavigatorScreenParams<AppStackParamList>;
};

// Screen props helpers
export type SpotDetailsScreenProps = NativeStackScreenProps<AppStackParamList, 'SpotDetails'>;
export type OTPVerifyScreenProps = NativeStackScreenProps<AuthStackParamList, 'OTPVerify'>;

export type DiscoverNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Discover'>,
  NativeStackNavigationProp<AppStackParamList>
>;
