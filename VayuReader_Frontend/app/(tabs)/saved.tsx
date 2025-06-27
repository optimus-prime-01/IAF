import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  RefreshControl,
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

const BASE_URL = 'http://192.168.198.128:4000';

export default function AbbreviationScreen() {
  const [allData, setAllData] = useState<AbbrevObj[]>([]);
  const [initialData, setInitialData] = useState<AbbrevObj[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Shuffle helper
  const shuffleArray = (arr: AbbrevObj[]) => {
    return arr
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/abbreviations/all`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: AbbrevObj[] = await res.json();

      const shuffled = shuffleArray(data);
      setAllData(data);
      setInitialData(shuffled.slice(0, 100));
    } catch (err) {
      console.error('🔥 Fetch all error:', err);
      Alert.alert('Error', 'Failed to load abbreviations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedApiLookup = useCallback((query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!query.trim()) return;

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${BASE_URL}/api/abbreviations/${query.trim().toUpperCase()}`
        );
        if (!res.ok) return;
        const obj: AbbrevObj = await res.json();

        setAllData((prev) => {
          const exists = prev.find((p) => p.abbreviation === obj.abbreviation);
          if (exists) return prev;
          return [...prev, obj];
        });
      } catch {
        // silent fail
      }
    }, 400);
  }, []);

  useEffect(() => {
    const onBack = () => {
      if (searchText) {
        setSearchText('');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [searchText]);

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return q
      ? allData.filter((item) =>
          item.abbreviation.toLowerCase().startsWith(q)
        )
      : initialData;
  }, [searchText, allData, initialData]);

  useEffect(() => {
    debouncedApiLookup(searchText);
  }, [searchText, debouncedApiLookup]);

  const renderItem = ({ item }: { item: AbbrevObj }) => (
    <View className="bg-[#1A1A40] rounded-xl p-4 mb-4">
      <Text className="text-white text-lg font-bold">{item.abbreviation}</Text>
      <Text className="text-gray-300 text-sm mt-1">{item.fullForm}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute" />
      <Image
        source={icons.logo}
        className="w-24 h-28 mt-14 mb-5 self-center"
      />

      <View className="px-5 mb-3">
        <SearchBar
          placeholder="Search an abbreviation"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {loading && (
        <View className="items-center justify-center my-4">
          <ActivityIndicator size="large" color="#5B5FEF" />
        </View>
      )}

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.abbreviation}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5B5FEF"
            colors={['#5B5FEF']}
          />
        }
        initialNumToRender={15}
        maxToRenderPerBatch={25}
        windowSize={10}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: loading ? 0 : 8,
        }}
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
}
