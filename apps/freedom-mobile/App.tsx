// SPDX-License-Identifier: GPL-3.0-or-later
import type { ReactElement } from 'react'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { ViewerScreen } from './src/screens/ViewerScreen'

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ViewerScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}
