module.exports = class extends think.Model {
  get relation() {
    return {
      goods_sku: {
        type: think.Model.HAS_MANY,
        where: { status: 1, is_show: 1 },
        field: 'id,name,retail_price,market_price,quantity_num,quantity_unit,goods_id'
      }
    }
  }
  async getHotGoods(limit) {
    const goods = await this.setRelation(true)
      .field(['id', 'goods_sn', 'name', 'promotion_tag', 'goods_brief','list_pic_url', 'like_volume', 'sell_volume'])
      .where({status: 1, is_hot: 1, is_on_sale: 1})
      .order(['sort_order ASC'])
      .limit(limit).select();
    return goods;
  }
  async getDetailById(id) {
    return this.setRelation('goods_sku', {
      where: {status: 1}
    }).where({id: id}).find();
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

  /**
   * 获取商品的规格信息
   * @param goodsId
   * @returns {Promise.<Array>}
   */
  async getSpecificationList(goodsId) {
    // 根据sku商品信息，查找规格值列表
    const specificationRes = await this.model('goods_specification').alias('gs')
      .field(['gs.*', 's.name'])
      .join({
        table: 'specification',
        join: 'inner',
        as: 's',
        on: ['specification_id', 'id']
      })
      .where({goods_id: goodsId}).select();

    const specificationList = [];
    const hasSpecificationList = {};
    // 按规格名称分组
    for (let i = 0; i < specificationRes.length; i++) {
      const specItem = specificationRes[i];
      if (!hasSpecificationList[specItem.specification_id]) {
        specificationList.push({
          specification_id: specItem.specification_id,
          name: specItem.name,
          valueList: [specItem]
        });
        hasSpecificationList[specItem.specification_id] = specItem;
      } else {
        for (let j = 0; j < specificationList.length; j++) {
          if (specificationList[j].specification_id === specItem.specification_id) {
            specificationList[j].valueList.push(specItem);
            break;
          }
        }
      }
    }
    return specificationList;
  }

};
