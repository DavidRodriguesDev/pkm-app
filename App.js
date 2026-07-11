import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import NotasScreen from './src/screens/NotasScreen';
import TarefasScreen from './src/screens/TarefasScreen';
import AulasScreen from './src/screens/AulasScreen';
import ResumosScreen from './src/screens/ResumosScreen';
import GravacaoScreen from './src/screens/GravacaoScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Notas e Aulas precisam de um Stack próprio porque cada uma pode
// abrir a tela de Gravação por cima. Tarefas e Resumos não precisam.

function NotasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotasLista" component={NotasScreen} />
      <Stack.Screen name="Gravacao" component={GravacaoScreen} />
    </Stack.Navigator>
  );
}

function AulasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AulasLista" component={AulasScreen} />
      <Stack.Screen name="Gravacao" component={GravacaoScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarIcon: ({ color, size }) => {
              const icones = {
                Notas: 'bulb-outline',
                'A fazeres': 'checkbox-outline',
                Aulas: 'book-outline',
                Resumos: 'document-text-outline',
              };
              return <Ionicons name={icones[route.name]} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Notas" component={NotasStack} />
          <Tab.Screen name="A fazeres" component={TarefasScreen} />
          <Tab.Screen name="Aulas" component={AulasStack} />
          <Tab.Screen name="Resumos" component={ResumosScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
