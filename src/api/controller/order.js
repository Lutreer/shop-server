const Base = require('./base.js')
const moment = require('moment')
const appId = think.config('weixin').appid
let crypto = require('crypto');

module.exports = class extends Base {
  /**
   * 获取订单列表
   * @return {Promise} []
   */
  async listAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;
    const orderList = await this.model('order').getOrdersList(page, size)

    return this.success(orderList);
  }
  /**
   * 取消订单
   * @return {Promise} []
   */
  async cancelAction() {
    const id = this.get('id')
    if(id) {
      let order = await his.model('order').getOrderById(id)
      if(!order || order.order_status != 5) return this.fail() // 只有待付款状态可以取消

      let num = await this.model('order').updatePayStatus(id, think.config('order_status').canceled)
      if(num > 0){
        return this.success();
      }else{
        return this.fail()
      }
    }else{
      return this.fail()
    }
  }

  /**
   * 删除订单
   * @return {Promise} []
   */
  async deleteAction() {
    const id = this.get('id')
    if(id) {
      let order = await this.model('order').getOrderById(id)
      if(!order || !(order.order_status == 1 || order.order_status == 2)) return this.fail() //只有失效或取消的订单可以删除
      let num = await this.model('order').updatePayStatus(id, think.config('order_status').deleted)
      if(num > 0){
        return this.success();
      }else{
        return this.fail()
      }
    }else{
      return this.fail()
    }

  }
  async detailAction() {
    const orderId = this.get('orderId');
    if(!orderId) return fail(400, '订单不存在');
    const orderInfo = await this.model('order').getOrderById(orderId);

    if (think.isEmpty(orderInfo)) {
      return this.fail('订单不存在');
    }
    orderInfo['order_status_text'] = think.config('order_status')[orderInfo.order_status]
    return this.success(orderInfo)
  }



  /**
   * 提交订单
   * @returns {Promise.<void>}
   * 注意：1. 为防止用户下单时出现产品下架了，尽量在用户不可能下单的时间段去更新产品
   */
  async submitAction() {
    // let orderData = {
    //   addressId: this.data.checkedAddress.id,
    //   isUseWerun: this.data.useWerun,
    //   werunMoney: this.data.werunDedPrice,
    //   weightMoney: this.data.freight,
    //   goods: [{goodId, skuId, number}],
    //   payMoney: this.data.payPrice
    // }
    let that = this
    let orderData = this.post()
    if(orderData){
      // let order = {
      //   id: null,
      //   order_sn: orderSN, // 序列号
      //   user_id: think.userId,// 下单人id
      //
      //   pay_way: 1,//1:微信，2:支付宝
      //   freight_price: orderData.freightMoney, // 运费
      //   werun_price: orderData.werunMoney, // 微信抵扣费用
      //   goods_price: goodsTotalPrice, // 商品总价
      //   order_price: orderData.payMoney, // 实付金额
      //
      //   address_id: orderData.address.id,
      //   address_consignee: orderData.address.name,// 收件人姓名
      //   address_mobile: orderData.address.mobile,// 电话
      //   address_college: orderData.address.college,// 学校
      //   address_detail: orderData.address.address,// 详细地址
      //
      //   order_status: 2, //0: 订单删除
      //   update_time: ['exp', 'CURRENT_TIMESTAMP()'],
      //   start_pay_time: start_pay_time,
      //   expire_pay_time: expire_pay_time,
      //   goods:[]
      // }
      let order = await this.model('order').submitOrder(orderData)

      if(order && order.id){
        let md5 = crypto.createHash('md5');
        let result = md5.update('a').digest('hex');


        const WeixinSerivce = this.service('weixin', 'api');
        try {
          // 调微信的统一下单接口
          // 下面传参的字段都是必须的，如果有改变service/weixin.js的方法 createUnifiedOrder 中也要更新。这里的字段不用排序，在createUnifiedOrder中排序, 其他一些字段在service/weixin.js中默认添加，但是sign在common/servie/weixinPay.js中间计算后添加，这里不能添加这俩字段

          // returnParams: { 'timeStamp', 'nonceStr', 'package', 'signType', 'paySign' }
          const returnParams = await WeixinSerivce.createUnifiedOrder({
            body: '丫米--学生品质',
            detail: '请在【丫米】小程序里查看详情',
            goods_tag: '微信运动抵扣' + order.werun_price + '元',
            out_trade_no:order.order_sn,
            total_fee: order.order_price,
            spbill_create_ip: that.ctx.ip.length > 15 ? '127.0.0.1' : that.ctx.ip, // 避免开发时候报错
            time_start: moment(order.start_pay_time, 'YYYY-MM-DD HH:mm:ss').format('YYYYMMDDHHmmss'),
            time_expire: moment(order.expire_pay_time, 'YYYY-MM-DD HH:mm:ss').format('YYYYMMDDHHmmss'),
            openid: think.openId
          });

          // 删掉购物车中的数据, 这里暂不处理删除失败的情况
          let isClearthis = await this.model('cart').clearBuyGoods(orderData.goods)

          returnParams.orderId = order.id
          return this.success(returnParams);
        } catch (err) {
          return this.success({
            'statusCode': order.id,
            'timeStamp': 'timeStamp',
            'nonceStr': 'nonceStr',
            'package': 'package',
            'signType': 'signType',
            'paySign': 'paySign'
          });

          // 调取失败，删除刚才保存过的订单，（暂不处理删除失败的情况）
          await this.model('order').deleteErrorOrder(order)
          console.log(('submitAction:' + JSON.stringify(err)))
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

      }else{
        return this.fail(2006, '下单失败')
      }
    }else{
      return this.fail(2006, '下单失败')
    }

  }

  /**
   * 确认收货
   * @returns {Promise<*>}
   */
  async confirmReceiveAction() {
    const orderId = this.post('orderId');
    if(!orderId) return this.fail(400, '订单不存在');
    const orderInfo = await this.model('order').getOrderById(orderId);

    if (think.isEmpty(orderInfo)) {
      return this.fail('订单不存在');
    }
    if(orderInfo.order_status != think.config('order_status').Unclaimed){
      return this.fail('还不能收货哦');
    }
    await this.model('order').where({id: orderId}).update({order_status: think.config('order_status').received})
    return this.success()
  }
}
