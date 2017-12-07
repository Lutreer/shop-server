const Base = require('./base.js');
const _ = require('lodash');
module.exports = class extends Base {
  /**
   * 获取购物车中的数据
   * @returns {Promise.<{cartList: *, cartTotal: {goodsCount: number, goodsAmount: number, checkedGoodsCount: number, checkedGoodsAmount: number}}>}
   */
  async getCart() {
    const cartList = await this.model('cart').getGoodsList()
    let count = _.sumBy(cartList, 'number');
    return this.success({
      cartList: cartList,
      count: count
    });
  }

  /**
   * 获取购物车信息，所有对购物车的增删改操作，都要重新返回购物车的信息
   * @return {Promise} []
   */
  async indexAction() {
    const cartList = await this.model('cart').getGoodsList()
    for (let i = 0, l = cartList.length; i < l; i++) {
      delete cartList[i].goods.goods
    }
    let count = _.sumBy(cartList, 'number');
    return this.success({
      cartList: cartList,
      count: count
    });
  }

  /**
   * 添加商品到购物车
   * @returns {Promise.<*>}
   */
  async addAction() {
    const goodsId = this.post('goodsId');
    const skuId = this.post('skuId');
    const goodsNum = this.post('goodsNum') || 1;

    // 判断商品是否可以购买
    const goodsInfo = await this.model('goods').where({id: goodsId, is_on_sale: 1, status: 1}).find();
    if (think.isEmpty(goodsInfo)) {
      return this.fail(400, '哎呀，商品已经下架了~');
    }
    if (goodsInfo.goods_volume <= 0) {
      return this.fail(400, '哎呀，库存不足了~');
    }

    // 判断商品是否可以购买
    const skuInfo = await this.model('goods_sku').where({id: skuId, is_show: 1, status: 1}).find();
    if (think.isEmpty(skuInfo)) {
      return this.fail(400, '哎呀，商品已经下架了~');
    }

    // 判断购物车中是否存在此规格商品
    let cartModel = this.model('cart')
    const cartInfo = await cartModel.where({goods_id: goodsId, sku_id: skuId, user_id: think.userId}).find();
    if (think.isEmpty(cartInfo)) {

      const cartId = await this.model('cart').add({
        user_id: think.userId,
        goods_id: goodsId,
        sku_id: skuId
      })

    } else {

      await this.model('cart').where({
        id: cartInfo.id
      }).increment('number', goodsNum);
    }
    return this.success(200, '添加成功');
  }

  // 更新指定的购物车信息
  async updateAction() {
    const id = this.post('id');
    const sku_id = this.post('sku_id');
    const goods_id = this.post('goods_id');
    const num = parseInt(this.post('num'));

    const cartInfo = await this.model('cart').where({id: id}).find();
    // 严格判断提交时数据是否真实
    if(cartInfo.user_id != think.userId) {
      return this.fail(400, '您无权操作');
    }

    const goodsInfo = await this.model('goods').getDetailById(goods_id)
    if (think.isEmpty(goodsInfo)) {
      return this.fail(400, '商品已下架');
    } else if(goodsInfo.goods_volume <= 0) {
      return this.fail(400, ' 库存不足');
    } else{
      // 判断规格和商品时候匹配
      let sku = null
      for(let i = 0, l = goodsInfo.goods_sku.length; i < l; i++) {
        if(goodsInfo.goods_sku[i].id == sku_id){
          sku = goodsInfo.goods_sku[i]
        }
      }
      if(!sku){
        return this.fail(400, '商品已下架');
      }else{

        const cartData = {
          sku_id: sku_id,
          goods_id: goods_id,
          number: num
        };
        await this.model('cart').where({id: id}).update(cartData);
        return this.success();
      }
    }
  }

  // 删除选中的购物车商品，批量删除
  async deleteAction() {
    let cartIds = this.post('cartId');

    await this.model('cart').where({id: ['IN', cartIds]}).delete();

    return this.success();
  }

  // 获取购物车商品的总件件数
  async goodscountAction() {
    const cartData = await this.getCartCount();
    return this.success({
      cartTotal: {
        goodsCount: cartData
      }
    });
  }

  /**
   * 订单提交前的检验和填写相关订单信息
   * @returns {Promise.<void>}
   */
  async checkoutAction() {
    const addressId = this.get('addressId'); // 收货地址id
    // const couponId = this.get('couponId'); // 使用的优惠券id

    // 选择的收货地址
    let checkedAddress = null;
    if (addressId) {
      checkedAddress = await this.model('address').getDetailById(addressId)
    } else {
      checkedAddress = await this.model('address').getDefault()
    }

    const appConfig = await this.model('app_config').where({status: 1, app_type: 'mina'}).find();
    // 告诉前端运费最低消费
    const freightLimit = appConfig.freight_limit;
    // 运费
    const freightPrice = appConfig.freight_price;


    return this.success({
      checkedAddress: checkedAddress,
      freightLimit:freightLimit,
      freightPrice:freightPrice
    });
  }
};
