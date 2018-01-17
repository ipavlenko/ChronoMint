import BigNumber from 'bignumber.js'
import EventEmitter from 'events'
import TokenModel from 'models/tokens/TokenModel'
import TxModel from 'models/TxModel'
import Amount from 'models/Amount'
import { nemAddress } from 'models/validator'
import { EVENT_NEW_TRANSFER, EVENT_UPDATE_BALANCE } from 'dao/AbstractTokenDAO'

const BLOCKCHAIN_NEM = 'NEM'

const EVENT_TX = 'tx'
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
    const { confirmed, unconfirmed, vested } = await this._nemProvider.getAccountBalances(this._mosaic)
    return {
      confirmed,
      unconfirmed: unconfirmed ? confirmed.plus(unconfirmed) : confirmed, // Unconfirmed balance is a "delta"-value
      vested,
    }
  }

  async getAccountBalance () {
    const { unconfirmed } = await this.getAccountBalances()
    return unconfirmed
  }

  // eslint-disable-next-line no-unused-vars
  async transfer (from: string, to: string, amount: BigNumber, token: TokenModel, feeMultiplier: Number = 1) {
    try {
      return await this._nemProvider.transfer(from, to, amount)
    } catch (e) {
      // eslint-disable-next-line
      console.log('Transfer failed', e)
      throw e
    }
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

  async watchTransfer () {
    this._nemProvider.addListener(EVENT_TX, async ({ tx }) => {
      this.emit(EVENT_NEW_TRANSFER, new TxModel({
        txHash: tx.txHash,
        // blockHash: tx.blockhash,
        // blockNumber: tx.blockheight,
        blockNumber: null,
        time: tx.time,
        from: tx.from || tx.signer,
        to: tx.to,
        value: new Amount(tx.value, this._symbol),
        fee: new Amount(tx.fee, this._symbol),
        credited: tx.credited,
      }))
    })
  }

  async watchBalance () {
    this._nemProvider.addListener(EVENT_BALANCE, async ({ account, time, balance }) => {
      this.emit(EVENT_UPDATE_BALANCE, {
        account,
        time,
        balance: readBalanceValue(this._symbol, balance, this._mosaic),
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

  fetchToken () {
    if (!this.isInitialized()) {
      // eslint-disable-next-line
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
    }), this)
  }
}

function readBalanceValue (symbol, balance, mosaic = null) {
  if (mosaic) {
    return (mosaic in balance.mosaics)
      ? balance.mosaics[mosaic].confirmed
      : new Amount(0, symbol)
  }
  const b = balance.balance
  return b.unconfirmed != null // nil check
    ? b.confirmed.plus(b.unconfirmed)
    : b.confirmed
}
