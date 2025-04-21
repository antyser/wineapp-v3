import { NavigatorScreenParams } from '@react-navigation/native';
import { Cellar } from '../api/generated/types.gen';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainDrawerParamList>;
  Login: undefined;
  WineDetails: { wineId: string; wine?: any };
  WineDetail: { wineId: string; wine?: any };
  AddWine: undefined;
  ScanLabel: undefined;
  AddTastingNote: { wineId: string; noteId?: string };
  WineSearch: {
    returnScreen?: string;
    context?: 'cellar' | 'wishlist' | 'tastingNote';
    cellarId?: string;
    initialQuery?: string;
  };

  // Cellar screens
  CellarDetail: { cellarId: string };
  CellarForm: { cellar?: Cellar };
  EditCellar: { cellar?: Cellar };
  CellarStats: { cellarId: string };
  AddBottles: { wine: any; onBottlesAdded?: () => void };

  SearchResults: {
    wines: any[];
    title?: string;
    source?: 'scan' | 'search' | 'history';
  };
};

export type MainDrawerParamList = {
  Home: undefined;
  MyWines: undefined;
  Chat: undefined;
  Profile: undefined;
  TestCellarAdd: undefined;
};

// Keep for backward compatibility during migration
export type MainTabParamList = MainDrawerParamList;
