import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import MainDrawer from './MainDrawer';

// Import the screens we've created
import CellarDetailScreen from '../screens/CellarDetailScreen';
import CellarFormScreen from '../screens/CellarFormScreen';
import CellarStatsScreen from '../screens/CellarStatsScreen';
import WineDetailScreen from '../screens/WineDetailScreen';
import WineSearchScreen from '../screens/WineSearchScreen';
import AddWineScreen from '../screens/AddWineScreen';
import AddBottlesScreen from '../screens/AddBottlesScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import LoginScreen from '../screens/LoginScreen';
import NoteScreen from '../screens/TastingNoteScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerShown: false, // We'll use our own headers with Appbar.Header
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainDrawer}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
        <Stack.Screen
          name="WineDetails"
          component={WineDetailScreen}
        />
        <Stack.Screen
          name="WineDetail"
          component={WineDetailScreen}
        />
        <Stack.Screen
          name="AddWine"
          component={AddWineScreen}
        />
        <Stack.Screen
          name="AddTastingNote"
          component={NoteScreen}
        />
        <Stack.Screen
          name="WineSearch"
          component={WineSearchScreen}
        />

        {/* Cellar screens */}
        <Stack.Screen
          name="CellarDetail"
          component={CellarDetailScreen}
        />
        <Stack.Screen
          name="CellarForm"
          component={CellarFormScreen}
        />
        <Stack.Screen
          name="EditCellar"
          component={CellarFormScreen}
          options={{ title: 'Edit Cellar' }}
        />
        <Stack.Screen
          name="CellarStats"
          component={CellarStatsScreen}
        />

        <Stack.Screen
          name="AddBottles"
          component={AddBottlesScreen}
        />

        <Stack.Screen
          name="SearchResults"
          component={SearchResultsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
