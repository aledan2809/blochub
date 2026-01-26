# 📱 BlocHub Mobile App - Concept & Architecture

> React Native mobile application pentru proprietari - acces 24/7 la informații bloc

---

## 🎯 Overview

Mobile app dedicată **proprietarilor** pentru:
- Vizualizare chitanțe și sold
- Plată online instantanee
- Trimitere indexuri contoare (poză → OCR automat)
- Sesizări și tichete
- Chat AI pentru întrebări
- Notificări push real-time

**Tech Stack:**
- React Native (iOS + Android)
- Expo pentru rapid development
- React Query pentru API calls
- AsyncStorage pentru cache local
- Expo Camera pentru OCR
- Push Notifications

---

## 📐 Architecture

```
blochub-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── home.tsx              # Dashboard proprietar
│   │   ├── chitante.tsx          # Istoric chitanțe
│   │   ├── payments.tsx          # Plăți online
│   │   ├── indexuri.tsx          # Trimitere indexuri
│   │   └── tichete.tsx           # Sesizări
│   └── _layout.tsx
├── components/
│   ├── ChitantaCard.tsx
│   ├── PaymentSheet.tsx
│   ├── OCRCamera.tsx
│   └── ChatBot.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useChitante.ts
│   └── usePayments.ts
├── lib/
│   ├── api.ts                    # API client
│   ├── storage.ts                # AsyncStorage wrapper
│   └── notifications.ts          # Push notifications
└── package.json
```

---

## 🎨 Key Screens

### 1. Home Dashboard
```typescript
// app/(tabs)/home.tsx
import { View, Text, ScrollView } from 'react-native'
import { useQuery } from '@tanstack/react-query'

export default function HomeScreen() {
  const { data: stats } = useQuery({
    queryKey: ['portal-stats'],
    queryFn: () => api.get('/api/portal/stats')
  })

  return (
    <ScrollView>
      {/* Card cu sold curent */}
      <SoldCard sold={stats.sold} />

      {/* Alerte */}
      {stats.alerteProprietar.map(alert => (
        <AlertCard key={alert.id} alert={alert} />
      ))}

      {/* Ultimele chitanțe */}
      <ChitanteRecente chitante={stats.chitanteRecente} />

      {/* Quick Actions */}
      <QuickActions>
        <ActionButton icon="payment" label="Plătește" />
        <ActionButton icon="camera" label="Indexuri" />
        <ActionButton icon="chat" label="Asistență" />
      </QuickActions>
    </ScrollView>
  )
}
```

### 2. Chitanțe Screen
```typescript
// app/(tabs)/chitante.tsx
export default function ChitanteScreen() {
  const { data: chitante } = useQuery({
    queryKey: ['chitante'],
    queryFn: () => api.get('/api/portal/chitante')
  })

  return (
    <FlatList
      data={chitante}
      renderItem={({ item }) => (
        <ChitantaCard
          chitanta={item}
          onPay={() => navigateTo('payments', { chitantaId: item.id })}
          onView={() => showChitantaDetails(item)}
        />
      )}
      ListHeaderComponent={
        <MonthSelector
          selectedMonth={month}
          onSelect={setMonth}
        />
      }
    />
  )
}
```

### 3. Payment Flow
```typescript
// components/PaymentSheet.tsx
import { StripeProvider, CardField } from '@stripe/stripe-react-native'

export function PaymentSheet({ chitantaId, amount }: PaymentSheetProps) {
  const createPayment = useMutation({
    mutationFn: () => api.post('/api/payments/create-intent', {
      chitantaId,
      amount
    })
  })

  const handlePay = async () => {
    // 1. Create payment intent
    const { clientSecret } = await createPayment.mutateAsync()

    // 2. Confirm payment with Stripe
    const { paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Card'
    })

    // 3. Show success
    if (paymentIntent.status === 'Succeeded') {
      showSuccess('Plata a fost procesată cu succes!')
      refetchChitante()
    }
  }

  return (
    <BottomSheet>
      <Text>Plată pentru chitanța #{chitantaId}</Text>
      <Text style={styles.amount}>{amount} lei</Text>

      <CardField
        postalCodeEnabled={false}
        placeholder={{ number: '4242 4242 4242 4242' }}
        onCardChange={setCard}
      />

      <Button onPress={handlePay} loading={createPayment.isPending}>
        Plătește {amount} lei
      </Button>
    </BottomSheet>
  )
}
```

### 4. OCR Camera pentru Indexuri
```typescript
// components/OCRCamera.tsx
import { Camera } from 'expo-camera'
import * as ImageManipulator from 'expo-image-manipulator'

export function OCRCamera({ contorId }: OCRCameraProps) {
  const [hasPermission, requestPermission] = Camera.useCameraPermissions()
  const submitIndex = useMutation({
    mutationFn: (data) => api.post('/api/portal/indexuri', data)
  })

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync()

    // Optimize image
    const manipulated = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: 1000 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    )

    // Upload and process with OCR
    const formData = new FormData()
    formData.append('image', {
      uri: manipulated.uri,
      type: 'image/jpeg',
      name: 'contor.jpg'
    })
    formData.append('contorId', contorId)

    const result = await submitIndex.mutateAsync(formData)

    // Show OCR result with confirmation
    showOCRConfirmation({
      detectedValue: result.ocrValue,
      confidence: result.confidence,
      onConfirm: () => finalizeSubmission(result)
    })
  }

  return (
    <View style={styles.container}>
      <Camera ref={cameraRef} style={styles.camera}>
        <CameraOverlay text="Centrează contorul în cadru" />
      </Camera>

      <View style={styles.controls}>
        <Button onPress={takePicture}>
          <CameraIcon />
        </Button>
      </View>
    </View>
  )
}
```

