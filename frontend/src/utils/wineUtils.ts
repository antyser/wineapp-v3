import { Wine } from '../api'; // Assuming Wine type is available from API types

/**
 * Formats the wine name, prepending the vintage unless the vintage is 1 or missing.
 * 
 * @param wine - The wine object containing name and vintage.
 * @returns Formatted wine name string.
 */
export const getFormattedWineName = (wine: Partial<Wine> | null | undefined): string => {
  if (!wine) {
    return '';
  }
  
  // Check if vintage exists, is not literally 1, and name exists
  if (wine.vintage && wine.vintage !== 1 && wine.name) {
    return `${wine.vintage} ${wine.name}`;
  }
  
  // Otherwise, just return the name or an empty string
  return wine.name || '';
}; 