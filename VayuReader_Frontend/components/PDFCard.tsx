import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { PDF_BASE_URL } from '@/constants/config';
import { getToken } from '@/lib/authStorage';

const PDFCard = React.memo(({ _id, title, createdAt, thumbnail, cardWidth, category }: PDF & { cardWidth?: number }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then(setToken);
  }, []);

  const thumbnailSource = thumbnail && token
    ? { uri: `${PDF_BASE_URL}${thumbnail}`, headers: { Authorization: `Bearer ${token}` } }
    : thumbnail
      ? { uri: `${PDF_BASE_URL}${thumbnail}` }
      : { uri: 'https://placehold.co/600x800' };

  return (
    <Link
      href={{ pathname: "/pdfread/[id]", params: { id: _id.toString() } }}
      asChild
    >
      <TouchableOpacity
        className="mx-1"
        style={{ width: cardWidth ?? "30%" }}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      >
        <Image
          source={thumbnailSource}
          className="w-full h-40 rounded-lg"
          resizeMode="cover"
        />
        <Text
          className="text-sm font-bold text-white mt-2"
          numberOfLines={1}
        >
          {title}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-light-300 font-medium mt-0">
            {createdAt?.split("-")[0]}
          </Text>
          <Text
            className="text-xs font-medium text-light-300 uppercase mr-2"
            numberOfLines={1}
          >
            {category}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
});

PDFCard.displayName = 'PDFCard';

export default PDFCard;
