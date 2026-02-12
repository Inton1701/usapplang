// app/account/contact.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen, Input, Button, Text, Spacer } from '@/components';
import { useProfile } from '@/hooks/useProfile';

export default function ContactInfoScreen() {
  const {
    profile,
    loading,
    updateProfile,
    changeEmail,
  } = useProfile();

  useEffect(() => {
    console.log('[ContactScreen] Mounted');
    return () => console.log('[ContactScreen] Unmounted');
  }, []);

  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[ContactScreen] profile effect - profile:', profile);
    if (!profile) return;
    setEmail(profile.email);
    setContactNumber(profile.contactNumber ?? '');
  }, [profile]);

  if (loading || !profile) {
    console.log('[ContactScreen] loading or no profile - loading:', loading, 'profile:', profile);
    return null;
  }

  const handleSave = async () => {
    console.log('[ContactScreen] Save button pressed - data:', { email, contactNumber });
    setSaving(true);
    try {
      if (email !== profile.email) {
        console.log('[ContactScreen] email changed, calling changeEmail ->', email);
        await changeEmail(email);
        console.log('[ContactScreen] changeEmail succeeded');
      }

      console.log('[ContactScreen] calling updateProfile with contactNumber');
      await updateProfile({ contactNumber });
      console.log('[ContactScreen] updateProfile succeeded');

      // success feedback
      const { showToast } = await import('@/providers/ToastProvider');
      showToast('success', 'Contact info saved');
    } catch (err: any) {
      console.log('ERROR in ContactScreen.handleSave:', err);
      const { showToast } = await import('@/providers/ToastProvider');
      const message = err?.message || 'Failed to save contact info';
      showToast('error', message);
    } finally {
      setSaving(false);
      console.log('[ContactScreen] Save finished - saving:false');
    }
  };

  const setEmailWithLog = (val: string) => {
    console.log('[ContactScreen] email changed ->', val);
    setEmail(val);
  };

  const setContactNumberWithLog = (val: string) => {
    console.log('[ContactScreen] contactNumber changed ->', val);
    setContactNumber(val);
  };

  return (
    <Screen className="bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <Text variant="title" className="text-center mb-2">
          Contact Info
        </Text>

        <Input
          value={email}
          onChangeText={setEmailWithLog}
          placeholder="Email"
          keyboardType="email-address"
        />

        <Spacer size={12} />

        <Input
          value={contactNumber}
          onChangeText={setContactNumberWithLog}
          placeholder="Contact Number"
          keyboardType="phone-pad"
        />

        <Spacer size={20} />

        <Button variant="ghost">
          Change Password
        </Button>

        <Spacer size={24} />

        <Button onPress={handleSave} loading={saving}>
          Save Contact Info
        </Button>
      </KeyboardAvoidingView>
    </Screen>
  );
}
