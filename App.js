import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, ScrollView, RefreshControl, Dimensions, Platform, TouchableOpacity, Modal, TextInput, Alert, FlatList, AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { LinearGradient } from 'expo-linear-gradient';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, MapPin, CloudLightning, CloudSnow, CloudDrizzle, Plus, User, LogOut, Check } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const BACKGROUND_FETCH_TASK = 'background-fetch-weather';
// UPDATED IP
const API_URL = 'http://192.168.18.12:3000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getWeatherIcon = (code) => {
  if (code === undefined) return <Sun size={64} color="#FFF" />;
  if (code <= 1) return <Sun size={64} color="#FFF" />;
  if (code <= 3) return <Cloud size={64} color="#FFF" />;
  if (code <= 48) return <Cloud size={64} color="#FFF" />;
  if (code <= 57) return <CloudDrizzle size={64} color="#FFF" />;
  if (code <= 67) return <CloudRain size={64} color="#FFF" />;
  if (code <= 77) return <CloudSnow size={64} color="#FFF" />;
  if (code <= 82) return <CloudRain size={64} color="#FFF" />;
  if (code <= 86) return <CloudSnow size={64} color="#FFF" />;
  if (code <= 99) return <CloudLightning size={64} color="#FFF" />;
  return <Sun size={64} color="#FFF" />;
};

const getWeatherDescription = (code) => {
  if (code === undefined) return "Loading...";
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast/Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
};

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  return BackgroundFetch.BackgroundFetchResult.NoData;
});

