import contractsManagerDAO from 'dao/ContractsManagerDAO'
import Immutable from 'immutable'
import networkService from '@chronobank/login/network/NetworkService'
import TokenModel from 'models/tokens/TokenModel'
import { DUCK_SESSION } from 'redux/session/actions'
import { accounts, mockStore } from 'specsInit'
import FeeModel from 'models/tokens/FeeModel'
import Amount from 'models/Amount'
import ReissuableModel from 'models/tokens/ReissuableModel'
import OwnerCollection from 'models/wallet/OwnerCollection'
import { DUCK_TOKENS, TOKENS_FETCHED } from 'redux/tokens/actions'
import TokensCollection from 'models/tokens/TokensCollection'
import OwnerModel from 'models/wallet/OwnerModel'
import * as a from './actions'

let store
const mock = new Immutable.Map({
  [ DUCK_SESSION ]: {
    account: accounts[ 0 ],
  },
  [ a.DUCK_ASSETS_MANAGER ]: {
    assets: {},
  },
})

describe('AssetsManager tests', () => {
  store = mockStore(mock)
  networkService
    .connectStore(store)

  afterEach(async (done) => {
    await setTimeout(() => {
      done()
    }, 3000)

  })

  const manager = accounts[ 1 ]
  let createdToken = null
  let createdTokenTx = null
  let addManagerTx = null

  it('should create platform', async (done) => {
    store.clearActions()
    const watchCallback = async () => {
      await store.dispatch(a.getUsersPlatforms())
      const actions = store.getActions()
      expect(actions[ 0 ].type).toEqual(a.GET_USER_PLATFORMS)
      expect(actions[ 0 ].payload.usersPlatforms.length).toEqual(2)
      done()
    }

    const locManagerDAO = await contractsManagerDAO.getPlatformManagerDAO()
    await locManagerDAO.watchCreatePlatform(watchCallback, accounts[ 0 ])
    await store.dispatch(a.createPlatform(new Immutable.Map({
      platformAddress: accounts[ 0 ],
    })))
  })

  it('should create token', async (done) => {
    const actions = store.getActions()
    const platform = actions[ 0 ].payload.usersPlatforms[ 1 ]

    const watchCallback = async (tx) => {
      expect(tx.args.token).toBeDefined()
      createdToken = createdToken.set('address', tx.args.token)
      createdTokenTx = tx
      done()
    }

    const platformTokenExtensionGatewayManagerEmitterDAO = await contractsManagerDAO.getPlatformTokenExtensionGatewayManagerEmitterDAO()
    await platformTokenExtensionGatewayManagerEmitterDAO.watchAssetCreate(watchCallback, accounts[ 0 ])

    createdToken = new TokenModel({
      decimals: 3,
      name: 'QQQ',
      symbol: 'QQQ',
      balance: new Amount(10000, 'QQQ', true),
      icon: '',
      fee: new FeeModel({
        fee: 1,
        withFee: true,
        feeAddress: platform.address,
      }),
      platform: platform,
      totalSupply: new Amount(10000, 'QQQ', true),
      isReissuable: new ReissuableModel({ value: true }),
    })

    store.dispatch(a.createAsset(createdToken))
  })

  it('should get users Platforms', async (done) => {
    await store.dispatch(a.getUsersPlatforms())
    const actions = store.getActions()
    const action = actions[ actions.length - 1 ]
    expect(action.type).toEqual(a.GET_USER_PLATFORMS)
    expect(action.payload.usersPlatforms.length).toEqual(2)
    done()
  })

  it('should get Platforms', async (done) => {
    await store.dispatch(a.getPlatforms())
    const actions = store.getActions()
    const action = actions[ actions.length - 1 ]
    expect(action.type).toEqual(a.GET_PLATFORMS)
    expect(action.payload.platforms.length).toEqual(2)
    done()
  })

  it('should get AssetsManager data', async (done) => {
    await store.dispatch(a.getAssetsManagerData())
    const actions = store.getActions()
    const action = actions[ actions.length - 1 ]
    expect(action.type).toEqual(a.GET_ASSETS_MANAGER_COUNTS)
    expect(action.payload.platforms.length).toEqual(2)
    expect(Object.keys(action.payload.assets).length).toEqual(2)
    expect(action.payload.managers.length).toEqual(2)
    done()
  })

  it('should get managers for asset symbol', async (done) => {
    const result: OwnerCollection = await a.getManagersForAssetSymbol(createdToken.symbol())
    createdToken = createdToken.managersList(result)
    expect(result.size()).toEqual(1)
    done()
  })

  it('should add manager', async (done) => {
    const watchCallback = async (tx) => {
      expect(tx.args.to).toEqual(manager)
      addManagerTx = tx
      done()
    }

    const chronoBankPlatformDAO = await contractsManagerDAO.getChronoBankPlatformDAO()
    await chronoBankPlatformDAO.watchManagers(watchCallback)
    await store.dispatch(a.addManager(createdToken, manager))
  })

  it('should remove manager', async (done) => {
    const txHash = await store.dispatch(a.removeManager(createdToken, manager))
    expect(txHash).toBeDefined()
    done()
  })

  it('should reissue Asset', async (done) => {
    const watchCallback = async (symbol) => {
      expect(symbol).toEqual(createdToken.symbol())
    }

    await store.dispatch(a.reissueAsset(createdToken, 100))
    const chronoBankPlatformDAO = await contractsManagerDAO.getChronoBankPlatformDAO()
    await chronoBankPlatformDAO.watchIssue(watchCallback)
    done()
  })

  it('should revoke Asset', async (done) => {
    const watchCallback = async (symbol) => {
      expect(symbol).toEqual(createdToken.symbol())
    }

    await store.dispatch(a.revokeAsset(createdToken, 100))
    const chronoBankPlatformDAO = await contractsManagerDAO.getChronoBankPlatformDAO()
    await chronoBankPlatformDAO.watchRevoke(watchCallback)
    done()
  })

  it('should check is reissuable token', async (done) => {
    const result: ReissuableModel = await a.checkIsReissuable(createdToken, { platform: createdToken.platform().address })
    expect(result).toBeTruthy()
    done()
  })

  it('should get transactions', async (done) => {
    await store.dispatch(a.getTransactions())
    const actions = store.getActions()
    const preLastAction = actions[ actions.length - 2 ]
    const lastAction = actions[ actions.length - 1 ]
    expect(preLastAction.type).toEqual(a.GET_TRANSACTIONS_START)
    expect(lastAction.type).toEqual(a.GET_TRANSACTIONS_DONE)
    expect(lastAction.payload.transactionsList.length).toEqual(10)
    done()
  })

  it('should set transaction', async (done) => {
    await store.dispatch(a.setTx(createdTokenTx))
    const actions = store.getActions()
    const lastAction = actions[ actions.length - 1 ]
    expect(lastAction.type).toEqual(a.GET_TRANSACTIONS_DONE)
    expect(lastAction.payload.transactionsList.length).toEqual(1)
    done()
  })

  it('should set managers', async (done) => {
    const testsStore = mockStore(new Immutable.Map({
      [ DUCK_SESSION ]: {
        account: accounts[ 0 ],
      },
      [ a.DUCK_ASSETS_MANAGER ]: {
        selectedToken: '',
      },
      [ DUCK_TOKENS ]: new TokensCollection().add(createdToken),
    }))

    await testsStore.dispatch(a.setManagers(addManagerTx))
    const newActions = testsStore.getActions()
    const lastAction = newActions[ newActions.length - 1 ]
    expect(lastAction.type).toEqual(TOKENS_FETCHED)
    expect(lastAction.token.managersList()).toEqual(createdToken.managersList().add(new OwnerModel({ address: addManagerTx.args.to })))
    done()
  })

  it('should get fee', async (done) => {
    const result: FeeModel = await a.getFee(createdToken)
    expect(result).toEqual(new FeeModel({
      fee: 1,
      withFee: true,
      feeAddress: createdToken.platform().address,
    }).isFetched(true))
    done()
  })

  it('should init watchers', async (done) => {
    const testsStore = mockStore(new Immutable.Map({
      [ DUCK_SESSION ]: {
        account: accounts[ 0 ],
      },
    }))
    const result = await testsStore.dispatch(a.watchInitTokens())
    const actions = testsStore.getActions()
    expect(actions[ 0 ].type).toEqual(a.GET_ASSETS_MANAGER_COUNTS_START)
    expect(result.length).toEqual(4)
    done()
  })

  it('check select token', async (done) => {
    const testsStore = mockStore(new Immutable.Map({
      [ DUCK_SESSION ]: {
        account: accounts[ 0 ],
      },
      [ a.DUCK_ASSETS_MANAGER ]: {
        selectedToken: '',
        assets: {
          [ createdToken.address() ]: {
            platform: createdToken.platform().address,
          },
        },
      },
      [ DUCK_TOKENS ]: new TokensCollection().add(createdToken),
    }))
    await testsStore.dispatch(a.selectToken(createdToken))
    const actions = testsStore.getActions()
    expect(actions[ 0 ].type).toEqual(a.SELECT_TOKEN)
    expect(actions[ 0 ].payload).toEqual({ symbol: 'QQQ' })

    expect(actions[ 1 ].type).toEqual(TOKENS_FETCHED)
    expect(actions[ 1 ].token).toEqual(createdToken
      .managersList(new OwnerCollection().isFetching(true))
      .fee(createdToken.fee().isFetching(true))
      .isReissuable(createdToken.isReissuable().isFetching(true)))

    expect(actions[ 2 ].type).toEqual(TOKENS_FETCHED)
    expect(actions[ 2 ].token).toEqual(createdToken
      .managersList(createdToken.managersList())
      .fee(new FeeModel({
        fee: 1,
        withFee: true,
        feeAddress: createdToken.platform().address,
      }).isFetched(true))
      .isReissuable(
        new ReissuableModel({ value: true })
          .isFetched(true)))

    done()
  })
})
