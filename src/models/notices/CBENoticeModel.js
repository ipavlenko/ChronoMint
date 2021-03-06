import { I18n } from 'platform/i18n'
import { Icons } from 'platform/icons'
import { abstractNoticeModel } from './AbstractNoticeModel'
import type CBEModel from '../CBEModel'

export default class CBENoticeModel extends abstractNoticeModel({
  cbe: null,
  isRevoked: false,
}) {
  cbe (): CBEModel {
    return this.get('cbe')
  }

  icon () {
    return Icons.get('notices.settings.icon')
  }

  title () {
    return I18n.t('notices.settings.title')
  }

  isRevoked () {
    return this.get('isRevoked')
  }

  message () {
    return this.isRevoked()
      ? I18n.t('notices.cbe.removed', { address: this.cbe().address() })
      : I18n.t('notices.cbe.added', { address: this.cbe().address() })
  }
}
