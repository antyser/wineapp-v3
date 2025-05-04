// Mock expo-font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
  __esModule: true,
}));

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialIcons: function MockMaterialIcons(props) {
      return <View testID={`icon-${props.name}`} />;
    },
    MaterialCommunityIcons: function MockMaterialCommunityIcons(props) {
      return <View testID={`icon-${props.name}`} />;
    },
    Ionicons: function MockIonicons(props) {
      return <View testID={`icon-${props.name}`} />;
    },
    FontAwesome: function MockFontAwesome(props) {
      return <View testID={`icon-${props.name}`} />;
    },
    FontAwesome5: function MockFontAwesome5(props) {
      return <View testID={`icon-${props.name}`} />;
    },
  };
});

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const ReactNativePaper = jest.requireActual('react-native-paper');
  return {
    ...ReactNativePaper,
    Provider: ({ children }) => children,
  };
});


// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {});

// Mock navigation
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});
