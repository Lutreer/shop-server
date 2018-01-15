const Base = require('./base.js')
const moment = require('moment')
const appId = require('../../common/config/secret').APP_APPID
let crypto = require('crypto');

module.exports = class extends Base {
  /**
   * 获取订单列表
   * @return {Promise} []
   */
  async listAction() {
    const orderList = await this.model('order').where({user_id: think.userId}).page(1, 10).countSelect();
    const newOrderList = [];
    for (const item of orderList.data) {
      // 订单的商品
      item.goodsList = await this.model('order_goods').where({order_id: item.id}).select();
      item.goodsCount = 0;
      item.goodsList.forEach(v => {
        item.goodsCount += v.number;
      });

      // 订单状态的处理
      item.order_status_text = await this.model('order').getOrderStatusText(item.id);

      // 可操作的选项
      item.handleOption = await this.model('order').getOrderHandleOption(item.id);

      newOrderList.push(item);
    }
    orderList.data = newOrderList;

    return this.success(orderList);
  }

  async detailAction() {
    const orderId = this.get('orderId');
    const orderInfo = await this.model('order').where({user_id: think.userId, id: orderId}).find();

    if (think.isEmpty(orderInfo)) {
      return this.fail('订单不存在');
    }

    orderInfo.province_name = await this.model('region').where({id: orderInfo.province}).getField('name', true);
    orderInfo.city_name = await this.model('region').where({id: orderInfo.city}).getField('name', true);
    orderInfo.district_name = await this.model('region').where({id: orderInfo.district}).getField('name', true);
    orderInfo.full_region = orderInfo.province_name + orderInfo.city_name + orderInfo.district_name;

    const orderGoods = await this.model('order_goods').where({order_id: orderId}).select();

    // 订单状态的处理
    orderInfo.order_status_text = await this.model('order').getOrderStatusText(orderId);
    orderInfo.add_time = moment.unix(orderInfo.add_time).format('YYYY-MM-DD HH:mm:ss');
    orderInfo.final_pay_time = moment('001234', 'Hmmss').format('mm:ss');
    // 订单最后支付时间
    if (orderInfo.order_status === 0) {
      // if (moment().subtract(60, 'minutes') < moment(orderInfo.add_time)) {
      orderInfo.final_pay_time = moment('001234', 'Hmmss').format('mm:ss');
      // } else {
      //     //超过时间不支付，更新订单状态为取消
      // }
    }

    // 订单可操作的选择,删除，支付，收货，评论，退换货
    const handleOption = await this.model('order').getOrderHandleOption(orderId);

    return this.success({
      orderInfo: orderInfo,
      orderGoods: orderGoods,
      handleOption: handleOption
    });
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
      //   order_status: 2, //0: 订单删除，1:订单失效， 2:下单未付款，3:已付款，4:订单取消, 5:已发货，6:已签收，7: 已退货
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

          // 删掉购物车中的数据, 这里暂不处理删除失败的情况
          let isClearthis = await this.model('cart').clearBuyGoods(orderData.goods)

          // 下面是一些故意混淆视听的数据，有用的只有statusCode是真的，表示的是订单的id
          returnParams.payId = Math.random().toString(36).substr(2, 15) // 假payId
          returnParams.orderSN = 'wx' + new Date().getTime() + Math.random().toString(36).substr(2, 15) // 假sn
          returnParams.orderId =  new Date().getMilliseconds()// 假order id
          returnParams.statusCode = order.id // 【真id在这里】
          return this.success(returnParams);
        } catch (err) {
          return this.success({
            'orderId': 'orderId',
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
};
