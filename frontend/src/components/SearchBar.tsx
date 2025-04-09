import React from 'react';
import { StyleSheet } from 'react-native';
import { Searchbar as PaperSearchbar } from 'react-native-paper';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchQuery, setSearchQuery, onSearch }) => {
  return (
    <PaperSearchbar
      placeholder="Search for wines..."
      onChangeText={setSearchQuery}
      value={searchQuery}
      style={styles.searchBar}
      iconColor="#000000"
      inputStyle={styles.searchInput}
      onSubmitEditing={onSearch}
    />
  );
};

const styles = StyleSheet.create({
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  searchInput: {
    color: '#000000',
  },
});

export default SearchBar; 