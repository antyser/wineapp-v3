// Basic mapping of country names/codes to flag emojis
// Needs expansion for more comprehensive coverage
const countryFlagMap: { [key: string]: string } = {
    "USA": "🇺🇸",
    "United States": "🇺🇸",
    "France": "🇫🇷",
    "Italy": "🇮🇹",
    "Spain": "🇪🇸",
    "Germany": "🇩🇪",
    "Australia": "🇦🇺",
    "Argentina": "🇦🇷",
    "Chile": "🇨🇱",
    "South Africa": "🇿🇦",
    "New Zealand": "🇳🇿",
    // Add more countries as needed
  };
  
  export const getCountryFlagEmoji = (countryName: string): string | null => {
    // Attempt to find a direct match
    if (countryFlagMap[countryName]) {
      return countryFlagMap[countryName];
    }
    
    // Attempt to find a case-insensitive match
    const lowerCaseCountry = countryName.toLowerCase();
    const matchedKey = Object.keys(countryFlagMap).find(
      (key) => key.toLowerCase() === lowerCaseCountry
    );
    
    return matchedKey ? countryFlagMap[matchedKey] : null;
  }; 