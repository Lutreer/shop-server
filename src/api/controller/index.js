const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const banner = await this.model('ad').field(['id', 'image_url', 'link']).where({ad_position_id: 1, is_show: 1, status: 1}).select();
    const channel = await this.model('channel').where({status: 1}).order({sort_order: 'asc'}).select();
    const brandList = await this.model('brand').setRelation(false).field(['id', 'outter_pic_url']).where({is_show: 1, status: 1}).order({sort_order: 'asc'}).limit(4).select();
    const hotGoods = await this.model('goods').getHotGoods(0,3)
    const newGoods = await this.model('goods').getNewGoods(0,5)
    const topicList = await this.model('topic').setRelation(false).where({status: 1}).field(['id', 'title', 'subtitle', 'list_pic_url', 'read_count']).limit(3).select()

    const cartCount = await this.model('cart').getCartCount()

    return this.success({
      banner: banner,
      channel: channel,

      hotGoodsList: hotGoods.data,
      brand: {
        title: '有的吃',
        list: brandList
      },
      topicList: topicList,
      newGoodsList: newGoods.data,
      categoryList: [],
      cartCount: cartCount
    });
  }
};
