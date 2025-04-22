import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainDrawerParamList } from './types';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

export default function MainDrawer() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: '#000000', // Black for active items
        drawerInactiveTintColor: '#444444', // Darker gray for inactive items
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: '#000000', // Black for header text
        drawerLabelStyle: {
          fontWeight: '600', // Make the font slightly bolder
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
