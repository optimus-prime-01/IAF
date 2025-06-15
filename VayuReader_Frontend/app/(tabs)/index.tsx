import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

import PDFCard from "@/components/PDFCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";


type RenderItemProps = { item: PDF };
type RenderCategoryItemProps = { item: string };

export default function Index() {
  const router = useRouter();
  const [allPdfs, setAllPdfs]     = useState<PDF[]>([]);
  const [activeCat, setActiveCat] = useState<string>('All');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading]     = useState<boolean>(true);

  // 1) Fetch all PDFs on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get<PDF[]>('http://192.168.205.128:3001/api/pdfs/all');
        const withId = res.data.map((doc) => ({
        ...doc,
        id: doc._id,        // add `id` field
      }));
      setAllPdfs(withId);
      } catch (err) {
        console.error('Failed to fetch PDFs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // 2) Derive the sections from allPdfs
  const recentData = [...allPdfs]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 10);
  const popularData = allPdfs.slice(0, 10);
  const categories  = Array.from(new Set(allPdfs.map((p) => p.category)));

  // 3) Optionally filter by category (and you can add search filter here too)
  const gridData = allPdfs.filter((p) => {
    if (activeCat !== 'All' && p.category !== activeCat) return false;
    if (searchText && !p.title.toLowerCase().includes(searchText.toLowerCase()))
      return false;
    return true;
  });

  // Render helpers
  const renderHorizontal = ({ item }: RenderItemProps) => (
    <View style={{ marginRight: 12 }}>
      <PDFCard {...item} cardWidth={100} />
    </View>
  );

  const renderCategory = ({ item }: RenderCategoryItemProps) => (
    <Text
      onPress={() => setActiveCat(item)}
      className={`px-4 py-2 mr-3 rounded-full ${
        activeCat === item ? 'bg-[#5B5FEF]' : 'bg-[#1C1B3A]'
      }`}
      style={{ color: 'white' }}
    >
      {item}
    </Text>
  );

  const renderGrid = ({ item }: RenderItemProps) => (
    <View className="mb-5 mr-3">
      <PDFCard {...item}  cardWidth={100} />
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute " />

      <FlatList
        data={gridData}
        keyExtractor={(item) => item._id}
        renderItem={renderGrid}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 80,
          paddingHorizontal: 16,
        }}
        columnWrapperStyle={{ justifyContent: 'flex-start' }}
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

            {loading && (
              <Text className="text-center text-white mt-4">
                Loading PDFs…
              </Text>
            )}

            {/* Recent Uploaded */}
            <Text className="text-white text-lg font-bold mt-8 mb-3 px-2">
              Recently Uploaded PDFs
            </Text>
            <FlatList
              data={recentData}
              horizontal
              keyExtractor={(item) => item._id}
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
              keyExtractor={(item) => item._id}
              renderItem={renderHorizontal}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 0, paddingBottom: 8 }}
            />

            {/* Categories */}
            <Text className="text-white text-lg font-bold mt-6 mb-3 px-2">
              Categories
            </Text>
            <FlatList
              data={['All', ...categories]}
              horizontal
              keyExtractor={(item) => item}
              renderItem={renderCategory}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 4, paddingBottom: 8 }}
            />

            {/* Grid Section Title */}
            <Text className="text-white text-lg font-bold mt-6 mb-4 px-4">
              {activeCat === 'All' ? 'All PDFs' : `${activeCat} PDFs`}
            </Text>
          </>
        }
      />
    </View>
  );
}
