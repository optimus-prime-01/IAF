import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import SearchBar from '@/components/SearchBar';
import { icons } from '@/constants/icons';
import { images } from '@/constants/images';

const PRESET_WORDS = [
  'A', 'A.D.', 'A.M.', 'AA', 'AAA', 'AAAS', 'AACHEN',
  'AAH', 'AAHED', 'AAHING', 'AAHS', 'AALBORG', 'AALII',
];

type WordObj = {
  word: string;
  meanings: { definition: string; partOfSpeech: string; examples?: string[] }[];
  synonyms?: string[];
};

const DictionaryScreen = () => {
  const router = useRouter();

  const [initialData, setInitialData] = useState<WordObj[]>([]);
  const [data, setData] = useState<WordObj[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);

  /** ───────────────────────────────────
   * Fetch the first 10 records once
   */
  // const fetchInitial = useCallback(async () => {
  //   try {
  //     const requests = PRESET_WORDS.slice(0, 10).map((w) =>
  //       axios
  //         .get<WordObj>(
  //           `https://dictionary-service-k9cu.onrender.com/api/dictionary/word/${w}`
  //         )
  //         .then((r) => r.data)
  //         .catch(() => null)
  //     );
  //     const results = (await Promise.all(requests)).filter(Boolean) as WordObj[];
  //     setInitialData(results);
  //     setData(results);
  //   } catch (e) {
  //     Alert.alert('Error', 'Failed to load initial words.');
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);
  // converting it into fetch
  const fetchInitial = useCallback(async () => {
  try {
    const requests = PRESET_WORDS.slice(0, 10).map(async (w) => {
      try {
        const response = await fetch(
          `http://192.168.205.128:4002/api/dictionary/word/${w}`
        );

        if (!response.ok) {
          console.error(`❌ Word "${w}" failed with status ${response.status}`);
          return null;
        }

        const data: WordObj = await response.json();
        console.log(`✅ Word "${w}" fetched successfully`, data);
        return data;
      } catch (err) {
        console.error(`🔥 Fetch error for "${w}":`, err);
        return null;
      }
    });

    const results = (await Promise.all(requests)).filter(Boolean) as WordObj[];
    setInitialData(results);
    setData(results);
  } catch (e) {
    console.error("🚨 Unexpected error:", e);
    Alert.alert('Error', 'Failed to load initial words.');
  } finally {
    setLoading(false);
  }
}, []);


  /** ───────────────────────────────────
   * Fetch single word when the user types
   */
  // const fetchSingleWord = async (word: string) => {
  //   if (!word.trim()) {
  //     // reset to initial list
  //     setData(initialData);
  //     return;
  //   }
  //   try {
  //     setLoading(true);
  //     const res = await axios.get<WordObj>(
  //       `https://dictionary-service-k9cu.onrender.com/api/dictionary/word/${word.trim()}`
  //     );
  //     setData([res.data]);
  //   } catch {
  //     setData([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const fetchSingleWord = async (word: string) => {
  if (!word.trim()) {
    // reset to initial list
    setData(initialData);
    return;
  }

  try {
    setLoading(true);

    const response = await fetch(
      `http://192.168.205.128:4002/api/dictionary/word/${word.trim()}`
    );

    if (!response.ok) {
      console.error(`❌ Failed to fetch "${word}": status ${response.status}`);
      setData([]);
      return;
    }

    const data: WordObj = await response.json();
    console.log(`✅ Fetched "${word}" successfully`, data);
    setData([data]);
  } catch (err) {
    console.error(`🔥 Fetch error for "${word}":`, err);
    setData([]);
  } finally {
    setLoading(false);
  }
};


  /** ───────────────────────────────────
   * Handle Android back button to reset search
   */
  useEffect(() => {
  const back = () => {
    if (searchText) {
      setSearchText('');
      setData(initialData);
      return true;
    }
    return false;
  };

  const subscription = BackHandler.addEventListener('hardwareBackPress', back);
  return () => subscription.remove();
}, [searchText, initialData]);

  
  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  /** ───────────────────────────────────
   * Card renderer
   */
  const renderItem = ({ item }: { item: WordObj }) => {
    const meaning = item.meanings?.[0]?.definition ?? 'No definition';
    return (
      <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/word/[word]',
          params: {
            word: item.word,
            definition: meaning,
            pos: item.meanings?.[0]?.partOfSpeech,
            examples: JSON.stringify(item.meanings?.[0]?.examples || []),
            synonyms: item.synonyms?.join(', ') || '',
          },
        })
      }
      className="bg-[#1A1A40] rounded-xl p-4 mb-4"
    >
      <Text className="text-white text-lg font-bold">{item.word}</Text>
      <Text className="text-gray-300 text-sm mt-1">{meaning}</Text>
    </TouchableOpacity>
    );
  };

  /** ───────────────────────────────────
   * Screen JSX
   */
  return (
    <View className="flex-1 bg-black">
      <Image source={images.bg} className="absolute" />

      <FlatList
        data={data}
        keyExtractor={(item) => item.word}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="w-full">
            <Image
              source={icons.logo}
              className="w-24 h-28 mt-10 mb-5 mx-auto"
            />

            <View className='mb-5'>
            <SearchBar
              placeholder="Search a word"
              value={searchText}
              onChangeText={(txt) => {
                setSearchText(txt);
                fetchSingleWord(txt);
              }}
            />
            </View>

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
              {searchText ? 'Word not found.' : 'No data.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
};

export default DictionaryScreen;
