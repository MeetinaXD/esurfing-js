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

const colors = require("colors");
const utils = require("./utils")
const es = require('./esurfing')

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

  if (configure.get().record){
    config = { ...config, ...configure.get().record }
  }

  if (auto){
    // get config automatically
    const redirectUrl = await utils.getRedirectUrl('http://www.baidu.com')
    if (!redirectUrl){
      throw new Error("cannot get profile automatically")
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

async function init(u, p, t){
  let status = null
  status = await es.networkCheck();

  if (status === es.codes.networkStatus_unknownEnvironment){
    throw new Error("unknown network environment")
  }

  if (status === es.codes.networkStatus_portal){
    const d = await es.portalLogin(u, p)
    console.log('portal login >>> ', d);
  }

  if (status === es.codes.networkStatus_OK){
    if (!configure.get().record){
      console.log(colors.red('online, but no profile found! please disconnect first.'))
      throw new Error("online but no profile found.")
    }

    // 只有网络连接中需要断网
    if (argv.d === true){
      if (!(await es.logout())){
        console.log(colors.red("logout return error!"))
      }
      // 断开后等待
      await utils.sleep(10000)
    }
  }

  status = await es.networkCheck();
  if (status === es.codes.networkStatus_offline){
    const s = await doLogin(u, p)
    await utils.sleep(3000)
    if (!s){
      throw new Error("login failed")
    }
  }

  status = await es.networkCheck();
  if (status === es.codes.networkStatus_OK){
    setTask(~~t)
  } else {
    throw new Error("unknown network environment")
  }
}

// entry
+async function(){
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

  let retry = 0
  while (++retry < 10){
    try{
      await init(u, p, t)
      break ;
    } catch(e) {
      console.log(retry, colors.red("init failed, waiting for next retry."))
      console.log('\terror message >>> ', e.message)
      // 30 sec(s) waiting
      await utils.sleep(30000)
    }
  }
  if (retry > 10){
    console.log(colors.red("program terminated after overtime's retry\n We will reset retry counter after 10 min."))
    await utils.sleep(20 *60 *1000)
    arguments.callee()
  }
}()