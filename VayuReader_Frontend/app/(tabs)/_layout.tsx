import { icons } from '@/constants/icons'
import { images } from '@/constants/images'
import { Text, View, Image, ImageBackground } from 'react-native'
import { Tabs } from 'expo-router'
import React from 'react'

const TabIcon = ({
  focused, icon, title,
  focusedWidth = 40, focusedHeight = 40,
  unfocusedWidth = 28, unfocusedHeight = 28,
}: any) => {
  if (focused) {
    return (
      <ImageBackground
        source={images.highlight}
        className="flex flex-row w-full flex-1 min-w-[112px] min-h-14 mt-5 justify-center items-center rounded-full overflow-hidden"
      >
        <Image source={icon} tintColor="#151312" style={{ width: focusedWidth, height: focusedHeight ,marginRight:2 }} />
        <View>
          <Text className="text-secondary text-base font-extrabold"
          >{title}</Text>
        </View>
      </ImageBackground>
    )
  }

  return (
    <View className="size-full justify-center items-center mt-4 rounded-full">
      <Image source={icon} tintColor="white" style={{ width: unfocusedWidth, height: unfocusedHeight }} />
    </View>
  )
}

const _Layout = () => {
  return (
    <View className="flex-1 pb-12 bg-black">
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarItemStyle: {
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarStyle: {
            backgroundColor: '#0f0D23',
            borderRadius: 50,
            marginHorizontal: 0,
            marginBottom: 10,
            height: 50,
            borderWidth: 1,
            borderColor: '#0f0d23',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                icon={icons.home}
                title="PDF"
                focusedWidth={30}
                focusedHeight={35}
                unfocusedWidth={30}
                unfocusedHeight={35}
              />
            )
          }}
        />

        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                icon={icons.dict}
                title="Dictionary"
                focusedWidth={35}
                focusedHeight={35}
                unfocusedWidth={30}
                unfocusedHeight={30}
              />
            )
          }}
        />

        <Tabs.Screen
          name="saved"
          options={{
            title: 'Saved',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                icon={icons.Acronyms}
                title="Acronyms"
                focusedWidth={35}
                focusedHeight={35}
                unfocusedWidth={30}
                unfocusedHeight={28}
              />
            )
          }}
        />
      </Tabs>

      {/* Footer Text */}
      <View className="items-center mb-3 mt-1">
        <Text className="text-gray-400 text-xs font-extrabold">
          Developed and maintained by 820 SU, AF Stn Bamrauli
        </Text>
      </View>
    </View>
  )
}

export default _Layout
