import PDFCard from "@/components/PDFCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useRouter } from "expo-router";
import { FlatList, Image, ScrollView, Text, View } from "react-native";
import pdfdata from "./../../pdfData";
export default function Index() {
  const router=useRouter();
  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute w-full z-0"/>
        <ScrollView className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{minHeight:"100%", paddingBottom:10}}>
          <Image source={icons.logo} className="w-24 h-28
          mt-10 mb-5 mx-auto" />

          {/* ADDING the search bar */}
          <View className="flex-1 mt-5">
            <SearchBar
              onPress={()=>{}}
              placeholder="Search for a PDF"
            />
          </View> 
          <Text className="text-lg text-white font-bold mt-5 mb-3">Latest Documents</Text>
                      <FlatList
                        data={pdfdata}
                        renderItem={({item})=>(
                          <PDFCard
                            {...item}

                          />
                        )}
                        keyExtractor={(item)=>item.id.toString()}
                        numColumns={3}
                        columnWrapperStyle={{
                          justifyContent:"flex-start",
                          gap:20,
                          paddingRight:5,
                          marginBottom:10
                        }}
                        className="mt-2 pb-32"
                        scrollEnabled={false}
            
            />

        </ScrollView> 
    </View>
  );
}
