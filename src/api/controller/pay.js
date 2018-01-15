const Base = require('./base.js');
const rp = require('request-promise');
const moment = require('moment');

module.exports = class extends Base {
  /**
   * 获取支付的请求参数
   * @returns {Promise<PreventPromise|void|Promise>}
   */
  async prepayAction() {
    const orderId = this.get('orderId');

    const orderInfo = await this.model('order').where({id: orderId}).find();
    if (think.isEmpty(orderInfo)) {
      return this.fail(400, '订单已取消');
    }
    if (parseInt(orderInfo.pay_status) !== 0) {
      return this.fail(400, '订单已支付，请不要重复操作');
    }
    const openid = await this.model('user').where({id: orderInfo.user_id}).getField('weixin_openid', true);
    if (think.isEmpty(openid)) {
      return this.fail('微信支付失败');
    }
    const WeixinSerivce = this.service('weixin', 'api');
    try {
      const returnParams = await WeixinSerivce.createUnifiedOrder({
        openid: openid,
        body: '订单编号：' + orderInfo.order_sn,
        out_trade_no: orderInfo.order_sn,
        total_fee: parseInt(orderInfo.actual_price * 100),
        spbill_create_ip: ''
      });
      return this.success(returnParams);
    } catch (err) {
      return this.fail('微信支付失败');
    }
  }
  /**
   * 微信支付成功的的回调方法，验证用户是否正常支付
   *
   * 由微信支付系统调取，自己系统不能调
   */
  async wxpayNotifyAction(){
    const WeixinSerivce = this.service('weixin', 'api');
    const result = WeixinSerivce.payNotify(this.post('xml'));


    console.log('WeixinSerivce.payNotify: ' + result.msg);
    if (!result.code) {
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${result.msg}]]></return_msg></xml>`;
    }

    const orderModel = this.model('order');
    const orderInfo = await orderModel.getOrderByOrderSn(result.data.out_trade_no);
    if (think.isEmpty(orderInfo)) {
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`;
    }
    // 只处理状态为6：仅客户端返回付款成功（下单中）
    if(orderInfo.order_status != 6){
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单状态错误]]></return_msg></xml>`;
    }

    // 6 => 7
    let updateRows = orderModel.updateOrderInfo(orderInfo.id, {pay_status:7,pay_time: moment(result.data.time_end, 'YYYYMMDDHHmmss').format('YYYY-MM-DD HH:mm:ss')})
    if (!updateRows) {
      return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`;
    }

    return `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`;
  }


  /**
   * 小程序客户端返回支付成功（但不一定是真的，需要微信系统调用wxpayNotifyAction后才能进一步验证真假）
   */
  async orderPayClientSuccessAction(){
    let orderId = this.post('id')
    if(!orderId) return this.fail(400, '支付失败')

    try{
      let rowNum = await this.model('order').where({id: orderId, order_status: 6, })

      if(rowNum <= 0) return this.fail(400, '支付失败')

      return this.success()
    }catch (e) {
      return this.fail(400, '支付失败')
    }

  }
};
