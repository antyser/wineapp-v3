import React, { useState } from 'react';
import { StyleSheet, FlatList, View, TouchableOpacity, ScrollView } from 'react-native';
import { Card, Text, IconButton, Chip, Searchbar, Menu, Button, Divider, ActivityIndicator, FAB } from 'react-native-paper';
import { CellarWine } from '../../api/cellarService';

interface CellarWineListProps {
  wines: CellarWine[];
  loading?: boolean;
  error?: string;
  onWinePress: (wine: CellarWine) => void;
  onUpdateQuantity?: (wine: CellarWine, quantity: number) => void;
  onStatusChange?: (wine: CellarWine, status: string) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  cellarSections?: string[];
  onAddWine?: () => void;
}

interface SortOption {
  label: string;
  value: string;
  desc: boolean;
}

const sortOptions: SortOption[] = [
  { label: 'Recent First', value: 'created_at', desc: true },
  { label: 'Oldest First', value: 'created_at', desc: false },
  { label: 'Name A-Z', value: 'name', desc: false },
  { label: 'Name Z-A', value: 'name', desc: true },
  { label: 'Price (High to Low)', value: 'purchase_price', desc: true },
  { label: 'Price (Low to High)', value: 'purchase_price', desc: false },
];

const CellarWineListItem: React.FC<{
  cellarWine: CellarWine;
  onPress: () => void;
  onUpdateQuantity?: (quantity: number) => void;
  onStatusChange?: (status: string) => void;
}> = ({ cellarWine, onPress, onUpdateQuantity, onStatusChange }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <TouchableOpacity onPress={onPress} style={styles.itemContainer}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="titleMedium">
                {cellarWine.wine.vintage} {cellarWine.wine.name}
              </Text>
              {cellarWine.wine.producer && (
                <Text variant="bodyMedium" style={styles.producer}>
                  {cellarWine.wine.producer}
                </Text>
              )}
            </View>

            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={
                <IconButton icon="dots-vertical" size={20} onPress={openMenu} />
              }
            >
              {onStatusChange && (
                <>
                  <Menu.Item
                    title="Mark as Consumed"
                    onPress={() => {
                      onStatusChange('consumed');
                      closeMenu();
                    }}
                  />
                  <Menu.Item
                    title="Mark as Gifted"
                    onPress={() => {
                      onStatusChange('gifted');
                      closeMenu();
                    }}
                  />
                  <Menu.Item
                    title="Mark as Sold"
                    onPress={() => {
                      onStatusChange('sold');
                      closeMenu();
                    }}
                  />
                  <Divider />
                </>
              )}
              <Menu.Item
                title="View Details"
                onPress={() => {
                  onPress();
                  closeMenu();
                }}
              />
            </Menu>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.chipsRow}>
              {cellarWine.section && (
                <Chip icon="tag" style={styles.chip} compact>
                  {cellarWine.section}
                </Chip>
              )}
              {cellarWine.wine.wine_type && (
                <Chip icon="glass-wine" style={styles.chip} compact>
                  {cellarWine.wine.wine_type}
                </Chip>
              )}
              {cellarWine.status !== 'in_stock' && (
                <Chip icon="information" style={styles.statusChip} compact>
                  {cellarWine.status.replace('_', ' ')}
                </Chip>
              )}
            </View>

            <View style={styles.quantityRow}>
              <Text variant="bodyMedium">
                {cellarWine.quantity} × {cellarWine.size || 'Standard'}
              </Text>

              {onUpdateQuantity && cellarWine.status === 'in_stock' && (
                <View style={styles.quantityControls}>
                  <IconButton
                    icon="minus"
                    size={16}
                    disabled={cellarWine.quantity <= 1}
                    onPress={() => onUpdateQuantity(cellarWine.quantity - 1)}
                  />
                  <IconButton
                    icon="plus"
                    size={16}
                    onPress={() => onUpdateQuantity(cellarWine.quantity + 1)}
                  />
                </View>
              )}
            </View>

            {cellarWine.purchase_price && (
              <Text variant="bodyMedium" style={styles.price}>
                ${cellarWine.purchase_price.toFixed(2)} per bottle
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const CellarWineList: React.FC<CellarWineListProps> = ({
  wines,
  loading = false,
  error,
  onWinePress,
  onUpdateQuantity,
  onStatusChange,
  onEndReached,
  hasMore = false,
  cellarSections = [],
  onAddWine,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0]);

  // Filter by search query and section
  const filteredWines = wines.filter((cellarWine) => {
    const matchesSearch = searchQuery
      ? `${cellarWine.wine.name} ${cellarWine.wine.producer || ''} ${cellarWine.wine.vintage || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesSection = selectedSection
      ? cellarWine.section === selectedSection
      : true;

    return matchesSearch && matchesSection;
  });

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search wines"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionsScroll}>
          <Chip
            selected={selectedSection === null}
            onPress={() => setSelectedSection(null)}
            style={styles.filterChip}
          >
            All Sections
          </Chip>
          {cellarSections.map((section, index) => (
            <Chip
              key={index}
              selected={selectedSection === section}
              onPress={() => setSelectedSection(section)}
              style={styles.filterChip}
            >
              {section}
            </Chip>
          ))}
        </ScrollView>

        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Button
              onPress={() => setSortMenuVisible(true)}
              icon="sort"
              mode="outlined"
              compact
              style={styles.sortButton}
            >
              Sort
            </Button>
          }
        >
          {sortOptions.map((option) => (
            <Menu.Item
              key={`${option.value}-${option.desc}`}
              title={option.label}
              onPress={() => {
                setSortBy(option);
                setSortMenuVisible(false);
              }}
              titleStyle={
                sortBy.value === option.value && sortBy.desc === option.desc
                  ? styles.selectedSortOption
                  : undefined
              }
            />
          ))}
        </Menu>
      </View>

      {loading && wines.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : error && wines.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredWines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CellarWineListItem
              cellarWine={item}
              onPress={() => onWinePress(item)}
              onUpdateQuantity={
                onUpdateQuantity
                  ? (quantity) => onUpdateQuantity(item, quantity)
                  : undefined
              }
              onStatusChange={
                onStatusChange
                  ? (status) => onStatusChange(item, status)
                  : undefined
              }
            />
          )}
          contentContainerStyle={styles.list}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && hasMore ? <ActivityIndicator style={styles.loadingMore} /> : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text variant="bodyLarge">No wines found</Text>
              {onAddWine && (
                <Button mode="contained" onPress={onAddWine} style={styles.addButton}>
                  Add Wine to Cellar
                </Button>
              )}
            </View>
          }
        />
      )}

      {onAddWine && filteredWines.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={onAddWine}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionsScroll: {
    flex: 1,
  },
  filterChip: {
    marginRight: 8,
  },
  sortButton: {
    height: 36,
  },
  selectedSortOption: {
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
    paddingBottom: 80, // Extra space for the FAB
  },
  itemContainer: {
    marginBottom: 16,
  },
  card: {
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  producer: {
    fontStyle: 'italic',
    marginTop: 2,
  },
  detailsContainer: {
    marginTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
  },
  statusChip: {
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#FFC107',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
  },
  loadingMore: {
    marginVertical: 16,
  },
  addButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CellarWineList;