### 5. Chat AI
```typescript
// components/ChatBot.tsx
export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([])
  const sendMessage = useMutation({
    mutationFn: (msg) => api.post('/api/agents/chat', {
      message: msg,
      conversationHistory: messages
    })
  })

  const handleSend = async (text: string) => {
    // Add user message
    const userMsg = { role: 'user', content: text, id: uuid() }
    setMessages(prev => [...prev, userMsg])

    // Get AI response
    const response = await sendMessage.mutateAsync(text)

    const aiMsg = {
      role: 'assistant',
      content: response.response,
      id: uuid()
    }
    setMessages(prev => [...prev, aiMsg])
  }

  return (
    <GiftedChat
      messages={messages}
      onSend={handleSend}
      user={{ _id: userId }}
      placeholder="Întreabă orice despre bloc..."
      renderBubble={renderBubble}
      renderInputToolbar={renderInputToolbar}
    />
  )
}
```

### 6. Tichete/Sesizări
```typescript
// app/(tabs)/tichete.tsx
export default function TicheteScreen() {
  const createTichet = useMutation({
    mutationFn: (data) => api.post('/api/tichete', data)
  })

  const handleCreate = () => {
    showBottomSheet({
      title: 'Sesizare nouă',
      fields: [
        { name: 'titlu', type: 'text', required: true },
        { name: 'descriere', type: 'textarea', required: true },
        { name: 'categorie', type: 'select', options: CATEGORII },
        { name: 'prioritate', type: 'select', options: PRIORITATI },
        { name: 'imagini', type: 'images', max: 5 }
      ],
      onSubmit: (data) => createTichet.mutate(data)
    })
  }

  return (
    <View>
      <TicheteList
        filter="active"
        onTichetPress={navigateToDetails}
      />

      <FAB
        icon="plus"
        label="Sesizare nouă"
        onPress={handleCreate}
      />
    </View>
  )
}
```

---

## 🔔 Push Notifications

### Setup
```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications'

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()

  if (status !== 'granted') return null

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-expo-project-id'
  })

  // Send token to backend
  await api.post('/api/portal/notifications/register', {
    pushToken: token.data,
    platform: Platform.OS
  })

  return token
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})
```

### Notification Types
```typescript
enum NotificationType {
  CHITANTA_NOUA = 'chitanta_noua',
  PLATA_CONFIRMATA = 'plata_confirmata',
  REMINDER_PLATA = 'reminder_plata',
  ANUNT_NOU = 'anunt_nou',
  TICHET_UPDATE = 'tichet_update',
  INDEX_REMINDER = 'index_reminder'
}
```

---

## 💾 Offline Support

### AsyncStorage Cache
```typescript
// lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export const storage = {
  async cacheChitante(chitante: Chitanta[]) {
    await AsyncStorage.setItem('chitante', JSON.stringify(chitante))
  },

  async getCachedChitante(): Promise<Chitanta[]> {
    const cached = await AsyncStorage.getItem('chitante')
    return cached ? JSON.parse(cached) : []
  },

  async cacheSold(sold: number) {
    await AsyncStorage.setItem('sold', sold.toString())
  }
}
```

### React Query Persistence
```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

const persister = createAsyncStoragePersister({
  storage: AsyncStorage
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})
```

---

## 🎨 Design System

### Theme
```typescript
// lib/theme.ts
export const theme = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: 'bold' },
    h2: { fontSize: 24, fontWeight: 'bold' },
    h3: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 14, fontWeight: '400' },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
}
```

---

## 📦 Package.json
```json
{
  "name": "blochub-mobile",
  "version": "1.0.0",
  "main": "expo-router",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@tanstack/react-query": "^5.0.0",
    "@stripe/stripe-react-native": "^0.37.0",
    "expo-camera": "~15.0.0",
    "expo-notifications": "~0.28.0",
    "react-native-gifted-chat": "^2.4.0",
    "axios": "^1.6.0",
    "zustand": "^4.5.0"
  }
}
```

---

## 🚀 Development Workflow

### 1. Setup
```bash
# Install Expo CLI
npm install -g expo-cli

# Create project
npx create-expo-app blochub-mobile --template

# Install dependencies
cd blochub-mobile
npm install
```

### 2. Run Development
```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### 3. Build for Production
```bash
# Build Android APK
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```

---

## 📱 Features Roadmap

### Phase 1 (MVP) - Month 1-2
- [ ] Authentication (login/register)
- [ ] Home dashboard
- [ ] Chitanțe list & details
- [ ] Plată online (Stripe)
- [ ] Push notifications basic

### Phase 2 - Month 3
- [ ] OCR Camera pentru indexuri
- [ ] Chat AI integration
- [ ] Tichete/Sesizări
- [ ] Offline support

### Phase 3 - Month 4+
- [ ] Biometric authentication
- [ ] Widget pentru sold
- [ ] Apple Pay / Google Pay
- [ ] AR pentru indexuri contoare
- [ ] Social sharing (plată între vecini)

---

## 🎯 Success Metrics

- **Download rate:** 60%+ proprietari au app instalat
- **Active users:** 40%+ deschid app săptămânal
- **Payment conversion:** 30%+ plăți prin mobile
- **OCR adoption:** 50%+ indexuri prin mobile
- **Satisfaction:** 4.5+ rating în stores

---

**Status:** Concept Phase - Ready for Development
**Priority:** High - proprietarii preferă mobile vs web
**Effort:** 2-3 luni development pentru MVP
