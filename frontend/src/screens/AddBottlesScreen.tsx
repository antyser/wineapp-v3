import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Appbar, Button, TextInput, HelperText, IconButton, Divider, Modal, Portal, List } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { addWineToCellarApiV1CellarsWinesPost, listCellarsApiV1CellarsGet } from '../api/generated/sdk.gen';
import { Cellar } from '../api/generated/types.gen';
import { Wine } from '../types/wine';

type AddBottlesScreenRouteProp = RouteProp<RootStackParamList, 'AddBottles'>;
type AddBottlesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const bottleSizeOptions = [
  { label: 'Standard (750ml)', value: '750ml' },
  { label: 'Half Bottle (375ml)', value: '375ml' },
  { label: 'Split (187ml)', value: '187ml' },
  { label: 'Magnum (1.5L)', value: '1.5L' },
  { label: 'Double Magnum (3L)', value: '3L' },
  { label: 'Jeroboam (4.5L/5L)', value: '5L' },
  { label: 'Imperial/Methuselah (6L)', value: '6L' },
  { label: 'Salmanazar (9L)', value: '9L' },
  { label: 'Balthazar (12L)', value: '12L' },
  { label: 'Nebuchadnezzar (15L)', value: '15L' },
];

const AddBottlesScreen = () => {
  const navigation = useNavigation<AddBottlesScreenNavigationProp>();
  const route = useRoute<AddBottlesScreenRouteProp>();
  const { wine, onBottlesAdded } = route.params;

  const [quantity, setQuantity] = useState(1);
  const [bottleSize, setBottleSize] = useState('750ml');
  const [note, setNote] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cellars, setCellars] = useState<Cellar[]>([]);
  const [selectedCellar, setSelectedCellar] = useState<Cellar | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBottleSizeDropdown, setShowBottleSizeDropdown] = useState(false);
  const [showCellarDropdown, setShowCellarDropdown] = useState(false);

  useEffect(() => {
    fetchUserCellars();
  }, []);

  const fetchUserCellars = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await listCellarsApiV1CellarsGet();
      if (response.data?.items) {
        setCellars(response.data.items);
        if (response.data.items.length > 0) {
          setSelectedCellar(response.data.items[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching cellars:', err);
      setError('Failed to load cellars. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleSelectBottleSize = (size: string) => {
    setBottleSize(size);
    setShowBottleSizeDropdown(false);
  };

  const handleDateChange = (date: Date) => {
    setPurchaseDate(date);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const handleSelectCellar = (cellar: Cellar) => {
    setSelectedCellar(cellar);
    setShowCellarDropdown(false);
  };

  const handleCreateCellar = () => {
    // Navigate to the cellar form screen
    navigation.navigate('CellarForm', {});
  };

  const handleAddToCellar = async () => {
    if (!selectedCellar) {
      setError('Please select a cellar first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Parse purchase price if provided
      const parsedPrice = purchasePrice ? parseFloat(purchasePrice) : undefined;
      
      await addWineToCellarApiV1CellarsWinesPost({
        body: {
          cellar_id: selectedCellar.id,
          wine_id: wine.id,
          quantity: quantity,
          size: bottleSize,
          status: 'in_stock',
          // Include purchase price if valid
          ...(parsedPrice && !isNaN(parsedPrice) && { purchase_price: parsedPrice }),
          // Include purchase date
          purchase_date: formatDate(purchaseDate),
          // Include condition (bottle note) if provided
          ...(note.trim() && { condition: note.trim() })
        }
      });

      // Call the callback if provided
      if (onBottlesAdded) {
        onBottlesAdded();
      }
      
      // Navigate back
      navigation.goBack();
    } catch (err) {
      console.error('Error adding wine to cellar:', err);
      setError('Failed to add wine to cellar. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format vintage
  const formatVintage = (vintage: string | number | undefined) => {
    return vintage ? vintage.toString() : 'N/A';
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Add Bottles" />
        <Appbar.Action icon="close" onPress={() => navigation.goBack()} />
      </Appbar.Header>

      <Portal>
        <Modal visible={showDatePicker} onDismiss={() => setShowDatePicker(false)} contentContainerStyle={styles.datePickerModal}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Select Purchase Date</Text>
            <View style={styles.calendarContainer}>
              {/* Custom date picker UI */}
              <View style={styles.datePickerControls}>
                <View style={styles.dateInputRow}>
                  {/* Year selector */}
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Year</Text>
                    <View style={styles.dateInputContainer}>
                      <IconButton 
                        icon="minus" 
                        size={20} 
                        onPress={() => {
                          const newDate = new Date(purchaseDate);
                          newDate.setFullYear(newDate.getFullYear() - 1);
                          setPurchaseDate(newDate);
                        }}
                      />
                      <Text style={styles.dateValue}>{purchaseDate.getFullYear()}</Text>
                      <IconButton 
                        icon="plus" 
                        size={20}
                        disabled={purchaseDate.getFullYear() >= new Date().getFullYear()}
                        onPress={() => {
                          const newDate = new Date(purchaseDate);
                          const currentYear = new Date().getFullYear();
                          if (newDate.getFullYear() < currentYear) {
                            newDate.setFullYear(newDate.getFullYear() + 1);
                            setPurchaseDate(newDate);
                          }
                        }}
                      />
                    </View>
                  </View>
                  
                  {/* Month selector */}
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Month</Text>
                    <View style={styles.dateInputContainer}>
                      <IconButton 
                        icon="minus" 
                        size={20} 
                        onPress={() => {
                          const newDate = new Date(purchaseDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setPurchaseDate(newDate);
                        }}
                      />
                      <Text style={styles.dateValue}>
                        {purchaseDate.toLocaleString('default', { month: 'short' })}
                      </Text>
                      <IconButton 
                        icon="plus" 
                        size={20}
                        disabled={
                          purchaseDate.getFullYear() === new Date().getFullYear() && 
                          purchaseDate.getMonth() >= new Date().getMonth()
                        }
                        onPress={() => {
                          const newDate = new Date(purchaseDate);
                          const now = new Date();
                          if (
                            newDate.getFullYear() < now.getFullYear() || 
                            (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() < now.getMonth())
                          ) {
                            newDate.setMonth(newDate.getMonth() + 1);
                            setPurchaseDate(newDate);
                          }
                        }}
                      />
                    </View>
                  </View>
                  
                  {/* Day selector */}
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Day</Text>
                    <View style={styles.dateInputContainer}>
                      <IconButton 
                        icon="minus" 
                        size={20} 
                        onPress={() => {
                          const newDate = new Date(purchaseDate);
                          newDate.setDate(newDate.getDate() - 1);
                          setPurchaseDate(newDate);
                        }}
                      />
                      <Text style={styles.dateValue}>{purchaseDate.getDate()}</Text>
                      <IconButton 
                        icon="plus" 
                        size={20}
                        disabled={
                          purchaseDate.getFullYear() === new Date().getFullYear() && 
                          purchaseDate.getMonth() === new Date().getMonth() &&
                          purchaseDate.getDate() >= new Date().getDate()
                        }
                        onPress={() => {
                          const newDate = new Date(purchaseDate);
                          const now = new Date();
                          if (
                            newDate.getFullYear() < now.getFullYear() || 
                            (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() < now.getMonth()) ||
                            (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() === now.getMonth() && newDate.getDate() < now.getDate())
                          ) {
                            newDate.setDate(newDate.getDate() + 1);
                            setPurchaseDate(newDate);
                          }
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.datePickerButtons}>
              <Button 
                mode="outlined" 
                onPress={() => setShowDatePicker(false)}
                style={styles.datePickerButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={() => {
                  handleDateChange(purchaseDate);
                }}
                style={[styles.datePickerButton, styles.datePickerConfirmButton]}
              >
                Confirm
              </Button>
            </View>
          </View>
        </Modal>

        <Modal visible={showCellarDropdown} onDismiss={() => setShowCellarDropdown(false)} contentContainerStyle={styles.dropdownModal}>
          <View style={styles.cellarPickerContainer}>
            <Text style={styles.datePickerTitle}>Select Cellar</Text>
            
            <ScrollView style={styles.cellarListContainer}>
              {cellars.length > 0 ? (
                cellars.map((cellar) => (
                  <TouchableOpacity
                    key={cellar.id}
                    style={[
                      styles.cellarItem,
                      selectedCellar?.id === cellar.id && styles.selectedCellarItem
                    ]}
                    onPress={() => handleSelectCellar(cellar)}
                  >
                    <Text style={styles.cellarItemText}>{cellar.name}</Text>
                    {selectedCellar?.id === cellar.id && (
                      <IconButton icon="check" size={20} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCellarList}>
                  <Text>No cellars found</Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.cellarPickerButtons}>
              <Button 
                mode="outlined"
                onPress={() => setShowCellarDropdown(false)}
                style={styles.cellarPickerButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleCreateCellar}
                style={[styles.cellarPickerButton, styles.createCellarButton]}
                icon="plus"
              >
                Create New Cellar
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <ScrollView style={styles.scrollView}>
        {/* Wine Preview Card */}
        <View style={styles.wineCard}>
          {wine.image_url ? (
            <Image source={{ uri: wine.image_url }} style={styles.wineImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text>No Image</Text>
            </View>
          )}
          <View style={styles.wineDetails}>
            <Text style={styles.wineYear}>{formatVintage(wine.vintage)} {wine.name}</Text>
            <View style={styles.wineTypeContainer}>
              <View style={styles.dot} />
              <Text>{wine.type || ''} {wine.varietal || ''}</Text>
            </View>
            <Text style={styles.wineRegion}>
              {[wine.country, wine.region].filter(Boolean).join(' > ')}
            </Text>
          </View>
        </View>

        <Divider />

        {/* Bottle Information Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Bottle Information</Text>
          
          {/* Cellar Selection */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Add to Cellar</Text>
            <TouchableOpacity 
              style={styles.cellarSelector}
              onPress={() => setShowCellarDropdown(true)}
            >
              <Text>{selectedCellar ? selectedCellar.name : 'Select a cellar'}</Text>
              <IconButton icon="chevron-down" size={20} onPress={() => setShowCellarDropdown(true)} />
            </TouchableOpacity>
          </View>

          {/* Quantity Selector */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Bottle Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={handleDecreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                value={quantity.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!isNaN(num) && num > 0) {
                    setQuantity(num);
                  }
                }}
                keyboardType="number-pad"
                mode="flat"
                dense
              />
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={handleIncreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottle Size Dropdown */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Bottle Size</Text>
            <TouchableOpacity 
              style={styles.bottleSizeSelector}
              onPress={() => setShowBottleSizeDropdown(!showBottleSizeDropdown)}
            >
              <Text>{bottleSize}</Text>
              <IconButton icon="chevron-down" size={20} onPress={() => setShowBottleSizeDropdown(!showBottleSizeDropdown)} />
            </TouchableOpacity>
          </View>

          {/* Bottle Size Dropdown Options */}
          {showBottleSizeDropdown && (
            <View style={styles.dropdownContainer}>
              <ScrollView style={styles.dropdownScroll}>
                {bottleSizeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      bottleSize === option.value && styles.selectedDropdownItem
                    ]}
                    onPress={() => handleSelectBottleSize(option.value)}
                  >
                    <Text>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Purchase Price */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Purchase Price (Optional)</Text>
            <TextInput
              style={styles.priceInput}
              value={purchasePrice}
              onChangeText={setPurchasePrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
              mode="outlined"
              left={<TextInput.Affix text="$" />}
            />
          </View>

          {/* Purchase Date */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Purchase Date</Text>
            <TouchableOpacity 
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{formatDate(purchaseDate)}</Text>
              <IconButton icon="calendar" size={20} onPress={() => setShowDatePicker(true)} />
            </TouchableOpacity>
          </View>

          {/* Bottle Note (Condition) */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Bottle Condition (Optional)</Text>
            <View style={styles.noteContainer}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Type Here..."
                multiline
                numberOfLines={4}
                maxLength={255}
                mode="outlined"
              />
              <Text style={styles.characterCount}>{note.length}/255</Text>
            </View>
          </View>

          {/* Bottle Note Help */}
          <View style={styles.infoContainer}>
            <IconButton icon="information-outline" size={20} />
            <Text style={styles.infoText}>
              Bottle Condition can be used to save bottle specific information, like "signed by winemaker" or notes on label condition.
            </Text>
          </View>

          {error && <HelperText type="error">{error}</HelperText>}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <Button
          mode="contained"
          style={styles.addButton}
          onPress={handleAddToCellar}
          loading={loading}
          disabled={loading || !selectedCellar}
        >
          Add to Cellar
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  wineCard: {
    flexDirection: 'row',
    padding: 16,
  },
  wineImage: {
    width: 70,
    height: 100,
    borderRadius: 4,
  },
  placeholderImage: {
    width: 70,
    height: 100,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wineDetails: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  wineYear: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  wineTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#761125',
    marginRight: 8,
  },
  wineRegion: {
    fontSize: 14,
    color: '#666',
  },
  formSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
  },
  quantityInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    textAlign: 'center',
    marginHorizontal: 8,
    backgroundColor: 'white',
  },
  bottleSizeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    paddingLeft: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    paddingLeft: 16,
  },
  priceInput: {
    backgroundColor: 'white',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 16,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDropdownItem: {
    backgroundColor: '#f5f5f5',
  },
  noteContainer: {
    marginBottom: 8,
  },
  noteInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  bottomContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addButton: {
    padding: 4,
    backgroundColor: '#761125',
  },
  datePickerModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  datePickerContainer: {
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  calendarContainer: {
    width: '100%',
    marginVertical: 16,
  },
  datePickerControls: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  dateInputGroup: {
    alignItems: 'center',
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 4,
    width: '90%',
  },
  dateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  datePickerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  datePickerConfirmButton: {
    backgroundColor: '#761125',
  },
  cellarSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    paddingLeft: 16,
  },
  dropdownModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 0,
    maxHeight: '80%',
  },
  cellarPickerContainer: {
    padding: 20,
  },
  cellarListContainer: {
    maxHeight: 300,
    marginVertical: 16,
  },
  cellarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCellarItem: {
    backgroundColor: '#f5f5f5',
  },
  cellarItemText: {
    fontSize: 16,
  },
  emptyCellarList: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellarPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cellarPickerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  createCellarButton: {
    backgroundColor: '#761125',
  },
});

export default AddBottlesScreen; 