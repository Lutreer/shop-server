const _ = require('lodash');

module.exports = class extends think.Model {

  get relation() {
    return {
      goods: {
        type: think.Model.MANY_TO_MANY,
        rModel: 'topic_goods',
        rfKey: 'goods_id'
      }
    }
  }
  async getList(data) {
    const topics = await this.setRelation('goods', {
      where: {status: 1, is_on_sale: 1}
    }).where({title: ['like', `%${data.title}%`]}).order(['sort_order ASC']).page(data.page, data.size).countSelect();
    return topics;
  }
  async getDetailById(id) {
    return this.setRelation('goods', {
      where: {status: 1, is_on_sale: 1}
    }).where({id: id}).find();
  }
};
