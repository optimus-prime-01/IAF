import { icons } from '@/constants/icons';
import React from 'react';
import { Image, NativeSyntheticEvent, TextInput, TextInputSubmitEditingEventData, View } from 'react-native';

interface Props {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => void;
}

const SearchBar = ({ placeholder, value, onChangeText, onSubmitEditing }: Props) => {
  return (
    <View className="flex-row items-center bg-dark-200 rounded-full px-5 py-2">
      <Image source={icons.search} className="size-5" resizeMode="contain" tintColor="#ab8bff" />

      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholderTextColor="#a8b5db"
        className="flex-1 ml-2 text-white"
        returnKeyType="search"
      />
    </View>
  );
};

export default SearchBar;
