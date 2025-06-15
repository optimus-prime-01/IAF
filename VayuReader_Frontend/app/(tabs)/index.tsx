import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

import PDFCard from "@/components/PDFCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";

type RenderItemProps = { item: PDF };
type RenderCategoryItemProps = { item: string };

export default function Index() {
  const router = useRouter();
  const [allPdfs,     setAllPdfs]     = useState<PDF[]>([]);
  const [activeCat,   setActiveCat]   = useState<string>('All');
  const [searchText,  setSearchText]  = useState<string>('');
  const [loading,     setLoading]     = useState<boolean>(true);

  // 1) Fetch on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get<PDF[]>('http://192.168.205.128:3001/api/pdfs/all');
        setAllPdfs(res.data.map(d => ({ ...d, id: d._id })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) Static sections
  const recentData  = useMemo(() =>
    [...allPdfs]
      .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0,10)
  , [allPdfs]);

  const popularData = useMemo(() => allPdfs.slice(0,10), [allPdfs]);

  const categories = useMemo(
    () => Array.from(new Set(allPdfs.map(p=>p.category))),
    [allPdfs]
  );

  // 3) Search results
  const searchResults = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return allPdfs.filter(p => p.title.toLowerCase().includes(q));
  }, [searchText, allPdfs]);

  // 4) Category‑filtered grid (only used when not searching)
  const gridData = useMemo(() => {
    return activeCat === 'All'
      ? allPdfs
      : allPdfs.filter(p => p.category === activeCat);
  }, [activeCat, allPdfs]);

  // 5) Decide which data the main FlatList shows
  const displayData = searchText ? searchResults : gridData;

  // 6) Renderers
  const renderHorizontal = ({ item }:RenderItemProps) => (
    <View style={{ marginRight:12 }}>
      <PDFCard {...item} cardWidth={100}/>
    </View>
  );
  const renderCategory = ({ item }:RenderCategoryItemProps) => (
    <Text
      onPress={()=>setActiveCat(item)}
      className={`px-4 py-2 mr-3 rounded-full ${
        activeCat===item ? 'bg-[#5B5FEF]' : 'bg-[#1C1B3A]'}`
      }
      style={{ color:'white' }}
    >{item}</Text>
  );
  const renderGrid = ({ item }:RenderItemProps) => (
    <View className="mb-5 mr-3">
      <PDFCard {...item} cardWidth={100} />
    </View>
  );

  // 7) Header component: shows static sections only when NOT searching
  const ListHeader = () => (
    <>
      

      {!searchText && (
        <>
          {/* Recent */}
          <Text className="text-white text-lg font-bold mt-4 mb-2 px-2">
            Recently Uploaded PDFs
          </Text>
          <FlatList
            data={recentData}
            horizontal
            keyExtractor={(item) => item._id}
            renderItem={renderHorizontal}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft:0, paddingBottom:8 }}
          />

          {/* Popular */}
          <Text className="text-white text-lg font-bold mt-4 mb-2 px-2">
            Mostly Accessed PDFs
          </Text>
          <FlatList
            data={popularData}
            horizontal
            keyExtractor={(item) => item._id}
            renderItem={renderHorizontal}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft:0, paddingBottom:8 }}
          />

          {/* Categories */}
          <Text className="text-white text-lg font-bold mt-4 mb-2 px-2">
            Categories
          </Text>
          <FlatList
            data={['All', ...categories]}
            horizontal
            keyExtractor={i=>i}
            renderItem={renderCategory}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft:4, paddingBottom:8 }}
          />

          {/* Grid Title */}
          <Text className="text-white text-lg font-bold mt-4 mb-2 px-4">
            {activeCat==='All'? 'All PDFs' : `${activeCat} PDFs`}
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
      <Image source={images.bg}
             className="absolute " />
      {/* logo + search */}
      <Image source={icons.logo} className="w-24 h-28 mt-10 mb-6 self-center"/>
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
        columnWrapperStyle={{ justifyContent:'flex-start' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom:80, paddingHorizontal:16 }}
        ListHeaderComponent={<ListHeader/>}
        ListEmptyComponent={
          searchText ? (
            <Text className="text-center text-white mt-10">
              No PDFs match “{searchText}.”
            </Text>
          ) : null
        }
      />
    </View>
  );
}
