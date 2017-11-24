module.exports = class extends think.Model {

  get relation() {
    return {
      goods_sku: {
        type: think.Model.HAS_MANY,
        where: { status: 1, is_show: 1 },
        field: 'id,name,retail_price,market_price,quantity_num,quantity_unit,goods_id,remark,add_cart_sym'
      },
      goods: {
        type: think.Model.MANY_TO_MANY,
        rModel: 'goods_goods',
        rfKey: 'relation_goods_id'
      }
    }
  }
  async getHotGoods(page, size) {
    const goods = await this.setRelation('goods_sku')
      .field(['id', 'goods_sn', 'name', 'promotion_tag', 'goods_brief','list_pic_url', 'like_volume', 'sell_volume'])
      .where({status: 1, is_hot: 1, is_on_sale: 1})
      .order(['sort_order ASC'])
      .page(page, size)
      .countSelect();
    return goods;
  }
  async getNewGoods(page, size) {
    const goods = await this.setRelation('goods_sku')
      .field(['id', 'goods_sn', 'name', 'promotion_tag', 'goods_brief','list_pic_url', 'like_volume', 'sell_volume'])
      .where({status: 1, is_new: 1, is_on_sale: 1})
      .order(['sort_order ASC'])
      .page(page, size)
      .countSelect();
    return goods;
  }

  /**
   * 根据id获取商品详情
   * @param id
   * @returns {Promise.<T|*|Promise>}
   */
  async getDetailById(id) {
    return this.setRelation(true)
      .fieldReverse(['category_id', 'brand_id', 'is_on_sale', 'cost_price', 'sort_order', 'add_time', 'status'])
      .where({id: id, status: 1, is_on_sale: 1})
      .find();
  }
  /**
   * 获取商品的product
   * @param goodsId
   * @returns {Promise.<*>}
   */
  async getProductList(goodsId) {
    const goods = await this.model('product').where({goods_id: goodsId}).select();
    return goods;
  }

  async searchByKeyword(keyword, page, size) {
    const goods = await this.setRelation('goods_sku')
      .field(['id', 'goods_sn', 'name', 'promotion_tag', 'goods_brief','list_pic_url', 'like_volume', 'sell_volume'])
      .where({status: 1, is_on_sale: 1, 'name|goods_brief': ['like', `%${keyword}%`]})
      .order(['sort_order ASC'])
      .page(page, size)
      .countSelect();
    return goods;
  }

};
