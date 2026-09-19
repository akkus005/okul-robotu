import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Vibration } from 'react-native';

const ESP32_WS_URL = 'ws://192.168.4.1:81';

export default function App() {
  const [screen, setScreen] = useState('LOGIN'); 
  
  const [users, setUsers] = useState([
    { username: 'admin', password: '1', role: 'ADMIN' },
    { username: 'ruhi', password: '123', role: 'ADMIN' }
  ]);
  
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState({ speed: 0, distance: 0, battery: 100, status: 'IDLE', lockState: 'LOCKED' });
  const [robotArrived, setRobotArrived] = useState(false);

  useEffect(() => {
    connectWebSocket();
    return () => { if (ws) ws.close(); };
  }, []);

  const connectWebSocket = () => {
    const websocket = new WebSocket(ESP32_WS_URL);
    
    websocket.onopen = () => setConnected(true);
    websocket.onclose = () => setConnected(false);
    websocket.onerror = () => setConnected(false);
    
    websocket.onmessage = (e) => {
      try {
        // ESP32 Telemetri Paketi: {"speed": 2.5, "distance": 120, "battery": 90, "status": "ARRIVED", "lockState": "LOCKED"}
        const data = JSON.parse(e.data);
        setTelemetry(data);

        // ROBOT HEDEFE VARDIĞINDA BİLDİRİM TETİKLE
        if (data.status === 'ARRIVED' && !robotArrived) {
          setRobotArrived(true);
          Vibration.vibrate([500, 500, 500]); // Telefona titreşim verir
          Alert.alert("🔔 KARGO ULAŞTI!", "Robot kapınıza vardı. Aşağıdaki butondan kapağı açıp belgeleri alabilirsiniz.");
        }
      } catch (err) {
        console.log("Telemetri ayrıştırma hatası");
      }
    };
    setWs(websocket);
  };

  const sendCommand = (cmd) => {
    if (ws && connected) {
      ws.send(JSON.stringify({ command: cmd }));
    } else {
      Alert.alert('Bağlantı Hatası', 'Robota bağlı değilsiniz!');
    }
  };

  const handleLogin = () => {
    const user = users.find(u => u.username === loginUser && u.password === loginPass);
    if (user) {
      setScreen(user.role);
      setLoginUser('');
      setLoginPass('');
    } else {
      Alert.alert('Hata', 'Kullanıcı adı veya şifre yanlış!');
    }
  };

  const handleAddUser = () => {
    if (newUsername && newUserPass) {
      setUsers([...users, { username: newUsername, password: newUserPass, role: 'TEACHER' }]);
      Alert.alert('Başarılı', `${newUsername} isimli öğretmen kaydedildi.`);
      setNewUsername('');
      setNewUserPass('');
    }
  };

  // --- EKRAN 1: GİRİŞ ---
  if (screen === 'LOGIN') {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>4WD OTONOM KURYE</Text>
        <Text style={styles.subTitle}>Sistem Girişi</Text>
        
        <View style={styles.statusBox}>
          <Text style={{ color: connected ? '#00FF00' : '#FF0000', fontWeight: 'bold' }}>
            {connected ? 'ROBOT BAĞLANTISI AKTİF' : 'ROBOT BAĞLANTISI YOK'}
          </Text>
        </View>

        <TextInput style={styles.input} placeholder="Kullanıcı Adı" onChangeText={setLoginUser} value={loginUser} />
        <TextInput style={styles.input} placeholder="Şifre" secureTextEntry onChangeText={setLoginPass} value={loginPass} />
        
        <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
          <Text style={styles.btnText}>SİSTEME GİRİŞ YAP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- EKRAN 2: ÖĞRETMEN MODU (Varış Bildirimli & Mıknatıs Kilit Açmalı) ---
  if (screen === 'TEACHER') {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>ÖĞRETMEN MODU</Text>
        
        {/* ROBOT DURUM PANOSU */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>ROBOT DURUMU:</Text>
          <Text style={[styles.cardStatus, { color: robotArrived ? '#00FF00' : '#f39c12' }]}>
            {robotArrived ? '📍 KAPINIZDA (TESLİMATA HAZIR)' : '➡️ YOLDA / BEKLEMEDE'}
          </Text>
        </View>

        <TouchableOpacity style={styles.btnAction} onPress={() => { setRobotArrived(false); sendCommand('CALL_ROBOT'); }}>
          <Text style={styles.btnText}>🤖 ROBOTU YANIMA ÇAĞIR</Text>
        </TouchableOpacity>

        {/* MIKNATISLI KİLİT AÇMA BUTONU (Robot varınca aktifleşir/kullanılır) */}
        <TouchableOpacity 
          style={[styles.btnAction, { backgroundColor: robotArrived ? '#8e44ad' : '#7f8c8d' }]} 
          onPress={() => sendCommand('UNLOCK_CARGO')}
        >
          <Text style={styles.btnText}>🔓 KİLİDİ AÇ (BELGELERİ AL)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#27ae60' }]} onPress={() => sendCommand('LOCK_CARGO')}>
          <Text style={styles.btnText}>🔒 KİLİTLEN VE GÖNDER</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnBack} onPress={() => setScreen('LOGIN')}>
          <Text style={styles.btnText}>ÇIKIŞ YAP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- EKRAN 3: ADMİN MODU ---
  if (screen === 'ADMIN') {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>ADMİN KONTROL PANELİ</Text>
        
        <View style={styles.telemetryBox}>
          <Text style={styles.telemetryText}>Hız: {telemetry.speed} km/s</Text>
          <Text style={styles.telemetryText}>Mesafe: {telemetry.distance} cm</Text>
          <Text style={styles.telemetryText}>Pil: %{telemetry.battery}</Text>
        </View>

        <View style={styles.dpad}>
          <TouchableOpacity style={styles.dpadBtn} onPressIn={() => sendCommand('FORWARD')} onPressOut={() => sendCommand('STOP')}><Text style={styles.btnText}>İLERİ</Text></TouchableOpacity>
          <View style={styles.dpadRow}>
            <TouchableOpacity style={styles.dpadBtn} onPressIn={() => sendCommand('LEFT')} onPressOut={() => sendCommand('STOP')}><Text style={styles.btnText}>SOL</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.dpadBtn, styles.stopBtn]} onPress={() => sendCommand('STOP')}><Text style={styles.btnText}>DUR</Text></TouchableOpacity>
            <TouchableOpacity style={styles.dpadBtn} onPressIn={() => sendCommand('RIGHT')} onPressOut={() => sendCommand('STOP')}><Text style={styles.btnText}>SAĞ</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.dpadBtn} onPressIn={() => sendCommand('BACK')} onPressOut={() => sendCommand('STOP')}><Text style={styles.btnText}>GERİ</Text></TouchableOpacity>
        </View>

        {/* MANUEL MIKNATISLI KİLİT TESTİ */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 }}>
          <TouchableOpacity style={[styles.btnMini, { backgroundColor: '#8e44ad' }]} onPress={() => sendCommand('UNLOCK_CARGO')}>
            <Text style={styles.btnText}>🔓 Kilit Aç</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnMini, { backgroundColor: '#2c3e50' }]} onPress={() => sendCommand('LOCK_CARGO')}>
            <Text style={styles.btnText}>🔒 Kilitle</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.emergencyBtn} onPress={() => sendCommand('EMERGENCY_STOP')}>
          <Text style={styles.emergencyText}>ACİL STOP !</Text>
        </TouchableOpacity>

        <View style={styles.addUserBox}>
          <Text style={styles.subTitle}>Öğretmen Hesabı Oluştur</Text>
          <TextInput style={styles.inputMini} placeholder="Öğretmen Adı" onChangeText={setNewUsername} value={newUsername} />
          <TextInput style={styles.inputMini} placeholder="Şifre Belirle" secureTextEntry onChangeText={setNewUserPass} value={newUserPass} />
          <TouchableOpacity style={styles.btnPrimaryMini} onPress={handleAddUser}>
            <Text style={styles.btnText}>HESAP AÇ</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnBack} onPress={() => setScreen('LOGIN')}>
          <Text style={styles.btnText}>ÇIKIŞ YAP</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f1c40f', marginBottom: 5 },
  subTitle: { fontSize: 14, color: '#fff', marginBottom: 15 },
  statusBox: { padding: 8, borderWidth: 1, borderColor: '#555', borderRadius: 8, marginBottom: 15 },
  statusCard: { width: '100%', backgroundColor: '#2c3e50', padding: 12, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  cardTitle: { color: '#aaa', fontSize: 12, fontWeight: 'bold' },
  cardStatus: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  input: { width: '100%', height: 45, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 15, marginBottom: 12 },
  btnPrimary: { width: '100%', height: 45, backgroundColor: '#2980b9', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  btnAction: { width: '100%', height: 50, backgroundColor: '#27ae60', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 12 },
  btnMini: { width: '48%', height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  btnBack: { width: '100%', height: 45, backgroundColor: '#7f8c8d', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginTop: 15 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  telemetryBox: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#333', padding: 10, borderRadius: 8, marginBottom: 15 },
  telemetryText: { color: '#00FF00', fontWeight: 'bold', fontSize: 12 },
  dpad: { alignItems: 'center', marginBottom: 15 },
  dpadRow: { flexDirection: 'row', marginVertical: 5 },
  dpadBtn: { width: 60, height: 60, backgroundColor: '#34495e', justifyContent: 'center', alignItems: 'center', borderRadius: 30, marginHorizontal: 8 },
  stopBtn: { backgroundColor: '#e67e22' },
  emergencyBtn: { width: '100%', height: 50, backgroundColor: '#c0392b', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 15, borderWidth: 2, borderColor: '#fff' },
  emergencyText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  addUserBox: { width: '100%', padding: 12, backgroundColor: '#2c3e50', borderRadius: 8 },
  inputMini: { height: 38, backgroundColor: '#fff', borderRadius: 5, paddingHorizontal: 10, marginBottom: 8 },
  btnPrimaryMini: { height: 38, backgroundColor: '#2980b9', justifyContent: 'center', alignItems: 'center', borderRadius: 5 }
});});
