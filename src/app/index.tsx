import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!studentId || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    
    setLoading(true);
    // Supabase ile giriş yapmayı deniyoruz
    const { error } = await supabase.auth.signInWithPassword({
      email: studentId.trim(),
      password: password,
    });

    if (error) {
      Alert.alert('Giriş Başarısız', error.message);
    } else {
      router.replace('/home');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/DumlupinarUniversitesiLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Giriş Yap</Text>

      <TextInput
        style={styles.input}
        placeholder="Öğrenci Numarası veya E-postası"
        value={studentId}
        onChangeText={setStudentId}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="OBS Şifresi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Giriş Yapılıyor...' : 'Giriş'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007BFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});