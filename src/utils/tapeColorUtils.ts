// Simple mapping of common tape color names to CSS color values
export const TAPE_COLOR_MAP: Record<string, string> = {
  'Red': '#FF0000',
  'Blue': '#0000FF',
  'Green': '#008000',
  'Yellow': '#FFFF00',
  'Black': '#000000',
  'White': '#FFFFFF',
  'Orange': '#FFA500',
  'Purple': '#800080',
  'Pink': '#FFC0CB',
  'Brown': '#A52A2A',
  'Grey': '#808080',
  'Silver': '#C0C0C0',
  'Gold': '#FFD700',
  'Navy': '#000080',
  'Maroon': '#800000',
  'Olive': '#808000',
  'Teal': '#008080',
  'Lime': '#00FF00',
  'Cyan': '#00FFFF',
  'Magenta': '#FF00FF',
  'Violet': '#EE82EE',
  'Indigo': '#4B0082',
  'Turquoise': '#40E0D0',
  'Tan': '#D2B48C',
  'Beige': '#F5F5DC',
  'Khaki': '#F0E68C',
  'Salmon': '#FA8072',
  'Coral': '#FF7F50',
  'Tomato': '#FF6347',
  'Orange Red': '#FF4500',
  'Dark Orange': '#FF8C00',
  'Light Blue': '#ADD8E6',
  'Sky Blue': '#87CEEB',
  'Light Green': '#90EE90',
  'Lavender': '#E6E6FA',
  'Plum': '#DDA0DD',
  'Orchid': '#DA70D6',
  'Thistle': '#D8BFD8',
  'Mint': '#98FF98',
  'Aquamarine': '#7FFFD4',
  'Chartreuse': '#7FFF00',
  'Spring Green': '#00FF7F',
  'Sea Green': '#2E8B57',
  'Forest Green': '#228B22',
  'Dark Green': '#013220',
  'Olive Drab': '#6B8E23',
  'Dark Khaki': '#BDB76B',
  'Pale Goldenrod': '#EEE8AA',
  'Light Goldenrod': '#FAFAD2',
  'Light Yellow': '#FFFFE0',
  'Peach': '#FFDAB9',
  'Papaya Whip': '#FFEFD5',
  'Moccasin': '#FFE4B5',
  'Wheat': '#F5DEB3',
  'Bisque': '#FFE4C4',
  'Blanched Almond': '#FFEBCD',
  'Cornsilk': '#FFF8DC',
  'Lemon Chiffon': '#FFFACD',
  'Light Cyan': '#E0FFFF',
  'Pale Turquoise': '#AFEEEE',
  'Light Sea Green': '#20B2AA',
  'Medium Turquoise': '#48D1CC',
  'Dark Slate Gray': '#2F4F4F',
  'Light Slate Gray': '#778899',
  'Cadet Blue': '#5F9EA0',
  'Steel Blue': '#4682B4',
  'Royal Blue': '#4169E1',
  'Medium Blue': '#0000CD',
  'Dark Blue': '#00008B',
  'Midnight Blue': '#191970',
  'Cornflower Blue': '#6495ED',
  'Slate Blue': '#6A5ACD',
  'Medium Slate Blue': '#7B68EE',
  'Dark Slate Blue': '#483D8B',
  'Medium Purple': '#9370DB',
  'Dark Magenta': '#8B008B',
  'Dark Orchid': '#9932CC',
  'Medium Orchid': '#BA55D3',
  'Dark Violet': '#9400D3',
  'Blue Violet': '#8A2BE2',
  'Medium Violet Red': '#C71585',
  'Pale Violet Red': '#DB7093',
  'Deep Pink': '#FF1493',
  'Hot Pink': '#FF69B4',
  'Light Pink': '#FFB6C1',
  'Antique White': '#FAEBD7',
  'Old Lace': '#FDF5E6',
  'Linen': '#FAF0E6',
  'Floral White': '#FFFAF0',
  'Ghost White': '#F8F8FF',
  'Honeydew': '#F0FFF0',
  'Mint Cream': '#F5FFFA',
  'Azure': '#F0FFFF',
  'Alice Blue': '#F0F8FF',
  'Seashell': '#FFF5EE',
  'Snow': '#FFFAFA',
  'Ivory': '#FFFFF0'
};

// Function to get color for tape color display
export const getTapeColorStyle = (colorName: string) => {
  // First try exact match
  if (TAPE_COLOR_MAP[colorName]) {
    return TAPE_COLOR_MAP[colorName];
  }
  
  // Try case insensitive match
  const lowerColorName = colorName.toLowerCase();
  for (const [key, value] of Object.entries(TAPE_COLOR_MAP)) {
    if (key.toLowerCase() === lowerColorName) {
      return value;
    }
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(TAPE_COLOR_MAP)) {
    if (key.toLowerCase().includes(lowerColorName) || lowerColorName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Default color if not found
  return '#CCCCCC';
};