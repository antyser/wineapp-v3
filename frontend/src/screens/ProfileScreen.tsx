import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Avatar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const ProfileScreen = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // Determine if the user is a real, non-anonymous user
  const isRealUser = isAuthenticated && user && !user.isAnonymous;

  console.log('ProfileScreen Render:', {isAuthenticated, isRealUser, userId: user?.id, isAnonymous: user?.isAnonymous});

  const handleSignOut = async () => {
    try {
      console.log('handleSignOut called');
      await signOut();
      // Navigation or state update after sign out will be handled by AuthContext listener
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = () => {
    // This would need to be implemented with your backend
    console.log('Delete account requested');
    // Add confirmation dialog and actual account deletion logic
  };

  const handleLoginPress = () => {
    console.log('Login button pressed'); 
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="account" style={styles.avatar} />
          <Text variant="headlineSmall" style={styles.name}>
            {isRealUser 
              ? (user.email || 'User') 
              : 'Guest'}
          </Text>
          {isRealUser ? (
            <Text variant="bodyMedium" style={styles.email}>
              {user.email || 'No email provided'}
            </Text>
          ) : (
            <Text variant="bodyMedium" style={styles.email}>
              Anonymous user
            </Text>
          )}
          
          {!isRealUser && (
            <Button 
              mode="contained" 
              style={styles.loginButton}
              onPress={handleLoginPress}
              icon="login"
            >
              Log In
            </Button>
          )}
        </View>

        {isRealUser && (
          <>
            <Divider />
            
            <View style={styles.accountOptionsContainer}>
              <Button
                mode="text"
                textColor="crimson"
                style={styles.accountButton}
                onPress={handleSignOut}
                icon="logout"
              >
                Log Out
              </Button>
              
              <Button
                mode="text"
                textColor="crimson"
                style={styles.accountButton}
                onPress={handleDeleteAccount}
                icon="delete"
              >
                Delete Account
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    backgroundColor: '#000000',
    marginBottom: 16,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  email: {
    color: '#222222',
    marginBottom: 16,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 16,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
  },
  accountOptionsContainer: {
    padding: 16,
  },
  accountButton: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  }
});

export default ProfileScreen;
