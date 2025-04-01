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

// Placeholder for screens that will be implemented later
const ScanLabelScreen = () => null;
const AddTastingNoteScreen = () => null;

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
          name="ScanLabel"
          component={ScanLabelScreen}
        />
        <Stack.Screen
          name="AddTastingNote"
          component={AddTastingNoteScreen}
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
        />
        <Stack.Screen
          name="CellarStats"
          component={CellarStatsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
