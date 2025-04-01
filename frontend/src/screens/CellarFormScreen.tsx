import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Snackbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CellarForm } from '../components/cellar';
import { cellarService, Cellar } from '../api/services';

const CellarFormScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { cellar } = (route.params as { cellar?: Cellar }) || {};
  const isEditing = !!cellar;

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleSubmit = async (values: { name: string; sections: string[] }) => {
    try {
      setLoading(true);

      if (isEditing) {
        // Update existing cellar
        await cellarService.updateCellar(cellar.id, {
          name: values.name,
          sections: values.sections,
        });
        setSnackbar({ visible: true, message: 'Cellar updated successfully!' });
      } else {
        // Create new cellar
        // Note: In a real app, you'd get the current user's ID
        const userIdMock = '123e4567-e89b-12d3-a456-426614174000'; // This should come from auth
        await cellarService.createCellar({
          name: values.name,
          sections: values.sections,
          user_id: userIdMock,
        });
        setSnackbar({ visible: true, message: 'Cellar created successfully!' });
      }

      // Return to previous screen after a short delay to show the snackbar
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error('Failed to save cellar:', err);
      setSnackbar({ visible: true, message: 'Failed to save cellar. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? 'Edit Cellar' : 'Add Cellar'} />
      </Appbar.Header>

      <CellarForm
        initialValues={cellar}
        onSubmit={handleSubmit}
        onCancel={() => navigation.goBack()}
        loading={loading}
        title={isEditing ? 'Edit Cellar' : 'Add Cellar'}
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CellarFormScreen;
