import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateEmail } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/lib/firebase';

export interface ProfileData {
  name: string;
  email: string;
  contactNumber?: string;
  birthday?: string;
  gender?: string;
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
      const localPhotoUri = await AsyncStorage.getItem(
        `${PHOTO_KEY}_${uid}`
      );

      setProfile({
        ...(firestoreData as ProfileData),
        localPhotoUri: localPhotoUri ?? undefined,
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

    await AsyncStorage.removeItem(`${PHOTO_KEY}_${uid}`);
    setProfile(prev => ({ ...prev!, localPhotoUri: undefined }));
  };

  const saveLocalProfileImage = async (uri: string) => {
    if (!uid) return;

    await AsyncStorage.setItem(`${PHOTO_KEY}_${uid}`, uri);
    setProfile(prev => ({ ...prev!, localPhotoUri: uri }));
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
