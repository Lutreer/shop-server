'use strict';

//这个service不符合think.service的标准，算是一个util
var md5 = require('md5');
var request = require('request');
var xml2js = require('xml2js');
var parseString = xml2js.parseString;
var builder = new xml2js.Builder();

/**
 * Extension method add
 */
Function.prototype.add = Function.prototype.add || function (name, value) {
  this.prototype[name] = value;
  return this;
};

/**
 * Extension method inherits
 */
Function.prototype.inherits = Function.prototype.inherits || function (superConstructor) {
  var arr = arguments;
  if (Array.isArray(arguments[0]) && arguments.length === 1) {
    arr = arguments[0];
  }
  for (var item = arr.length; item >= 0; item--) {
    for (var key in arr[item]) {
      this.prototype[key] = arr[item][key];
    }
  }
  return this;
};

/**
 * @constructor WXPayUrl
 * @description微信支付URL
 */
function WXPayUrl() {
}

WXPayUrl.add('url', {
  unifiedorder: 'https://api.mch.weixin.qq.com/pay/unifiedorder', //统一下单
  orderquery: 'https://api.mch.weixin.qq.com/pay/orderquery', //查询订单
  closeorder: 'https://api.mch.weixin.qq.com/pay/closeorder', //关闭订单
  refund: 'https://api.mch.weixin.qq.com/pay/refund', //申请退款
  refundquery: 'https://api.mch.weixin.qq.com/pay/refundquery', //查询退款
  downloadbill: 'https://api.mch.weixin.qq.com/pay/downloadbill', //下载对账单
  report: 'https://api.mch.weixin.qq.com/pay/report' //交易保障
});

/**
 * 微信支付工具类函数
 */
function Utils() {
  this.init = function () {
  };
}

Utils
  .add('options', {})
  .add('parseWXReturnXML', function (xmlObject) {
    var newObject = {};
    xmlObject = xmlObject.xml || {};
    for (var key in xmlObject) {
      newObject[key] = xmlObject[key][0];
    }
    return newObject;
  })
  .add('createNonceStr', function () {
    return Math.random().toString(36).substr(2, 15);
  })
  .add('createTimeStamp', function () {
    return parseInt(new Date().getTime() / 1000) + '';
  })

  // 去除key，排序，URL键值对，加key，md5，uppercase
  .add('sign', function (options) {
    var ops = options || {};
    var keys = Object.keys(ops)
      .filter(function (item) {
        return ops[item] !== undefined
          && ops[item] !== ''
          && ['key', 'sign'].indexOf(item) < 0;
      })
      .sort()
      .map(function (key) {
        return key + '=' + ops[key];
      })
      .join('&') + '&key=' + ops.key;
    return md5(keys).toUpperCase();
  });

/**
 * 微信小程序支付
 * WeixinPay
 */
function WeiXinPay() {
  this.init.apply(this, arguments);
}

WeiXinPay
  .inherits(new Utils(), new WXPayUrl())
  .add('init', function () {
    // 每一个字段都必须
    // arguments[0] = {
    // appid: think.config('weixin.appid'), // 微信小程序appid
    // mch_id: think.config('weixin.mch_id'), // 商户帐号ID
    // notify_url: think.config('weixin.notify_url'),
    // sign_type: 'MD5',
    // trade_type: 'JSAPI',
    // limit_pay: 'no_credit', // 不允许使用信用卡支付，账期长
    // key: think.config('weixin.partner_key'), // 秘钥
    // }
    for (var key in arguments[0]) {
      this[key] = arguments[0][key];
    }
  })
  /**
   * 创建统一订单
   */
  .add('createUnifiedOrder', function (param, fn) {
    var that = this;
    var ops = param || {};

    ops.appid = that.appid;
    ops.mch_id = that.mch_id;
    ops.notify_url = that.notify_url;
    ops.sign_type = that.sign_type;
    ops.trade_type = that.trade_type;
    ops.key = that.partner_key;
    ops.limit_pay = that.limit_pay;
    ops.nonce_str = that.createNonceStr();

    // 去除key，排序，URL键值对，加&key=...，md5，uppercase
    ops.sign = that.sign(ops);
    delete ops.key
    request({
      url: that.url.unifiedorder,
      method: 'POST',
      body: builder.buildObject(ops), // object => xml
      // agentOptions: {
      //   pfx: that.pfx,
      //   passphrase: that.mch_id
      // }
    }, function (err, response, body) {
      // parseString: xml => object
      parseString(body, function (err, result) {
        fn(that.parseWXReturnXML(result));
      });
    });
    return that;
  })
  /**
   * 查寻订单
   */
  .add('queryOrder', function (param, fn) {
    var that = this;
    param.nonce_str = param.nonce_str || that.createNonceStr();

    param.appid = that.appid;
    param.mch_id = that.mch_id;
    param.sign = that.sign(param);

    request({
      url: that.url.orderquery,
      method: 'POST',
      body: builder.buildObject(param)
    }, function (err, response, body) {
      parseString(body, function (err, result) {
        fn(that.parseWXReturnXML(result));
      });
    });
    return that;
  })
  /**
   * @description 关闭订单
   * @param  {Object} param
   * @param  {Function} fn) callback
   * @return {Object} Constructor
   */
  .add('closeorder', function (param, fn) {
    var that = this;
    param.appid = this.appid;
    param.mch_id = this.mch_id;
    param.nonce_str = param.nonce_str || that.createNonceStr();
    param.sign = that.sign(param);
    request({
      url: this.url.closeorder,
      method: 'POST',
      body: builder.buildObject(param)
    }, function (err, response, body) {
      parseString(body, function (err, result) {
        fn(that.parseWXReturnXML(result));
      });
    });

  });

module.exports = WeiXinPay;