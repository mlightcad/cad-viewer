// SPDX-License-Identifier: GPL-3.0-or-later
//
// Conteúdo do ecrã Acerca/Licenças (arquitectura §8.2), transcrito do
// inventário L1 (`docs/OBJ-0104-licenses.md`). Informativo: não é parecer
// jurídico e não condiciona nenhum fluxo técnico (D-1). Itens ainda por
// confirmar no L1 aparecem como tal, nunca como afirmação.

export interface AboutItem {
  readonly name: string
  readonly license: string
  readonly notice: string
  readonly note?: string
}

export interface AboutSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly items?: readonly AboutItem[]
}

export const SOURCE_URL_PENDING = 'SOURCE_URL_PENDING'

export const ABOUT_TITLE = 'Acerca e licenças'

export const NOT_LEGAL_ADVICE =
  'Informação para transparência. Não constitui aconselhamento jurídico.'

export const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'about',
    title: 'Acerca',
    paragraphs: [
      'Freedom DWG/CAD Viewer — visualizador offline de DWG/DXF. Não envia ficheiros para nenhum serviço.'
    ]
  },
  {
    id: 'license',
    title: 'Licença desta app',
    paragraphs: [
      'Este programa é software livre: pode redistribuí-lo e/ou modificá-lo nos termos da GNU General Public License, versão 3 ou (à sua escolha) qualquer versão posterior, publicada pela Free Software Foundation.',
      'É distribuído SEM QUALQUER GARANTIA. Licença declarada: GPL-3.0-or-later. Copyright (C) 2026 Equipa Aitra (titular por confirmar).'
    ]
  },
  {
    id: 'source',
    title: 'Código-fonte',
    paragraphs: [
      `Código-fonte correspondente: ${SOURCE_URL_PENDING} (endereço público ainda por definir).`
    ]
  },
  {
    id: 'third-party',
    title: 'Créditos e avisos de terceiros',
    paragraphs: [
      'Componentes de terceiros incluídos ou usados por esta app, conforme o inventário de licenças. Entradas marcadas "por confirmar" aguardam verificação.'
    ],
    items: [
      {
        name: 'mlightcad / cad-viewer (@mlightcad/*)',
        license: 'MIT',
        notice: 'Copyright (c) 2026 mlightcad'
      },
      {
        name: 'LibreDWG (via @mlightcad/libredwg-web e libredwg-converter)',
        license: 'GPL-3.0',
        notice: 'Copyright (C) Free Software Foundation, Inc.',
        note: 'Variante (only / or-later) e linha de copyright por confirmar.'
      },
      {
        name: 'three.js',
        license: 'MIT',
        notice: 'Aviso de copyright dos autores de three.js'
      },
      {
        name: 'React, React Native, Expo, expo-crypto',
        license: 'MIT',
        notice: 'Avisos de copyright dos respectivos autores'
      },
      {
        name: 'react-native-webview, react-native-tcp-socket, react-native-safe-area-context',
        license: 'MIT',
        notice: 'Avisos de copyright dos respectivos autores'
      },
      {
        name: 'Restantes dependências de execução',
        license: 'Várias (MIT, ISC, BSD, Apache-2.0, …)',
        notice: 'Conforme o inventário gerado',
        note: 'Lista final por confirmar.'
      }
    ]
  },
  {
    id: 'marks',
    title: 'Marcas',
    paragraphs: [
      'DWG é um formato de ficheiro; esta app não é afiliada à Autodesk nem ao projecto mlightcad.'
    ]
  },
  {
    id: 'privacy',
    title: 'Privacidade',
    paragraphs: ['Sem rede, sem contas, sem telemetria.']
  }
]