const getPakistaniSuggestions = (weatherCode) => {
  if (weatherCode >= 51 && weatherCode <= 67) return ["Let's have a Pakora Party!", "Samosas & Chutney time?", "Hot Chai & Paratha?"];
  if (weatherCode >= 95) return ["Stay safe indoors with Gajar Ka Halwa!", "Hot Coffee weather?"];
  if (weatherCode <= 1) return ["Ice Cream run?", "Cold Rooh Afza?", "Sugarcane Juice (Ganne ka ras)?"];
  if (weatherCode >= 71) return ["Kashmiri Chai (Pink Tea)?", "Soup night?"];
  return ["Biryani plans?", "BBQ tonight?", "Chai break?"];
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("Locating...");

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPollCreateModal, setShowPollCreateModal] = useState(false);
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [refreshing, setRefreshing] = useState(false);

  const appState = useRef(AppState.currentState);

  // --- Logging Helper ---
  const logEvent = async (action, details = {}) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentUser) headers['x-user-id'] = currentUser.id;

      await fetch(`${API_URL}/log`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, details })
      });
    } catch (e) {
      console.log("Logging failed:", e.message); // Silent fail for UX
    }
  };

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission denied');
        setLoading(false);
        logEvent('LOCATION_PERMISSION_DENIED');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      let addrs = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude, longitude: loc.coords.longitude
      });
      if (addrs.length > 0) setAddress(`${addrs[0].city || "Unknown"}, ${addrs[0].region}`);

      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await resp.json();
      setWeather(data);
      logEvent('WEATHER_FETCHED', { lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const resp = await fetch(`${API_URL}/users`);
      const data = await resp.json();
      setUsers(data);
    } catch (e) { console.error("Fetch Users Error:", e); }
  };

  const fetchPolls = async () => {
    try {
      const headers = currentUser ? { 'x-user-id': currentUser.id } : {};
      const resp = await fetch(`${API_URL}/polls`, { headers });
      const data = await resp.json();
      setPolls(data);
    } catch (e) { console.error("Fetch Polls Error:", e); }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setShowLoginModal(false);
    logEvent('USER_LOGIN', { userId: user.id, name: user.name });
    fetchPolls();
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }

    const weatherDesc = getWeatherDescription(weather?.current?.weather_code);
    const context = `${Math.round(weather?.current?.temperature_2m)}°C, ${weatherDesc}`;

    try {
      logEvent('POLL_CREATE_SUBMIT', { question: pollQuestion });
      const resp = await fetch(`${API_URL}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          question: pollQuestion,
          options: pollOptions,
          weather_context: context
        })
      });

      if (resp.ok) {
        setShowPollCreateModal(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
        fetchPolls(); // Logger in backend records success
      } else {
        Alert.alert("Error", "Failed to create poll");
      }
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleVote = async (pollId, optionId) => {
    if (!currentUser) { setShowLoginModal(true); return; }

    try {
      logEvent('VOTE_ATTEMPT', { pollId, optionId });
      const resp = await fetch(`${API_URL}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ poll_id: pollId, option_id: optionId })
      });

      if (resp.ok) {
        fetchPolls();
      } else {
        const err = await resp.json();
        Alert.alert("Info", err.error || "Failed to vote");
      }
    } catch (e) { Alert.alert("Error", e.message); }
  };

  useEffect(() => {
    fetchWeather();
    fetchUsers();
    fetchPolls();
    logEvent('APP_LAUNCHED');

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logEvent('APP_FOREGROUNDED');
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    logEvent('PULL_TO_REFRESH');
    await Promise.all([fetchWeather(), fetchPolls()]);
    setRefreshing(false);
  };

  const suggestions = weather ? getPakistaniSuggestions(weather.current.weather_code) : [];
  const applySuggestion = (text) => {
    setPollQuestion(text);
    logEvent('SUGGESTION_SELECTED', { text });
  };

  if (loading && !weather) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#00ff9f" /></View>;

  const current = weather?.current;
  const isDay = current?.is_day === 1;
  const gradientColors = isDay ? ['#4facfe', '#00f2fe'] : ['#0f2027', '#203a43', '#2c5364'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={gradientColors} style={styles.background} />

      <View style={styles.topBar}>
        <Text style={styles.appName}>PakWeather & Polls</Text>
        {currentUser ? (
          <TouchableOpacity style={styles.userBadge} onPress={() => {
            logEvent('USER_LOGOUT', { userId: currentUser.id });
            setCurrentUser(null);
          }}>
            <View style={[styles.avatarSmall, { backgroundColor: currentUser.avatar_color }]} />
            <Text style={styles.userName}>{currentUser.name}</Text>
            <LogOut size={16} color="#FFF" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => setShowLoginModal(true)}>
            <User size={18} color="#FFF" />
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >
        <View style={styles.weatherSummary}>
          <View>
            <Text style={styles.locationTitle}>{address}</Text>
            <Text style={styles.tempLarge}>{Math.round(current?.temperature_2m)}°</Text>
            <Text style={styles.descSmall}>{getWeatherDescription(current?.weather_code)}</Text>
          </View>
          {getWeatherIcon(current?.weather_code)}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Community Polls</Text>
          {currentUser && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowPollCreateModal(true)}>
              <Plus size={20} color="#000" />
              <Text style={styles.createBtnText}>New Poll</Text>
            </TouchableOpacity>
          )}
        </View>

        {polls.map(poll => (
          <View key={poll.id} style={styles.pollCard}>
            <View style={styles.pollHeader}>
              <View style={[styles.avatarTiny, { backgroundColor: poll.creator_avatar }]} />
              <View>
                <Text style={styles.pollCreator}>{poll.creator_name}</Text>
                <Text style={styles.pollContext}>{poll.weather_context}</Text>
              </View>
            </View>
            <Text style={styles.pollQuestion}>{poll.question}</Text>

            {poll.options.map(opt => {
              const percent = poll.total_votes > 0 ? (opt.vote_count / poll.total_votes) * 100 : 0;
              const isSelected = poll.user_voted_option_id === opt.id;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionBtn, isSelected && styles.optionSelected]}
                  onPress={() => handleVote(poll.id, opt.id)}
                  disabled={!!poll.user_voted_option_id}
                >
                  <View style={[styles.progressBar, { width: `${percent}%` }]} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{opt.text}</Text>
                    <Text style={styles.voteCount}>{opt.vote_count} ({Math.round(percent)}%)</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <Text style={styles.totalVotes}>{poll.total_votes} votes</Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showLoginModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select User</Text>
            <FlatList
              data={users}
              keyExtractor={u => u.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userItem} onPress={() => handleLogin(item)}>
                  <View style={[styles.avatarMedium, { backgroundColor: item.avatar_color }]} />
                  <Text style={styles.userItemName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLoginModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPollCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Weather Poll</Text>

            <Text style={styles.suggestionTitle}>Suggestions based on weather:</Text>
            <View style={styles.chipContainer}>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} style={styles.chip} onPress={() => applySuggestion(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Ask e.g. Chai or Coffee?"
              placeholderTextColor="#999"
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />

            {pollOptions.map((opt, i) => (
              <TextInput
                key={i}
                style={styles.input}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor="#999"
                value={opt}
                onChangeText={(txt) => {
                  const newOpts = [...pollOptions];
                  newOpts[i] = txt;
                  setPollOptions(newOpts);
                }}
              />
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.actionBtnCancel} onPress={() => setShowPollCreateModal(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnSubmit} onPress={handleCreatePoll}>
                <Text style={styles.actionText}>Post Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f2027' },
  background: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },

  topBar: { paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  loginBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, alignItems: 'center' },
  loginText: { color: '#fff', marginLeft: 5, fontSize: 14 },
  userBadge: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', padding: 5, paddingRight: 10, borderRadius: 20, alignItems: 'center' },
  userName: { color: '#fff', marginLeft: 8, fontWeight: '600' },

  scrollContent: { padding: 20, paddingBottom: 50 },

  weatherSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.1)', padding: 20, borderRadius: 25 },
  locationTitle: { color: '#fff', fontSize: 16, opacity: 0.8 },
  tempLarge: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  descSmall: { color: '#fff', fontSize: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  createBtn: { flexDirection: 'row', backgroundColor: '#00ff9f', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  createBtnText: { color: '#000', fontWeight: 'bold', marginLeft: 5 },

  pollCard: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 15, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#4facfe' },
  pollHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarTiny: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  pollCreator: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  pollContext: { color: '#aaa', fontSize: 12 },
  pollQuestion: { color: '#fff', fontSize: 18, marginBottom: 15, fontWeight: '600' },

  optionBtn: { marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, height: 45, justifyContent: 'center', overflow: 'hidden' },
  optionSelected: { borderColor: '#00ff9f', borderWidth: 1 },
  progressBar: { position: 'absolute', height: '100%', backgroundColor: 'rgba(79, 172, 254, 0.4)', left: 0 },
  optionContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15 },
  optionText: { color: '#fff', fontWeight: '500' },
  voteCount: { color: '#ccc', fontSize: 12 },
  totalVotes: { color: '#666', fontSize: 12, textAlign: 'right', marginTop: 5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },

  userItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333' },
  avatarMedium: { width: 40, height: 40, borderRadius: 20, marginRight: 15 },
  userItemName: { color: '#fff', fontSize: 16 },
  closeBtn: { marginTop: 20, alignItems: 'center', padding: 15 },
  closeBtnText: { color: '#aaa' },

  suggestionTitle: { color: '#00ff9f', marginBottom: 10, fontSize: 14 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  chip: { backgroundColor: 'rgba(79, 172, 254, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#4facfe' },
  input: { backgroundColor: '#333', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionBtnCancel: { flex: 1, backgroundColor: '#444', padding: 15, borderRadius: 10, marginRight: 10, alignItems: 'center' },
  actionBtnSubmit: { flex: 1, backgroundColor: '#00ff9f', padding: 15, borderRadius: 10, marginLeft: 10, alignItems: 'center' },
  actionText: { color: '#000', fontWeight: 'bold' }
});
