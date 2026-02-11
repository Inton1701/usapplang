import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Input, InputProps } from './Input';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

export interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry' | 'rightIcon'> {
  // All other props inherited from Input
}

export function PasswordInput({ ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      {...props}
      secureTextEntry={!showPassword}
      rightIcon={
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOffIcon size={20} color="#9ca3af" />
          ) : (
            <EyeIcon size={20} color="#9ca3af" />
          )}
        </TouchableOpacity>
      }
    />
  );
}
