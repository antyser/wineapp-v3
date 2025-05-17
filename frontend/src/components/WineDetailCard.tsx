import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, useTheme, Icon } from 'react-native-paper';
import { Wine } from '../api/generated/types.gen';
import { getFormattedWineName } from '../utils/wineUtils';
import { Image } from 'expo-image';

// Import default images
const redDefaultImage = require('../../assets/images/red_default_realistic.png');
const whiteDefaultImage = require('../../assets/images/white_default_realistic.png');
const winePlaceholder = require('../../assets/images/wine-placeholder.png');

/**
 * WineDetailCard Component
 *
 * A comprehensive card component displaying detailed wine information.
 * This component is specifically designed for the Wine Details screen, providing
 * a focused view of wine information.
 *
 * Features:
 * - Displays complete wine details (name, vintage, region, type, etc.)
 * - Shows wine image
 * - Arranges information in a clear, readable layout.
 *
 * Used in:
 * - WineDetailScreen as the main content component for wine details
 */
interface WineDetailCardProps {
  wine: Wine;
  rating?: number | null; // Rating is display-only now
  noteText?: string;
}

const WineDetailCard: React.FC<WineDetailCardProps> = ({
  wine,
  rating = null,
  noteText,
}) => {
  const theme = useTheme();

  // Helper function to format rating display
  const formatRating = (currentRating: number | null): string => {
    const r = currentRating ?? 0; // Treat null as 0
    if (r === 0) return 'Not rated';
    return `Rated: ${Number.isInteger(r) ? r.toString() : r.toFixed(1)}/5`;
  };

  const renderInfoItem = (label: string, value?: string | number | null, icon?: string) => {
    if (!value && value !== 0 && label !== "Grapes" && label !== "Avg. Price") return null;
    // Special handling for Grapes and Avg. Price to allow rendering a placeholder if value is null
    if ((label === "Grapes" || label === "Avg. Price") && (!value && value !==0)) {
        // Render with a placeholder or specific text if you want to indicate missing info
        // For now, we pass it through to let the caller decide (e.g. placeholder View)
        // Or, we can render a placeholder text here directly:
        // return (
        //   <View style={styles.infoItemCol}>
        //     {icon && (
        //       <View style={styles.infoIconContainer}>
        //         <Icon source={icon} size={16} color={theme.colors.onSurfaceVariant} />
        //       </View>
        //     )}
        //     <View>
        //       <Text variant="labelSmall" style={styles.infoLabel}>{label}</Text>
        //       <Text variant="bodyMedium" style={styles.infoValue}>N/A</Text>
        //     </View>
        //   </View>
        // );
        // Let the caller handle missing Grapes/Price with a placeholder View for layout integrity
    } else if (!value && value !== 0) {
        return null; 
    }

    return (
      <View style={styles.infoItemCol}>
        {icon && (
          <View style={styles.infoIconContainer}>
            <Icon source={icon} size={16} color={theme.colors.onSurfaceVariant} />
          </View>
        )}
        <View style={styles.textInfoWrapper}>
          <Text variant="labelSmall" style={styles.infoLabel}>{label}</Text>
          <Text 
            variant="bodyMedium" 
            style={styles.infoValue}
            numberOfLines={label === "Winery" ? 2 : undefined}
            ellipsizeMode={label === "Winery" ? "tail" : undefined}
          >
            {String(value)}
          </Text>
        </View>
      </View>
    );
  };


  return (
    <Card style={styles.card}>
      <View style={styles.topContainer}>
        {/* Wine image on left */}
        <View style={styles.imageContainer}>
          <Image
            source={wine.image_url ? { uri: wine.image_url } : (wine.type && wine.type.toLowerCase() === 'red' ? redDefaultImage : whiteDefaultImage)}
            style={styles.wineImage}
            placeholder={winePlaceholder}
            transition={300}
            resizeMode="contain"
          />
        </View>

        {/* Wine Name (Vintage + Name) on right, using getFormattedWineName */}
        <View style={styles.nameContainer}>
          <Text variant="titleMedium" style={styles.nameText}>
            {getFormattedWineName(wine)}
          </Text>
        </View>
      </View>

      {/* Details arranged in 3 rows, 2 columns */}
      <Card.Content style={styles.detailsContent}>
        <View style={styles.infoRow}>
          {renderInfoItem("Winery", wine.winery, "office-building-outline")}
          {renderInfoItem("Country", wine.country, "earth")}
        </View>
        <View style={styles.infoRow}>
          {renderInfoItem("Region", wine.region, "map-marker-outline")}
          {renderInfoItem("Type", wine.type, "glass-wine")}
        </View>
        <View style={styles.infoRow}>
          {renderInfoItem("Grapes", wine.varietal, "fruit-grapes-outline")}
          {wine.average_price !== undefined && wine.average_price !== null ? (
            renderInfoItem("Avg. Price", `$${wine.average_price.toFixed(2)} / 750ml`, "cash-multiple")
          ) : (
            /* Render a placeholder for Avg. Price if null/undefined to maintain 2-column structure */
            <View style={styles.infoItemCol} />
          )}
        </View>
        
        {rating !== null && (
            <View style={styles.ratingDisplay}>
                <View style={styles.infoIconContainer}>
                    <Icon source="star" size={16} color="#FFD700"/>
                </View>
                <Text variant="bodyMedium" style={styles.infoValue}>{formatRating(rating)}</Text>
            </View>
        )}

        {noteText && (
          <View style={styles.noteDisplay}>
            <View style={styles.infoIconContainer}>
              <Icon source="note-text-outline" size={16} color={theme.colors.onSurfaceVariant} />
            </View>
            <View style={styles.noteTextContainer}>
              <Text variant="labelMedium" style={styles.noteLabel}>Your Note:</Text>
              <Text variant="bodyMedium" style={styles.noteTextContent}>{noteText}</Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 0, // Removed margin as it's part of a larger screen
    marginHorizontal: 0,
    borderRadius: 0, // Flat card, no rounded corners
    elevation: 0, // No shadow for a flatter look
    backgroundColor: '#FFFFFF', // Explicit white background
  },
  topContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start', // Align items to the top for name wrapping
  },
  imageContainer: {
    width: 100, // Fixed width for image
    height: 150, // Fixed height for image (adjust aspect ratio as needed)
    marginRight: 16,
    backgroundColor: '#f0f0f0', // Placeholder background for image
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  wineImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    marginTop: 4,
    color: '#757575',
  },
  nameContainer: {
    flex: 1, // Allow name to take remaining space
    justifyContent: 'center', // Vertically center if space allows, but flex-start in parent
  },
  nameText: {
    // No explicit bolding here, relies on variant or theme for titleLarge
  },
  detailsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16, // Add padding at the bottom of the card content
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // Space between rows
  },
  infoItemCol: {
    flex: 1, // Each item takes half the space in a 2-column row
    flexDirection: 'row',
    alignItems: 'flex-start', // Align icon and text block to their tops for better label alignment
    paddingRight: 4, 
  },
  textInfoWrapper: {
    flexShrink: 1,
  },
  infoIconContainer: { 
    marginRight: 6,
  },
  infoLabel: {
    color: '#757575', // Muted color for labels
    // textTransform: 'uppercase',
    // fontSize: 10,
  },
  infoValue: {
    // fontWeight: '500',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align icon to the top of the text block
    marginTop: 8,
    paddingTop: 8,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteLabel: {
    color: '#757575', // Using a common gray color for the label
    marginBottom: 4, // Space between label and note content
    // fontWeight: 'bold', // Optional: if you want the label to be bold
  },
  noteTextContent: {
    flex: 1,
  },
});

export default WineDetailCard; 