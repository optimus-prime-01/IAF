import { icons } from '@/constants/icons'
import { images } from '@/constants/images'
import React from 'react'
import { Image, Text, View } from 'react-native'

const profile = () => {
  return (
    <View className="flex-1 bg-black">
        <Image source={images.bg} className="absolute" />
        <Image
                      source={icons.logo}
                      className="w-24 h-28 mt-10 mb-5 mx-auto"
                    />
      <Text>profile</Text>
    </View>
  )
}

export default profile