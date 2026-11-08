import enCommand from '../en/command'

export default {
  ...enCommand,
  ACAD: {
    ...enCommand.ACAD,
    classicgroup: {
      description:
        'オブジェクトグループダイアログを開き、グループを作成および管理します'
    }
  }
}
