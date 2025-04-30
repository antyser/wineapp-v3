import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import MainTabs from './MainTabs'; // Assuming MainTabs handles Home, MyWines, Chat, Profile
import LoginScreen from '../screens/LoginScreen';
import WineDetailScreen from '../screens/WineDetailScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import TastingNoteScreen from '../screens/TastingNoteScreen';
import WineOffersScreen from '../screens/WineOffersScreen';
import WineSearchScreen from '../screens/WineSearchScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Main" // Start with the main tab navigator
        screenOptions={{ headerShown: false }} // Hide header globally for the root stack
      >
        {/* Main application flow with bottom tabs */}
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
        />

        {/* Screens presented modally or pushing over tabs */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ presentation: 'modal' }} // Example: Login as a modal
        />
         <Stack.Screen 
          name="WineDetail" 
          component={WineDetailScreen} 
          options={{ headerShown: false }} // Disable stack header, rely on screen's Appbar
        />
         <Stack.Screen 
          name="SearchResults" 
          component={SearchResultsScreen} 
          options={{ headerShown: false }} // Handled by Appbar inside screen
        />
        <Stack.Screen 
          name="WineSearch"
          component={WineSearchScreen}
          options={{ presentation: 'modal', headerShown: true, title: 'Search Wines'}}
        />
        <Stack.Screen 
          name="AddTastingNote"
          component={TastingNoteScreen}
          options={{ presentation: 'modal', headerShown: true, title: 'Add Tasting Note' }}
        />
        <Stack.Screen 
          name="WineOffers"
          component={WineOffersScreen}
          options={{ presentation: 'modal', headerShown: false }} // Disable stack header
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
