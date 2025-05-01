import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Button, Avatar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiFetch } from '../lib/apiClient';

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
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[ProfileScreen] Attempting to delete account...');
              // Use apiFetch to call the DELETE endpoint
              // apiFetch handles authentication internally
              // Expecting a 204 No Content or similar successful response
              await apiFetch<void>('/api/v1/auth/me', { method: 'DELETE' }); 

              console.log('[ProfileScreen] Account deletion successful via API, signing out...');
              await signOut(); // Sign out after successful deletion
              
            } catch (error: any) {
              console.error('[ProfileScreen] Error deleting account:', error);
              Alert.alert('Error', error.message || 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
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
