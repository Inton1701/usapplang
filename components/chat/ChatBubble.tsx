import React, { useState, useEffect } from 'react';
import { View, Image, Linking, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../ui/Text';
import { AudioPlayer } from './AudioPlayer';
import { ImagePreviewModal } from './ImagePreviewModal';
import type { MessageAttachment } from '@/types';
import { getAttachmentData } from '@/services/messagesService';

export interface ChatBubbleProps {
  message: string;
  isOutgoing?: boolean;
  timestamp?: string;
  attachments?: MessageAttachment[];
  deleted?: boolean;
  className?: string;
}

export function ChatBubble({
  message,
  isOutgoing = false,
  timestamp,
  attachments = [],
  deleted = false,
  className = '',
}: ChatBubbleProps) {
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const bubbleStyles = isOutgoing
    ? 'bg-blue-500 self-end rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
    : 'bg-gray-200 self-start rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl';

  const textColor = deleted
    ? isOutgoing
      ? 'text-white italic'
      : 'text-gray-400 italic'
    : isOutgoing
      ? 'text-white'
      : 'text-gray-900';

  // Load attachment data from Firestore
  useEffect(() => {
    const loadAttachments = async () => {
      for (const attachment of attachments) {
        if (attachmentUrls[attachment.id]) continue;

        setLoading(prev => ({ ...prev, [attachment.id]: true }));
        try {
          const dataUrl = await getAttachmentData(attachment.url); // attachment.url is the document ID
          setAttachmentUrls(prev => ({ ...prev, [attachment.id]: dataUrl }));
        } catch (error) {
          console.error('Failed to load attachment:', error);
        } finally {
          setLoading(prev => ({ ...prev, [attachment.id]: false }));
        }
      }
    };

    if (attachments.length > 0 && !deleted) {
      loadAttachments();
    }
  }, [attachments, deleted]);

  const handleOpenImage = (url: string) => {
    setPreviewImage(url);
  };

  const handleOpenFile = (attachment: MessageAttachment) => {
    const url = attachmentUrls[attachment.id];
    if (url && attachment.type === 'file') {
      Linking.openURL(url).catch(err => console.error('Failed to open file:', err));
    }
  };

  return (
    <View className={`max-w-[75%] ${className}`}>
      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          visible={!!previewImage}
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Attachments */}
      {attachments.length > 0 && !deleted && (
        <View className="mb-1">
          {attachments.map((attachment) => {
            const url = attachmentUrls[attachment.id];
            const isLoading = loading[attachment.id];

            return (
              <View key={attachment.id} className="mb-1">
                {attachment.type === 'image' ? (
                  <View>
                    {isLoading ? (
                      <View className="w-[200px] h-[200px] rounded-lg bg-gray-100 items-center justify-center">
                        <ActivityIndicator size="small" color={isOutgoing ? '#3b82f6' : '#6b7280'} />
                      </View>
                    ) : url ? (
                      <Pressable onPress={() => handleOpenImage(url)}>
                        <Image
                          source={{ uri: url }}
                          style={{ width: 200, height: 200 }}
                          className="rounded-lg"
                          resizeMode="cover"
                        />
                      </Pressable>
                    ) : null}
                  </View>
                ) : attachment.type === 'voice' ? (
                  <View className={`px-4 py-3 ${bubbleStyles}`} style={{ minWidth: 250 }}>
                    <AudioPlayer
                      audioUrl={url || ''}
                      duration={attachment.duration}
                      isOutgoing={isOutgoing}
                      isLoading={isLoading}
                    />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleOpenFile(attachment)}
                    className={`px-4 py-3 flex-row items-center ${bubbleStyles}`}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={isOutgoing ? '#ffffff' : '#6b7280'} />
                    ) : (
                      <>
                        <Text className="text-2xl mr-2">📄</Text>
                        <View className="flex-1">
                          <Text
                            className={isOutgoing ? 'text-white' : 'text-gray-900'}
                            numberOfLines={1}
                          >
                            {attachment.name}
                          </Text>
                          <Text className={`text-xs ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}>
                            {(attachment.size / 1024).toFixed(1)} KB
                          </Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Message text bubble */}
      {message && (
        <View className={`px-4 py-2 ${bubbleStyles}`}>
          <Text className={textColor}>{message}</Text>
          {timestamp && (
            <Text
              className={`text-xs mt-1 ${
                deleted
                  ? isOutgoing
                    ? 'text-white opacity-70'
                    : 'text-gray-400'
                  : isOutgoing
                    ? 'text-white'
                    : 'text-gray-500'
              }`}
            >
              {timestamp}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
