import { Field, formPropTypes, formValueSelector, reduxForm } from 'redux-form/immutable'
import { I18n } from 'platform/i18n/index'
import { FlatButton, RaisedButton } from 'material-ui'
import { Translate } from 'react-redux-i18n'
import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { TextField } from 'redux-form-material-ui'
import { connect } from 'react-redux'
import { ACCEPT_IMAGES } from 'models/FileSelect/FileExtension'
import { addToken, formTokenLoadMetaData, getDataFromContract, modifyToken } from 'redux/settings/erc20/tokens/actions'
import { modalsClose } from 'redux/modals/actions'
import FileSelect from 'components/common/FileSelect/FileSelect'
import ModalDialog from 'components/dialogs/ModalDialog'
import TokenModel from 'models/tokens/TokenModel'
import validate from './validate'

import '../FormDialog.scss'

export const FORM_CBE_TOKEN = 'CBETokenDialog'

function mapStateToProps (state) {
  const selector = formValueSelector(FORM_CBE_TOKEN)
  return {
    isFetching: state.get('settingsERC20Tokens').formFetching,
    address: selector(state, 'address'),
    symbolFromContract: selector(state, 'symbolFromContract'),
    decimalsFromContract: selector(state, 'decimalsFromContract'),
  }
}

function mapDispatchToProps (dispatch, ownProps) {
  return {
    onClose: () => dispatch(modalsClose()),
    getDataFromContract: (e, address) => dispatch(getDataFromContract(new TokenModel({ address }))),
    onSubmit: (values) => {
      dispatch(modalsClose())
      if (ownProps.isModify) {
        dispatch(modifyToken(ownProps.initialValues, values))
      } else {
        dispatch(addToken(values))
      }
    },
  }
}

@connect(mapStateToProps, mapDispatchToProps)
@reduxForm({
  form: FORM_CBE_TOKEN,
  validate,
  asyncValidate: (token, dispatch) => formTokenLoadMetaData(token, dispatch, FORM_CBE_TOKEN),
  asyncBlurFields: [ 'address', 'symbol', 'decimals' ],
})
export default class CBETokenDialog extends PureComponent {
  static propTypes = {
    isModify: PropTypes.bool,
    isFetching: PropTypes.bool,
    handleAddressChange: PropTypes.func,
    onClose: PropTypes.func,
    address: PropTypes.string,
    getDataFromContract: PropTypes.func,
    ...formPropTypes,
  }

  render () {
    return (
      <ModalDialog
        onClose={() => this.props.onClose()}
      >
        <form styleName='root' onSubmit={this.props.handleSubmit}>
          <div styleName='header'>
            <h3
              styleName='title'
            >
              {<Translate value={this.props.isModify ? 'settings.erc20.tokens.modify' : 'settings.erc20.tokens.add'} />}
            </h3>
          </div>
          <div styleName='content'>
            <Field
              component={TextField}
              name='address'
              fullWidth
              disabled={this.props.isFetching}
              floatingLabelText={<Translate value={'common.ethAddress'} />}
              onBlur={this.props.getDataFromContract}
            />
            {
              this.props.address &&
              <div>
                <Field
                  component={TextField}
                  name='name'
                  fullWidth
                  disabled={this.props.isFetching}
                  floatingLabelText={<Translate value={'common.name'} />}
                />
                <Field
                  component={TextField}
                  name='symbol'
                  fullWidth
                  disabled={this.props.isFetching}
                  floatingLabelText={<Translate value={'settings.erc20.tokens.symbol'} />}
                />
                <Field
                  component={TextField}
                  name='decimals'
                  fullWidth
                  disabled={this.props.isFetching}
                  floatingLabelText={<Translate value={'settings.erc20.tokens.decimals'} />}
                />
                <Field
                  component={TextField}
                  name='url'
                  fullWidth
                  floatingLabelText={<Translate value={'settings.erc20.tokens.url'} />}
                />
                <Field
                  component={FileSelect}
                  name='icon'
                  value={this.props.initialValues.icon()}
                  fullWidth
                  label={I18n.t('wallet.selectTokenIcon')}
                  accept={ACCEPT_IMAGES}
                />
              </div>
            }
          </div>
          <div styleName='footer'>
            <FlatButton styleName='action' label='Cancel' onTouchTap={() => this.props.onClose()} />
            <RaisedButton
              styleName='action'
              label={<Translate
                value={this.props.isModify ? 'settings.erc20.tokens.modify' : 'settings.erc20.tokens.add'} />}
              primary
              type='submit'
            />
          </div>
        </form>
      </ModalDialog>
    )
  }
}
