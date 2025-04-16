import React, { useMemo, useState } from 'react';
import { StyleSheet, View, SectionList } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Menu, Text } from 'react-native-paper';
import { CellarWineResponse } from '../../api/generated';

interface CellarWineListProps {
  wines: CellarWineResponse[];
  loading?: boolean;
  error?: string;
  onWinePress: (wine: CellarWineResponse) => void;
  onUpdateQuantity: (wine: CellarWineResponse, quantity: number) => void;
  onStatusChange: (wine: CellarWineResponse, status: string) => void;
  cellarSections?: string[] | null;
  onAddWine?: () => void;
}

interface SectionData {
  title: string;
  data: CellarWineResponse[];
}

const CellarWineList: React.FC<CellarWineListProps> = ({
  wines,
  loading,
  error,
  onWinePress,
  onUpdateQuantity,
  onStatusChange,
  cellarSections,
  onAddWine,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const sections = useMemo(() => {
    if (!wines.length) return [];

    // Group by section or "Unsorted" if no section assigned
    const winesBySection: Record<string, CellarWineResponse[]> = {};
    
    // Initialize with cellar sections if provided
    if (cellarSections) {
      cellarSections.forEach(section => {
        winesBySection[section] = [];
      });
    }

    // Add "Unsorted" section
    winesBySection["Unsorted"] = [];
    
    // Group wines by section
    wines.forEach(wine => {
      const section = wine.section || "Unsorted";
      if (!winesBySection[section]) {
        winesBySection[section] = [];
      }
      winesBySection[section].push(wine);
    });

    // Convert to SectionList format
    const formattedSections: SectionData[] = Object.entries(winesBySection)
      .filter(([_, wines]) => wines.length > 0) // Only include sections with wines
      .map(([title, data]) => ({
        title,
        data
      }));

    return formattedSections;
  }, [wines, cellarSections]);

  const renderWineItem = ({ item }: { item: CellarWineResponse }) => {
    return (
      <Card style={styles.wineCard} onPress={() => onWinePress(item)}>
        <Card.Content>
          <View style={styles.wineHeader}>
            <View style={styles.wineInfo}>
              <Text variant="titleMedium">{item.wine?.name || 'Unknown Wine'}</Text>
              
              {item.wine?.vintage && (
                <Text variant="bodyMedium">{item.wine.vintage}</Text>
              )}
              
              {item.wine?.winery && (
                <Text variant="bodySmall">{item.wine.winery}</Text>
              )}
            </View>
            
            <Menu
              visible={activeMenuId === item.id}
              onDismiss={() => setActiveMenuId(null)}
              anchor={
                <Button 
                  onPress={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(item.id);
                  }}
                >
                  Actions
                </Button>
              }
            >
              <Menu.Item 
                title="Increase Qty" 
                onPress={() => {
                  onUpdateQuantity(item, (item.quantity || 0) + 1);
                  setActiveMenuId(null);
                }}
              />
              <Menu.Item 
                title="Decrease Qty" 
                onPress={() => {
                  if ((item.quantity || 0) > 1) {
                    onUpdateQuantity(item, (item.quantity || 0) - 1);
                  }
                  setActiveMenuId(null);
                }}
                disabled={(item.quantity || 0) <= 1}
              />
              <Divider />
              <Menu.Item 
                title="Mark as Consumed" 
                onPress={() => {
                  onStatusChange(item, 'consumed');
                  setActiveMenuId(null);
                }}
              />
              <Menu.Item 
                title="Mark as Gifted" 
                onPress={() => {
                  onStatusChange(item, 'gifted');
                  setActiveMenuId(null);
                }}
              />
            </Menu>
          </View>
          
          <View style={styles.details}>
            <Text variant="bodySmall">Quantity: {item.quantity || 1}</Text>
            
            {item.purchase_price && (
              <Text variant="bodySmall">
                Price: ${item.purchase_price.toFixed(2)}
              </Text>
            )}
            
            {item.purchase_date && (
              <Text variant="bodySmall">
                Purchased: {new Date(item.purchase_date).toLocaleDateString()}
              </Text>
            )}
            
            <Text variant="bodySmall" style={styles.status}>
              Status: {item.status || 'in_stock'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (wines.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No wines in this cellar yet.</Text>
        {onAddWine && (
          <Button 
            mode="contained" 
            onPress={onAddWine}
            style={styles.addButton}
          >
            Add Wine
          </Button>
        )}
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderWineItem}
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium">{title}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  list: {
    padding: 16,
  },
  wineCard: {
    marginBottom: 12,
  },
  wineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wineInfo: {
    flex: 1,
    marginRight: 8,
  },
  details: {
    marginTop: 12,
  },
  status: {
    marginTop: 4,
    textTransform: 'capitalize',
  },
  sectionHeader: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    marginVertical: 8,
    borderRadius: 4,
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
  emptyText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 16,
  },
});

export default CellarWineList;
