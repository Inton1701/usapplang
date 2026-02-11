// ──────────────────────────────────────────────
// Login screen
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button, Input, PasswordInput, Text, Spacer } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { showToast } from '@/providers/ToastProvider';

export default function LoginScreen() {
  const { login, register, loginAnonymous, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    console.log('[LoginScreen] handleSubmit - isRegister:', isRegister);
    try {
      if (isRegister) {
        if (!name.trim()) {
          console.log('[LoginScreen] Registration failed - name is empty');
          showToast('error', 'Name required');
          return;
        }
        if (password !== confirmPassword) {
          console.log('[LoginScreen] Registration failed - passwords do not match');
          showToast('error', 'Passwords do not match');
          return;
        }
        if (password.length < 6) {
          console.log('[LoginScreen] Registration failed - password too short');
          showToast('error', 'Password must be at least 6 characters');
          return;
        }
        console.log('[LoginScreen] Calling register...');
        await register(email.trim(), password, name.trim());
        console.log('[LoginScreen] Registration successful');
      } else {
        console.log('[LoginScreen] Calling login...');
        await login(email.trim(), password);
        console.log('[LoginScreen] Login successful');
      }
      console.log('[LoginScreen] Navigating to contacts...');
      router.replace('/(tabs)/contacts');
    } catch (err: any) {
      console.error('[LoginScreen] Auth error:', err);
      showToast('error', 'Auth error', err?.message ?? 'Something went wrong');
    }
  };

  const handleAnonymous = async () => {
    console.log('[LoginScreen] handleAnonymous called');
    try {
      console.log('[LoginScreen] Calling loginAnonymous...');
      await loginAnonymous();
      console.log('[LoginScreen] Anonymous login successful');
      console.log('[LoginScreen] Navigating to contacts...');
      router.replace('/(tabs)/contacts');
    } catch (err: any) {
      console.error('[LoginScreen] Anonymous auth error:', err);
      showToast('error', 'Auth error', err?.message ?? 'Something went wrong');
    }
  };

  return (
    <Screen className="bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <Text variant="title" className="text-3xl text-center mb-2">
          USApp
        </Text>
        <Text variant="muted" className="text-center mb-8">
          {isRegister ? 'Create your account' : 'Sign in to continue'}
        </Text>

        {isRegister && (
          <>
            <Input
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Spacer size={12} />
          </>
        )}

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Spacer size={12} />

        <PasswordInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
        />
        <Spacer size={12} />

        {isRegister && (
          <>
            <PasswordInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Spacer size={12} />
          </>
        )}

        <Spacer size={8} />

        <Button onPress={handleSubmit} loading={loading}>
          {isRegister ? 'Create Account' : 'Sign In'}
        </Button>

        <Spacer size={12} />

        <Button variant="ghost" onPress={() => setIsRegister((v) => !v)}>
          {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
        </Button>

        <Spacer size={24} />

        <View className="items-center">
          <Text variant="muted" className="mb-3">— or —</Text>
          <Button variant="ghost" onPress={handleAnonymous} loading={loading}>
            Continue as Guest
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
