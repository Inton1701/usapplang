import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import { updateEmail } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/lib/firebase';

export interface ProfileData {
  name: string;
  email: string;
  contactNumber?: string;
  birthday?: string;
  gender?: string;
  photoFilename?: string;
  address?: string;
  localPhotoUri?: string;
}

const PHOTO_KEY = 'LOCAL_PROFILE_PHOTO';

export function useProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const loadProfile = async () => {
      // 🔹 Firestore user data
      const snap = await getDoc(doc(db, 'users', uid));
      const firestoreData = snap.exists() ? snap.data() : {};

      // 🔹 Local profile photo
      const localPhotoUri = await AsyncStorage.getItem(`${PHOTO_KEY}_${uid}`);

      // If we don't have a cached local URI but Firestore has a photo filename,
      // try to resolve it to the documentDirectory path.
      let resolvedLocalUri = localPhotoUri ?? undefined;
      const photoFilename = (firestoreData as ProfileData).photoFilename;
      if (!resolvedLocalUri && photoFilename) {
        const candidate = `${FileSystem.documentDirectory}profilePics/${photoFilename}`;
        const info = await FileSystem.getInfoAsync(candidate);
        if (info.exists) resolvedLocalUri = candidate;
      }

      setProfile({
        ...(firestoreData as ProfileData),
        localPhotoUri: resolvedLocalUri,
      });

      setLoading(false);
    };

    loadProfile();
  }, [uid]);

  const updateProfile = async (data: Partial<ProfileData>) => {
    if (!uid) return;

    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date(),
    });

    setProfile(prev => ({ ...prev!, ...data }));
  };

  const changeEmail = async (newEmail: string) => {
    if (!uid || !auth.currentUser) return;

    try {
      // Update auth email (may require recent login)
      await updateEmail(auth.currentUser, newEmail);

      // Update Firestore users document
      await updateDoc(doc(db, 'users', uid), {
        email: newEmail,
        updatedAt: new Date(),
      });

      setProfile(prev => ({ ...prev!, email: newEmail }));
    } catch (err: any) {
      // Bubble up a clearer error for callers to handle (e.g. requires recent login)
      throw err;
    }
  };

  const removeProfileImage = async () => {
    if (!uid) return;
    try {
      const stored = await AsyncStorage.getItem(`${PHOTO_KEY}_${uid}`);
      if (stored) {
        await FileSystem.deleteAsync(stored, { idempotent: true }).catch(() => {});
      }

      // remove file from documentDirectory if Firestore has filename
      const snap = await getDoc(doc(db, 'users', uid));
      const firestoreData = snap.exists() ? snap.data() : {};
      const filename = (firestoreData as ProfileData).photoFilename;
      if (filename) {
        const path = `${FileSystem.documentDirectory}profilePics/${filename}`;
        await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
      }

      // clear Firestore field and local cache
      await updateDoc(doc(db, 'users', uid), {
        photoFilename: deleteField(),
        updatedAt: new Date(),
      });

      await AsyncStorage.removeItem(`${PHOTO_KEY}_${uid}`);
      setProfile(prev => ({ ...prev!, localPhotoUri: undefined, photoFilename: undefined }));
    } catch (err) {
      console.warn('Failed to remove profile image', err);
    }
  };

  const saveLocalProfileImage = async (uri: string) => {
    if (!uid) return;
    try {
      // ensure profilePics directory exists
      const dir = `${FileSystem.documentDirectory}profilePics`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

      // determine extension
      const parts = uri.split('.');
      let ext = parts.length ? parts.pop() || 'jpg' : 'jpg';
      ext = ext.split('?')[0];

      const filename = `${uid}_${Date.now()}.${ext}`;
      const dest = `${dir}/${filename}`;

      await FileSystem.copyAsync({ from: uri, to: dest });

      // persist filename in Firestore and cache local uri
      await updateDoc(doc(db, 'users', uid), {
        photoFilename: filename,
        updatedAt: new Date(),
      });

      await AsyncStorage.setItem(`${PHOTO_KEY}_${uid}`, dest);
      setProfile(prev => ({ ...prev!, localPhotoUri: dest, photoFilename: filename }));
    } catch (err) {
      console.warn('Failed to save local profile image', err);
    }
  };

  return {
    profile,
    loading,
    updateProfile,
    saveLocalProfileImage,
    removeProfileImage,
    changeEmail,
  };
}
