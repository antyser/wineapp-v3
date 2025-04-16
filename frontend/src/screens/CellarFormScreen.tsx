import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api';
import { Cellar } from '../api/generated';
import { RootStackParamList } from '../navigation/types';
import CellarForm from '../components/cellar/CellarForm';

type Props = NativeStackScreenProps<RootStackParamList, 'CellarForm'>;

const CellarFormScreen = ({ route, navigation }: Props) => {
  const cellar = route.params?.cellar;
  const isEditing = !!cellar;

  const handleSubmit = async (formData: { name: string; sections: string[] }) => {
    try {
      if (isEditing && cellar) {
        // Update existing cellar
        await api.updateCellarApiV1CellarsCellarIdPatch({
          path: { cellar_id: cellar.id },
          body: {
            name: formData.name,
            sections: formData.sections
          }
        });
        
        // Navigate back to previous screen
        navigation.goBack();
      } else {
        // Create new cellar
        await api.createCellarApiV1CellarsPost({
          body: {
            name: formData.name,
            sections: formData.sections
          }
        });
        
        // Navigate to MyWines screen
        navigation.navigate('MyWines');
      }
    } catch (error) {
      console.error('Failed to save cellar:', error);
      // Could show an error message here
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditing ? 'Edit Cellar' : 'Create Cellar'} />
      </Appbar.Header>

      <CellarForm
        initialValues={cellar || undefined}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CellarFormScreen;
