# Purrsonica Mobile Companion

Official iOS and Android mobile companion app for **[Purrsonica](https://github.com/AFuxy/Purrsonica)** — Modern Local Music & Video Player.

---

## Features

- **Direct Zero-Cloud Media Streaming**: Streams lossless FLAC, MP3, and AAC audio directly from your home PC over your private LAN or encrypted P2P out-of-LAN cellular data.
- **Dynamic QR Code Handshake**: Seamless 1-tap device pairing via camera scanner with zero account setup.
- **Connection Resilience Engine**:
  - Automatically reconnects if your phone drops Wi-Fi or leaves the home network.
  - Exponential backoff retry loop (1s → 1.5s → 2.25s → max 10s).
  - Tries multiple known local desktop IP addresses concurrently with strict 1500ms discovery timeouts.
  - Zero re-pairing required when reconnecting.
- **Range Resumption Audio Engine**:
  - Uses HTTP 206 Partial Content range requests.
  - If a song is playing and the network temporarily stutters, playback automatically recovers from the exact millisecond offset rather than starting over from 0:00.
  - Background audio playback and lock-screen playback controls.
- **Cross-Device Playback Awareness**:
  - Live desktop sync: Displays *"Now Playing on Zak's Gaming PC"*.
  - 1-tap **"Transfer Playback to PC"** handoff.
  - Control PC volume, track skip, and play/pause directly from your phone.
- **Full Library Browsing**:
  - Live synced tracks and playlists with pull-to-refresh.
  - Instant search across titles, artists, and albums.
  - Harmonic mixing metadata badges (BPM & Camelot Key).

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) app installed on your iPhone or Android phone, or an iOS Simulator / Android Emulator.

### Installation

```bash
# Clone the repository
git clone https://github.com/AFuxy/Purrsonica-Mobile.git
cd Purrsonica-Mobile

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Pairing with Purrsonica Desktop

1. Open **Purrsonica Desktop** on your PC.
2. Go to **Settings → Mobile Companion** (or click the Smartphone icon in the desktop playback bar).
3. Click **"Pair New Phone"** to display the dynamic QR code.
4. In **Purrsonica Mobile**, point your camera at the QR code on your PC screen.
5. Once paired, your library will synchronize instantly!

---

## Tech Stack

- **Framework**: React Native with Expo SDK 57
- **Language**: TypeScript
- **State Management**: Zustand
- **Audio Engine**: `expo-av` with background audio modes
- **Camera Scanner**: `expo-camera`
- **Secure Persistence**: `expo-secure-store`
- **Design System**: Purrsonica Emerald / Cyan Dark Neon Palette
