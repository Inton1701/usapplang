# Component Usage Cheatsheet

## 🎯 Copy-Paste Ready Examples

### Button
```tsx
// Primary button
<Button variant="primary" size="md" onPress={() => {}}>
  Send Message
</Button>

// Ghost button
<Button variant="ghost" size="sm" onPress={() => {}}>
  Cancel
</Button>

// Loading state
<Button loading={true}>Processing...</Button>

// Disabled
<Button disabled={true}>Can't Click</Button>
```

### Text
```tsx
// Body text
<Text variant="body">Regular paragraph text</Text>

// Muted text
<Text variant="muted">Secondary information</Text>

// Title
<Text variant="title">Screen Title</Text>

// Custom styling
<Text className="text-red-500 font-bold">Custom styled</Text>
```

### Input
```tsx
// Basic input
<Input placeholder="Type here..." />

// With left icon
<Input 
  placeholder="Search..." 
  leftIcon={<SearchIcon />}
/>

// With right icon
<Input 
  placeholder="Password" 
  rightIcon={<EyeIcon />}
  secureTextEntry
/>

// Custom styling
<Input 
  className="text-lg"
  containerClassName="bg-blue-50"
  placeholder="Custom input"
/>
```

### Avatar
```tsx
// With image URL
<Avatar source="https://example.com/avatar.jpg" size={40} />

// With fallback initials
<Avatar fallbackText="John Doe" size={40} />

// Different sizes
<Avatar fallbackText="AB" size={32} />
<Avatar fallbackText="CD" size={48} />
<Avatar fallbackText="EF" size={64} />
```

### IconButton
```tsx
// Basic icon button
<IconButton 
  icon={<MenuIcon />}
  onPress={() => {}}
  accessibilityLabel="Open menu"
/>

// Different size
<IconButton 
  icon={<CloseIcon />}
  size={32}
  onPress={() => {}}
/>

// With emoji
<IconButton 
  icon={<Text>⚙️</Text>}
  onPress={() => {}}
  accessibilityLabel="Settings"
/>
```

### Divider
```tsx
// Horizontal
<Divider />

// Vertical
<Divider orientation="vertical" />

// Custom color
<Divider className="bg-blue-500" />
```

### Badge
```tsx
// Count badge
<Badge count={5} />

// Max count
<Badge count={150} maxCount={99} /> // Shows "99+"

// Dot badge
<Badge dot={true} />

// On avatar
<View className="relative">
  <Avatar fallbackText="JD" />
  <Badge count={3} className="absolute -top-1 -right-1" />
</View>
```

### ChatBubble
```tsx
// Incoming message
<ChatBubble 
  message="Hey, how are you?"
  isOutgoing={false}
  timestamp="10:30 AM"
/>

// Outgoing message
<ChatBubble 
  message="I'm doing great, thanks!"
  isOutgoing={true}
  timestamp="10:32 AM"
/>

// Without timestamp
<ChatBubble 
  message="Quick reply"
  isOutgoing={true}
/>
```

### MessageListItem
```tsx
// Incoming with avatar
<MessageListItem
  message="Hello there!"
  senderName="Sarah Johnson"
  senderAvatar="https://example.com/avatar.jpg"
  timestamp="10:30 AM"
  isOutgoing={false}
  showAvatar={true}
/>

// Outgoing (your message)
<MessageListItem
  message="Hi! How are you?"
  timestamp="10:31 AM"
  isOutgoing={true}
  showAvatar={false}
/>

// Subsequent message (no avatar)
<MessageListItem
  message="Another message"
  senderName="Sarah Johnson"
  timestamp="10:30 AM"
  isOutgoing={false}
  showAvatar={false}
/>
```

### MessageComposer
```tsx
// Basic composer
<MessageComposer 
  onSend={(message) => console.log(message)}
  placeholder="Type a message..."
/>

// Disabled state
<MessageComposer 
  onSend={handleSend}
  disabled={isSending}
  placeholder="Sending..."
/>

// Custom styling
<MessageComposer 
  onSend={handleSend}
  className="border-t-2 border-blue-500"
/>
```

