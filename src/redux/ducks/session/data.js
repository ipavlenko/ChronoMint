import {push, replace} from 'react-router-redux';
import AppDAO from '../../../dao/AppDAO';
import UserDAO from '../../../dao/UserDAO';
import LocDAO from '../../../dao/LocDAO';
import UserModel from '../../../models/UserModel';
import {cbeWatcher} from '../watcher';
import AbstractContractDAO from '../../../dao/AbstractContractDAO';
import {
    SESSION_CREATE_START,
    SESSION_CREATE_SUCCESS,
    SESSION_PROFILE,
    SESSION_DESTROY
} from './constants';

export const ROLE_CBE = 'cbe';
export const ROLE_LOC = 'loc';
export const ROLE_USER = 'user';

const initialState = {
    account: null,
    profile: new UserModel(), /** @see UserModel **/
    type: null // TODO Rename to role
};

const reducer = (state = initialState, action) => {
    switch (action.type) {
        case SESSION_CREATE_SUCCESS:
            const {account, type} = action.payload;
            localStorage.setItem('chronoBankAccount', account);
            return {
                ...state,
                account,
                type
            };
        case SESSION_PROFILE:
            return {
                ...state,
                profile: action.profile
            };
        case SESSION_DESTROY:
            localStorage.clear();
            localStorage.setItem('next', action.next);
            AbstractContractDAO.stopWatching();

            // TODO When all contracts event watchers will be initialized through the...
            /** @see AbstractContractDAO._watch TODO ...remove line below */
            window.location.reload(); // to stop watch all events

            return initialState;
        default:
            return state;
    }
};

const createSessionStart = () => ({type: SESSION_CREATE_START});
const createSessionSuccess = (payload) => ({type: SESSION_CREATE_SUCCESS, payload});
const loadUserProfile = (profile: UserModel) => ({type: SESSION_PROFILE, profile});
const destroySession = (next) => ({type: SESSION_DESTROY, next});

const checkLOCControllers = (index, LOCCount, account) => {
    if (index >= LOCCount) {
        return Promise.resolve(false);
    }
    return AppDAO.getLOCbyID(index).then(r => {
        const loc = new LocDAO(r);
        return loc.isController(account).then(r => {
            if (r) {
                return true;
            } else {
                return checkLOCControllers(index + 1, LOCCount, account);
            }
        });
    });
};

const login = (account, checkRole: boolean = false) => (dispatch) => {
    dispatch(createSessionStart());
    return new Promise((resolve, reject) => {
        UserDAO.isCBE(account).then(cbe => {
            if (cbe) {
                resolve(ROLE_CBE);
            } else {
                AppDAO.getLOCCount(account).then(r => {
                    checkLOCControllers(0, r.toNumber(), account).then(r => {
                        if (r) {
                            resolve(ROLE_LOC);
                        } else {
                            const accounts = AppDAO.web3.eth.accounts;
                            if (accounts.includes(account)) {
                                resolve(ROLE_USER);
                            } else {
                                resolve(null);
                            }
                        }
                    });
                });
            }
        }).catch(error => reject(error));
    }).then(role => {
        UserDAO.getMemberProfile(account).then(profile => {
            dispatch(loadUserProfile(profile));
            dispatch(createSessionSuccess({account, type: role}));

            if (role === ROLE_CBE) {
                dispatch(cbeWatcher(account));
            }

            if (role === null) {
                dispatch(push('/login'));
            } else if (!checkRole) {
                const next = localStorage.getItem('next');
                localStorage.removeItem('next');
                dispatch(replace(next ? next : ('/' + (role === ROLE_USER ? 'wallet' : ''))));
            } else if (role === ROLE_USER) {
                dispatch(push('/wallet')); // TODO User should not always start from /wallet
            }
        });
    }, error => {
        console.error(error);
    });
};

const updateUserProfile = (profile: UserModel, account) => (dispatch) => {
    UserDAO.setMemberProfile(account, profile).then(() => {
        dispatch(loadUserProfile(profile));
    });
};

const logout = () => (dispatch) => {
    Promise.resolve(dispatch(destroySession(`${location.pathname}${location.search}`)))
        .then(() => dispatch(push('/login')));
};

export {
    logout,
    login,
    updateUserProfile,
    loadUserProfile
}

export default reducer;