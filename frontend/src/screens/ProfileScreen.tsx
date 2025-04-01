import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Avatar, List, Divider, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="account" style={styles.avatar} />
          <Text variant="headlineSmall" style={styles.name}>
            Wine Enthusiast
          </Text>
          <Text variant="bodyMedium" style={styles.email}>
            user@example.com
          </Text>
          <Button mode="outlined" style={styles.editButton}>
            Edit Profile
          </Button>
        </View>

        <Divider />

        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          <List.Item
            title="Dark Mode"
            right={() => (
              <Switch value={darkMode} onValueChange={setDarkMode} />
            )}
          />
          <List.Item
            title="Notifications"
            right={() => <List.Icon icon="chevron-right" />}
          />
          <List.Item
            title="Language"
            description="English"
            right={() => <List.Icon icon="chevron-right" />}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Privacy Settings"
            right={() => <List.Icon icon="chevron-right" />}
          />
          <List.Item
            title="Cellar Management"
            right={() => <List.Icon icon="chevron-right" />}
          />
          <List.Item
            title="Change Password"
            right={() => <List.Icon icon="chevron-right" />}
          />
        </List.Section>

        <Divider />

        <View style={styles.statsContainer}>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Your Stats
          </Text>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">0</Text>
              <Text variant="bodySmall">Wines</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">0</Text>
              <Text variant="bodySmall">Tastings</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">0</Text>
              <Text variant="bodySmall">Regions</Text>
            </View>
          </View>
        </View>

        <Button
          mode="text"
          textColor="crimson"
          style={styles.logoutButton}
        >
          Log Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  avatar: {
    backgroundColor: '#8E2430',
    marginBottom: 12,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#666666',
    marginBottom: 16,
  },
  editButton: {
    marginTop: 8,
  },
  statsContainer: {
    padding: 16,
  },
  statsTitle: {
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  logoutButton: {
    margin: 16,
  },
});

export default ProfileScreen;
