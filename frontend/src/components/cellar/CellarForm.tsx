import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Button, TextInput, Chip, Text } from 'react-native-paper';
import { Cellar } from '../../api/generated';

interface CellarFormProps {
  initialValues?: Cellar;
  onSubmit: (values: { name: string; sections: string[] }) => void;
}

const CellarForm: React.FC<CellarFormProps> = ({
  initialValues,
  onSubmit,
}) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [section, setSection] = useState('');
  const [sections, setSections] = useState<string[]>(initialValues?.sections || []);
  const [nameError, setNameError] = useState('');

  const handleAddSection = () => {
    if (section.trim() === '') return;
    if (sections.includes(section.trim())) return;
    
    setSections([...sections, section.trim()]);
    setSection('');
  };

  const handleRemoveSection = (sectionToRemove: string) => {
    setSections(sections.filter(s => s !== sectionToRemove));
  };

  const handleSubmit = () => {
    if (name.trim() === '') {
      setNameError('Name is required');
      return;
    }

    onSubmit({
      name: name.trim(),
      sections,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        label="Cellar Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (text.trim() !== '') {
            setNameError('');
          }
        }}
        style={styles.input}
        error={!!nameError}
      />
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

      <View style={styles.sectionInput}>
        <TextInput
          label="Add Section (optional)"
          value={section}
          onChangeText={setSection}
          style={styles.sectionField}
        />
        <Button 
          mode="contained" 
          onPress={handleAddSection}
          disabled={!section.trim()}
          style={styles.addButton}
        >
          Add
        </Button>
      </View>

      <View style={styles.sectionsContainer}>
        {sections.length > 0 ? (
          <Text style={styles.sectionLabel}>Sections:</Text>
        ) : (
          <Text style={styles.helperText}>
            Sections help you organize your wines (e.g., "Rack 1", "Fridge")
          </Text>
        )}
        <View style={styles.chipContainer}>
          {sections.map((sectionItem) => (
            <Chip
              key={sectionItem}
              style={styles.chip}
              onClose={() => handleRemoveSection(sectionItem)}
            >
              {sectionItem}
            </Chip>
          ))}
        </View>
      </View>

      <Button 
        mode="contained" 
        onPress={handleSubmit} 
        style={styles.submitButton}
      >
        {initialValues ? 'Update Cellar' : 'Create Cellar'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  sectionInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionField: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    marginLeft: 8,
  },
  sectionsContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  helperText: {
    marginBottom: 8,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  submitButton: {
    marginTop: 16,
  }
});

export default CellarForm;

