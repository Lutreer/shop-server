const Base = require('./base.js');

module.exports = class extends Base {
  async listAction() {
    const page = this.get('page') || 1
    const size = this.get('size') || 10
    const title = this.get('title') || ''

    const model = this.model('topic');
    const data = await model.getList({page, size, title})

    return this.success(data);
  }

  async detailAction() {
    const model = this.model('topic');
    const data = await model.where({id: this.get('id')}).find();

    return this.success(data);
  }

  async relatedAction() {
    const model = this.model('topic');
    const data = await model.field(['id', 'title', 'price_info', 'scene_pic_url', 'subtitle']).limit(4).select();

    return this.success(data);
  }
};
