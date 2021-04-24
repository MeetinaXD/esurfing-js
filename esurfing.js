const utils = require("./utils")
const axios = require("axios")

let portal = {
  address: null
}

const codesName = [
  'networkStatus_OK',
  'networkStatus_offline',
  'networkStatus_portal',
  'networkStatus_disconnect'
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
   * 1.获取网卡地址，判断是否连接
   * 2.访问百度，判断是否正常连接（超时限制）
   * 3.若跳转，则进行普通登录; 否则访问2.2.2.2获取跳转
   * 4.若2.2.2.2无跳转，程序结束
   * 5.访问获得跳转的地址，再次跳转
   * 6.进行登录，等待10秒，进行正常登录
   */
  /**
   * 新检测流程：
   * 1.访问2.2.2.2
   * 2.根据重定向的地址确定状态
   */
  let ret = await utils.getNetworkInfo()
  if (!ret){
    return codes.networkStatus_disconnect
  }
  let redirect = await utils.getRedirectUrl("http://www.baidu.com")
  ret = (await axios.get("http://www.baidu.com", { retry: 3, timeout: 3000 })).data
  if (ret.indexOf("百度一下") !== -1){
    return codes.networkStatus_OK
  }

  if (ret.indexOf("Portal") !== -1){
    // need portal
    redirect = await utils.getRedirectUrl("http://2.2.2.2")

    if (!redirect){
      throw new Error("unknown error")
    }
    portal.address = redirect.host
    return codes.networkStatus_portal
  }
  if (redirect && redirect.host.indexOf("enet.10000.gd") !== -1){
    return codes.networkStatus_offline
  }
  redirect = await utils.getRedirectUrl("http://2.2.2.2")
  if (!redirect){
    throw new Error("unknown error")
  }
  portal.address = redirect.host
  redirect = await utils.getRedirectUrl(redirect.host)
  if (!redirect){
    throw new Error("unknown error")
  }
  if (ret && ret.host.indexOf("login") !== -1){
    return codes.networkStatus_portal
  }
  return codes.networkStatus_OK
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