import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import MainTabs from './MainTabs';

// Placeholder for screens that will be implemented later
const WineDetailsScreen = () => null;
const AddWineScreen = () => null;
const ScanLabelScreen = () => null;
const AddTastingNoteScreen = () => null;

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Main">
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="WineDetails" 
          component={WineDetailsScreen} 
          options={{ title: 'Wine Details' }} 
        />
        <Stack.Screen 
          name="AddWine" 
          component={AddWineScreen} 
          options={{ title: 'Add Wine' }} 
        />
        <Stack.Screen 
          name="ScanLabel" 
          component={ScanLabelScreen} 
          options={{ title: 'Scan Wine Label' }} 
        />
        <Stack.Screen 
          name="AddTastingNote" 
          component={AddTastingNoteScreen} 
          options={{ title: 'Add Tasting Note' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 