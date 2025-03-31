import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  WineDetails: { wineId: string };
  AddWine: undefined;
  ScanLabel: undefined;
  AddTastingNote: { wineId: string };
};

export type MainTabParamList = {
  Home: undefined;
  MyWines: undefined;
  Chat: undefined;
  Profile: undefined;
}; 