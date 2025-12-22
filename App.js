import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, ScrollView, RefreshControl, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, MapPin, CloudLightning, CloudSnow, CloudDrizzle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// WMO Weather interpretation codes
const getWeatherIcon = (code) => {
  if (code === undefined) return <Sun size={64} color="#FFF" />;
  if (code <= 1) return <Sun size={64} color="#FFF" />;
  if (code <= 3) return <Cloud size={64} color="#FFF" />;
  if (code <= 48) return <Cloud size={64} color="#FFF" />;
  if (code <= 57) return <CloudDrizzle size={64} color="#FFF" />;
  if (code <= 67) return <CloudRain size={64} color="#FFF" />;
  if (code <= 77) return <CloudSnow size={64} color="#FFF" />;
  if (code <= 82) return <CloudRain size={64} color="#FFF" />; // Showers
  if (code <= 86) return <CloudSnow size={64} color="#FFF" />;
  if (code <= 99) return <CloudLightning size={64} color="#FFF" />;
  return <Sun size={64} color="#FFF" />;
};

const getWeatherDescription = (code) => {
  if (code === undefined) return "Loading...";
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("Locating...");

  const fetchWeather = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // Reverse Geocoding to get City Name
      let addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        setAddress(`${addr.city || addr.subregion || "Unknown"}, ${addr.region || addr.country}`);
      }

      // Fetch Weather Data from Open-Meteo
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await response.json();
      setWeather(data);
      
    } catch (e) {
      setErrorMsg('Error fetching weather data: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const onRefresh = React.useCallback(() => {
    fetchWeather();
  }, []);

  if (loading && !weather) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff9f" />
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  const current = weather?.current;
  const isDay = current?.is_day === 1;

  // Modern Gradient Colors based on Day/Night
  const gradientColors = isDay 
    ? ['#4facfe', '#00f2fe']  // Blue Cyan
    : ['#0f2027', '#203a43', '#2c5364']; // Dark Night

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={gradientColors}
        style={styles.background}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#FFF"/>
        }
      >
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <MapPin color="#FFF" size={20} />
            <Text style={styles.locationText}>{address}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>

        <View style={styles.weatherContainer}>
          <View style={styles.iconContainer}>
            {getWeatherIcon(current?.weather_code)}
          </View>
          <Text style={styles.temperature}>{Math.round(current?.temperature_2m)}°</Text>
          <Text style={styles.weatherDescription}>{getWeatherDescription(current?.weather_code)}</Text>
          <Text style={styles.feelsLike}>Feels like {Math.round(current?.apparent_temperature)}°</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Wind color="rgba(255,255,255,0.7)" size={24} />
            <Text style={styles.statValue}>{current?.wind_speed_10m} km/h</Text>
            <Text style={styles.statLabel}>Wind</Text>
          </View>
          <View style={styles.statItem}>
            <Droplets color="rgba(255,255,255,0.7)" size={24} />
            <Text style={styles.statValue}>{current?.relative_humidity_2m}%</Text>
            <Text style={styles.statLabel}>Humidity</Text>
          </View>
          <View style={styles.statItem}>
            <CloudRain color="rgba(255,255,255,0.7)" size={24} />
            <Text style={styles.statValue}>{current?.precipitation} mm</Text>
            <Text style={styles.statLabel}>Precip</Text>
          </View>
        </View>

        {weather?.daily && (
           <View style={styles.forecastContainer}>
              <Text style={styles.forecastTitle}>7-Day Forecast</Text>
              {weather.daily.time.map((day, index) => (
                <View key={day} style={styles.forecastItem}>
                   <Text style={styles.forecastDay}>
                     {new Date(day).toLocaleDateString('en-US', { weekday: 'short' })}
                   </Text>
                   <View style={styles.forecastIcon}>
                      {getWeatherIcon(weather.daily.weather_code[index]) && React.cloneElement(getWeatherIcon(weather.daily.weather_code[index]), { size: 24 })}
                   </View>
                   <View style={styles.forecastTemps}>
                      <Text style={styles.maxTemp}>{Math.round(weather.daily.temperature_2m_max[index])}°</Text>
                      <Text style={styles.minTemp}>{Math.round(weather.daily.temperature_2m_min[index])}°</Text>
                   </View>
                </View>
              ))}
           </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f2027',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  locationText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  weatherContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  temperature: {
    fontSize: 80,
    fontWeight: '200',
    color: '#FFF',
    marginLeft: 15, // Optical balancing
  },
  weatherDescription: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: -5,
  },
  feelsLike: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  forecastContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  forecastTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  forecastDay: {
    color: '#FFF',
    fontSize: 16,
    width: 50,
  },
  forecastIcon: {
    flex: 1,
    alignItems: 'center',
  },
  forecastTemps: {
    flexDirection: 'row',
    width: 80,
    justifyContent: 'flex-end',
  },
  maxTemp: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  minTemp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginLeft: 10,
  },
});
