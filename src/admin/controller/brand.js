const Base = require('./base.js');

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const page = this.get('page') || 1;
    const size = this.get('size') || 10;
    const title = this.get('title') || '';

    const model = this.model('brand');
    const data = await model.field(['id', 'title', 'description', 'outter_pic_url', 'inner_pic_url', 'content_pic_url', 'show_in_home', 'sort_order', 'is_show']).where({title: ['like', `%${title}%`], status: 1}).order(['sort_order ASC']).page(page, size).countSelect();

    return this.success(data);
  }

  async infoAction() {
    const id = this.get('id');
    const model = this.model('brand');
    const data = await model.field(['id', 'title', 'description', 'outter_pic_url', 'inner_pic_url', 'content_pic_url', 'show_in_home', 'sort_order', 'is_show']).where({id: id}).find();

    return this.success(data);
  }

  async storeAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('brand');
    values.is_show = values.is_show ? 1 : 0;
    values.show_in_home = values.show_in_home ? 1 : 0;

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      delete values.id;
      await model.add(values);
    }
    return this.success(values);
  }

  async destoryAction() {
    const id = this.post('id');
    await this.model('brand').where({id: id}).limit(1).update({status: 0});
    return this.success();
  }

  async updatePicAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('brand');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }
};
