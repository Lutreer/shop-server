const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const banner = await this.model('ad').field(['id', 'image_url', 'link']).where({ad_position_id: 1, is_show: 1, status: 1}).select();
    const channel = await this.model('channel').where({status: 1}).order({sort_order: 'asc'}).select();
    const brandList = await this.model('brand').field(['id', 'outter_pic_url']).where({is_show: 1}).order({sort_order: 'asc'}).limit(4).select();
    const hotGoods = await this.model('goods').getHotGoods(3)
    const newGoods = await this.model('goods').getNewGoods(5)
    const topicList = await this.model('topic').limit(3).select()

    const cartCount = await this.model('cart').getCartCount()

    return this.success({
      banner: banner,
      channel: channel,

      hotGoodsList: hotGoods,
      brand: {
        title: '里面有段话',
        list: brandList
      },
      topicList: topicList,
      newGoodsList: newGoods,
      categoryList: [],
      cartCount: cartCount
    });
  }
};
