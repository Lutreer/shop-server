const _ = require('lodash');
module.exports = class extends think.Model {
  get relation() {
    return {
      goods: {
        type: think.Model.BELONG_TO,
        field: 'id, is_hot, is_new, is_on_sale, like_volume, list_pic_url, name, sku_label, status, goods_brief'
      }

    }
  }
  /**
   * 获取购物车的商品
   * @returns {Promise.<*>}
   */
  async getGoodsList() {
    var goodsList = await this.setRelation(true).fieldReverse(['user_id']).where({user_id: think.userId}).select();
    return goodsList;
  }


  /**
   * 清空已购买的商品
   * @returns {Promise.<*>}
   */
  async clearBuyGoods(goodAndSku) {
    let cartModel = this.model('cart')
    try{
      for(let i = 0, l = goodAndSku.length; i < l; i++){
        const res = await cartModel.where({goods_id: goodAndSku[i].goodId, sku_id: goodAndSku[i].skuId}).delete();
      }
      return true
    }catch (err){
      console.log("clearBuyGoods:" + JSON.stringify(err))
      return false
    }
  }
  /**
   * 清除某一个商品（真删除）
   * @returns {Promise.<*>}
   */
  async removeGoods() {
    const $res = await this.model('cart').where({user_id: think.userId, goods_}).delete();
    return $res;
  }

  /**
   * 购物车的商品数量
   * @returns {Promise.<number>}
   */
  async getCartCount() {
    const cartList = await this.model('cart').field(['number']).where({user_id: think.userId}).select();
    let count = _.sumBy(cartList, 'number');
    return count
  }
};
