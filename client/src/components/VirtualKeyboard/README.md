# VirtualKeyboard Component dengan Code Splitting

## Overview

VirtualKeyboard component telah diimplementasikan dengan code splitting untuk optimasi performa. Component ini hanya akan dimuat saat dibutuhkan, mengurangi initial bundle size.

## Cara Penggunaan

### Import dengan Lazy Loading (Recommended)

```jsx
import { VirtualKeyboard } from "./components/VirtualKeyboard";

// Penggunaan di component
function MyComponent() {
  const [showKeyboard, setShowKeyboard] = useState(false);

  return (
    <div>
      <input
        onFocus={() => setShowKeyboard(true)}
        onBlur={() => setShowKeyboard(false)}
      />

      <VirtualKeyboard
        isVisible={showKeyboard}
        onInputChange={(input) => {
          // Handle keyboard input
        }}
        onHide={() => setShowKeyboard(false)}
        initialValue=""
      />
    </div>
  );
}
```

### Import Original Component (Tanpa Lazy Loading)

```jsx
import { VirtualKeyboardOriginal } from "./components/VirtualKeyboard";

// Penggunaan langsung tanpa lazy loading
function MyComponent() {
  const [showKeyboard, setShowKeyboard] = useState(false);

  return (
    <div>
      <VirtualKeyboardOriginal
        isVisible={showKeyboard}
        onInputChange={(input) => {
          // Handle keyboard input
        }}
        onHide={() => setShowKeyboard(false)}
        initialValue=""
      />
    </div>
  );
}
```

## Props

| Prop            | Type     | Default | Description                          |
| --------------- | -------- | ------- | ------------------------------------ |
| `isVisible`     | boolean  | false   | Menampilkan/menyembunyikan keyboard  |
| `onInputChange` | function | null    | Callback untuk handle input changes  |
| `onHide`        | function | null    | Callback saat keyboard disembunyikan |
| `initialValue`  | string   | ""      | Nilai awal keyboard                  |

## Performa Optimasi

### Code Splitting Benefits

1. **Reduced Initial Bundle Size**: VirtualKeyboard hanya dimuat saat dibutuhkan
2. **Faster Initial Load**: Aplikasi lebih cepat load karena tidak perlu memuat keyboard component
3. **On-Demand Loading**: Component dimuat hanya saat `isVisible` bernilai true

### Loading States

- **Initial State**: Component tidak dimuat sama sekali
- **Loading State**: Menampilkan "Loading keyboard..." saat component sedang dimuat
- **Ready State**: Keyboard siap digunakan

## Implementasi Details

### File Structure

```
src/components/
├── VirtualKeyboard.jsx           # Original component
├── VirtualKeyboardLoader.jsx     # Loader dengan dynamic import
├── LazyVirtualKeyboard.jsx       # Wrapper dengan Suspense
└── VirtualKeyboard/
    ├── index.jsx                 # Export pattern
    ├── example.jsx               # Contoh penggunaan
    └── README.md                 # Documentation
```

### Dynamic Import

```javascript
// Dynamic import untuk code splitting
const module = await import("./VirtualKeyboard.jsx");
setVirtualKeyboardComponent(() => module.default);
```

### Suspense Boundary

```jsx
<Suspense fallback={<KeyboardLoadingFallback />}>
  <VirtualKeyboardComponent {...props} />
</Suspense>
```

## Best Practices

1. **Gunakan lazy loading** untuk aplikasi production
2. **Preload saat component mount** untuk user experience yang lebih baik
3. **Handle loading state** dengan fallback yang jelas
4. **Cleanup properly** untuk memory leaks prevention

## Migration dari Original Component

Jika anda sudah menggunakan VirtualKeyboard sebelumnya, migrasi sangat mudah:

```jsx
// Sebelumnya
import VirtualKeyboard from "./components/VirtualKeyboard";

// Sekarang (dengan lazy loading)
import { VirtualKeyboard } from "./components/VirtualKeyboard";

// Props dan functionality tetap sama
```

## Testing Code Splitting

Untuk memverifikasi bahwa code splitting berfungsi dengan baik:

1. **Check Network Tab** di browser dev tools
2. **Cari separate chunk** untuk keyboard library
3. **Monitor loading** saat keyboard pertama kali dibuka
4. **Verify bundle size** reduction di build output

## Build Configuration

Vite config telah dioptimasi untuk code splitting:

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['preact'],
        keyboard: ['simple-keyboard'],
        mediapipe: ['@mediapipe/camera_utils', '@mediapipe/face_mesh'],
        tensorflow: ['@tensorflow-models/body-segmentation', '@tensorflow/tfjs-backend-webgl', '@tensorflow/tfjs-core'],
      },
    },
  },
}
```
