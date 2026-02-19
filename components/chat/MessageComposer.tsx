import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { SendIcon, AttachIcon, ImageIcon, MicIcon } from '../icons';
import { Text } from '../ui/Text';
import type { MessageAttachment } from '@/types';

export interface MessageComposerProps {
  onSend?: (message: string, attachments?: MessageAttachment[]) => void;
  onUploadAttachment?: (file: {
    uri: string;
    type: string;
    name: string;
    size: number;
    duration?: number;
  }) => Promise<MessageAttachment>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function MessageComposer({
  onSend,
  onUploadAttachment,
  placeholder = 'Type a message...',
  disabled = false,
  className = '',
}: MessageComposerProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);

  const validateFileSize = (size: number): boolean => {
    if (size > MAX_FILE_SIZE) {
      Alert.alert('File too large', 'Maximum file size is 5MB');
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Disable native editor to avoid dark mode issue
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      let imageUri = asset.uri;
      let fileSize = asset.fileSize || 0;

      // Auto-compress if file is larger than 5MB
      if (fileSize > MAX_FILE_SIZE) {
        try {
          setUploading(true);
          Alert.alert('Compressing image', 'Image is larger than 5MB, compressing...');

          let quality = 0.7;
          let compressedUri = imageUri;
          let compressedSize = fileSize;

          // Try reducing quality until file is under 5MB
          while (compressedSize > MAX_FILE_SIZE && quality > 0.1) {
            const manipResult = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: 1920 } }], // Max width 1920px
              { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
            );
            
            compressedUri = manipResult.uri;
            
            const fileInfo = await FileSystem.getInfoAsync(compressedUri);
            compressedSize = fileInfo.exists && typeof fileInfo.size === 'number' ? fileInfo.size : 0;
            
            console.log(`[handlePickImage] Compression attempt: quality=${quality}, size=${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
            
            if (compressedSize <= MAX_FILE_SIZE) {
              imageUri = compressedUri;
              fileSize = compressedSize;
              break;
            }
            
            quality -= 0.1;
          }

          if (compressedSize > MAX_FILE_SIZE) {
            setUploading(false);
            Alert.alert('Compression failed', 'Could not compress image to under 5MB');
            return;
          }
        } catch (error) {
          setUploading(false);
          Alert.alert('Compression failed', 'Failed to compress image');
          console.error('[handlePickImage] Compression error:', error);
          return;
        }
      }

      if (onUploadAttachment) {
        setUploading(true);
        try {
          const attachment = await onUploadAttachment({
            uri: imageUri,
            type: 'image/jpeg',
            name: `image_${Date.now()}.jpg`,
            size: fileSize,
          });
          setAttachments([...attachments, attachment]);
        } catch (error) {
          Alert.alert('Upload failed', 'Failed to upload image');
        } finally {
          setUploading(false);
        }
      }
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      const fileSize = result.size || 0;

      if (!validateFileSize(fileSize)) return;

      if (onUploadAttachment) {
        setUploading(true);
        try {
          const attachment = await onUploadAttachment({
            uri: result.uri,
            type: result.mimeType || 'application/octet-stream',
            name: result.name,
            size: fileSize,
          });
          setAttachments([...attachments, attachment]);
        } catch (error) {
          Alert.alert('Upload failed', 'Failed to upload file');
        } finally {
          setUploading(false);
        }
      }
    }
  };

  const handleStartRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant microphone permissions');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecordingInstance(recording);
      setRecording(true);
    } catch (error) {
      Alert.alert('Recording failed', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    if (!recordingInstance) return;

    try {
      setRecording(false);
      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();

      if (uri) {
        const status = await recordingInstance.getStatusAsync();
        const durationSeconds = status.durationMillis ? Math.floor(status.durationMillis / 1000) : 0;
        
        // Get actual file size from file system
        let fileSize = 0;
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists && typeof fileInfo.size === 'number') {
            fileSize = fileInfo.size;
          }
        } catch (error) {
          // Fallback to rough estimate
          fileSize = status.durationMillis ? (status.durationMillis / 1000) * 12000 : 0;
        }

        if (!validateFileSize(fileSize)) {
          setRecordingInstance(null);
          return;
        }

        if (onUploadAttachment) {
          setUploading(true);
          try {
            const attachment = await onUploadAttachment({
              uri,
              type: 'audio/m4a',
              name: `voice_${Date.now()}.m4a`,
              size: fileSize,
              duration: durationSeconds,
            });
            setAttachments([...attachments, attachment]);
          } catch (error) {
            Alert.alert('Upload failed', 'Failed to upload voice message');
          } finally {
            setUploading(false);
          }
        }
      }

      setRecordingInstance(null);
    } catch (error) {
      Alert.alert('Recording failed', 'Failed to process recording');
      setRecordingInstance(null);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && onSend) {
      onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
    }
  };

  return (
    <View 
      className={`bg-white border-t border-gray-200 px-4 py-2 ${className}`}
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <View className="flex-row flex-wrap mb-2">
          {attachments.map((attachment) => (
            <View key={attachment.id} className="mr-2 mb-2 relative">
              {attachment.type === 'image' ? (
                <Image
                  source={{ uri: attachment.url }}
                  style={{ width: 60, height: 60 }}
                  className="rounded"
                />
              ) : (
                <View className="w-[60px] h-[60px] bg-blue-100 rounded items-center justify-center">
                  <Text className="text-xs">{attachment.type === 'voice' ? '🎤' : '📄'}</Text>
                </View>
              )}
              <Pressable
                onPress={() => handleRemoveAttachment(attachment.id)}
                className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
              >
                <Text className="text-white text-xs">×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row items-end">
        {recording ? (
          <>
            {/* Stop recording button on left when recording */}
            <Pressable
              onPress={handleStopRecording}
              className="bg-red-500 rounded-full w-10 h-10 items-center justify-center mr-2"
              accessibilityLabel="Stop recording"
            >
              <View className="w-4 h-4 bg-white" />
            </Pressable>
            
            {/* Recording indicator */}
            <View className="flex-1 bg-red-100 rounded-3xl px-4 py-3 flex-row items-center">
              <View className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              <Text className="text-red-700">Recording...</Text>
            </View>
          </>
        ) : (
          <>
            {/* Attachment buttons on left */}
            <View className="flex-row mr-2">
              <Pressable
                onPress={handlePickImage}
                disabled={disabled || uploading}
                className="mr-1 w-10 h-10 items-center justify-center"
              >
                <ImageIcon size={22} color={disabled || uploading ? '#9ca3af' : '#3b82f6'} />
              </Pressable>
              <Pressable
                onPress={handlePickFile}
                disabled={disabled || uploading}
                className="mr-1 w-10 h-10 items-center justify-center"
              >
                <AttachIcon size={22} color={disabled || uploading ? '#9ca3af' : '#3b82f6'} />
              </Pressable>
              <Pressable
                onPress={handleStartRecording}
                disabled={disabled || uploading}
                className="w-10 h-10 items-center justify-center"
                accessibilityLabel="Record voice message"
              >
                <MicIcon size={22} color={disabled || uploading ? '#9ca3af' : '#3b82f6'} />
              </Pressable>
            </View>

            {/* Message input */}
            <View className="flex-1 bg-gray-100 rounded-3xl px-4 py-2 mr-2">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={placeholder}
                placeholderTextColor="#9ca3af"
                multiline
                className="text-base text-gray-900 max-h-[100px]"
                editable={!disabled && !uploading}
                accessibilityLabel="Message input"
              />
            </View>

            {/* Send button on right */}
            {uploading ? (
              <View className="bg-blue-500 rounded-full w-10 h-10 items-center justify-center">
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            ) : (
              <Pressable
                onPress={handleSend}
                disabled={disabled || (!message.trim() && attachments.length === 0)}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                className={`bg-blue-500 rounded-full w-10 h-10 items-center justify-center ${
                  disabled || (!message.trim() && attachments.length === 0) ? 'opacity-50' : 'active:bg-blue-600'
                }`}
              >
                <SendIcon size={18} color="#ffffff" />
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}
