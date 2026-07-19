/**
 * SAP Summit brand palette — synced from artifacts/volunteer-hub/src/index.css
 *
 * Light tokens:  SAP Electric Blue primary, crisp blue-white background
 * Dark tokens:   Deep navy background, bright electric blue primary
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#131628',
    tint: '#0057D2',

    // Core surfaces
    background: '#EEF0F9',
    foreground: '#131628',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#131628',

    // Primary action color — SAP Electric Blue #0057D2
    primary: '#0057D2',
    primaryForeground: '#FFFFFF',

    // Secondary
    secondary: '#D6DDF5',
    secondaryForeground: '#0048B3',

    // Muted / subdued
    muted: '#E3E7F2',
    mutedForeground: '#606B8A',

    // Accent
    accent: '#D6DDF5',
    accentForeground: '#0048B3',

    // Destructive
    destructive: '#E81212',
    destructiveForeground: '#FFFFFF',

    // Borders
    border: '#C7CFE0',
    input: '#C7CFE0',
  },

  dark: {
    // Legacy aliases
    text: '#E9ECF5',
    tint: '#2B7FFF',

    // Core surfaces — deep navy
    background: '#080C24',
    foreground: '#E9ECF5',

    // Cards
    card: '#0D1230',
    cardForeground: '#E9ECF5',

    // Primary — bright electric blue
    primary: '#2B7FFF',
    primaryForeground: '#FFFFFF',

    // Secondary
    secondary: '#1A2040',
    secondaryForeground: '#7EB3FF',

    // Muted
    muted: '#1A1F38',
    mutedForeground: '#7E8AAE',

    // Accent
    accent: '#1E2650',
    accentForeground: '#7EB3FF',

    // Destructive
    destructive: '#E84040',
    destructiveForeground: '#FFFFFF',

    // Borders
    border: '#242A48',
    input: '#242A48',
  },

  // Border radius: 0.375rem = 6px (from web --radius: 0.375rem)
  radius: 6,
};

export default colors;
