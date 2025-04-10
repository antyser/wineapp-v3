import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Searchbar as PaperSearchbar, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  placeholder = 'Search for wines...'
}) => {
  const theme = useTheme();

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      onSearch();
    }
  };

  return (
    <View style={styles.container}>
      <PaperSearchbar
        placeholder={placeholder}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
        iconColor={theme.colors.primary}
        onSubmitEditing={handleSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchBar: {
    borderRadius: 8,
    elevation: 0,
    backgroundColor: '#F3F3F3',
  },
});

export default SearchBar; 