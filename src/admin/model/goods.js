const _ = require('lodash');

module.exports = class extends think.Model {

  get relation() {
    return {
      goods_sku: {
        type: think.Model.HAS_MANY
      }
    }
  }
  async getList(data) {
    const goods = await this.setRelation('goods_sku', {
        where: {status: 1}
      }).where({name: ['like', `%${data.name}%`], status: 1}).order(['sort_order ASC']).page(data.page, data.size).countSelect();
    return goods;
  }
  async getDetailById(id) {
    return this.setRelation('goods_sku', {
      where: {status: 1}
    }).where({id: id}).find();
  }
};
