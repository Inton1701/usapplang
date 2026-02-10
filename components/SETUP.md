# 🔧 Setup Guide - Component Library

## Prerequisites Installation

Your component library requires a few dependencies to work properly:

### 1. Install NativeWind (Required)

```bash
npm install nativewind
npm install --save-dev tailwindcss
```

### 2. Install Safe Area Context (Required for Screen component)

```bash
npx expo install react-native-safe-area-context
```

### 3. Configure Tailwind CSS

Create `tailwind.config.js` in your project root:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 4. Configure Babel

Update or create `babel.config.js`:

```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

### 5. Add TypeScript Support for NativeWind

Create `app.d.ts` in your project root:

```typescript
/// <reference types="nativewind/types" />
```

### 6. Update tsconfig.json (Optional but Recommended)

Add path aliases to your `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components": ["./components"],
      "@/components/*": ["./components/*"]
    }
  }
}
```

## 🚀 Quick Setup Script

Run these commands in order:

```bash
# Install dependencies
npm install nativewind
npm install --save-dev tailwindcss
npx expo install react-native-safe-area-context

# Initialize Tailwind (creates tailwind.config.js)
npx tailwindcss init
```

Then manually:
1. Update `tailwind.config.js` with the content paths shown above
2. Add NativeWind plugin to `babel.config.js`
3. Create `app.d.ts` with NativeWind types reference
4. Restart your Metro bundler

## ✅ Verify Installation

After setup, test that everything works:

```tsx
import { View, Text } from 'react-native';

export default function TestScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-500">
      <Text className="text-white text-xl font-bold">
        NativeWind is working! 🎉
      </Text>
    </View>
  );
}
```

If you see a blue background with white text, you're all set!

## 📦 Component Usage Without NativeWind (Fallback)

If you want to use components before installing NativeWind, you can temporarily use inline styles:

```tsx
// Temporary - replace className with style
<View style={{ flex: 1, padding: 16 }}>
  {/* content */}
</View>
```

But for the full component library experience, **NativeWind is strongly recommended**.

## 🔍 Troubleshooting

### Metro bundler issues after installing NativeWind
```bash
# Clear cache and restart
npx expo start --clear
```

### TypeScript errors with className
Make sure `app.d.ts` exists with:
```typescript
/// <reference types="nativewind/types" />
```

### Safe area not working
Ensure you wrap your app root with SafeAreaProvider:

```tsx
// App.tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Your app content */}
    </SafeAreaProvider>
  );
}
```

## 📚 Next Steps

After setup:
1. Open `component-showcase.html` to see all components
2. Read `COMPONENT_LIBRARY.md` for full documentation
3. Check `app/(chat)/ChatScreen.tsx` for a working example
4. Start building your messenger app!

## 🆘 Need Help?

- NativeWind docs: https://www.nativewind.dev/
- Expo docs: https://docs.expo.dev/
- React Native docs: https://reactnative.dev/

---

Once you complete this setup, all 18 components in your library will work perfectly! 🚀
