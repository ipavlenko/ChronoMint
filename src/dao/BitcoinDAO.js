import BigNumber from 'bignumber.js'
import TransferNoticeModel from 'models/notices/TransferNoticeModel'
import type TxModel from 'models/TxModel'
import type TokenModel from 'models/TokenModel'
import { btcProvider, bccProvider, ltcProvider, btgProvider } from '@chronobank/login/network/BitcoinProvider'
import { DECIMALS } from '@chronobank/login/network/BitcoinEngine'
import { bitcoinAddress } from 'components/forms/validator'

const EVENT_TX = 'tx'
const EVENT_BALANCE = 'balance'

export class BitcoinDAO {
  constructor (name, symbol, bitcoinProvider) {
    this._name = name
    this._symbol = symbol
    this._bitcoinProvider = bitcoinProvider
  }

  getAddressValidator () {
    return bitcoinAddress
  }

  getAccount () {
    return this._bitcoinProvider.getAddress()
  }

  getInitAddress () {
    // BitcoinDAO is not a cntract DAO, bitcoin have no initial address, but it have a token name.
    return `Bitcoin/${this._symbol}`
  }

  getName () {
    return this._name
  }

  getSymbol () {
    return this._symbol
  }

  isApproveRequired () {
    return false
  }

  isInitialized () {
    return this._bitcoinProvider.isInitialized()
  }

  getDecimals () {
    return 8
  }

  async getFeeRate () {
    return this._bitcoinProvider.getFeeRate()
  }

  async getAccountBalances () {
    const { balance0, balance6 } = await this._bitcoinProvider.getAccountBalances()
    return {
      balance: balance0 || balance6,
      balance0: balance0,
      balance6: balance6,
    }
  }

  async transfer (to, amount: BigNumber, token: TokenModel, feeMultiplier: Number = 1) {
    try {
      return await this._bitcoinProvider.transfer(to, amount, feeMultiplier * token.feeRate())
    } catch (e) {
      // eslint-disable-next-line
      console.log('Transfer failed', e)
      throw e
    }
  }

  // eslint-disable-next-line no-unused-vars
  async getTransfer (id, account = this.getAccount()): Promise<Array<TxModel>> {
    // TODO @ipavlenko: Change the purpose of TxModel, add support of Bitcoin transactions
    return []
  }

  async watchTransfer (callback) {
    this._bitcoinProvider.addListener(EVENT_TX, async ({ account, time, tx }) => {
      callback(new TransferNoticeModel({
        account,
        time,
        tx: tx.set('symbol', this.getSymbol()),
      }))
    })
  }

  async watchBalance (callback) {
    this._bitcoinProvider.addListener(EVENT_BALANCE, async ({ account, time, balance }) => {
      callback({
        account,
        time,
        balance: balance.balance0.div(DECIMALS),
        symbol: this.getSymbol(),
      })
    })
  }

  // eslint-disable-next-line no-unused-vars
  async watchApproval (callback) {
    // Ignore
  }

  async stopWatching () {
    // Ignore
  }

  resetFilterCache () {
    // do nothing
  }
}

export const btcDAO = new BitcoinDAO('Bitcoin', 'BTC', btcProvider)
export const bccDAO = new BitcoinDAO('Bitcoin Cash', 'BCC', bccProvider)
export const ltcDAO = new BitcoinDAO('Litecoin', 'LTC', ltcProvider)
export const btgDAO = new BitcoinDAO('Bitcoin Gold ', 'BTG', btgProvider)
