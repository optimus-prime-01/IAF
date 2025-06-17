import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Text,
  View,
} from 'react-native';

import SearchBar from '@/components/SearchBar';
import { icons } from '@/constants/icons';
import { images } from '@/constants/images';

type AbbrevObj = {
  abbreviation: string;
  fullForm: string;
};

const AbbreviationScreen = () => {
  const router = useRouter(); // not used for navigation here

  const [initialData, setInitialData] = useState<AbbrevObj[]>([]);
  const [data, setData]         = useState<AbbrevObj[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading]   = useState(true);

  /** ───────────────────────────────────
   * 1) Load first 15 abbreviations
   */
  // const fetchInitial = useCallback(async () => {
  //   try {
  //     const res = await axios.get<AbbrevObj[]>(
  //       'http://192.168.205.128:4000/api/abbreviations/all'
  //     );
  //     const slice = res.data.slice(0, 15);
  //     setInitialData(slice);
  //     console.log("✅ POST Success:", res.data);
  //     setData(slice);
  //   } catch (error) {
  //     Alert.alert('Error', 'Failed to load abbreviations.');
  //     if (axios.isAxiosError(error)) {
  //   console.error("❌ Axios Error (POST):", error.message);
  //   console.error("🔎 Response:", error.response?.data);
  //   console.error("🌐 Request Config:", error.config);
  // } else {
  //   console.error("🔥 Unknown Error:", error);
  // }
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);
  const fetchInitial = useCallback(async () => {
  try {
    const response = await fetch('http://192.168.205.128:4000/api/abbreviations/all');

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Fetch Error (Status):", response.status);
      console.error("📄 Response Body:", errorText);
      Alert.alert('Error', `Server responded with status ${response.status}`);
      return;
    }

    const data: AbbrevObj[] = await response.json();
    const slice = data.slice(0, 15);
    console.log("✅ Fetch Success:", data);
    setInitialData(slice);
    setData(slice);
  } catch (error) {
    console.error("🔥 Fetch Error:", error);
    Alert.alert('Error', 'Failed to load abbreviations.');
  } finally {
    setLoading(false);
  }
}, []);


  /** ───────────────────────────────────
   * 2) Search single abbreviation
   */
//   const fetchSingleAbbrev = async (word: string) => {
//   const trimmed = word.trim();
//   if (!trimmed) {
//     setData(initialData);
//     return;
//   }
//   try {
//     setLoading(true);
//     // convert to UPPERCASE before hitting the API
//     const res = await axios.get<AbbrevObj>(
//       `http://192.168.205.128:4000/api/abbreviations/${trimmed.toUpperCase()}`
//     );
//     setData([res.data]);
//   } catch {
//     setData([]);
//   } finally {
//     setLoading(false);
//   }
// };
const fetchSingleAbbrev = async (word: string) => {
  const trimmed = word.trim();
  if (!trimmed) {
    setData(initialData);
    return;
  }

  try {
    setLoading(true);
    const response = await fetch(
      `http://192.168.205.128:4000/api/abbreviations/${trimmed.toUpperCase()}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Fetch Error (Status):", response.status);
      console.error("📄 Response Body:", errorText);
      setData([]);
      return;
    }

    const data: AbbrevObj = await response.json();
    console.log("✅ Fetch Success (Single):", data);
    setData([data]);
  } catch (error) {
    console.error("🔥 Fetch Exception:", error);
    setData([]);
  } finally {
    setLoading(false);
  }
};

  /** ───────────────────────────────────
   * 3) Android Back Button resets search
   */
  useEffect(() => {
    const onBack = () => {
      if (searchText) {
        setSearchText('');
        setData(initialData);
        return true; // consumed
      }
      return false;  // default back
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [searchText, initialData]);

  /** ───────────────────────────────────
   * 4) Fetch on mount
   */
  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  /** ───────────────────────────────────
   * 5) Render each abbreviation box (non‑clickable)
   */
  const renderItem = ({ item }: { item: AbbrevObj }) => (
    <View className="bg-[#1A1A40] rounded-xl p-4 mb-4">
      <Text className="text-white text-lg font-bold">{item.abbreviation}</Text>
      <Text className="text-gray-300 text-sm mt-1">{item.fullForm}</Text>
    </View>
  );

  /** ───────────────────────────────────
   * 6) Screen JSX
   */
  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute" />

      <FlatList
        data={data}
        keyExtractor={(item) => item.abbreviation}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="w-full">
            {/* Logo */}
            <Image
              source={icons.logo}
              className="w-24 h-28 mt-10 mb-5 mx-auto"
            />

            {/* SearchBar */}
            <View className="mb-5">
              <SearchBar
                placeholder="Search an abbreviation"
                value={searchText}
                onChangeText={(txt) => {
                  setSearchText(txt);
                  fetchSingleAbbrev(txt);
                }}
              />
            </View>

            {/* Loading Spinner */}
            {loading && (
              <View className="justify-center items-center my-4">
                <ActivityIndicator size="large" color="#5B5FEF" />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text className="text-center text-gray-400 mt-10">
              {searchText ? 'No match found.' : 'No data to display.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
};

export default AbbreviationScreen;
