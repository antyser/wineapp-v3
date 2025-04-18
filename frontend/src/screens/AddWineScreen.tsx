import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Appbar, TextInput, Button, HelperText, Text, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { createNewWineApiV1WinesPost } from '../api';

type AddWineScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const wineTypes = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert'];

const AddWineScreen = () => {
  const navigation = useNavigation<AddWineScreenNavigationProp>();

  const [formData, setFormData] = useState({
    name: '',
    vintage: '',
    producer: '',
    region: '',
    country: '',
    wine_type: '',
    grape_variety: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Wine name is required';
    }

    if (!formData.vintage.trim()) {
      newErrors.vintage = 'Vintage is required';
    } else if (!/^(19|20)\d{2}|NV|MV$/i.test(formData.vintage)) {
      newErrors.vintage = 'Enter a valid year (1900-2099) or NV/MV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // This would actually call the API - for now just simulate success
      // const createdWine = await wineService.createWine(formData);

      // Simulate a successful creation with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate back or to the wine detail
      // navigation.navigate('WineDetail', { wineId: createdWine.id });

      // For now, just go back
      navigation.goBack();
    } catch (error) {
      console.error('Error creating wine:', error);
      setErrors(prev => ({
        ...prev,
        form: 'Failed to create wine. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectWineType = (type: string) => {
    handleChange('wine_type', formData.wine_type === type ? '' : type);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Add New Wine" />
      </Appbar.Header>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <TextInput
          label="Wine Name *"
          value={formData.name}
          onChangeText={value => handleChange('name', value)}
          style={styles.input}
          error={!!errors.name}
        />
        {errors.name && <HelperText type="error">{errors.name}</HelperText>}

        <TextInput
          label="Vintage *"
          value={formData.vintage}
          onChangeText={value => handleChange('vintage', value)}
          placeholder="e.g. 2018, NV for non-vintage"
          style={styles.input}
          error={!!errors.vintage}
        />
        {errors.vintage && <HelperText type="error">{errors.vintage}</HelperText>}

        <TextInput
          label="Producer"
          value={formData.producer}
          onChangeText={value => handleChange('producer', value)}
          placeholder="e.g. Château Margaux"
          style={styles.input}
        />

        <TextInput
          label="Region"
          value={formData.region}
          onChangeText={value => handleChange('region', value)}
          placeholder="e.g. Bordeaux"
          style={styles.input}
        />

        <TextInput
          label="Country"
          value={formData.country}
          onChangeText={value => handleChange('country', value)}
          placeholder="e.g. France"
          style={styles.input}
        />

        <Text variant="bodyMedium" style={styles.label}>Wine Type</Text>
        <View style={styles.chipContainer}>
          {wineTypes.map(type => (
            <Chip
              key={type}
              mode={formData.wine_type === type ? 'flat' : 'outlined'}
              selected={formData.wine_type === type}
              onPress={() => selectWineType(type)}
              style={styles.chip}
            >
              {type}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Grape Variety"
          value={formData.grape_variety}
          onChangeText={value => handleChange('grape_variety', value)}
          placeholder="e.g. Cabernet Sauvignon, Merlot"
          style={styles.input}
        />

        <TextInput
          label="Description"
          value={formData.description}
          onChangeText={value => handleChange('description', value)}
          placeholder="Enter any additional details about this wine"
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        {errors.form && (
          <HelperText type="error" style={styles.formError}>
            {errors.form}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submitButton}
        >
          Add Wine
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  textArea: {
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  formError: {
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default AddWineScreen;
