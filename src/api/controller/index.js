const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const banner = await this.model('ad').field(['id', 'image_url', 'link']).where({ad_position_id: 1, is_show: 1, status: 1}).select();
    const channel = await this.model('channel').where({status: 1}).order({sort_order: 'asc'}).select();
    const brandList = await this.model('brand').field(['id', 'outter_pic_url']).where({is_show: 1}).order({sort_order: 'asc'}).limit(4).select();
    const hotGoods = await this.model('goods').field(['id', 'name', 'list_pic_url', 'retail_price', 'goods_brief']).where({is_hot: 1}).limit(3).select();
    const topicList = await this.model('topic').limit(3).select();

    const cartList = await this.model('cart').where({user_id: think.userId, session_id: 1}).select();
    // 获取购物车统计信息
    let cartCount = 0;
    for (const cartItem of cartList) {
      cartCount += cartItem.number;
    }

    // const categoryList = await this.model('category').where({name: ['<>', '推荐']}).select();
    // const newGoods = await this.model('goods').field(['id', 'name', 'list_pic_url', 'retail_price']).where({is_new: 1}).limit(4).select();
    // const newCategoryList = [];
    // for (const categoryItem of categoryList) {
    //   const childCategoryIds = await this.model('category').where({parent_id: categoryItem.id}).getField('id', 100);
    //   const categoryGoods = await this.model('goods').field(['id', 'name', 'list_pic_url', 'retail_price']).where({category_id: ['IN', childCategoryIds]}).limit(7).select();
    //   newCategoryList.push({
    //     id: categoryItem.id,
    //     name: categoryItem.name,
    //     goodsList: categoryGoods
    //   });
    // }

    return this.success({
      banner: banner,
      channel: channel,

      hotGoodsList: hotGoods,
      brand: {
        title: '里面有段话',
        list: brandList
      },
      topicList: topicList,
      newGoodsList: [],
      categoryList: [],
      cartCount: cartCount
    });
  }
};
