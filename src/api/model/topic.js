const _ = require('lodash');

module.exports = class extends think.Model {

  get relation() {
    return {
      goods: {
        type: think.Model.MANY_TO_MANY,
        rModel: 'topic_goods',
        rfKey: 'goods_id',
        where: {status: 1, is_on_sale: 1},
        field: 'id, goods_sn, name, promotion_tag, goods_brief, list_pic_url, sell_volume',
        relation:['goods']
      }
    }
  }

  async getList(data) {
    const topics = await this.setRelation(false).where({title: ['like', `%${data.title}%`], status: 1, is_show: 1}).order(['sort_order ASC']).field(['id', 'title', 'subtitle', 'list_pic_url', 'read_count']).page(data.page, data.size).countSelect()
    return topics;
  }
  async getDetailById(id) {
    return this.setRelation(true).where({id: id, status: 1, is_show: 1}).find();
  }
};
