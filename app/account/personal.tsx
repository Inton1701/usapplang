// app/account/personal.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from '@/components/ui/IconButton';
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

  useEffect(() => {
    console.log('[PersonalScreen] Mounted');
    return () => console.log('[PersonalScreen] Unmounted');
  }, []);

  const router = useRouter();

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<string | undefined>();
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[PersonalScreen] profile effect - profile:', profile);
    if (!profile) return;
    setName(profile.name);
    setBirthday(profile.birthday);
    setGender(profile.gender ?? '');
    setAddress(profile.address ?? '');
  }, [profile]);

  if (loading || !profile) {
    console.log('[PersonalScreen] loading or no profile - loading:', loading, 'profile:', profile);
    return null;
  }

  const pickImage = async () => {
    console.log('[PersonalScreen] pickImage started');
    try {
      const result: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      console.log('[PersonalScreen] ImagePicker result:', result);

      // support both old and new response shapes
      const canceled = result?.canceled ?? result?.cancelled ?? false;
      const uri = result?.assets?.[0]?.uri ?? result?.uri;

      if (canceled) {
        console.log('[PersonalScreen] pickImage canceled by user');
        return;
      }

      if (!uri) {
        console.log('[PersonalScreen] pickImage no uri returned');
        return;
      }

      try {
        console.log('[PersonalScreen] saving local profile image...', uri);
        await saveLocalProfileImage(uri);
        console.log('[PersonalScreen] saved local profile image');
      } catch (err) {
        console.log('ERROR in saveLocalProfileImage:', err);
      }
    } catch (err) {
      console.log('ERROR in pickImage:', err);
    }
  };


  const handleSave = async () => {
    console.log('[PersonalScreen] Save button pressed - data:', { name, birthday, gender, address });
    setSaving(true);
    try {
      console.log('[PersonalScreen] calling updateProfile');
      await updateProfile({ name, birthday, gender, address });
      console.log('[PersonalScreen] updateProfile succeeded');
    } catch (err) {
      console.log('ERROR in handleSave:', err);
    } finally {
      setSaving(false);
      console.log('[PersonalScreen] Save finished - saving:', false);
    }
  };

  // wrapped setters so we can log input changes
  const setNameWithLog = (val: string) => {
    console.log('[PersonalScreen] name changed ->', val);
    setName(val);
  };

  const setAddressWithLog = (val: string) => {
    console.log('[PersonalScreen] address changed ->', val);
    setAddress(val);
  };

  const setBirthdayWithLog = (val?: string) => {
    console.log('[PersonalScreen] birthday changed ->', val);
    setBirthday(val);
  };

  const setGenderWithLog = (val: string) => {
    console.log('[PersonalScreen] gender changed ->', val);
    setGender(val);
  };

  return (
    <Screen className="bg-white px-6">
      {/* Back button upper-left */}
      <Spacer size={8} />
      <IconButton
        accessibilityLabel="Back"
        onPress={() => {
          console.log('[PersonalScreen] Back pressed');
          try {
            router.back();
          } catch (err) {
            console.log('ERROR in router.back():', err);
          }
        }}
        icon={<Ionicons name="chevron-back" size={20} color="#111827" />}
        className="absolute top-4 left-4"
        size={40}
      />
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

        <Pressable
          onPress={async () => {
            console.log('[PersonalScreen] Remove photo pressed');
            try {
              await removeProfileImage();
              console.log('[PersonalScreen] removeProfileImage succeeded');
            } catch (err) {
              console.log('ERROR in removeProfileImage:', err);
            }
          }}
        >
          <Text className="text-red-500">Remove Photo</Text>
        </Pressable>
      </View>

      <Input value={name} onChangeText={setNameWithLog} placeholder="Full Name" />
      <Spacer size={12} />

      <BirthdayPicker value={birthday} onChange={setBirthdayWithLog} />
      <Spacer size={12} />

      <Select
        label="Gender"
        value={gender}
        onChange={setGenderWithLog}
        options={[
          { label: 'Select gender', value: '' },
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ]}
      />
      <Spacer size={12} />

      <Input
        value={address}
        onChangeText={setAddressWithLog}
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
