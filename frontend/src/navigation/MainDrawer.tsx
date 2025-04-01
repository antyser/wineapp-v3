import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainDrawerParamList } from './types';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import MyWinesScreen from '../screens/MyWinesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TestCellarAddScreen from '../screens/TestCellarAddScreen';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

export default function MainDrawer() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.tertiary,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.primary,
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
        name="MyWines"
        component={MyWinesScreen}
        options={{
          title: 'My Wines',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="glass-wine" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" color={color} size={size} />
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
      <Drawer.Screen
        name="TestCellarAdd"
        component={TestCellarAddScreen}
        options={{
          title: 'Test Cellar Add',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="database-plus" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}
