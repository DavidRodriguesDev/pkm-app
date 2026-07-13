import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import NotasScreen from './src/screens/NotasScreen';
import TarefasScreen from './src/screens/TarefasScreen';
import AulasScreen from './src/screens/AulasScreen';
import ResumosScreen from './src/screens/ResumosScreen';
import GravacaoScreen from './src/screens/GravacaoScreen';
import ChatAulaScreen from './src/screens/ChatAulaScreen';
import VisualizadorScreen from './src/screens/VisualizadorScreen';
import { colors, font } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// O Visualizador é a única tela que precisa do header nativo (usa
// navigation.setOptions pra mostrar título + toggle VER/EDITAR e o botão
// de voltar). Todas as outras telas desenham o próprio header por dentro.
const visualizadorHeaderOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontFamily: font.mono, fontSize: 13, letterSpacing: 1 },
  headerBackTitleVisible: false,
};

// Notas, Aulas e Resumos precisam de um Stack próprio porque cada uma pode
// abrir Gravação/Visualizador/ChatAula por cima. Tarefas não precisa.

function NotasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotasLista" component={NotasScreen} />
      <Stack.Screen name="Gravacao" component={GravacaoScreen} />
      <Stack.Screen name="Visualizador" component={VisualizadorScreen} options={visualizadorHeaderOptions} />
    </Stack.Navigator>
  );
}

function AulasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AulasLista" component={AulasScreen} />
      <Stack.Screen name="Gravacao" component={GravacaoScreen} />
      <Stack.Screen name="ChatAula" component={ChatAulaScreen} />
    </Stack.Navigator>
  );
}

// Antes essa aba apontava direto pro VisualizadorStack — a lista de
// resumos (ResumosScreen) nunca era exibida. Agora "Resumos" abre a lista
// primeiro, e só entra no Visualizador quando o usuário toca num item.
function ResumosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ResumosLista" component={ResumosScreen} />
      <Stack.Screen name="Visualizador" component={VisualizadorScreen} options={visualizadorHeaderOptions} />
    </Stack.Navigator>
  );
}

const ICONES = {
  Notas: 'bulb-outline',
  'A fazeres': 'checkbox-outline',
  Aulas: 'book-outline',
  Resumos: 'document-text-outline',
};

function AppNavigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.textPrimary,
          tabBarInactiveTintColor: colors.textDim,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontFamily: font.mono,
            fontSize: 10,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONES[route.name]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Notas" component={NotasStack} />
        <Tab.Screen name="A fazeres" component={TarefasScreen} />
        <Tab.Screen name="Aulas" component={AulasStack} />
        <Tab.Screen name="Resumos" component={ResumosStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigation />
    </SafeAreaProvider>
  );
}

// -----------------------------------------------------------------------
// QUER UMA FONTE MONO "DE VERDADE" (tipo JetBrains Mono) NO LUGAR DA
// MONOSPACE DO SISTEMA? É só:
//
// 1. Instalar (com o bundler PARADO):
//      npx expo install @expo-google-fonts/jetbrains-mono expo-font
//
// 2. Reiniciar limpando cache:
//      npx expo start -c
//
// 3. No topo deste arquivo, adicionar:
//      import { View } from 'react-native';
//      import {
//        useFonts,
//        JetBrainsMono_400Regular,
//        JetBrainsMono_700Bold,
//      } from '@expo-google-fonts/jetbrains-mono';
//
// 4. Trocar a função App() por:
//      export default function App() {
//        const [fontsLoaded] = useFonts({
//          JetBrainsMono_400Regular,
//          JetBrainsMono_700Bold,
//        });
//        if (!fontsLoaded) {
//          return <View style={{ flex: 1, backgroundColor: colors.background }} />;
//        }
//        return (
//          <SafeAreaProvider>
//            <StatusBar style="light" />
//            <AppNavigation />
//          </SafeAreaProvider>
//        );
//      }
//
// 5. Em src/theme.js, trocar font.mono/font.monoBold pelos nomes
//    'JetBrainsMono_400Regular' e 'JetBrainsMono_700Bold'.
// -----------------------------------------------------------------------