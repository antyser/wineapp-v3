import { NavigatorScreenParams } from '@react-navigation/native';
import { Cellar, WineSearcherOffer as Offer } from '../api/generated/types.gen';
import { Wine, Note } from "../api";

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainDrawerParamList>;
  Login: undefined;
  AppTabs: undefined; // Represents the bottom tab navigator
  Home: undefined;
  MyWines: undefined;
  Chat: undefined;
  Profile: undefined;
  WineDetail: { wineId: string, wine?: Wine }; // Keep optional wine here for potential pre-loading
  WineSearch: {
    returnScreen?: string;
    context?: 'cellar' | 'wishlist' | 'tastingNote';
    cellarId?: string;
    initialQuery?: string;
  };
  SearchResults: {
    wines: Wine[];
    title: string;
    source: 'search' | 'scan' | 'history' | 'recommendation';
  };
  AddTastingNote: { 
    wineId: string; // Keep wineId for context if needed, e.g. creating a new note
    wine: Wine;     // Pass the full wine object
    note?: Note;    // Pass the specific note object if editing
  };
  WineOffers: { wineName: string, offers: Offer[] };

  // Cellar screens
  CellarDetail: { cellarId: string };
  CellarForm: { cellar?: Cellar };
  EditCellar: { cellar?: Cellar };
  CellarStats: { cellarId: string };
  AddBottles: { wine: any; onBottlesAdded?: () => void };
};

export type MainDrawerParamList = {
  Home: undefined;
  Profile: undefined;
};

// Keep for backward compatibility during migration
export type MainTabParamList = MainDrawerParamList;

// Type for the Bottom Tab Navigator itself (if needed)
export type AppTabParamList = {
    HomeTab: undefined; // Name matching the screen in Tab.Navigator
    MyWinesTab: undefined;
    ChatTab: undefined;
    ProfileTab: undefined;
};
