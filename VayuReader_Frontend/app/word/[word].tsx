import { images } from '@/constants/images';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';

const WordDetails = () => {
  const { word, definition, pos, examples, synonyms } = useLocalSearchParams();
  const router = useRouter();

  return (
    <>
    <Stack.Screen
        options={{
          title: word?.toString() ?? 'Word Details',
          headerBackTitle: 'Back',
          headerTitleAlign: 'center',
        }}
      />
    <View className="flex-1 bg-black px-4 pt-10">
      <Image
              source={images.bg}
              className="absolute "
            />
      {/* <TouchableOpacity
        className="bg-white w-20 px-3 py-2 rounded-xl mb-5"
        onPress={() => router.back()}
      >
        <Text className="text-black text-center">Back</Text>
      </TouchableOpacity> */}

      <Text className="text-white text-2xl font-bold mb-1">{word}</Text>
      <Text className="text-gray-300 text-lg mb-4">/{pos}/</Text>

      <ScrollView>
        <View className="mb-4 p-3 bg-[#1c1731] rounded-xl">
          <Text className="text-purple-400 font-bold mb-1">Definition</Text>
          <Text className="text-white">{definition}</Text>
        </View>

        <View className="mb-4 p-3 bg-[#1c1731] rounded-xl">
  <Text className="text-purple-400 font-bold mb-1">Example Sentences</Text>
  
  {Array.isArray(examples) && examples.length > 0 ? (
    examples.map((e: string, idx: number) => (
      <Text key={idx} className="text-white mb-1">• {e}</Text>
    ))
  ) : (
    <Text className="text-white">—</Text>
  )}
</View>


        <View className="mb-4 p-3 bg-[#1c1731] rounded-xl">
          <Text className="text-purple-400 font-bold mb-1">Synonyms</Text>
          <Text className="text-white">{synonyms}</Text>
        </View>
      </ScrollView>
    </View>
     </>
  );
};

export default WordDetails;
