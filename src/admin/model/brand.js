const _ = require('lodash');

module.exports = class extends think.Model {

  get relation() {
    return {
      goods: {
        type: think.Model.MANY_TO_MANY,
        rModel: 'brand_goods',
        rfKey: 'goods_id',
        fKey: 'brandd_id',
        where: {status: 1, is_on_sale: 1}
      }
    }
  }
  async getList(data) {
    const brands = await this.setRelation(false).field(['id', 'title', 'description', 'outter_pic_url', 'inner_pic_url', 'content_pic_url', 'show_in_home', 'sort_order', 'is_show']).where({title: ['like', `%${data.title}%`], status: 1}).order(['sort_order ASC']).page(data.page, data.size).countSelect();

    return brands
  }

  async getDetailById(id) {
    const data = await this.setRelation(true).field(['id', 'title', 'description', 'outter_pic_url', 'inner_pic_url', 'content_pic_url', 'show_in_home', 'sort_order', 'is_show']).where({id: id}).find();
    return data
  }


};
