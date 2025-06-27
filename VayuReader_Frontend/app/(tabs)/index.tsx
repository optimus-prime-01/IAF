import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Image,
  Text,
  View,
  RefreshControl,
} from 'react-native';

import PDFCard from "@/components/PDFCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";

type RenderItemProps = { item: PDF };
type RenderCategoryItemProps = { item: string };

export default function Index() {
  const router = useRouter();
  const [allPdfs, setAllPdfs] = useState<PDF[]>([]);
  const [activeCat, setActiveCat] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  /** ───────────────────────────────
   * 📦 Fetch PDFs function
   */
  const fetchPdfs = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://192.168.198.128:4001/api/pdfs/all');
      if (!response.ok) throw new Error('Failed to fetch PDFs');
      const data: PDF[] = await response.json();
      setAllPdfs(data.map((d) => ({ ...d, id: d._id })));
    } catch (err) {
      console.error("🔥 Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /** ───────────────────────────────
   * 🧠 Pull to refresh handler
   */
  const onRefresh = () => {
    setRefreshing(true);
    fetchPdfs();
  };

  /** ───────────────────────────────
   * ⏮ Back button clears search
   */
  useEffect(() => {
    const handleBackPress = () => {
      if (searchText) {
        setSearchText('');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [searchText]);

  /** ───────────────────────────────
   * 🔃 Initial fetch
   */
  useEffect(() => {
    fetchPdfs();
  }, []);

  /** ───────────────────────────────
   * 🧠 Memoized derived data
   */
  const recentData = useMemo(() =>
    [...allPdfs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10), [allPdfs]);

  const popularData = useMemo(() => allPdfs.slice(0, 10), [allPdfs]);

  const categories = useMemo(() =>
    Array.from(new Set(allPdfs.map(p => p.category))),
    [allPdfs]);

  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return allPdfs.filter(p => p.title.toLowerCase().includes(q));
  }, [searchText, allPdfs]);

  const gridData = useMemo(() => {
    return activeCat === 'All'
      ? allPdfs
      : allPdfs.filter(p => p.category === activeCat);
  }, [activeCat, allPdfs]);

  const displayData = searchText ? searchResults : gridData;

  /** ───────────────────────────────
   * 🧱 UI Components
   */
  const renderHorizontal = ({ item }: RenderItemProps) => (
    <View style={{ marginRight: 12 }}>
      <PDFCard {...item} cardWidth={100} />
    </View>
  );

  const renderCategory = ({ item }: RenderCategoryItemProps) => (
    <Text
      onPress={() => setActiveCat(item)}
      className={`px-4 py-2 mr-3 rounded-full ${activeCat === item ? 'bg-[#5B5FEF]' : 'bg-[#1C1B3A]'}`}
      style={{ color: 'white' ,fontSize: 15 }}
    >{item}</Text>
  );

  const renderGrid = ({ item }: RenderItemProps) => (
    <View className="mb-5 mr-3">
      <PDFCard {...item} cardWidth={100} />
    </View>
  );

  const ListHeader = () => (
    <>
      {!searchText && (
        <>
          <Text className="text-white font-bold mt-4 mb-5 px-2"
  style={{ fontSize: 19 }}>
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
          <View className="h-px bg-gray-700 my-2 mt-2" />

          <Text className="text-white font-bold mt-4 mb-5 px-2"
          style={{ fontSize: 19 }}>
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
          <View className="h-px bg-gray-700 my-2 mt-2" />
          <Text className="text-white  font-bold mt-4 mb-3 px-2"
          style={{ fontSize: 20 }}>
            Categories
          </Text>
          <FlatList
            data={['All', ...categories]}
            horizontal
            keyExtractor={i => i}
            renderItem={renderCategory}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 4, paddingBottom: 8 }}
          />

          <Text className="text-white font-bold mt-4 mb-4 px-2"
          style={{ fontSize: 19}}>
            {activeCat === 'All' ? 'All PDF' : `${activeCat} PDF`}
          </Text>
        </>
      )}

      {searchText && (
        <Text className="text-white text-lg font-bold mt-4 mb-4 px-2">
          Search results for “{searchText}”
        </Text>
      )}
    </>
  );

  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute " />
      <Image source={icons.logo} className="w-24 h-28 mt-14 mb-6 self-center" />
      <View className="px-5 mb-4">
        <SearchBar
          placeholder="Search for a PDF"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && (
        <Text className="text-center text-white mb-4">Loading…</Text>
      )}

      <FlatList
        data={displayData}
        keyExtractor={(item) => item._id}
        renderItem={renderGrid}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'flex-start' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 16 }}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          searchText ? (
            <Text className="text-center text-white mt-10">
              No PDFs match “{searchText}.”
            </Text>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B5FEF"
            colors={['#5B5FEF']}
          />
        }
      />
    </View>
  );
}