### ChatHeader
```tsx
// Basic header
<ChatHeader 
  title="Sarah Johnson"
  subtitle="Active now"
  onBackPress={() => navigation.goBack()}
/>

// With avatar
<ChatHeader 
  title="Group Chat"
  subtitle="5 members"
  avatar="https://example.com/group.jpg"
  onBackPress={() => {}}
/>

// With actions
<ChatHeader 
  title="John Doe"
  subtitle="Online"
  onBackPress={() => {}}
  rightActions={
    <View className="flex-row">
      <IconButton icon={<PhoneIcon />} onPress={() => {}} />
      <IconButton icon={<VideoIcon />} onPress={() => {}} />
    </View>
  }
/>
```

### TypingIndicator
```tsx
// With name
<TypingIndicator userName="Sarah" />

// Without name
<TypingIndicator />

// Custom styling
<TypingIndicator 
  userName="John"
  className="ml-4"
/>
```

### ReadReceipt
```tsx
// Sent
<ReadReceipt status="sent" />

// Delivered
<ReadReceipt status="delivered" />

// Read
<ReadReceipt status="read" />

// In a message
<View className="flex-row items-center gap-1">
  <Text variant="muted">Message sent</Text>
  <ReadReceipt status="delivered" />
</View>
```

### Timestamp
```tsx
// Time only
<Timestamp date={new Date()} format="time" />
// Output: "10:30 AM"

// Date only
<Timestamp date={new Date()} format="date" />
// Output: "Today" or "Jan 15"

// Date and time
<Timestamp date={new Date()} format="datetime" />
// Output: "10:30 AM" or "Jan 15, 10:30 AM"

// From string
<Timestamp date="2024-01-15T10:30:00Z" format="time" />
```

### Screen
```tsx
// Basic screen with safe area
<Screen>
  <Text>Content</Text>
</Screen>

// Without safe area
<Screen safe={false}>
  <Text>Content</Text>
</Screen>

// Custom background
<Screen className="bg-gray-100">
  <Text>Content</Text>
</Screen>
```

### Row
```tsx
// Basic row
<Row>
  <Text>Left</Text>
  <Text>Right</Text>
</Row>

// With gap
<Row gap={4}>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</Row>

// Center aligned
<Row align="center" justify="center">
  <Text>Centered</Text>
</Row>

// Space between
<Row justify="between">
  <Text>Left</Text>
  <Text>Right</Text>
</Row>
```

### Column
```tsx
// Basic column
<Column>
  <Text>Top</Text>
  <Text>Bottom</Text>
</Column>

// With gap
<Column gap={3}>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</Column>

// Center aligned
<Column align="center" justify="center">
  <Text>Centered</Text>
</Column>
```

### Spacer
```tsx
// Vertical space
<Spacer size={16} />

// Horizontal space
<Spacer size={8} horizontal={true} />

// Different sizes
<Spacer size={4} />  // Small
<Spacer size={16} /> // Medium
<Spacer size={32} /> // Large
```

## 🎨 Common Patterns

### Message List
```tsx
<ScrollView className="flex-1 px-4">
  <MessageListItem
    message="Hey!"
    senderName="Sarah"
    timestamp="10:30 AM"
  />
  <MessageListItem
    message="Hi there!"
    isOutgoing={true}
    timestamp="10:31 AM"
  />
  <TypingIndicator userName="Sarah" />
</ScrollView>
```

### Chat Screen Layout
```tsx
<Screen>
  <ChatHeader title="Chat" onBackPress={() => {}} />
  <ScrollView className="flex-1 px-4">
    {/* Messages */}
  </ScrollView>
  <MessageComposer onSend={handleSend} />
</Screen>
```

### User Info Row
```tsx
<Row align="center" gap={3}>
  <Avatar fallbackText="John Doe" size={40} />
  <Column className="flex-1">
    <Text variant="body">John Doe</Text>
    <Text variant="muted">Active 2h ago</Text>
  </Column>
  <Badge count={3} />
</Row>
```

### Action Buttons
```tsx
<Row gap={2} justify="end">
  <Button variant="ghost" onPress={() => {}}>
    Cancel
  </Button>
  <Button variant="primary" onPress={() => {}}>
    Send
  </Button>
</Row>
```

---

💡 **Tip**: All components accept a `className` prop for custom Tailwind styling!
