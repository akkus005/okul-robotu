import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, SafeAreaView, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gyroscope } from 'expo-sensors';

export default function App() {
  const [screen, setScreen] = useState('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [queue, setQueue] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [robotLocation, setRobotLocation] = useState('Şarj İstasyonu (Zemin Kat)');
  
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');

  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [tileCount, setTileCount] = useState(0);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let subscription;
    if (screen === 'ROBOT') {
      Gyroscope.setUpdateInterval(100);
      subscription = Gyroscope.addListener(data => setGyroData(data));
    }
    return () => subscription && subscription.remove();
  }, [screen]);

  const loadUsers = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem('@users');
      if (storedUsers) setUsers(JSON.parse(storedUsers));
    } catch (e) {
      console.log('Kullanıcı yükleme hatası', e);
    }
  };

  const handleLogin = () => {
    const userClean = username.trim().toLowerCase();
    
    if (userClean === 'admin' && password === 'ruhi1234') {
      setScreen('ADMIN');
    } else if (userClean === 'robot' && password === 'ruhi1234') {
      setScreen('ROBOT');
    } else {
      const found = users.find(u => u.username.toLowerCase() === userClean && u.password === password);
      if (found) {
        setScreen('USER');
      } else {
        Alert.alert('Hata', 'Geçersiz Kullanıcı Adı veya Şifre!');
      }
    }
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre boş olamaz!');
      return;
    }
    const updatedUsers = [...users, { username: newUsername, password: newPassword }];
    setUsers(updatedUsers);
    await AsyncStorage.setItem('@users', JSON.stringify(updatedUsers));
    setNewUsername('');
    setNewPassword('');
    Alert.alert('Başarılı', `${newUsername} kullanıcısı sisteme eklendi.`);
  };

  const handleCreateRequest = () => {
    if (!startPoint || !endPoint) {
      Alert.alert('Hata', 'Lütfen Başlangıç ve Bitiş noktalarını giriniz!');
      return;
    }
    const newTask = {
      id: Date.now(),
      sender: username,
      start: startPoint,
      end: endPoint,
      status: 'Sırada'
    };
    setQueue([...queue, newTask]);
    if (!currentTask) setCurrentTask(newTask);
    Alert.alert('İşlem Başarılı', 'Talebiniz kuyruğa eklendi.');
    setStartPoint('');
    setEndPoint('');
  };

  const handleCompleteCurrentTask = (manual = false) => {
    Alert.alert('Bildirim', manual ? 'Alıcı teslimatı onayladı.' : 'Kamera haznenin boşaldığını tespit etti. Sıradaki göreve geçiliyor.');
    const remainingQueue = queue.slice(1);
    setQueue(remainingQueue);
    setCurrentTask(remainingQueue.length > 0 ? remainingQueue[0] : null);
  };

  const triggerElevatorFingerbot = async () => {
    console.log('[WI-FI ASANSÖR]: Fingerbot tetiklendi, düğmeye basılıyor...');
    Alert.alert('Asansör', 'Wi-Fi sinyali gönderildi, asansör çağrılıyor.');
  };

  if (screen === 'LOGIN') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>OKUL KURYE ROBOTU</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sistem Girişi</Text>
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı Adı (admin, robot veya adınız)"
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
            <Text style={styles.btnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'ADMIN') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Admin Kontrol Paneli</Text>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>+ Yeni Öğretmen / Kullanıcı Ekle</Text>
            <TextInput
              style={styles.input}
              placeholder="Yeni Kullanıcı Adı"
              placeholderTextColor="#888"
              value={newUsername}
              onChangeText={setNewUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Yeni Şifre"
              placeholderTextColor="#888"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity style={styles.successBtn} onPress={handleAddUser}>
              <Text style={styles.btnText}>Kullanıcıyı Kaydet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Robot Anlık Durum</Text>
            <Text style={styles.infoText}>Konum: {robotLocation}</Text>
            <Text style={styles.infoText}>Aktif Görev: {currentTask ? `${currentTask.start} -> ${currentTask.end}` : 'Beklemede'}</Text>
            <Text style={styles.infoText}>Kuyrukta Bekleyen: {queue.length} Görev</Text>
          </View>

          <TouchableOpacity style={styles.dangerBtn} onPress={() => Alert.alert('ACİL STOP', 'Robot tüm hareketleri durdurdu!')}>
            <Text style={styles.btnText}>ACİL STOP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('LOGIN')}>
            <Text style={styles.btnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'USER') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Kurye Çağrı Paneli</Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ LÜTFEN UYGULAMAYI KAPATMAYINIZ</Text>
            <Text style={styles.subWarningText}>Robot konumu anlık güncellenmektedir.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Robotun Anlık Konumu</Text>
            <Text style={styles.locationTag}>📍 {robotLocation}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Robot Çağır</Text>
            <TextInput
              style={styles.input}
              placeholder="Başlangıç (Örn: Müdür Odası, 1. Kat Koridor)"
              placeholderTextColor="#888"
              value={startPoint}
              onChangeText={setStartPoint}
            />
            <TextInput
              style={styles.input}
              placeholder="Bitiş (Örn: Çay Ocağı, 204 Nolu Sınıf)"
              placeholderTextColor="#888"
              value={endPoint}
              onChangeText={setEndPoint}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateRequest}>
              <Text style={styles.btnText}>Sıraya Ekle (Çağır)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('LOGIN')}>
            <Text style={styles.btnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'ROBOT') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.robotHeader}>ROBOT BEYNİ (AKTİF)</Text>
          <Text style={styles.subWarningText}>Wi-Fi Sunucu & Type-C OTG Bağlantısı Çalışıyor</Text>

          <View style={styles.cameraFrame}>
            <Text style={styles.cameraText}>360° USB OTG Kamera Görüntüsü (Dahili)</Text>
            <Text style={styles.tileText}>Sayılan Karo Sayısı: {tileCount}</Text>
            <ActivityIndicator size="large" color="#00ff00" style={{ marginTop: 10 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sistem ve Bağlantı Durumu</Text>
            <Text style={styles.statusOk}>✓ USB Type-C OTG Hub: Bağlı</Text>
            <Text style={styles.statusOk}>✓ Arduino Nano (Motor Sürücü): Hazır</Text>
            <Text style={styles.statusOk}>✓ Wi-Fi Yerel Ağ Dinleniyor (Port 8080)</Text>
            <Text style={styles.infoText}>Jiroskop Z-Açısı: {gyroData.z.toFixed(2)} rad/s</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mevcut Görev</Text>
            {currentTask ? (
              <View>
                <Text style={styles.infoText}>Gönderen: {currentTask.sender}</Text>
                <Text style={styles.infoText}>Rota: {currentTask.start} ➔ {currentTask.end}</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={triggerElevatorFingerbot}>
                  <Text style={styles.btnText}>Wi-Fi Asansör Çağır (Fingerbot)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.successBtn} onPress={() => handleCompleteCurrentTask(true)}>
                  <Text style={styles.btnText}>Alıcı Onayladı (Teslim Et)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.infoText}>Kuyrukta Bekleyen Görev Yok.</Text>
            )}
          </View>

          <TouchableOpacity style={styles.dangerBtn} onPress={() => setScreen('LOGIN')}>
            <Text style={styles.btnText}>Robot Modundan Çık</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 15 },
  scrollContent: { paddingVertical: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginVertical: 15 },
  robotHeader: { fontSize: 26, fontWeight: 'bold', color: '#22c55e', textAlign: 'center', marginTop: 10 },
  card: { backgroundColor: '#1e293b', borderRadius: 10, padding: 15, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8', marginBottom: 10 },
  input: { backgroundColor: '#334155', color: '#fff', borderRadius: 8, padding: 12, marginBottom: 10 },
  primaryBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  secondaryBtn: { backgroundColor: '#475569', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  successBtn: { backgroundColor: '#16a34a', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  dangerBtn: { backgroundColor: '#dc2626', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  actionBtn: { backgroundColor: '#d97706', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  warningBox: { backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 15 },
  warningText: { color: '#fca5a5', fontWeight: 'bold', textAlign: 'center' },
  subWarningText: { color: '#cbd5e1', textAlign: 'center', fontSize: 12, marginTop: 3, marginBottom: 10 },
  infoText: { color: '#e2e8f0', fontSize: 14, marginVertical: 4 },
  locationTag: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },
  statusOk: { color: '#4ade80', fontSize: 13, marginVertical: 2 },
  cameraFrame: { height: 180, backgroundColor: '#0284c7', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cameraText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  tileText: { color: '#e0f2fe', fontSize: 12, marginTop: 5 }
});
