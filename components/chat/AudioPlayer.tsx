import React, { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { PlayIcon, PauseIcon } from '../icons';
import { Text } from '../ui/Text';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  isOutgoing?: boolean;
  isLoading?: boolean;
}

export function AudioPlayer({ audioUrl, duration, isOutgoing = false, isLoading = false }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);

  useEffect(() => {
    return () => {
      // Cleanup sound when component unmounts
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePlayPause = async () => {
    try {
      if (!sound) {
        // Load and play audio
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
      } else {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      }
    } catch (error) {
      console.error('[AudioPlayer] Playback error:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
      setAudioDuration(status.durationMillis ? status.durationMillis / 1000 : audioDuration);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        sound?.setPositionAsync(0);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return <ActivityIndicator size="small" color={isOutgoing ? '#ffffff' : '#6b7280'} />;
  }

  return (
    <View className="flex-row items-center">
      <Pressable
        onPress={handlePlayPause}
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          isOutgoing ? 'bg-blue-400' : 'bg-gray-300'
        }`}
        accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
        accessibilityRole="button"
      >
        {isPlaying ? (
          <PauseIcon size={20} color={isOutgoing ? '#ffffff' : '#374151'} />
        ) : (
          <PlayIcon size={20} color={isOutgoing ? '#ffffff' : '#374151'} />
        )}
      </Pressable>
      
      <View className="flex-1">
        <View className={`h-1 rounded-full ${isOutgoing ? 'bg-blue-300' : 'bg-gray-300'}`}>
          <View
            className={`h-1 rounded-full ${isOutgoing ? 'bg-white' : 'bg-blue-500'}`}
            style={{
              width: audioDuration > 0 ? `${(position / audioDuration) * 100}%` : '0%',
            }}
          />
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className={`text-xs ${isOutgoing ? 'text-white' : 'text-gray-500'}`}>
            {formatTime(position)}
          </Text>
          <Text className={`text-xs ${isOutgoing ? 'text-white' : 'text-gray-500'}`}>
            {formatTime(audioDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
}
