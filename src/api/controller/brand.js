const Base = require('./base.js');

module.exports = class extends Base {
  async listAction() {
    const model = this.model('brand');
    const data = await model.field(['id', 'inner_pic_url', 'description', 'title']).where({is_show: 1, status: 1}).order({sort_order: 'asc'}).page(this.get('page') || 1, this.get('size') || 10).countSelect();

    return this.success(data);
  }

  async detailAction() {
    const model = this.model('brand');
    const data = await model.where({id: this.get('id')}).find();

    return this.success({brand: data});
  }
};
