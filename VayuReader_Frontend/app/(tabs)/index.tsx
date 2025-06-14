import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Image, Text, View } from "react-native";

import PDFCard from "@/components/PDFCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import pdfdata from "./../../pdfData";


type RenderItemProps = {
  item: PDF;
};
type RenderCategoryItemProps = {
  item: string;
};

// Splitting the data for now as backend api are not ready
const recentData  = pdfdata.slice(0, 5);
const popularData = pdfdata.slice(5, 10);
//Fetching the categories from the pdfData
const categories  = Array.from(new Set(pdfdata.map((p) => p.type)));

export default function Index() {
  const router = useRouter();
  const [activeCat, setActiveCat] = useState<string>("All");
  const [searchText, setSearchText] = useState("");


  // Filter grid by active category
  const gridData =
    activeCat === "All"
      ? pdfdata
      : pdfdata.filter((p) => p.type === activeCat);

  // Horizontal PDF render
  const renderHorizontal = ({ item }:RenderItemProps) => (
    <View style={{ marginRight: 12 }}>
      <PDFCard {...item} cardWidth={100}/>
    </View>
  );

  // Category chip render
  const renderCategory = ({ item }:RenderCategoryItemProps) => (
    <Text
      onPress={() => setActiveCat(item)}
      className={`px-4 py-2 mr-3 rounded-full ${
        activeCat === item ? "bg-[#5B5FEF]" : "bg-[#1C1B3A]"
      }`}
      style={{ color: "white" }}
    >
      {item}
    </Text>
  );

  // 3‑column grid render
  const renderGrid = ({ item }:RenderItemProps) => (
    <View className="mb-5">
  <PDFCard {...item} cardWidth={100} />
  </View>
  )

  return (
    <View className="flex-1 bg-black">
      <Image
        source={images.bg}
        className="absolute"
      />

      <FlatList
        data={gridData}
        keyExtractor={(item) => item.id}
        renderItem={renderGrid}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 80,
          paddingHorizontal: 16,
        }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        ListHeaderComponent={
          <>
            {/* Logo */}
            <Image
              source={icons.logo}
              className="w-24 h-28 mt-10 mb-6 self-center"
            />

            {/* Search Bar */}
            <View className="px-1">
              <SearchBar
                placeholder="Search for a PDF"
                value={searchText}
  onChangeText={setSearchText}
              />
            </View>

            {/* Recent Uploaded */}
            <Text className="text-white text-lg font-bold mt-8 mb-3 px-2">
              Recently Uploaded PDFs
            </Text>
            <FlatList
              data={recentData}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={renderHorizontal}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 0, paddingBottom: 8 }}
            />

            {/* Mostly Accessed */}
            <Text className="text-white text-lg font-bold mt-6 mb-3 px-2">
              Mostly Accessed PDFs
            </Text>
            <FlatList
              data={popularData}
              horizontal
              keyExtractor={(item) => item.id}
              renderItem={renderHorizontal}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 0, paddingBottom: 8 }}
            />

            {/* Categories */}
            <Text className="text-white text-lg font-bold mt-6 mb-3 px-2">
              Categories
            </Text>
            <FlatList
              data={["All", ...categories]}
              horizontal
              keyExtractor={(item) => item}
              renderItem={renderCategory}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 4, paddingBottom: 8 }}
            />

            {/* Grid Section Title */}
            <Text className="text-white text-lg font-bold mt-6 mb-4 px-4">
              {activeCat === "All" ? "All PDFs" : `${activeCat} PDFs`}
            </Text>
          </>
        }
      />
    </View>
  );
}
