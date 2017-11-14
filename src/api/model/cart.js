const _ = require('lodash');
module.exports = class extends think.Model {
  get relation() {
    return {
      goods: {
        type: think.Model.BELONG_TO
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
   * 获取购物车的选中的商品
   * @returns {Promise.<*>}
   */
  async getCheckedGoodsList() {
    const goodsList = await this.model('cart').where({user_id: think.userId}).select();
    return goodsList;
  }

  /**
   * 清空已购买的商品
   * @returns {Promise.<*>}
   */
  async clearBuyGoods() {
    const $res = await this.model('cart').where({user_id: think.userId}).delete();
    return $res;
  }
  /**
   * 清除某一个商品
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
