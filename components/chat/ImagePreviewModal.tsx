import React from 'react';
import { View, Modal, Image, Pressable, Alert, Dimensions } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Text } from '../ui/Text';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

export function ImagePreviewModal({ visible, imageUrl, onClose }: ImagePreviewModalProps) {
  const { width, height } = Dimensions.get('window');

  const handleSaveImage = async () => {
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Cannot save image without media library permissions');
        return;
      }

      // MediaLibrary can handle both data URIs and file URIs
      // For data URIs, createAssetAsync will handle the conversion
      try {
        if (imageUrl.startsWith('data:')) {
          // Create an asset from the data URI
          const asset = await MediaLibrary.createAssetAsync(imageUrl);
          Alert.alert('Success', 'Image saved to your photo library');
        } else {
          // For regular file URIs
          await MediaLibrary.saveToLibraryAsync(imageUrl);
          Alert.alert('Success', 'Image saved to your photo library');
        }
      } catch (saveError) {
        console.error('[ImagePreviewModal] Direct save failed, trying alternative:', saveError);
        // Fallback: try to save as regular URI
        await MediaLibrary.saveToLibraryAsync(imageUrl);
        Alert.alert('Success', 'Image saved to your photo library');
      }
    } catch (error) {
      console.error('[ImagePreviewModal] Save error:', error);
      Alert.alert('Error', 'Failed to save image. Make sure the image is loaded.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {/* Close button */}
        <Pressable
          onPress={onClose}
          className="absolute top-12 right-4 z-10 bg-black/50 rounded-full w-10 h-10 items-center justify-center"
        >
          <Text className="text-white text-2xl">×</Text>
        </Pressable>

        {/* Save button */}
        <Pressable
          onPress={handleSaveImage}
          className="absolute top-12 left-4 z-10 bg-black/50 rounded-lg px-4 py-2"
        >
          <Text className="text-white font-medium">Save</Text>
        </Pressable>

        {/* Image */}
        <Pressable onPress={onClose} className="flex-1 items-center justify-center">
          <Image
            source={{ uri: imageUrl }}
            style={{ width, height }}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </Modal>
  );
}
