import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { TextInput, Button, Text, Chip, IconButton } from 'react-native-paper';
import { Cellar } from '../../api/cellarService';

interface CellarFormProps {
  initialValues?: Partial<Cellar>;
  onSubmit: (values: { name: string; sections: string[] }) => void;
  onCancel?: () => void;
  loading?: boolean;
  title?: string;
}

const CellarForm: React.FC<CellarFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  title = 'Add Cellar',
}) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [nameError, setNameError] = useState('');
  const [sections, setSections] = useState<string[]>(initialValues?.sections || []);
  const [newSection, setNewSection] = useState('');

  useEffect(() => {
    // Update form when initialValues change
    if (initialValues) {
      setName(initialValues.name || '');
      setSections(initialValues.sections || []);
    }
  }, [initialValues]);

  const validate = (): boolean => {
    console.log('Validating form', { name });
    let isValid = true;

    if (!name.trim()) {
      console.log('Name validation failed: empty name');
      setNameError('Cellar name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    console.log('Validation result:', isValid);
    return isValid;
  };

  const handleSubmit = () => {
    console.log('CellarForm: Submit button clicked');
    if (validate()) {
      console.log('CellarForm: Validation passed, calling onSubmit with', { name: name.trim(), sections });
      onSubmit({ name: name.trim(), sections });
    } else {
      console.log('CellarForm: Validation failed');
    }
  };

  const addSection = () => {
    if (newSection.trim()) {
      setSections([...sections, newSection.trim()]);
      setNewSection('');
    }
  };

  const removeSection = (index: number) => {
    const updatedSections = [...sections];
    updatedSections.splice(index, 1);
    setSections(updatedSections);
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>{title}</Text>

      <TextInput
        label="Cellar Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        error={!!nameError}
      />
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

      <Text variant="titleMedium" style={styles.sectionTitle}>Sections</Text>
      <Text variant="bodySmall" style={styles.helperText}>
        Add sections to organize your wines (e.g., "Rack A", "Refrigerator", "Basement")
      </Text>

      <View style={styles.sectionsContainer}>
        {sections.map((section, index) => (
          <Chip
            key={index}
            style={styles.sectionChip}
            onClose={() => removeSection(index)}
          >
            {section}
          </Chip>
        ))}
      </View>

      <View style={styles.addSectionRow}>
        <TextInput
          label="New Section"
          value={newSection}
          onChangeText={setNewSection}
          style={styles.sectionInput}
        />
        <IconButton
          icon="plus"
          onPress={addSection}
          disabled={!newSection.trim()}
        />
      </View>

      <View style={styles.buttonsContainer}>
        {onCancel && (
          <Button
            mode="outlined"
            onPress={onCancel}
            style={styles.button}
          >
            Cancel
          </Button>
        )}
        <Button
          mode="contained"
          onPress={() => {
            console.log('Create Cellar button clicked');
            handleSubmit();
          }}
          loading={loading}
          disabled={loading}
          style={styles.button}
          testID="create-cellar-button"
        >
          {initialValues?.id ? 'Update' : 'Create'} Cellar
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  helperText: {
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  sectionChip: {
    margin: 4,
  },
  addSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionInput: {
    flex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  button: {
    minWidth: 120,
  },
});

export default CellarForm;
