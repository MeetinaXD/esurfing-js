const utils = require("./utils")
const axios = require("axios")

const configure = new utils.Config("./config.json")

let portal = {
  address: null
}

const codesName = [
  'networkStatus_OK',
  'networkStatus_offline',
  'networkStatus_portal',
  'networkStatus_disconnect',
  'networkStatus_unknownEnvironment'
]
const codes = {}

codesName.forEach(name =>{
  !codes[name] && (codes[name] = Symbol(name))
})

/**
 * async getVerifyCode
 * @param {*} formData
 *            (require: username, clientip, nasip, mac, iswifi, timestamp, authKey)
 * @returns String verifyCode
 */
 async function getVerifyCode(formData){
  const url = "http://enet.10000.gd.cn:10001/client/challenge"
  const d = await axios.post(url, formData)
  return d.data.challenge
}

/**
 * async login
 * do login with user info
 * @param {*} username (student id)
 * @param {*} password (the end 8 numbers of id)
 * @param {*} config (object, nasip, clientip and mac is required)
 * @returns Object, login result
 */
async function login(username, password, config = null){
  let formData = {
    username,
    password,
    iswifi: "4060",
    clientip: null, //wlanip
    nasip: null, //nasip
    authenticator: null,
    mac: null,
    verificationcode: "",
    timestamp: 0
  }
  if (!config){
    throw new Error("config not specify")
  }
  formData = {
    ...formData,
    ...config
  }

  formData.timestamp = new Date().getTime() + ''
  // no need to add secret
  let { clientip, nasip, mac, timestamp } = formData
  formData.authenticator = utils.getHash([clientip, nasip, mac, timestamp])

  const verifyCode = await getVerifyCode(formData)

  // update and calc
  formData.timestamp = new Date().getTime() + ''
  timestamp = formData.timestamp
  formData.authenticator = utils.getHash([clientip, nasip, mac, timestamp, verifyCode])

  const url = "http://enet.10000.gd.cn:10001/client/login"
  const d = (await axios.post(url, formData)).data

  const code = d.rescode

  // login success
  if (code && ~~code === 0){
    configure.get().record = {
      username,
      mac: formData.mac,
      nasip: formData.nasip,
      wlanip: formData.clientip
    }
    configure.write()
  }
  return d
}

/**
 * async logout
 * do logout
 * @returns Boolean, logout result
 */
async function logout(){
  const { wlanip, nasip, mac } = configure.get().record
  if (!(wlanip && nasip && mac)){
    console.log('no record found, cannot disconnect');
    return;
  }
  const url = "http://enet.10000.gd.cn:10001/client/logout"
  let formData = {
    clientip: wlanip, //wlanip
    nasip: nasip, //nasip
    authenticator: null,
    mac: mac,
    timestamp: new Date().getTime()
  }
  const timestamp = formData.timestamp
  formData.authenticator = utils.getHash([wlanip, nasip, mac, timestamp])
  const code = (await axios.post(url, formData)).data.rescode
  return (code && ~~code === 0)
}

/**
 * async active
 * keep connection, call automatically by interval
 * @returns Number, actice status
 *          (0: ok, 1: offine (needs relogin), 2: auth failed.)
 */
async function active(){
  const url = "http://enet.10000.gd.cn:8001/hbservice/client/active"
  const t = new Date().getTime()
  const { username, wlanip, nasip, mac } = configure.get().record
  const params = {
    username,
    clientip: wlanip,
    nasip,
    mac,
    timestamp: t,
    authenticator: utils.getHash([wlanip, nasip, mac, t])
  }
  const code = (await axios.get(url, { params })).data.rescode

  // 0 -- online
  // 1 -- offline
  // 2 -- auth failed
  return code
}

/**
 * async networkCheck
 * check network environment, return the network status
 * @returns Symbol, status
 *          (0: ok, 1: offine (needs relogin), 2: portal needed., 3: network disconnect)
 */
async function networkCheck(){
  /**
   * 1.???????????????????????????????????????
   * 2.?????????????????????????????????????????????????????????
   * 3.?????????????????????????????????; ????????????2.2.2.2????????????
   * 4.???2.2.2.2????????????????????????
   * 5.??????????????????????????????????????????
   * 6.?????????????????????10????????????????????????
   */
  /**
   * ??????????????????
   * 1.??????2.2.2.2
   * 2.????????????????????????????????????
   */
  let ret = await utils.getNetworkInfo()
  // ??????????????????
  if (!ret){
    return codes.networkStatus_disconnect
  }

  // ????????????????????????
  ret = (await axios.get("http://www.baidu.com", { retry: 3, timeout: 10000 })).data
  if (ret.indexOf("????????????") !== -1){
    return codes.networkStatus_OK
  }

  let redirect = await utils.getRedirectUrl("http://2.2.2.2")
  // console.log('re >>> ', redirect);

  // ????????????????????? ?????????????????????
  if (!redirect){
    return codes.networkStatus_unknownEnvironment
  }

  // ???????????????portal???????????????portal??????
  if (redirect.host.indexOf("portal") !== -1){
    // ?????????????????????????????????
    redirect = await utils.getRedirectUrl(redirect.host)
    if (!redirect){
      throw new Error("unknown error")
    }
    if (redirect && redirect.host.indexOf("login") !== -1){
      portal.address = redirect.host
      return codes.networkStatus_portal
    }
    // ???????????????????????????login??????
    return codes.networkStatus_unknownEnvironment
  }

  // ???????????????gd10000????????????????????????
  if (redirect.host.indexOf("enet.10000.gd") !== -1){
    return codes.networkStatus_offline
  }

  // ??????????????????????????????
  return codes.networkStatus_unknownEnvironment
}

/**
 * async portalLogin
 * do portal login, may cause a short network disconnecion
 * @param {*} username
 * @param {*} password
 * @returns Object, login result
 */
async function portalLogin(username, password){
  if (!portal.address){
    throw new Error("no portal address found!")
  }
  const url = `http://${portal.address}:8080/portal/pws?t=li&ifEmailAuth=false`
  const formData = utils.constructLoginForm(username, password, portal.address)
  let ret = (await axios.post(url, formData, { retry: 3 })).data
  const data = utils.responseToJSON(ret)
  return data
}


async function portalLogout(username, password){

}

module.exports = {
  login,
  logout,
  active,
  portalLogin,
  portalLogout,
  networkCheck,

  codes
}