# SVG Components for HD Quality

This directory contains SVG components for crisp, high-definition graphics at any screen resolution.

## Benefits of SVG

✅ **Perfect quality** at any size - no pixelation
✅ **Smaller file size** compared to multiple PNG resolutions
✅ **Dynamic theming** - easily change colors
✅ **Better performance** - one file instead of multiple densities
✅ **Scalable** - works perfectly on all screen densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

## Usage Examples

### Logo Component

```tsx
import { Logo, LogoIcon } from '@/components/svg';
import { useTheme } from '@/hooks/useTheme';

function SplashScreen() {
  const theme = useTheme();

  return (
    <View>
      {/* Large logo */}
      <Logo width={200} height={200} color={theme.primary} />

      {/* Small icon */}
      <LogoIcon width={40} height={40} color={theme.primary} />
    </View>
  );
}
```

### Icon Components

```tsx
import {
  SendIcon,
  MicIcon,
  StarIcon,
  DoubleCheckIcon
} from '@/components/svg';

function ChatInput() {
  const theme = useTheme();

  return (
    <View>
      {/* Send button */}
      <TouchableOpacity>
        <SendIcon width={24} height={24} color={theme.primary} />
      </TouchableOpacity>

      {/* Mic button */}
      <TouchableOpacity>
        <MicIcon width={24} height={24} color={theme.text} />
      </TouchableOpacity>

      {/* Star icon (filled) */}
      <StarIcon width={20} height={20} color="#FFD700" filled />

      {/* Message status */}
      <DoubleCheckIcon width={16} height={16} color={theme.primary} />
    </View>
  );
}
```

## Creating Custom SVG Icons

To add new SVG icons:

1. Export your design as SVG from Figma/Sketch/Illustrator
2. Use an SVG optimizer like SVGO to clean up the code
3. Convert the SVG code to React Native SVG components:

```tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface YourIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export const YourIcon: React.FC<YourIconProps> = ({
  width = 24,
  height = 24,
  color = '#000000'
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="YOUR_SVG_PATH_DATA_HERE"
        fill={color}
      />
    </Svg>
  );
};
```

4. Add the export to `index.tsx`
5. Use it throughout your app!

## Replacing Ionicons with SVG

Instead of:
```tsx
<Ionicons name="send" size={24} color={theme.primary} />
```

Use:
```tsx
<SendIcon width={24} height={24} color={theme.primary} />
```

## Performance Tips

- SVG components are just as performant as Ionicons
- For frequently used icons, consider memoizing them:
```tsx
const MemoizedIcon = React.memo(SendIcon);
```

- SVG files are automatically optimized by Metro bundler
