const crypto = require('crypto');
const md5 = require('md5');
const WeiXinPay = require('../../common/service/weixinPay');

module.exports = class extends think.Service {

  /**
   * 统一下单
   * @param payInfo
   * @returns {Promise}
   */
  createUnifiedOrder(payInfo) {

    const weixinpay = new WeiXinPay({
      appid: think.config('weixin.appid'), // 微信小程序appid
      mch_id: think.config('weixin.mch_id'), // 商户帐号ID
      notify_url: think.config('weixin.notify_url'),
      sign_type: 'MD5',
      trade_type: 'JSAPI',
      limit_pay: 'no_credit', // 不允许使用信用卡支付，账期长
      key: think.config('weixin.key'), // 秘钥
    });

    return new Promise((resolve, reject) => {
      weixinpay.createUnifiedOrder({
        body: payInfo.body,
        detail: payInfo.detail,
        goods_tag: payInfo.goods_tag,
        out_trade_no:payInfo.out_trade_no,
        total_fee: payInfo.total_fee,
        spbill_create_ip: payInfo.spbill_create_ip,
        time_start: payInfo.time_start,
        time_expire: payInfo.time_expire,
        openid: payInfo.openid
      }, (res) => {
        if (res.return_code === 'SUCCESS' && res.result_code === 'SUCCESS') {
          const returnParams = {
            // 'appid': res.appid,
            'timeStamp': parseInt(Date.now() / 1000) + '',
            'nonceStr': res.nonce_str,
            'package': 'prepay_id=' + res.prepay_id,
            'signType': 'MD5'
          };
          const paramStr = `appId=${returnParams.appid}&nonceStr=${returnParams.nonceStr}&package=${returnParams.package}&signType=${returnParams.signType}&timeStamp=${returnParams.timeStamp}&key=` + think.config('weixin.key');
          returnParams.paySign = md5(paramStr).toUpperCase();
          resolve(returnParams);
        } else {
          reject(res);
        }
      });
    });
  }

  /**
   * 生成排序后的支付参数 query
   * @param queryObj
   * @returns {Promise.<string>}
   */
  buildQuery(queryObj) {
    const sortPayOptions = {};
    for (const key of Object.keys(queryObj).sort()) {
      sortPayOptions[key] = queryObj[key];
    }
    let payOptionQuery = '';
    for (const key of Object.keys(sortPayOptions).sort()) {
      payOptionQuery += key + '=' + sortPayOptions[key] + '&';
    }
    payOptionQuery = payOptionQuery.substring(0, payOptionQuery.length - 1);
    return payOptionQuery;
  }

  /**
   * 对 query 进行签名
   * @param queryStr
   * @returns {Promise.<string>}
   */
  signQuery(queryStr) {
    queryStr = queryStr + '&key=' + think.config('weixin.partner_key');
    const md5 = require('md5');
    const md5Sign = md5(queryStr);
    return md5Sign.toUpperCase();
  }

  /**
   * 处理微信支付回调
   * @param notifyData
   * notifyData详细：https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_7
   */
  payNotify(notifyData) {
    if (think.isEmpty(notifyData)) {
      return {code: false, msg: '【支付结果通知】未接收到任何数据'};
    }

    const notifyObj = {};
    let sign = '';
    for (const key of Object.keys(notifyData)) {
      if (key !== 'sign') {
        notifyObj[key] = notifyData[key][0];
      } else {
        sign = notifyData[key][0];
      }
    }
    if (notifyObj.return_code !== 'SUCCESS' || notifyObj.result_code !== 'SUCCESS') {
      console.log('return_code false');
      return {code: false, msg: 'return_code false'};
    }
    const signString = this.signQuery(this.buildQuery(notifyObj));
    if (think.isEmpty(sign)) {
      return {code: false, msg: '【支付结果通知】中获取不到sign的值'};
    }
    if (signString !== sign) {
      return {code: false, msg: '数据校验失败'};
    }
    return {code: true, data: notifyObj};
  }
};