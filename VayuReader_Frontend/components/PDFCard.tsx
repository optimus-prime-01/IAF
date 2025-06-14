import { Link } from 'expo-router';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

const PDFCard = ({
  id,
  title,
  type,
  createdAt,
  thumbnail,
  cardWidth, // optional prop for horizontal layouts
}: PDF & { cardWidth?: number }) => {
  return (
    <Link
      href={{ pathname: "/pdfread/[id]", params: { id: id.toString() } }}
      asChild
    >
      <TouchableOpacity
        className="mx-1"
        style={{ width: cardWidth ?? "30%" }} // fallback to 30% for grid
      >
        <Image
          source={thumbnail}
          className="w-full h-52 rounded-lg"
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
            {type}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
};


export default PDFCard