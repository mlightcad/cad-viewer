// SPDX-License-Identifier: GPL-3.0-or-later
import { type ReactElement, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { AboutLicenses } from './src/about/AboutLicenses'
import { ViewerScreen } from './src/screens/ViewerScreen'

export default function App(): ReactElement {
  // O ecrã Acerca é uma sobreposição: o viewer fica montado (sessão, servidor
  // e WebView intactos) e nenhum fluxo técnico depende dele.
  const [aboutOpen, setAboutOpen] = useState(false)
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ViewerScreen />
        {aboutOpen ? null : (
          <View style={{ position: 'absolute', top: 8, right: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Acerca e licenças"
              onPress={() => setAboutOpen(true)}
              style={{
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 12
              }}
            >
              <Text style={{ fontSize: 16, color: '#1a56db' }}>Acerca</Text>
            </Pressable>
          </View>
        )}
        {aboutOpen ? (
          <AboutLicenses onClose={() => setAboutOpen(false)} />
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  )
}
