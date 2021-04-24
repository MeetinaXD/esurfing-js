const os = require('os');
const axios = require('axios')
const md5 = require('md5-node');
const fs = require('fs')
const qs = require("qs")

Date.prototype.format = function (fmt) {
  let ret;
  const opt = {
    "Y+": this.getFullYear().toString(),
    "m+": (this.getMonth() + 1).toString(),
    "d+": this.getDate().toString(),
    "H+": this.getHours().toString(),
    "M+": this.getMinutes().toString(),
    "S+": this.getSeconds().toString()
  };
  for (let k in opt) {
    ret = new RegExp("(" + k + ")").exec(fmt);
    if (ret) {
      fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
    };
  };
  return fmt;
}

axios.interceptors.request.use(function (config) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'DNT': 1,
    'Upgrade-Insecure-Requests': 1,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Connection': 'keep-alive'
  }
  config.headers = { ...config.headers, ...headers }
  return config;
}, function (error) {
  return Promise.reject(error);
});

// retry configure
axios.interceptors.response.use(e => e, async function(err){
  let config = err.config
  config = {
    ...config,
    retry: config.retry || 0,
    timeout: config.timeout || 3000,
    __retry_counter: config.__retry_counter || 0
  }
  if (config.__retry_counter >= config.retry){
    return Promise.reject(new Error("Timeout exceeded"))
  }
  config.__retry_counter++;

  // retry output
  console.log('timeout >>> ' + config.__retry_counter);
  await sleep(config.timeout)

  // call again
  return axios(config)
})

// axios.defaults.timeout = 3000


async function getRedirectUrl(url){
  // const url = "http://www.baidu.com"
  if (url.indexOf("http") === -1){
    url = "http://" + url
  }
  const exp = /((\d+\.){3}\d+)+/g
  let ret = null
  try {
    ret = await axios.get(url, { retry: 3, timeout: 3000 })
  } catch (error) {
    if (error.message === 'Timeout exceeded'){
      return null
    }
  }
  // console.log('ret >>> ', ret);

  const { host, path } = ret.request
  const ip = path.match(exp)
  if (url !== `http://${host}`){
    let res = { host, path }
    if (ip){
      res = {
        ...res,
        nasip: ip[0],
        wlanip: ip[1]
      }
    }
    return res
  } else {
    return null
  }
}

// return the md5 value calc by array element's merge
function getHash(array){
	const secret = "Eshore!@#";
  if (!(array instanceof Array)){
    return null
  }
  array.push(secret)
  str = array.join("")
  return md5(str).toUpperCase()
}

function responseToJSON(data){
  return JSON.parse(decodeURIComponent(Buffer.from(data, "base64").toString("binary")))
}

function constructLoginForm(username, password, address){
  const form = {
    userName: username,
    userPwd: Buffer.from(password, "binary").toString("base64"),
    userDynamicPwd: "",
    userDynamicPwdd: "",
    serviceType: "",
    userurl: "",
    userip: "",
    basip: "",
    language: "Chinese",
    usermac: "null",
    wlannasid: "",
    wlanssid: "",
    entrance: "null",
    loginVerifyCode: "",
    userDynamicPwddd: "",
    customPageId: 100,
    pwdMode: 0,
    portalProxyIP: address,
    portalProxyPort: 50200,
    dcPwdNeedEncrypt: 1,
    assignIpType: 0,
    appRootUrl: `http://${address}:8080/portal/`,
    manualUrl: ""
  }
  return qs.stringify(form)
}

// return the default network info
function getNetworkInfo() {
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
      var iface = interfaces[devName];
      for (var i = 0; i < iface.length; i++) {
          var alias = iface[i];
          if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
              return alias
          }
      }
  }
  return null
}
function sleep(ms){
  return new Promise(resolve => setTimeout(resolve,ms))
}

class Config{
  constructor(path){
    const exp = /\w+\.json/
    if (typeof path !== "string" || !exp.test(path)){
      throw new Error("illegal path")
    }
    if(fs.existsSync(path)){
      this.configObj = require(path)
    } else {
      this.configObj = {}
    }
    this.path = path
  }

  get(){
    return this.configObj
  }

  // load / reload
  load(){
    this.configObj = require(this.path)
    return this.configObj
  }

  write(){
    const str = JSON.stringify(this.configObj)
    fs.writeFileSync(this.path, str)
  }
}

module.exports = {
  getNetworkInfo,
  getRedirectUrl,
  getHash,
  responseToJSON,
  constructLoginForm,
  Config,
  sleep
}