import React from 'react';

export type AtmosphereMode = 'auto' | 'clear' | 'drizzle' | 'heavy' | 'cyclone' | 'dark_mode';

interface Props {
  mode: AtmosphereMode;
  onChange: (mode: AtmosphereMode) => void;
}

export const AtmosphereWidget: React.FC<Props> = () => {
  // Completely removed floating widget from bottom-right corner to maintain clean professional layout
  return null;
};
