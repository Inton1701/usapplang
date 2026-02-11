// app/account/personal.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Screen,
  Input,
  Button,
  Text,
  Spacer,
  BirthdayPicker,
  Select,
} from '@/components';
import { useProfile } from '@/hooks/useProfile';

export default function PersonalInfoScreen() {
  const {
    profile,
    loading,
    updateProfile,
    saveLocalProfileImage,
    removeProfileImage,
  } = useProfile();

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<string | undefined>();
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setBirthday(profile.birthday);
    setGender(profile.gender ?? '');
    setAddress(profile.address ?? '');
  }, [profile]);

  if (loading || !profile) return null;

  const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], // ✅ SAFE & WORKS IN ALL SDK VERSIONS
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1], // nice square crop like Facebook
  });

  if (!result.canceled) {
    await saveLocalProfileImage(result.assets[0].uri);
  }
};


  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      name,
      birthday,
      gender,
      address,
    });
    setSaving(false);
  };

  return (
    <Screen className="bg-white px-6">
      <View className="items-center mt-8 mb-6">
        <Pressable onPress={pickImage}>
          <Image
            source={{
              uri:
                profile.localPhotoUri ||
                `https://ui-avatars.com/api/?name=${profile.name}`,
            }}
            className="w-24 h-24 rounded-full"
          />
        </Pressable>

        <Spacer size={8} />

        <Text variant="title">{profile.name}</Text>
        <Text variant="muted">{profile.email}</Text>

        <Spacer size={6} />

        <Pressable onPress={removeProfileImage}>
          <Text className="text-red-500">Remove Photo</Text>
        </Pressable>
      </View>

      <Input value={name} onChangeText={setName} placeholder="Full Name" />
      <Spacer size={12} />

      <BirthdayPicker value={birthday} onChange={setBirthday} />
      <Spacer size={12} />

      <Select
        label="Gender"
        value={gender}
        onChange={setGender}
        options={[
          { label: 'Select gender', value: '' },
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ]}
      />
      <Spacer size={12} />

      <Input
        value={address}
        onChangeText={setAddress}
        placeholder="Address"
        multiline
        numberOfLines={4}
      />

      <Spacer size={24} />

      <Button onPress={handleSave} loading={saving}>
        Save Personal Info
      </Button>
    </Screen>
  );
}
