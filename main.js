/**
 * Esurfing AutoLogin (node)
 * author: MeetinaXD
 * Last Edit: Apri 8, 2021.
 *
 * 👉 my blog: https://meetinaxd.ltiex.com
 *
 * ❤️ Thanks to:
 * 📖 [reference] https://github.com/Coande/LandLeg_Java
 *
 * 😃 You have unlimited right to modify this program.
 * Enjoy !
 */

const axios = require("axios")
const colors = require("colors");
const utils = require("./utils")

const configure = new utils.Config("./config.json")
let taskid = null

const argv = require('yargs')
  .option('d', {
    alias : 'disconnect',
    demand: false,
    default: 'false',
    describe: 'is disconnect first.',
    type: 'boolean'
  })
  .option('u', {
    alias : 'username',
    demand: false,
    default: '',
    describe: 'username, can specify in env',
    type: 'string'
  })
  .option('p', {
    alias : 'password',
    demand: false,
    default: '',
    describe: 'password, can specify in env',
    type: 'string'
  })
  .argv

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
 * @returns Boolean, login result
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
  const d = await axios.post(url, formData)
  const code = d.data.rescode

  // login success
  if (code && ~~code === 0){
    configure.get().record = {
      username,
      mac: formData.mac,
      nasip: formData.nasip,
      wlanip: formData.clientip
    }
    configure.write()
    return true
  }
  return false
}

/**
 * async logout
 * do logout
 * @returns Boolean, logout result
 *          (0: ok, 1: offine (needs relogin), 2: auth failed.)
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
 * return Number, actice status
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

async function doLogin(username, password){
  const auto = true

  // if don't use automatic mode, please configure the value below
  let config = {
    mac: utils.getNetworkInfo().mac.toUpperCase().split(":").join("-"),
    nasip: "",
    clientip: ""
  }

  if (auto){
    // get config automatically
    const redirectUrl = await utils.getRedirectUrl('http://www.baidu.com')
    if (!redirectUrl){
      if (!configure.get().record){
        console.log(colors.red('online, but no profile found! please disconnect first.'))
        throw new Error("online but no connection.")
      }

      // online
      return true
    }

    // offline
    config = {
      ...config,
      nasip: redirectUrl.nasip,
      clientip: redirectUrl.wlanip
    }
  }

  const s = await login(username, password, config)
  if (!s){
    throw new Error("cannot login")
  }
  console.log(colors.bgGreen('login successfully'))
}

function setTask(sec){
  taskid && clearInterval(taskid)
  taskid = setInterval(async function(){
    const s = await active()
    if (!s){
      taskid && clearInterval(taskid)
      // reconnect
      init()
      return;
    }
    console.log(colors.gray(new Date().format("HH:MM:SS")) + " connection activated.")
  }, sec * 1000 * 60)
  console.log("keep connection will run " + colors.green(`every ${sec} mins.`))
}

async function init(){
  let u = argv.u.trim().length?argv.u:null
  let p = argv.p.trim().length?argv.p:null
  if (u === "" || p === ""){
    u = process.env['ESU_USERNAME']
    p = process.env['ESU_PASSWORD']
  }

  if (!u || !p){
    console.log(colors.red("specify username and password, use '-h' to see usage"));
    return ;
  }

  const s = await doLogin(u, p)
  if (!s)
  setTask(1)
  // await utils.sleep(10000)
  // await active()
  // await utils.sleep(1000)
  // const d = await logout()
  // console.log('logout >>> ', d);
}

+async function(){
  if (argv.d){
    await logout()
  }
  init()
}()

// console.log('ip >>> ', utils.getNetworkInfo());
