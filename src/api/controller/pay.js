const Base = require('./base.js');
const rp = require('request-promise');
const moment = require('moment');

module.exports = class extends Base {
  /**
   * 获取支付的请求参数
   * @returns {Promise<PreventPromise|void|Promise>}
   */
  async prepayAction() {
    const orderId = this.post('orderId');

    const order = await this.model('order').where({id: orderId, order_status:['!=', 0]}).find();
    if (think.isEmpty(order)) {
      return this.fail(400, '订单不存在');
    }

    if (parseInt(order.order_status) > think.config('order_status').booking) {
      return this.fail(400, '已支付，请勿重复支付');
    }
    if (parseInt(order.order_status) === think.config('order_status').expired) {
      return this.fail(2008, '订单已失效: 付款超时');
    }
    if(new Date() < new Date(order.expire_pay_time)) return this.fail(2008, '订单已失效: 付款超时');

    // 验证订单中的商品是否有效
    let goodsPrice = 0
    for(let i = 0, l = order.order_goods.length; i < l; i++){
      let goodAndSku = await this.model("goods").getGoodAndSku(order.order_goods[i].goods_id, order.order_goods[i].sku_id)
      if(!goods) {
        this.model("order").updatePayStatus(order.id, think.config('order_status').expired)
        return this.fail(2009, '订单已失效:商品价格变动');
      }

      // 计算价格是否改变
      goodsPrice = goodsPrice + goodAndSku.goods_sku[0].retail_price * Math.abs(order.order_goods[i].number)

    }
    if(goodsPrice != order.goods_price) {
      return this.fail(400, '商品价格变动');
    }




    const WeixinSerivce = this.service('weixin', 'api');

    let that = this
    try {
      const returnParams = await WeixinSerivce.createUnifiedOrder({
        body: '吃瓜-大家的瓜果',
        detail: '请在【吃瓜】小程序里查看详情',
        goods_tag: '微信运动抵扣' + order.werun_price + '元',
        out_trade_no:order.order_sn,
        total_fee: order.order_price,
        spbill_create_ip: that.ctx.ip.length > 15 ? '127.0.0.1' : that.ctx.ip, // 避免开发时候报错
        time_start: moment(order.start_pay_time, 'YYYY-MM-DD HH:mm:ss').format('YYYYMMDDHHmmss'),
        time_expire: moment(order.expire_pay_time, 'YYYY-MM-DD HH:mm:ss').format('YYYYMMDDHHmmss'),
        openid: think.openId
      });

      returnParams.orderId = order.id
      return this.success(returnParams);
    } catch (err) {
      console.log(('prepayAction:' + JSON.stringify(err)))
      // 有些错误信息需要返回给用户
      let returnMsg = err.return_msg
      let errorMsg = ''
      switch(returnMsg){
        case '余额不足' :
          errorMsg = '余额不足'
          break
        case '订单已关闭' :
          errorMsg = '订单已关闭'
          break
        case '商户订单号重复' :
          errorMsg = '订单号重复'
          break
        case '系统错误' :
          errorMsg = '系统错误'
          break
        case '商户订单已支付' :
          errorMsg = '订单已支付'
          break
        default:
          errorMsg = '支付失败!'
      }
      return this.fail(2007, errorMsg);
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
      let rowNum = await this.model('order').where({id: orderId, order_status: think.config('order_status').paid })

      if(rowNum <= 0) return this.fail(400, '支付失败')

      return this.success()
    }catch (e) {
      return this.fail(400, '支付失败')
    }

  }
};
