// Icon components using @expo/vector-icons
// Import and use these instead of react-icons

import React from 'react';
import { 
  Ionicons, 
  MaterialIcons, 
  FontAwesome, 
  Feather,
  AntDesign,
  Entypo,
  MaterialCommunityIcons 
} from '@expo/vector-icons';

export interface IconProps {
  size?: number;
  color?: string;
  style?: any;
}

// Common messenger icons
export const BackIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="arrow-back" size={size} color={color} {...props} />
);

export const SendIcon = ({ size = 24, color = '#fff', ...props }: IconProps) => (
  <Ionicons name="send" size={size} color={color} {...props} />
);

export const SearchIcon = ({ size = 20, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="search" size={size} color={color} {...props} />
);

export const PhoneIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="call" size={size} color={color} {...props} />
);

export const VideoIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="videocam" size={size} color={color} {...props} />
);

export const MenuIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="menu" size={size} color={color} {...props} />
);

export const CloseIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="close" size={size} color={color} {...props} />
);

export const MoreIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="ellipsis-vertical" size={size} color={color} {...props} />
);

export const AttachIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="attach" size={size} color={color} {...props} />
);

export const CameraIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="camera" size={size} color={color} {...props} />
);

export const ImageIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="image" size={size} color={color} {...props} />
);

export const MicIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="mic" size={size} color={color} {...props} />
);

export const EmojiIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="happy-outline" size={size} color={color} {...props} />
);

export const SettingsIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="settings-outline" size={size} color={color} {...props} />
);

export const CheckIcon = ({ size = 16, color = '#3b82f6', ...props }: IconProps) => (
  <Ionicons name="checkmark" size={size} color={color} {...props} />
);

export const CheckAllIcon = ({ size = 16, color = '#3b82f6', ...props }: IconProps) => (
  <Ionicons name="checkmark-done" size={size} color={color} {...props} />
);

export const NotificationIcon = ({ size = 24, color = '#000', ...props }: IconProps) => (
  <Ionicons name="notifications-outline" size={size} color={color} {...props} />
);

export const EyeIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="eye-outline" size={size} color={color} {...props} />
);

export const EyeOffIcon = ({ size = 24, color = '#6b7280', ...props }: IconProps) => (
  <Ionicons name="eye-off-outline" size={size} color={color} {...props} />
);

// Export icon libraries for custom usage
export {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  Feather,
  AntDesign,
  Entypo,
  MaterialCommunityIcons,
};

// Type exports
export type { IconProps as VectorIconProps } from '@expo/vector-icons/build/createIconSet';
