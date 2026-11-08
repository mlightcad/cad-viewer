import enDialog from '../en/dialog'

export default {
  ...enDialog,
  classicGroupDlg: {
    ...enDialog.classicGroupDlg,
    title: '객체 그룹',
    groupName: '그룹 이름',
    selectable: '선택 가능',
    identification: '그룹 식별',
    description: '설명',
    findName: '이름 찾기 <',
    highlight: '강조 <',
    includeUnnamed: '이름 없는 항목 포함',
    createGroup: '그룹 만들기',
    new: '새로 만들기 <',
    unnamed: '이름 없음',
    changeGroup: '그룹 변경',
    remove: '제거 <',
    add: '추가 <',
    rename: '이름 바꾸기',
    reOrder: '재정렬...',
    descriptionBtn: '설명',
    explode: '분해',
    selectableBtn: '선택 가능',
    yes: '예',
    no: '아니요',
    pickObject: '그룹을 찾을 객체 선택',
    notInGroup: '객체가 그룹의 구성원이 아닙니다',
    selectObjects: '새 그룹의 객체 선택',
    selectToAdd: '추가할 객체 선택',
    selectToRemove: '제거할 객체 선택',
    clearSelectableFirst:
      '객체를 제거하기 전에 그룹의 선택 가능 옵션을 끄십시오',
    invalidName: '잘못된 그룹 이름입니다',
    nameExists: '그룹 이름이 이미 있습니다',
    created: '그룹 {name}을(를) 만들었습니다'
  },
  orderGroupDlg: {
    ...enDialog.orderGroupDlg,
    title: '그룹 순서',
    groupName: '그룹 이름',
    description: '설명',
    removeFrom: '위치에서 제거 (0부터)',
    newPosition: '객체의 새 위치 번호 입력',
    numberOfObjects: '객체 수',
    reOrder: '재정렬',
    reverseOrder: '순서 반전',
    highlight: '강조'
  }
}
