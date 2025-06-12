import { icons } from '@/constants/icons'
import { images } from '@/constants/images'
import React from 'react'
import { Image, Text, View } from 'react-native'

const saved = () => {
  return (
    <View className="flex-1 bg-black">
        <Image source={images.bg} className="absolute w-full z-0"/>
        <Image source={icons.logo} className="w-24 h-28
                  mt-10 mb-5 mx-auto" />
          <Text>Saved</Text>
        </View>
  )
}

export default saved