import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar as PaperSearchBar } from 'react-native-paper';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  placeholder = 'Search for wines...',
  disabled = false,
}) => {
  return (
    <PaperSearchBar
      placeholder={placeholder}
      onChangeText={setSearchQuery}
      value={searchQuery}
      onIconPress={onSearch}
      onSubmitEditing={onSearch}
      style={styles.searchBar}
      inputStyle={styles.input}
      iconColor="#888"
      elevation={0}
    />
  );
};

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    paddingLeft: 0,
  },
});

export default SearchBar; 