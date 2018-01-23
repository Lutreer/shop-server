const _ = require('lodash');
const moment = require('moment');

module.exports = class extends think.Model {
  get relation() {
    return {
      order_goods: {
        type: think.Model.HAS_MANY,
        where: {'status': 1}
      }
    }
  }
  async getOrdersList(page, size) {
    let orders = await this.setRelation('order_goods')
      .where('order_status > 0')
      .field('id, add_time, order_sn, order_price, order_status')
      .order(['add_time DESC'])
      .page(page, size)
      .countSelect();
    for(let i = 0; i < orders.data.length; i++){
      orders.data[i]['order_status_text'] = think.config('order_status')[orders.data[i].order_status]
    }
    return orders;
  }



  /**
   * 获取订单可操作的选项
   * @param orderId
   * @returns {Promise.<{cancel: boolean, delete: boolean, pay: boolean, comment: boolean, delivery: boolean, confirm: boolean, return: boolean}>}
   */
  async getOrderHandleOption(orderId) {
    const handleOption = {
      cancel: false, // 取消操作
      delete: false, // 删除操作
      pay: false, // 支付操作
      comment: false, // 评论操作
      delivery: false, // 确认收货操作
      confirm: false, // 完成订单操作
      return: false, // 退换货操作
      buy: false // 再次购买
    };

    const orderInfo = await this.where({id: orderId}).find();

    // 订单流程：下单成功－》支付订单－》发货－》收货－》评论
    // 订单相关状态字段设计，采用单个字段表示全部的订单状态
    // 1xx表示订单取消和删除等状态 0订单创建成功等待付款，101订单已取消，102订单已删除
    // 2xx表示订单支付状态,201订单已付款，等待发货
    // 3xx表示订单物流相关状态,300订单已发货，301用户确认收货
    // 4xx表示订单退换货相关的状态,401没有发货，退款402,已收货，退款退货
    // 如果订单已经取消或是已完成，则可删除和再次购买
    if (orderInfo.order_status === 101) {
      handleOption.delete = true;
      handleOption.buy = true;
    }

    // 如果订单没有被取消，且没有支付，则可支付，可取消
    if (orderInfo.order_status === 0) {
      handleOption.cancel = true;
      handleOption.pay = true;
    }

    // 如果订单已付款，没有发货，则可退款操作
    if (orderInfo.order_status === 201) {
      handleOption.return = true;
    }

    // 如果订单已经发货，没有收货，则可收货操作和退款、退货操作
    if (orderInfo.order_status === 300) {
      handleOption.cancel = true;
      handleOption.pay = true;
      handleOption.return = true;
    }

    // 如果订单已经支付，且已经收货，则可完成交易、评论和再次购买
    if (orderInfo.order_status === 301) {
      handleOption.delete = true;
      handleOption.comment = true;
      handleOption.buy = true;
    }

    return handleOption;
  }

  /**
   * 获取订单
   * @returns {Promise<void>}
   */
  async getOrderById(id) {
    let order = await this.where({id: id}).find()
    return order
  }

  /**
   * 删除掉错误的订单和相关数据
   *
   * 前提是该订单已经保存
   */
  async deleteErrorOrder(order) {
    try {
      await this.where({id: order.id}).delete()
      const orderGoodsModel = this.model('order_goods').db(this.db())
      await orderGoodsModel.where({order_id: order.id}).delete()
      return true
    } catch(e){
      return false
    }
  }



  /**
   * 订单提交
   * @param param
   * @returns {Promise<*>}
   */
  async submitOrder(param) {
    // 获取收货地址信息和计算运费
    // let param = {
    //   addressId: this.data.checkedAddress.id,
    //   isUseWerun: this.data.useWerun,
    //   werunMoney: this.data.werunDedPrice,
    //   weightMoney: this.data.freight,
    //   goods: [{goodId, skuId, number}],
    //   payMoney: this.data.payPrice
    // }
    const orderData = param;

    // 验证商品是否可用，并记录当前的商品（下单的规格）价格
    let orderGoods = [] // 订单中的商品
    let goodsTotalPrice = 0.00 // 计算总价并与提交的价格对比何时数据的准确性

    let goodsModel = this.model('goods')
    for(let i = 0, l = orderData.goods.length; i < l; i++){
      let good = await this.model('goods').getDetailById(orderData.goods[i].goodId)

      if(!good.id){
        return this.fail(2001, '部分商品已下架')
      }

      let hasSku = false
      for(let j = 0, len = good.goods_sku.length; j < len; j++){
        if(good.goods_sku[j].id === orderData.goods[i].skuId) {
          let _good = {}
          _good.order_id = null
          _good.goods_id = good.id
          _good.sku_id = good.goods_sku[j].id
          _good.sku_label = good.sku_label
          _good.goods_name = good.name
          _good.sku_name = good.goods_sku[j].name
          _good.retail_price = good.goods_sku[j].retail_price // 卖价

          _good.market_price = good.goods_sku[j].market_price // 市场价
          _good.list_pic_url = good.list_pic_url // 列表图
          _good.number = Math.abs(orderData.goods[i].number) // 数量

          orderGoods.push(_good)

          goodsTotalPrice = goodsTotalPrice + good.goods_sku[j].retail_price * Math.abs(orderData.goods[i].number)
          hasSku = true
          break
        }
      }
      if(!hasSku) {
        return this.fail(2001, '部分商品已下架') // 该产品规格下架了
      }
    }

    // 到这一步说明订单中的商品是可购买的，不存在下架
    // 验证收货地址是否可用
    if(orderData.address.id){
      let address = await this.model('address').getDetailById(orderData.address.id)
      if(!address.id){
        // 不存在该收货地址，或已经被删除
        return this.fail(2002, '收货地址错误') // 该产品规格下架了
      }else{
        //完善收货详细信息
        orderData.address['name'] = address.name
        orderData.address['mobile'] = address.mobile
        orderData.address['college'] = address.college.name
        orderData.address['address'] = address.address
      }
    }else{
      // 没有收货地址
      return this.fail(2002, '收货地址错误')
    }

    // 计算运费和微信运动抵扣的费用
    const date = moment().format('YYYY-MM-DD')

    // .field(['werun_deadline', 'werun_ded_peice_limit', 'werun_ded_status', 'werun_ded_steps','werun_ded_steps_peice', 'werun_praise_limit', 'werun_praise_steps', 'werun_ranking_limit_num'])
    const appConfig = await this.model('app_config')
      .where({status: 1, app_type: 'mina'})
      .find();

    // 系统开启了微信抵扣且用户使用了微信抵扣
    if(appConfig.werun_ded_status == 1 && orderData.isUseWerun){
      // TODO 可能会出现用户在零点临界点下单导致微信步数抵扣计算不符的情况，暂时返回错误让用户重新下单，以后再做优化
      const myRun = await this.model('werun')
        .where({status: 1, user_id: think.userId, step_date:date})
        .find()

      // 计算用户使用的步数是否大于剩余可用步数
      let orderUseSteps = orderData.werunMoney * appConfig.werun_ded_steps
      let restSteps = myRun.steps - myRun.consume_steps

      // 使用的步数超过剩余步数
      if(orderUseSteps > restSteps){
        return this.fail(2003, '微信步数抵扣错误')
      }
    }else{
      orderData.werunMoney = 0
    }


    // 计算该所需单运费
    let freightPrice = goodsTotalPrice > appConfig.freight_limit ? 0 : appConfig.freight_price
    // 验证提交的运费是否正确
    if(orderData.freightMoney < freightPrice){
      return this.fail(2004, '运费错误')
    }

    // 验证实付费用
    let realPay = goodsTotalPrice + freightPrice - orderData.werunMoney
    if(Math.abs(orderData.payMoney - realPay) > 0.1){// 暂时允许1毛钱的误差
      return this.fail(2005, '订单金额错误')
    }


    //验证通过，存储订单
    // order 表的数据 wm:wechat mina, g:goods.length, p: real pay, a: address.id
    let orderSN = 'wx' + moment().format('YYYYMMDDHHMMssSSS') + 'g' + orderData.goods.length + 'p' + orderData.payMoney * 100 + 'a' + orderData.address.id

    let start_pay_time = moment().format('YYYY-MM-DD HH:mm:ss')
    let expire_pay_time = moment(start_pay_time, 'YYYY-MM-DD HH:mm:ss').add(60, 'minute').format('YYYY-MM-DD HH:mm:ss')
    let orderTable = {
      // id: null,
      order_sn: orderSN, // 序列号
      user_id: think.userId,// 下单人id

      pay_way: 1,//1:微信，2:支付宝
      freight_price: orderData.freightMoney, // 运费
      werun_price: orderData.werunMoney, // 微信抵扣费用
      goods_price: goodsTotalPrice, // 商品总价
      order_price: orderData.payMoney, // 实付金额

      address_id: orderData.address.id,
      address_consignee: orderData.address.name,// 收件人姓名
      address_mobile: orderData.address.mobile,// 电话
      address_college: orderData.address.college,// 学校
      address_detail: orderData.address.address,// 详细地址

      // 0: 订单删除，1:订单失效，2:订单取消, 3: 退货中, 4: 已退货
      // 5:下单未付款（未付款），6：仅客户端返回付款成功（下单中） 7:微信返回付款成功（已付款，5~20分钟后改为备货中，TODO 定时任务,还有失效订单），8：备货中（4~6可以退货，暂时不做）,  9:已发货，10:已签收（未评价），11：已评价
      order_status: 5,

      update_time: ['exp', 'CURRENT_TIMESTAMP()'],
      start_pay_time: start_pay_time,
      expire_pay_time: expire_pay_time,
      // add_time: null
    }


    // let orderModel = this.model('order')

    // src/model/order.js
    var orderId = null
    try {
      await this.startTrans();
      orderId = await this.add(orderTable)
      orderTable.id = orderId
      orderTable.goods = orderGoods
      const orderGoodsModel = this.model('order_goods').db(this.db())
      for(let j = 0, len = orderGoods.length; j < len; j++){
        orderGoods[j].order_id = orderId
      }
      let orderGoodsId = await orderGoodsModel.addMany(orderGoods)
      await this.commit();
      return orderTable
    } catch(e){
      console.log(JSON.stringify('submitOrder:' + e))
      await this.rollback();
      // 担心没有回滚, 手动删除错误订单
      if(orderId){
        this.where({id: orderId}).delete()
      }
      return null
    }





    // const result = await this.transaction(async () => {
    //   let orderId = await this.add(orderTable)
    //
    //   // 通过 db 方法让 order_goods 模型复用当前模型的数据库连接
    //   const orderGoodsModel = this.model('order_goods').db(this.db())
    //   for(let j = 0, len = orderGoods.length; j < len; j++){
    //     orderGoods[j].order_id = orderId
    //   }
    //   let orderGoodsId = await orderGoodsModel.addMany(orderGoods)
    //   console.log(JSON.stringify(orderGoodsId))
    //   return false
    //
    // })
  }


  /**
   * 根据订单编号查找订单信息
   */
  async getOrderByOrderSn(orderSn) {
    if (think.isEmpty(orderSn)) {
      return {};
    }
    return await this.where({order_sn: orderSn}).find();
  }

  /**
   * 更新订单
   */
  async updateOrderInfo(orderId, data) {
    if(payStatus && !think.isEmpty(data)){
      delete data.id
      delete data.order_sn
      delete data.user_id
      delete data.order_price
      delete data.address_id
      let row = await this.where({id: orderId}).limit(1).update(data);
      return row
    }else{
      return false
    }
  }

  /**
   * 更改订单支付状态
   * 默认 下单未付款
   */
  async updatePayStatus(orderId, payStatus = think.config('order_status').nonPayment) {
      let row = await this.where({id: orderId}).update({order_status: parseInt(payStatus)});
      return row
  }
};
