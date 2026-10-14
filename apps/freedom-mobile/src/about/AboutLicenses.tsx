// SPDX-License-Identifier: GPL-3.0-or-later

import type { ReactElement } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ABOUT_SECTIONS, ABOUT_TITLE, NOT_LEGAL_ADVICE } from './aboutContent'

export function AboutLicenses({
  onClose
}: {
  onClose: () => void
}): ReactElement {
  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar ao visualizador"
          onPress={onClose}
          style={styles.back}
        >
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {ABOUT_TITLE}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.disclaimer}>{NOT_LEGAL_ADVICE}</Text>
        {ABOUT_SECTIONS.map(section => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              {section.title}
            </Text>
            {section.paragraphs.map(p => (
              <Text key={p} style={styles.body}>
                {p}
              </Text>
            ))}
            {section.items?.map(item => (
              <View
                key={item.name}
                style={styles.item}
                accessible
                accessibilityLabel={`${item.name}. Licença ${item.license}. ${item.notice}.${item.note ? ` ${item.note}` : ''}`}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.body}>Licença: {item.license}</Text>
                <Text style={styles.body}>{item.notice}</Text>
                {item.note ? (
                  <Text style={styles.note}>{item.note}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

export const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff'
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a56db'
  },
  backText: { color: '#ffffff', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600', flexShrink: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  disclaimer: { fontSize: 14, color: '#444444', fontStyle: 'italic' },
  section: { gap: 8 },
  heading: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, color: '#222222' },
  note: { fontSize: 14, color: '#444444', fontStyle: 'italic' },
  item: { gap: 2, paddingVertical: 4 },
  itemName: { fontSize: 14, fontWeight: '600' }
})
