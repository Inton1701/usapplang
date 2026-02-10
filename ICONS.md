# 🎨 Icons Guide

## Using Icons in Your Components

All icons are built using `@expo/vector-icons` which is compatible with React Native and Expo.

## 📦 Import Icons

```tsx
// Import specific icons
import { SendIcon, PhoneIcon, VideoIcon } from '@/components/icons';

// Or import from components root
import { SendIcon, BackIcon } from '@/components';

// Import icon libraries directly
import { Ionicons, MaterialIcons } from '@/components/icons';
```

## 🎯 Available Pre-configured Icons

### Navigation Icons
- `BackIcon` - Back arrow
- `CloseIcon` - Close X
- `MenuIcon` - Hamburger menu
- `MoreIcon` - Three vertical dots

### Communication Icons
- `SendIcon` - Send message
- `PhoneIcon` - Voice call
- `VideoIcon` - Video call
- `MicIcon` - Microphone
- `AttachIcon` - Attach file

### Media Icons
- `CameraIcon` - Camera
- `ImageIcon` - Image/gallery
- `EmojiIcon` - Emoji picker

### Action Icons
- `SearchIcon` - Search
- `SettingsIcon` - Settings
- `NotificationIcon` - Notifications
- `CheckIcon` - Single checkmark
- `CheckAllIcon` - Double checkmark (read receipt)

## 💡 Usage Examples

### Basic Icon Usage
```tsx
import { SendIcon } from '@/components/icons';

<SendIcon size={24} color="#3b82f6" />
```

### In IconButton
```tsx
import { IconButton } from '@/components';
import { PhoneIcon } from '@/components/icons';

<IconButton
  icon={<PhoneIcon size={20} color="#374151" />}
  onPress={() => makeCall()}
  accessibilityLabel="Call"
/>
```

### In Chat Components
```tsx
import { MessageComposer } from '@/components';
// Icons are already integrated in MessageComposer, ReadReceipt, and ChatHeader
```

### Custom Icon from Library
```tsx
import { Ionicons, MaterialIcons, FontAwesome } from '@/components/icons';

// Use any Ionicons icon
<Ionicons name="heart" size={24} color="red" />

// Use Material Icons
<MaterialIcons name="favorite" size={24} color="red" />

// Use FontAwesome
<FontAwesome name="star" size={24} color="gold" />
```

## 🎨 Icon Props

All pre-configured icons accept these props:

```tsx
interface IconProps {
  size?: number;      // Default: 24
  color?: string;     // Default: varies by icon
  style?: any;        // Additional style props
}
```

## 📚 Available Icon Libraries

The following icon libraries are available from `@expo/vector-icons`:

1. **Ionicons** - Modern, clean icons (recommended)
2. **MaterialIcons** - Google Material Design icons
3. **FontAwesome** - Popular icon set
4. **Feather** - Simple, minimal icons
5. **AntDesign** - Ant Design icons
6. **Entypo** - Classic icon set
7. **MaterialCommunityIcons** - Extended Material icons

### Finding Icons

Browse available icons at:
- Ionicons: https://ionic.io/ionicons
- Material: https://materialdesignicons.com/
- FontAwesome: https://fontawesome.com/icons

## 🔧 Creating Custom Icons

Add your own icon exports to `components/icons.tsx`:

```tsx
// components/icons.tsx

export const MyCustomIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="rocket" size={size} color={color} {...props} />
);
```

Then use it:

```tsx
import { MyCustomIcon } from '@/components/icons';

<MyCustomIcon size={32} color="#3b82f6" />
```

## 🎨 Common Color Values

For consistent styling:

```tsx
// Primary colors
color="#3b82f6"  // Blue (primary)
color="#ef4444"  // Red (error)
color="#10b981"  // Green (success)

// Gray scale
color="#111827"  // Gray 900 (dark)
color="#374151"  // Gray 700 (medium)
color="#6b7280"  // Gray 500 (muted)
color="#9ca3af"  // Gray 400 (light)

// White/Black
color="#ffffff"  // White
color="#000000"  // Black
```

## ✅ Already Integrated Components

These components already use icons internally:

- **ChatHeader** - BackIcon
- **MessageComposer** - SendIcon
- **ReadReceipt** - CheckIcon, CheckAllIcon

## 📖 Example: Custom Icon Button

```tsx
import { IconButton } from '@/components';
import { Ionicons } from '@/components/icons';

function MyComponent() {
  return (
    <IconButton
      icon={<Ionicons name="settings-outline" size={20} color="#374151" />}
      onPress={() => openSettings()}
      accessibilityLabel="Open settings"
    />
  );
}
```

## 🚫 Note About react-icons

`react-icons` is not compatible with React Native. Always use `@expo/vector-icons` instead, which is what all the pre-configured icons in this library use.

---

Need more icons? Check the icon libraries or add custom exports to `components/icons.tsx`!
