import { icons } from '@/constants/icons'
import { images } from '@/constants/images'
import { Text } from '@react-navigation/elements'
import { Tabs } from 'expo-router'
import React from 'react'
import { Image, ImageBackground, View } from 'react-native'
const TabIcon=({focused, icon,title}:any)=>{

    if(focused){
    return (
        <ImageBackground
                            source={images.highlight}
                            className="flex flex-row w-full flex-1 min-w-[112px] min-h-14 mt-5
                            justify-center items-center rounded-full overflow-hidden"
                        >
                            <Image source={icon} tintColor="#151312" 
                            className="size-5"/>
                            <Text className='text-secondary text-base font-semibold ml-2'>{title}</Text>

                        </ImageBackground>
    )
    }

    return (
        <View className="size-full justify-center items-center
        mt-4 rounded-full">
            <Image source={icon}
            tintColor="#A8B5DB"
            className="size-5"/>
        </View>
    )
}
const _Layout = () => {
  return (
    <Tabs
        screenOptions={{
            tabBarShowLabel:false,
            tabBarItemStyle:{
                width:'100%',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center'
            },
            tabBarStyle:{
                backgroundColor: '#0f0D23',
                borderRadius:50,
                marginHorizontal:20,
                marginBottom:36,
                height:50,
                position:'absolute',
                overflow: 'hidden',
                borderWidth:1,
                borderColor: '#0f0d23'
            }
        }}
    >
        <Tabs.Screen 
            name="index"
            options={{
                title:'Home',
                headerShown:false,
                tabBarIcon: ({focused})=>(
                   <TabIcon focused={focused} 
                   icon={icons.home}
                    title="Home"
                    />
                )
            }}
        />

        <Tabs.Screen
            name="search"
            options={{
                title:'Search',
                headerShown:false,
                tabBarIcon:({focused})=>(
                     <TabIcon 
                     focused={focused} 
                    icon={icons.search}
                    title="Search"
                    />
                )
            }}
        />

        <Tabs.Screen
            name="saved"
            options={{
                title:'Saved',
                headerShown:false,
                tabBarIcon:({focused})=>(
                     <TabIcon 
                     focused={focused} 
                    icon={icons.save}
                    title="Saved"
                    />
                )
            }}
        />

        <Tabs.Screen
            name="profile"
            options={{
                title:'Profile',
                headerShown:false,
                tabBarIcon:({focused})=>(
                     <TabIcon 
                     focused={focused} 
                    icon={icons.person}
                    title="Profile"
                    />
                )
            }}
        />
    </Tabs>
  )
}

export default _Layout