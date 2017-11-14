const _ = require('lodash');

module.exports = class extends think.Model {

  get relation() {
    return {
      brand: {
        type: think.Model.BELONG_TO
      },
      goods_sku: {
        type: think.Model.HAS_MANY,
        where: { status: 1},
      },
      goods: {
        type: think.Model.MANY_TO_MANY,
        rModel: 'goods_goods',
        rfKey: 'relation_goods_id'
      }
    }
  }
  async getList(data) {
    const goods = await this.setRelation(true).where({name: ['like', `%${data.name}%`], status: 1}).order(['sort_order ASC']).page(data.page, data.size).countSelect();
    return goods;
  }
  async getDetailById(id) {
    return this.setRelation(true).where({id: id}).find();
  }
};
