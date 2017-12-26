import BigNumber from 'bignumber.js'
import { EVENT_UPDATE_BALANCE } from 'dao/AbstractTokenDAO'
import EventEmitter from 'events'
import TokenModel from 'models/tokens/TokenModel'
import type TxModel from 'models/TxModel'
import { nemAddress } from 'models/validator'

const BLOCKCHAIN_NEM = 'NEM'

// const EVENT_TX = 'tx'
const EVENT_BALANCE = 'balance'

export const EVENT_NEM_LIKE_TOKEN_CREATED = 'nemLikeTokenCreated'
export const EVENT_NEM_LIKE_TOKEN_FAILED = 'nemLikeTokenFailed'

export default class NemDAO extends EventEmitter {

  constructor (name, symbol, nemProvider, mosaic, decimals) {
    super()
    this._name = name
    this._symbol = symbol.toUpperCase()
    this._mosaic = mosaic
    this._decimals = decimals
    this._nemProvider = nemProvider

    // TODO @ipavlenko: Sorry, will remove this soon
    this.isTransferLocked = true
  }

  getAddressValidator () {
    return nemAddress
  }

  getAccount () {
    return this._nemProvider.getAddress()
  }

  getInitAddress () {
    // NemDAO is not a cntract DAO, NEM have no initial address, but it have a token name.
    return `Nem/${this._mosaic === null ? '' : this._mosaic}/${this._symbol}`
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
    return this._nemProvider.isInitialized()
  }

  hasBalancesStream () {
    // Balance should not be fetched after transfer notification,
    // it will be updated from the balances event stream
    return true
  }

  getDecimals () {
    return this._decimals
  }

  async getFeeRate () {
    return this._nemProvider.getFeeRate()
  }

  async getAccountBalances () {
    // TODO @ipavlenko: Implement vestedBalance & unvestedBalance
    const { balance /*, vestedBalance, unvestedBalance */ } = await this._nemProvider.getAccountBalances(this._mosaic)
    return {
      balance,
    }
  }

  async getAccountBalance () {
    const balances = await this.getAccountBalances()
    return balances.balance
  }

  // eslint-disable-next-line no-unused-vars
  async transfer (from: string, to: string, amount: BigNumber, token: TokenModel, feeMultiplier: Number = 1) {
    // TODO @ipavlenko: Change the purpose of TxModel, add support of Nem transactions
  }

  // eslint-disable-next-line no-unused-vars
  async getTransfer (txid, account): Promise<Array<TxModel>> {
    // TODO @ipavlenko: Change the purpose of TxModel, add support of Nem transactions
    return []
  }

  watch (/*account*/): Promise {
    return Promise.all([
      this.watchTransfer(),
      this.watchBalance(),
    ])
  }

  // eslint-disable-next-line no-unused-vars
  async watchTransfer () {
    // TODO @ipavlenko: Implement for XEM
    // this._nemProvider.addListener(EVENT_TX, async ({ account, time, tx }) => {
    //   callback(new TransferNoticeModel({
    //     account,
    //     time,
    //     tx: tx.set('symbol', this.getSymbol()),
    //   }))
    // })
  }

  async watchBalance () {
    this._nemProvider.addListener(EVENT_BALANCE, async ({ /* account, time,*/ balance }) => {
      this.emit(EVENT_UPDATE_BALANCE, this._mosaic
        ? balance.balance.value
        : balance.mosaics[ this._mosaic ].value,
      )
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

  fetchToken () {
    if (!this.isInitialized()) {
      console.warn(`${this._name} support is not available`)
      this.emit(EVENT_NEM_LIKE_TOKEN_FAILED)
      return
    }

    this.emit(EVENT_NEM_LIKE_TOKEN_CREATED, new TokenModel({
      name: this._name,
      decimals: this._decimals,
      symbol: this._symbol,
      isOptional: false,
      isFetched: true,
      blockchain: BLOCKCHAIN_NEM,
      isLocked: this.isTransferLocked,
    }), this)
  }
}