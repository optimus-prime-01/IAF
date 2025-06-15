import axios from 'axios';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
const BASE_URL = 'http://192.168.205.128:3001';

type PdfDocument = {
  _id: string;
  title: string;
  pdfUrl: string;       // e.g. "/uploads/... .pdf"
  thumbnail?: string;
  createdAt: string;
  viewCount: number;
  category: string;
};

export default function PdfDetails() {

  const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc]         = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
const navigation = useNavigation();
useLayoutEffect(() => {
  if (doc?.title) {
    navigation.setOptions({
      title: doc.title,
      headerBackTitle: 'Back',
      headerTitleAlign: 'center',
    });
  }
}, [doc]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get<PdfDocument>(`${BASE_URL}/api/pdfs/${id}`);
        setDoc(res.data);
      } catch (e: any) {
        setError(e.message || 'Failed to load PDF details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5B5FEF" />
      </View>
    );
  }

  if (error || !doc) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error || 'PDF not found'}</Text>
      </View>
    );
  }

  // Full URL to the PDF file
  const pdfSource = {
    uri: `${BASE_URL}${doc.pdfUrl}`,
    cache: true,
  };

  return (
    <>
    <Stack>
      <Stack.Screen
        options={{
          title: 'PDF Viewer',
          headerBackTitle: 'Back',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
    <View style={styles.container}>
      <Pdf
        source={pdfSource}
        style={styles.pdf}
        trustAllCerts={false}
        onLoadComplete={(numPages) => {
          console.log(`Loaded ${numPages} pages`);
        }}
        onError={(err) => console.error('PDF load error:', err)}
      />
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
});
