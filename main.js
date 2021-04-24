/**
 * es AutoLogin (nodejs)
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
const es = require('./esurfing')

const configure = new utils.Config("./config.json")
let taskid = null
let counter = 0

const argv = require('yargs')
  .option('d', {
    alias : 'disconnect',
    demand: false,
    default: 'false',
    describe: 'is disconnect first.',
    type: 'boolean'
  })
  .option('t', {
    alias : 'time',
    demand: false,
    default: '1',
    describe: 'activate time, default is 1 (min)',
    type: 'number'
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

async function doLogin(username, password){
  const auto = true

  // if don't use automatic mode, please configure the value below
  let config = {
    mac: utils.getNetworkInfo().mac.toUpperCase().split(":").join("-"),
    nasip: "119.146.175.80",
    clientip: "100.2.48.127"
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

  const s = await es.login(username, password, config)

  if (~~s.rescode !== 0){
    // throw new Error(s.resinfo)
    console.log(colors.bgRed(s.resinfo))
    return false
  }
  console.log(colors.bgGreen('login successfully'))
  return true
}

function setTask(sec){
  taskid && clearInterval(taskid)
  taskid = setInterval(async function(){
    const s = await es.active()
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
  let t = argv.t?~~argv.t:null

  if (u === "" || p === "" || !t){
    u = process.env['ESU_USERNAME']
    p = process.env['ESU_PASSWORD']
    t = process.env['ESU_INTERVAL']
  }

  if (!u || !p || !t){
    console.log(colors.red("configure undefined, use '-h' to see usage"))
    return ;
  }
  if (counter == 10){
    console.log(colors.bgRed("retry times over the limit, program terminated."))
    return ;
  }
  if (counter !== 0){
    console.log(counter, colors.red("connect lost, retrying..."))
    await utils.sleep(10000)
  }
  const s = await doLogin(u, p)
  // console.log('a >>> ', s);

  if (!s){
    counter++
    init()
    return ;
  }
  counter = 0
  setTask(~~t)
  // const d = await logout()
}

+async function(){
  // check network environment
  let a = await es.networkCheck();
  if (a === es.codes.networkStatus_portal){
    a = (await es.portalLogin("3119000592", "04102512")).data
  }
  console.log('ret >>> ', a);

  // console.log(a, a === es.codes.networkStatus_portal)
  return;
  const s = (await axios.get("http://172.17.18.3:8080/portal/").catch(e => {
    // console.log(e)
  }))
  const d = (await utils.getRedirectUrl("http://172.17.18.3:8080/portal/"))
  //http://172.17.18.3:8080/portal/pws?t=li&ifEmailAuth=false
  const url = 'http://172.17.18.3:8080/portal/pws?t=li&ifEmailAuth=false'
  const r = (await axios.post(url, utils.constructLoginForm("1","2"))).data

  console.log(utils.responseToJSON(r))
  const exp = /((\d+\.){3}\d+)+/g
  // if (s){
  //   if (exp.test(s.host) || true) {
  //     // needs byod login
  //     const d = (await axios.get("http://172.17.18.2:8080/byod/index.xhtml"))
  //     console.log('d >>> ', d);

  //   }
  // }
  // // console.log('s >>> ', s);
  return ;
  if (argv.d === true){
    await logout()
  }
  await utils.sleep(1000)
  init()
}()

// console.log('ip >>> ', utils.getNetworkInfo());

// http://2.2.2.2/