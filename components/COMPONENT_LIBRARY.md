# React Native Component Library

A simple, practical component library for Expo messenger apps using TypeScript and NativeWind.

## ✨ Features

- 🎯 **TypeScript First** - Fully typed components with IntelliSense support
- 🎨 **NativeWind Styling** - Use Tailwind className instead of StyleSheet
- ⚡ **Lightweight** - No heavy dependencies, just clean composable components
- ♿ **Accessible** - Built with accessibility roles and labels
- 📦 **Barrel Exports** - Import everything from `@/components`

## 📦 Installation

All components are already set up in your project. Just import and use:

```tsx
import { Button, ChatBubble, Screen } from "@/components";
```

## 🎨 Components

### UI Components
- **Button** - Primary action buttons with variants (primary, ghost) and sizes (sm, md)
- **Text** - Typography component with variants (body, muted, title)
- **Input** - Text input with optional left/right icon slots
- **Avatar** - User avatars with fallback initials
- **IconButton** - Pressable icon buttons
- **Divider** - Horizontal/vertical dividers
- **Badge** - Notification badges with count or dot

### Chat Components
- **ChatBubble** - Message bubbles with incoming/outgoing styles
- **MessageComposer** - Input area with send button
- **MessageListItem** - Complete message item with avatar, name, and bubble
- **TypingIndicator** - Animated typing indicator
- **ReadReceipt** - Message status (sent, delivered, read)
- **Timestamp** - Formatted message timestamps
- **ChatHeader** - Chat screen header with back button and actions

### Layout Components
- **Screen** - Safe area wrapper with optional padding
- **Row** - Horizontal flexbox layout helper
- **Column** - Vertical flexbox layout helper
- **Spacer** - Simple spacing component

## 🚀 Usage Example

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import {
  Screen,
  ChatHeader,
  MessageListItem,
  MessageComposer,
  TypingIndicator,
} from '@/components';

export default function ChatScreen() {
  const handleSend = (message: string) => {
    console.log('Sending:', message);
  };

  return (
    <Screen>
      <ChatHeader
        title="Sarah Johnson"
        subtitle="Active now"
        onBackPress={() => console.log('Back')}
      />
      
      <ScrollView className="flex-1 px-4">
        <MessageListItem
          message="Hey! How are you?"
          senderName="Sarah Johnson"
          timestamp="10:30 AM"
        />
        
        <MessageListItem
          message="I'm doing great!"
          isOutgoing={true}
          timestamp="10:32 AM"
        />
        
        <TypingIndicator userName="Sarah" />
      </ScrollView>
      
      <MessageComposer onSend={handleSend} />
    </Screen>
  );
}
```

## 📁 Project Structure

```
components/
├── ui/
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Button.tsx
│   ├── Divider.tsx
│   ├── IconButton.tsx
│   ├── Input.tsx
│   ├── Text.tsx
│   └── index.ts
├── chat/
│   ├── ChatBubble.tsx
│   ├── ChatHeader.tsx
│   ├── MessageComposer.tsx
│   ├── MessageListItem.tsx
│   ├── ReadReceipt.tsx
│   ├── Timestamp.tsx
│   ├── TypingIndicator.tsx
│   └── index.ts
├── layout/
│   ├── Column.tsx
│   ├── Row.tsx
│   ├── Screen.tsx
│   ├── Spacer.tsx
│   └── index.ts
└── index.ts
```

## 🎨 Component Showcase

Open `component-showcase.html` in your browser to view all components with live examples and code snippets.

## 💡 Component Examples

### Button
```tsx
<Button variant="primary" size="md" onPress={() => alert('Clicked!')}>
  Click Me
</Button>

<Button variant="ghost" size="sm" loading={isLoading}>
  Loading...
</Button>
```

### Avatar
```tsx
<Avatar 
  fallbackText="Sarah Johnson" 
  size={40} 
/>

<Avatar 
  source="https://example.com/avatar.jpg"
  fallbackText="John Doe"
  size={32}
/>
```

### Input
```tsx
<Input 
  placeholder="Search messages..."
  leftIcon={<SearchIcon />}
/>
```

### ChatBubble
```tsx
<ChatBubble 
  message="Hello there!" 
  isOutgoing={true}
  timestamp="10:30 AM"
/>
```

### Row & Column
```tsx
<Row gap={4} align="center" justify="between">
  <Text>Left</Text>
  <Text>Right</Text>
</Row>

<Column gap={2} align="stretch">
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</Column>
```

## 🎯 TypeScript Support

All components are fully typed with exported prop interfaces:

```tsx
import type { ButtonProps, ChatBubbleProps, ScreenProps } from '@/components';
```

## 🎨 Customization

All components accept a `className` prop for custom styling:

```tsx
<Button className="mt-4 shadow-lg">
  Custom Styled Button
</Button>

<ChatBubble 
  message="Custom message" 
  className="shadow-md"
/>
```

## ♿ Accessibility

Components include proper accessibility props:
- `accessibilityRole` - Defines component type
- `accessibilityLabel` - Screen reader labels
- `accessibilityState` - Component states (disabled, selected, etc.)

## 📝 Notes

- All components use NativeWind `className` for styling
- Safe area handling is built into the `Screen` component
- Components are designed to be composable and reusable
- No Storybook or complex theming system - just simple, practical components

## 🔗 Import Paths

All components can be imported from the root components folder:

```tsx
// Import specific components
import { Button, Avatar, Text } from '@/components/ui';
import { ChatBubble, MessageComposer } from '@/components/chat';
import { Screen, Row, Column } from '@/components/layout';

// Or import everything from root
import { Button, ChatBubble, Screen } from '@/components';
```

---

Built with ❤️ using TypeScript, React Native, Expo, and NativeWind
