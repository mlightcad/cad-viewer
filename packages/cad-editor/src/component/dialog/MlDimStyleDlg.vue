<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.dimStyleDlg.title')"
    :width="760"
    @open="reload"
  >
    <div class="ml-dim-style">
      <div class="ml-dim-style__current">
        {{ t('dialog.dimStyleDlg.current', { name: currentName || '—' }) }}
      </div>
      <div class="ml-dim-style__body">
        <div class="ml-dim-style__list">
          <div class="ml-dim-style__label">{{ t('dialog.dimStyleDlg.styles') }}</div>
          <el-select v-model="filter" size="small" class="ml-dim-style__filter">
            <el-option value="all" :label="t('dialog.dimStyleDlg.filterAll')" />
            <el-option value="used" :label="t('dialog.dimStyleDlg.filterUsed')" />
          </el-select>
          <ul class="ml-dim-style__names">
            <li
              v-for="name in visibleNames"
              :key="name"
              :class="{ 'is-active': name === selected }"
              @click="selected = name"
            >
              {{ name }}
            </li>
          </ul>
        </div>
        <div class="ml-dim-style__preview">
          <div>
            {{ t('dialog.dimStyleDlg.previewOf', { name: selected || '—' }) }}
          </div>
          <svg viewBox="0 0 220 90" class="ml-dim-style__svg">
            <line x1="30" y1="20" x2="30" y2="70" stroke="currentColor" />
            <line x1="190" y1="20" x2="190" y2="70" stroke="currentColor" />
            <line
              x1="36"
              :y1="previewY"
              x2="184"
              :y2="previewY"
              stroke="var(--el-color-primary)"
            />
            <text
              x="110"
              :y="previewY - 6"
              text-anchor="middle"
              fill="currentColor"
              font-size="12"
            >
              {{ previewText }}
            </text>
          </svg>
          <div class="ml-dim-style__label">
            {{ t('dialog.dimStyleDlg.description') }}
          </div>
          <div class="ml-dim-style__desc">{{ description }}</div>
        </div>
        <div class="ml-dim-style__actions">
          <el-button @click="setCurrent">{{ t('dialog.dimStyleDlg.setCurrent') }}</el-button>
          <el-button @click="beginNew">{{ t('dialog.dimStyleDlg.new') }}</el-button>
          <el-button :disabled="!selected" @click="beginEdit('modify')">
            {{ t('dialog.dimStyleDlg.modify') }}
          </el-button>
          <el-button @click="beginEdit('override')">
            {{ t('dialog.dimStyleDlg.override') }}
          </el-button>
          <el-button @click="compareOpen = true">
            {{ t('dialog.dimStyleDlg.compare') }}
          </el-button>
          <el-button @click="visible = false">{{ t('dialog.dimStyleDlg.close') }}</el-button>
        </div>
      </div>
    </div>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="newOpen"
    v-model:modelValue="newOpen"
    :title="t('dialog.dimStyleDlg.newTitle')"
    :width="420"
    :z-index="2200"
    @ok="confirmNew"
  >
    <el-form label-position="top">
      <el-form-item :label="t('dialog.dimStyleDlg.newName')">
        <el-input v-model="newName" />
      </el-form-item>
      <el-form-item :label="t('dialog.dimStyleDlg.startWith')">
        <el-select v-model="newStart">
          <el-option v-for="name in styleNames" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('dialog.dimStyleDlg.useFor')">
        <el-input :model-value="t('dialog.dimStyleDlg.allDimensions')" disabled />
      </el-form-item>
    </el-form>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="editOpen"
    v-model:modelValue="editOpen"
    :title="editTitle"
    :width="720"
    :z-index="2200"
    @ok="confirmEdit"
  >
    <el-tabs v-model="tab">
      <el-tab-pane
        v-for="group in labeledFieldGroups"
        :key="group.id"
        :label="group.title"
        :name="group.id"
      >
        <div class="ml-dim-style__grid">
          <label v-for="field in group.fields" :key="field" class="ml-dim-style__field">
            <span>{{ field }}</span>
            <el-input v-model="form[field]" size="small" />
          </label>
        </div>
      </el-tab-pane>
    </el-tabs>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="compareOpen"
    v-model:modelValue="compareOpen"
    :title="t('dialog.dimStyleDlg.compareTitle')"
    :width="560"
    :z-index="2200"
  >
    <div class="ml-dim-style__compare">
      <el-select v-model="compareA">
        <el-option v-for="name in styleNames" :key="name" :label="name" :value="name" />
      </el-select>
      <el-select v-model="compareB">
        <el-option v-for="name in styleNames" :key="'b' + name" :label="name" :value="name" />
      </el-select>
    </div>
    <div v-if="differences.length === 0">{{ t('dialog.dimStyleDlg.noDifferences') }}</div>
    <table v-else class="ml-dim-style__table">
      <thead>
        <tr>
          <th>{{ t('dialog.dimStyleDlg.variable') }}</th>
          <th>{{ compareA }}</th>
          <th>{{ compareB }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in differences" :key="row.key">
          <td>{{ row.key }}</td>
          <td>{{ row.a }}</td>
          <td>{{ row.b }}</td>
        </tr>
      </tbody>
    </table>
  </ml-base-dialog>
</template>

<script lang="ts" setup>
import {
  AcApDocManager,
  DIM_STYLE_FIELDS,
  type DimStyleField,
  getDimStyleOverride,
  readDimStyleFields,
  setDimStyleOverride,
  writeDimStyleFields
} from '@mlightcad/cad-simple-viewer'
import { AcDbDatabase, AcDbDimension, AcDbDimStyleTableRecord } from '@mlightcad/data-model'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'

const visible = defineModel<boolean>('modelValue', { default: false })
const { t } = useI18n()

const filter = ref<'all' | 'used'>('all')
const selected = ref('')
const currentName = ref('')
const styleNames = ref<string[]>([])
const usedNames = ref<Set<string>>(new Set())
const form = reactive<Record<string, string>>({})
const tab = ref('lines')
const newOpen = ref(false)
const editOpen = ref(false)
const compareOpen = ref(false)
const editMode = ref<'modify' | 'new' | 'override'>('modify')
const newName = ref('')
const newStart = ref('')
const compareA = ref('')
const compareB = ref('')

const fieldGroups: { id: string; label: string; fields: DimStyleField[] }[] = [
  {
    id: 'lines',
    label: 'dialog.dimStyleDlg.tabs.lines',
    fields: [
      'dimclrd',
      'dimlwd',
      'dimdle',
      'dimdli',
      'dimsd1',
      'dimsd2',
      'dimclre',
      'dimlwe',
      'dimexe',
      'dimexo',
      'dimse1',
      'dimse2'
    ]
  },
  {
    id: 'symbols',
    label: 'dialog.dimStyleDlg.tabs.symbols',
    fields: ['dimblk', 'dimblk1', 'dimblk2', 'dimsah', 'dimldrblk', 'dimasz', 'dimcen', 'dimtsz']
  },
  {
    id: 'text',
    label: 'dialog.dimStyleDlg.tabs.text',
    fields: ['dimtxsty', 'dimclrt', 'dimtxt', 'dimtfac', 'dimgap', 'dimtad', 'dimjust', 'dimtih', 'dimtoh']
  },
  {
    id: 'fit',
    label: 'dialog.dimStyleDlg.tabs.fit',
    fields: ['dimatfit', 'dimtix', 'dimsoxd', 'dimtofl', 'dimscale', 'dimtmove']
  },
  {
    id: 'primary',
    label: 'dialog.dimStyleDlg.tabs.primary',
    fields: [
      'dimlunit',
      'dimdec',
      'dimfrac',
      'dimdsep',
      'dimrnd',
      'dimpost',
      'dimlfac',
      'dimzin',
      'dimaunit',
      'dimadec',
      'dimazin'
    ]
  },
  {
    id: 'alternate',
    label: 'dialog.dimStyleDlg.tabs.alternate',
    fields: ['dimalt', 'dimaltu', 'dimaltd', 'dimaltf', 'dimapost', 'dimaltrnd', 'dimaltz']
  },
  {
    id: 'tolerances',
    label: 'dialog.dimStyleDlg.tabs.tolerances',
    fields: ['dimtol', 'dimlim', 'dimtp', 'dimtm', 'dimtdec', 'dimtfac', 'dimtolj', 'dimtzin']
  }
]

const labeledFieldGroups = computed(() =>
  fieldGroups.map(group => ({
    ...group,
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- tab labels are data-driven keys
    title: t(group.label)
  }))
)

function database(): AcDbDatabase | undefined {
  return AcApDocManager.instance.curDocument?.database
}

function reload() {
  const db = database()
  if (!db) return
  const names: string[] = []
  for (const record of db.tables.dimStyleTable.newIterator()) {
    if (!record.name.startsWith('*')) names.push(record.name)
  }
  styleNames.value = names
  currentName.value = db.dimstyle
  const used = new Set<string>()
  for (const block of db.tables.blockTable.newIterator()) {
    // Skip anonymous dim / xref / hatch blocks; scan model + paper layouts.
    const name = block.name ?? ''
    if (name.startsWith('*') && !/^(\*Model_Space|\*Paper_Space)/i.test(name)) {
      continue
    }
    for (const entity of block.newIterator()) {
      if (entity instanceof AcDbDimension && entity.dimensionStyleName) {
        used.add(entity.dimensionStyleName)
      }
    }
  }
  usedNames.value = used
  selected.value = names.includes(db.dimstyle) ? db.dimstyle : names[0] || ''
  compareA.value = selected.value
  compareB.value = names[0] || ''
}

const visibleNames = computed(() => {
  if (filter.value === 'used') {
    return styleNames.value.filter(name => usedNames.value.has(name))
  }
  return styleNames.value
})

const selectedStyle = computed(() => {
  const db = database()
  if (!db || !selected.value) return undefined
  return db.tables.dimStyleTable.getAt(selected.value)
})

const previewY = computed(() => {
  const tad = Number(selectedStyle.value?.dimtad ?? 0)
  return tad === 1 ? 48 : tad === 2 ? 62 : 55
})

const previewText = computed(() => {
  const txt = Number(selectedStyle.value?.dimtxt ?? 2.5)
  const scale = Number(selectedStyle.value?.dimscale ?? 1) || 1
  return (txt * scale).toFixed(2)
})

const description = computed(() => {
  const style = selectedStyle.value
  if (!style) return ''
  return `DIMTXT=${style.dimtxt}  DIMASZ=${style.dimasz}  DIMSCALE=${style.dimscale}  DIMDLI=${style.dimdli}`
})

const editTitle = computed(() => {
  if (editMode.value === 'override') return t('dialog.dimStyleDlg.overrideTitle')
  if (editMode.value === 'new') {
    return t('dialog.dimStyleDlg.newStyleTitle', { name: newName.value })
  }
  return t('dialog.dimStyleDlg.modifyTitle', { name: selected.value })
})

function loadForm(style: AcDbDimStyleTableRecord | undefined) {
  if (!style) return
  const values = readDimStyleFields(style)
  for (const key of DIM_STYLE_FIELDS) {
    form[key] = values[key] == null ? '' : String(values[key])
  }
}

const STRING_FIELDS = new Set<DimStyleField>([
  'dimpost',
  'dimapost',
  'dimdsep',
  'dimtxsty',
  'dimldrblk',
  'dimblk',
  'dimblk1',
  'dimblk2'
])

function parsedForm(): Partial<Record<DimStyleField, unknown>> {
  const out: Partial<Record<DimStyleField, unknown>> = {}
  for (const key of DIM_STYLE_FIELDS) {
    const raw = form[key]
    if (raw == null) continue
    if (STRING_FIELDS.has(key)) {
      out[key] = raw
      continue
    }
    const numeric = Number(raw)
    out[key] = raw.trim() === '' || Number.isNaN(numeric) ? raw : numeric
  }
  return out
}

function setCurrent() {
  const db = database()
  if (!db || !selected.value) return
  db.dimstyle = selected.value
  setDimStyleOverride(db, null)
  currentName.value = selected.value
}

function beginNew() {
  newName.value = ''
  newStart.value = selected.value || styleNames.value[0] || ''
  newOpen.value = true
}

function confirmNew() {
  const name = newName.value.trim()
  const db = database()
  if (!db || !name) return
  const source = db.tables.dimStyleTable.getAt(newStart.value)
  const record = new AcDbDimStyleTableRecord()
  record.name = name
  if (source) writeDimStyleFields(record, readDimStyleFields(source))
  record.dimtxsty = source?.dimtxsty || record.dimtxsty
  db.tables.dimStyleTable.add(record)
  newOpen.value = false
  reload()
  selected.value = name
  editMode.value = 'new'
  loadForm(record)
  editOpen.value = true
}

function beginEdit(mode: 'modify' | 'override') {
  const db = database()
  if (!db) return
  editMode.value = mode
  const name = mode === 'override' ? db.dimstyle : selected.value
  loadForm(db.tables.dimStyleTable.getAt(name))
  const override = mode === 'override' ? getDimStyleOverride(db) : null
  if (override) {
    for (const [key, value] of Object.entries(override)) {
      form[key] = value == null ? '' : String(value)
    }
  }
  editOpen.value = true
}

function confirmEdit() {
  const db = database()
  if (!db) return
  const values = parsedForm()
  if (editMode.value === 'override') {
    setDimStyleOverride(db, values)
    return
  }
  const name = editMode.value === 'new' ? newName.value.trim() : selected.value
  const record = db.tables.dimStyleTable.getAt(name)
  if (record) writeDimStyleFields(record, values)
  reload()
}

const differences = computed(() => {
  const db = database()
  if (!db || !compareOpen.value) return []
  const a = db.tables.dimStyleTable.getAt(compareA.value)
  const b = db.tables.dimStyleTable.getAt(compareB.value)
  if (!a || !b) return []
  const fa = readDimStyleFields(a)
  const fb = readDimStyleFields(b)
  return DIM_STYLE_FIELDS.filter(key => String(fa[key]) !== String(fb[key])).map(key => ({
    key,
    a: String(fa[key]),
    b: String(fb[key])
  }))
})
</script>

<style scoped>
.ml-dim-style__current {
  margin-bottom: 8px;
}
.ml-dim-style__body {
  display: grid;
  grid-template-columns: 180px 1fr 140px;
  gap: 12px;
  min-height: 320px;
}
.ml-dim-style__names {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  border: 1px solid var(--el-border-color);
  height: 240px;
  overflow: auto;
}
.ml-dim-style__names li {
  padding: 4px 8px;
  cursor: pointer;
}
.ml-dim-style__names li.is-active {
  background: var(--el-color-primary-light-8);
}
.ml-dim-style__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ml-dim-style__svg {
  width: 100%;
  height: 120px;
  background: var(--el-fill-color-light);
}
.ml-dim-style__desc {
  font-size: 12px;
  white-space: pre-wrap;
}
.ml-dim-style__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  max-height: 360px;
  overflow: auto;
}
.ml-dim-style__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.ml-dim-style__compare {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.ml-dim-style__table {
  width: 100%;
  border-collapse: collapse;
}
.ml-dim-style__table th,
.ml-dim-style__table td {
  border-bottom: 1px solid var(--el-border-color);
  text-align: left;
  padding: 4px;
  font-size: 12px;
}
</style>
