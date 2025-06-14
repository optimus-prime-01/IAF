import SearchBar from '@/components/SearchBar'
import { icons } from '@/constants/icons'
import { images } from '@/constants/images'
import React, { useState } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'

const saved = () => {
    const [loading, setLoading] = useState(false);
  
  return (
    <View className="flex-1 bg-black" >
      <Image
        source={images.bg}
        className="absolute"
      />
      <View className="w-full">
            <Image
              source={icons.logo}
              className="w-24 h-28 mt-10 mb-5 mx-auto"
            />

            <View className='mb-5 px-6'>
            <SearchBar
              placeholder="Search a word"
            />
        </View>
        {loading && (
                      <View className="justify-center items-center my-4">
                        <ActivityIndicator size="large" color="#5B5FEF" />
                      </View>
                    )}
      </View>
      <Text>saved</Text>
    </View>
  )
}

export default saved