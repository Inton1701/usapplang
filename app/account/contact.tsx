// app/account/contact.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Screen, Input, Button, Text, Spacer } from '@/components';
import { useProfile } from '@/hooks/useProfile';

export default function ContactInfoScreen() {
  const {
    profile,
    loading,
    updateProfile,
    changeEmail,
  } = useProfile();

  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEmail(profile.email);
    setContactNumber(profile.contactNumber ?? '');
  }, [profile]);

  if (loading || !profile) return null;

  const handleSave = async () => {
    setSaving(true);

    if (email !== profile.email) {
      await changeEmail(email);
    }

    await updateProfile({
      contactNumber,
    });

    setSaving(false);
  };

  return (
    <Screen className="bg-white px-6">
      <Spacer size={24} />

      <Input
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
      />

      <Spacer size={12} />

      <Input
        value={contactNumber}
        onChangeText={setContactNumber}
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
    </Screen>
  );
}
