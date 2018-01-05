const Base = require('./base.js');
const moment = require('moment');

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

    // 获取收货地址信息和计算运费
    // let orderData = {
    //   addressId: this.data.checkedAddress.id,
    //   isUseWerun: this.data.useWerun,
    //   werunMoney: this.data.werunDedPrice,
    //   weightMoney: this.data.freight,
    //   goods: [{goodId, skuId, number}],
    //   payMoney: this.data.payPrice
    // }
    const orderData = this.post();

    // 验证商品是否可用，并记录当前的商品（下单的规格）价格
    let goodsTotalPrice = 0.00 // 计算总价并与提交的价格对比何时数据的准确性
    for(let i = 0, l = orderData.goods.length; i < l; i++){
      let good = await this.model('goods').getDetailById(orderData.goods[i].goodId)

      if(!good.id){
        return this.fail(2001, '部分商品已下架')
      }

      let hasSku = false
      let orderGoods = [] // 订单中的商品
      for(let j = 0, len = good.goods_sku.length; j < len; j++){
        if(good.goods_sku[j].id === orderData.goods[i].skuId) {
          let _good = {}
          // _good.order_id = null
          _good.good_id = good.id
          _good.sku_id = good.goods_sku[j].id
          _good.good_name = good.name
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
    let orderSN = 'wm' + moment().format('YYYYMMDDHHMMssSSS') + 'g' + orderData.goods.length + 'p' + orderData.payMoney * 100 + 'a' + orderData.address.id
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

      order_status: 2, //0: 订单删除，1:订单失效， 2:下单未付款，3:已付款，4:订单取消, 5:已发货，6:已签收，7: 已退货
      update_time: ['exp', 'CURRENT_TIMESTAMP()']
      // pay_time: null,
      // add_time: null
    }


    const result = await this.transaction(async () => {

      // 如果添加成功则 commit，失败则 rollback
      try {
        await this.startTrans();
        let orderId = await this.model('order_goods').add(orderTable)

        // 通过 db 方法让 order_goods 模型复用当前模型的数据库连接
        const orderGoodsModel = this.model('order_goods').db(this.db())

        for(let j = 0, len = good.goods_sku.length; j < len; j++){
          orderGoods[i].order_id = orderId
        }
        await orderGoodsModel.addMany(orderGoods)
        await this.commit();
        return this.success();
      } catch(e){
        await this.rollback();
        return this.fail(2006, '下单失败')
      }

    })

  }
};
