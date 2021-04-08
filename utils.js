const os = require('os');
const axios = require('axios')
const md5 = require('md5-node');
const fs = require('fs')

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
  config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  return config;
}, function (error) {
  return Promise.reject(error);
});

async function getRedirectUrl(url){
  const exp = /((\d+\.){3}\d+)+/g
  const ret = await axios.get(url)
  const { host, path } = ret.request.socket._httpMessage
  const ip = path.match(exp)
  if (url !== `http://${host}` && ip){
    return {
      host,
      path,
      nasip: ip[0],
      wlanip: ip[1]
    }
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
  Config,
  sleep
}